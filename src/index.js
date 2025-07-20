// try {
//     const reloader = require('electron-reloader');
//     reloader(module, {
//     });
// } catch (err) {
// }

require('dotenv').config();

if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, dialog, desktopCapturer, session } = require('electron');

// Set app name immediately for proper identification in System Preferences
app.setName('Leviousa');

const { createWindows } = require('./window/windowManager.js');
const listenService = require('./features/listen/listenService');
const { initializeFirebase } = require('./features/common/services/firebaseClient');
const databaseInitializer = require('./features/common/services/databaseInitializer');
const authService = require('./features/common/services/authService');
const path = require('node:path');
const express = require('express');
const axios = require('axios');
const { autoUpdater } = require('electron-updater');
const { EventEmitter } = require('events');
const askService = require('./features/ask/askService');
const settingsService = require('./features/settings/settingsService');
const sessionRepository = require('./features/common/repositories/session');
const modelStateService = require('./features/common/services/modelStateService');
const featureBridge = require('./bridge/featureBridge');
const windowBridge = require('./bridge/windowBridge');
const leviousaBridge = require('./bridge/leviousaBridge');
const { initializeEyeContactBridge } = require('./features/eyecontact/eyeContactBridge');

// Global variables
const eventBridge = new EventEmitter();
let WEB_PORT = 3000;
let isShuttingDown = false; // Flag to prevent infinite shutdown loop

//////// after_modelStateService ////////
global.modelStateService = modelStateService;
//////// after_modelStateService ////////

// Local AI services removed by user request
// ollamaModelRepository removed - local models disabled

// Native deep link handling - cross-platform compatible
let pendingDeepLinkUrl = null;

function setupProtocolHandling() {
    // Protocol registration - must be done before app is ready
    console.log('🔗 [Protocol] Setting up protocol handling...');
    try {
        console.log('🔗 [Protocol] Is default protocol client?', app.isDefaultProtocolClient('leviousa'));
        
        // Set app name for protocol registration
        app.setName('Leviousa');
        
        if (!app.isDefaultProtocolClient('leviousa')) {
            const success = app.setAsDefaultProtocolClient('leviousa');
            console.log('🔗 [Protocol] Set as default protocol client result:', success);
            if (success) {
                console.log('🔗 [Protocol] Successfully set as default protocol client for leviousa://');
            } else {
                console.warn('🔗 [Protocol] Failed to set as default protocol client - this may affect deep linking');
            }
        } else {
            console.log('🔗 [Protocol] Already registered as default protocol client for leviousa://');
        }
    } catch (error) {
        console.error('[Protocol] Error during protocol registration:', error);
    }

    // Handle protocol URLs on Windows/Linux
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        console.log('🔗 [Protocol] SECOND INSTANCE TRIGGERED! Command line:', commandLine);
        
        focusMainWindow();
        
        let protocolUrl = null;
        
        // Search through all command line arguments for a valid protocol URL
        for (const arg of commandLine) {
            if (arg && typeof arg === 'string' && arg.startsWith('leviousa://')) {
                // Clean up the URL by removing problematic characters
                const cleanUrl = arg.replace(/[\\₩]/g, '');
                
                // Additional validation for Windows
                if (process.platform === 'win32') {
                    // On Windows, ensure the URL doesn't contain file path indicators
                    if (!cleanUrl.includes(':') || cleanUrl.indexOf('://') === cleanUrl.lastIndexOf(':')) {
                        protocolUrl = cleanUrl;
                        break;
                    }
                } else {
                    protocolUrl = cleanUrl;
                    break;
                }
            }
        }
        
        if (protocolUrl) {
            console.log('[Protocol] Valid URL found from second instance:', protocolUrl);
            handleCustomUrl(protocolUrl);
        } else {
            console.log('[Protocol] No valid protocol URL found in command line arguments');
            console.log('[Protocol] Command line args:', commandLine);
        }
    });

    // Handle protocol URLs on macOS
    app.on('open-url', (event, url) => {
        event.preventDefault();
        console.log('🔗 [Protocol] MACOS OPEN-URL TRIGGERED! Received URL:', url);
        
        if (!url || !url.startsWith('leviousa://')) {
            console.warn('[Protocol] Invalid URL format:', url);
            return;
        }

        if (app.isReady()) {
            handleCustomUrl(url);
        } else {
            pendingDeepLinkUrl = url;
            console.log('[Protocol] App not ready, storing URL for later');
        }
    });
}

function focusMainWindow() {
    const { windowPool } = require('./window/windowManager.js');
    if (windowPool) {
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            if (header.isMinimized()) header.restore();
            header.focus();
            return true;
        }
    }
    
    // Fallback: focus any available window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        const mainWindow = windows[0];
        if (!mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            return true;
        }
    }
    
    return false;
}

if (process.platform === 'win32') {
    for (const arg of process.argv) {
        if (arg && typeof arg === 'string' && arg.startsWith('leviousa://')) {
            // Clean up the URL by removing problematic characters (korean characters issue...)
            const cleanUrl = arg.replace(/[\\₩]/g, '');
            
            if (!cleanUrl.includes(':') || cleanUrl.indexOf('://') === cleanUrl.lastIndexOf(':')) {
                console.log('[Protocol] Found protocol URL in initial arguments:', cleanUrl);
                pendingDeepLinkUrl = cleanUrl;
                break;
            }
        }
    }
    
    console.log('[Protocol] Initial process.argv:', process.argv);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

// setup protocol after single instance lock
setupProtocolHandling();

// Set the app name for System Preferences and other native dialogs
app.setName('Leviousa');

app.whenReady().then(async () => {

    // Setup native loopback audio capture for Windows
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
            // Grant access to the first screen found with loopback audio
            callback({ video: sources[0], audio: 'loopback' });
        }).catch((error) => {
            console.error('Failed to get desktop capturer sources:', error);
            callback({});
        });
    });

    // Check if this is a development build with enhanced debugging
    const isDevBuild = process.env.LEVIOUSA_DEV_BUILD === 'true';
    if (isDevBuild) {
        console.log('🔧 ===== DEVELOPMENT BUILD MODE =====');
        console.log('🔧 Enhanced debugging features enabled');
        console.log('🔧 Developer tools will auto-open for all windows');
        console.log('🔧 Full console logging enabled');
        console.log('🔧 ====================================');
    }

    // Initialize core services
    await initializeFirebase();
    
    try {
        await databaseInitializer.initialize();
        console.log('>>> [index.js] Database initialized successfully');
        
        // Clean up zombie sessions from previous runs first - MOVED TO authService
        // sessionRepository.endAllActiveSessions();

        await authService.initialize();
        console.log('>>> [index.js] AuthService initialized successfully');

        //////// after_modelStateService ////////
        await modelStateService.initialize();
        console.log('>>> [index.js] ModelStateService initialized successfully');
        //////// after_modelStateService ////////

        // Initialize Leviousa pre-configured API keys
        await leviousaBridge.initializePreConfiguredKeys();
        console.log('>>> [index.js] PreConfigured keys initialized successfully');
        
        featureBridge.initialize();  // 추가: featureBridge 초기화
        windowBridge.initialize();
        leviousaBridge.initializeLeviousaHandlers();  // Initialize Leviousa-specific handlers
        initializeEyeContactBridge();  // Initialize eye contact correction handlers
        setupWebDataHandlers();

        // Initialize eye contact service if enabled
        const leviousaConfig = require('./features/common/config/leviousa-config');
        if (leviousaConfig.leviousaConfig.isFeatureEnabled('eyeContactCorrection')) {
            const sieveEyeContactService = require('./features/eyecontact/sieveEyeContactService');
            await sieveEyeContactService.initialize();
        }

        // Initialize Ollama models in database
        // ollamaModelRepository initialization removed - local models disabled

        // Ollama warm-up removed - local models disabled

        // Start web server and create windows ONLY after all initializations are successful
        WEB_PORT = await startWebStack();
        console.log('>>> [index.js] Web stack started successfully');
        
        const isDev = !app.isPackaged;
        if (isDev) {
            console.log('🔥 Development mode: Frontend served via Firebase hosting at', process.env.leviousa_WEB_URL);
            console.log('🔧 API server listening on localhost:' + process.env.leviousa_API_PORT);
        } else {
            console.log('📱 Production mode: Web front-end listening on', WEB_PORT);
        }
        
        console.log('>>> [index.js] About to create windows...');
        try {
            createWindows();
            console.log('>>> [index.js] Windows created successfully');
        } catch (windowError) {
            console.error('>>> [index.js] Window creation failed:', windowError);
            console.error('>>> [index.js] Window creation error stack:', windowError.stack);
        }

    } catch (err) {
        console.error('>>> [index.js] Database initialization failed - some features may not work', err);
        // Optionally, show an error dialog to the user
        dialog.showErrorBox(
            'Application Error',
            'A critical error occurred during startup. Some features might be disabled. Please restart the application.'
        );
    }

    // initAutoUpdater should be called after auth is initialized
    initAutoUpdater();

    // Process any pending deep link after everything is initialized
    if (pendingDeepLinkUrl) {
        console.log('[Protocol] Processing pending URL:', pendingDeepLinkUrl);
        handleCustomUrl(pendingDeepLinkUrl);
        pendingDeepLinkUrl = null;
    }
});

app.on('before-quit', async (event) => {
    // Prevent infinite loop by checking if shutdown is already in progress
    if (isShuttingDown) {
        console.log('[Shutdown] 🔄 Shutdown already in progress, allowing quit...');
        return;
    }
    
    console.log('[Shutdown] App is about to quit. Starting graceful shutdown...');
    
    // Set shutdown flag to prevent infinite loop
    isShuttingDown = true;
    
    // Prevent immediate quit to allow graceful shutdown
    event.preventDefault();
    
    try {
        // 1. Stop audio capture first (immediate)
        await listenService.closeSession();
        console.log('[Shutdown] Audio capture stopped');
        
        // 2. End all active sessions (database operations) - with error handling
        try {
            await sessionRepository.endAllActiveSessions();
            console.log('[Shutdown] Active sessions ended');
        } catch (dbError) {
            console.warn('[Shutdown] Could not end active sessions (database may be closed):', dbError.message);
        }
        
        // Ollama shutdown removed - local models disabled
        
        // 4. Close database connections (final cleanup)
        try {
            databaseInitializer.close();
            console.log('[Shutdown] Database connections closed');
        } catch (closeError) {
            console.warn('[Shutdown] Error closing database:', closeError.message);
        }
        
        console.log('[Shutdown] Graceful shutdown completed successfully');
        
    } catch (error) {
        console.error('[Shutdown] Error during graceful shutdown:', error);
        // Continue with shutdown even if there were errors
    } finally {
        // Actually quit the app now
        console.log('[Shutdown] Exiting application...');
        app.exit(0); // Use app.exit() instead of app.quit() to force quit
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindows();
    }
});

function setupWebDataHandlers() {
    const sessionRepository = require('./features/common/repositories/session');
    const sttRepository = require('./features/listen/stt/repositories');
    const summaryRepository = require('./features/listen/summary/repositories');
    const askRepository = require('./features/ask/repositories');
    const userRepository = require('./features/common/repositories/user');
    const presetRepository = require('./features/common/repositories/preset');

    const handleRequest = async (channel, responseChannel, payload) => {
        let result;
        // const currentUserId = authService.getCurrentUserId(); // No longer needed here
        try {
            switch (channel) {
                // SESSION
                case 'get-sessions':
                    // Adapter injects UID
                    result = await sessionRepository.getAllByUserId();
                    break;
                case 'get-session-details':
                    const session = await sessionRepository.getById(payload);
                    if (!session) {
                        result = null;
                        break;
                    }
                    const [transcripts, ai_messages, summary] = await Promise.all([
                        sttRepository.getAllTranscriptsBySessionId(payload),
                        askRepository.getAllAiMessagesBySessionId(payload),
                        summaryRepository.getSummaryBySessionId(payload)
                    ]);
                    result = { session, transcripts, ai_messages, summary };
                    break;
                case 'delete-session':
                    result = await sessionRepository.deleteWithRelatedData(payload);
                    break;
                case 'create-session':
                    // Adapter injects UID
                    const id = await sessionRepository.create('ask');
                    if (payload && payload.title) {
                        await sessionRepository.updateTitle(id, payload.title);
                    }
                    result = { id };
                    break;
                
                // USER
                case 'get-user-profile':
                    // Adapter injects UID
                    result = await userRepository.getById();
                    break;
                case 'update-user-profile':
                     // Adapter injects UID
                    result = await userRepository.update(payload);
                    break;
                case 'find-or-create-user':
                    result = await userRepository.findOrCreate(payload);
                    break;
                case 'save-api-key':
                    // Use ModelStateService as the single source of truth for API key management
                    result = await modelStateService.setApiKey(payload.provider, payload.apiKey);
                    break;
                case 'check-api-key-status':
                    // Use ModelStateService to check API key status
                    const hasApiKey = await modelStateService.hasValidApiKey();
                    result = { hasApiKey };
                    break;
                case 'delete-account':
                    // Adapter injects UID
                    result = await userRepository.deleteById();
                    break;

                // PRESET
                case 'get-presets':
                    // Adapter injects UID
                    result = await presetRepository.getPresets();
                    break;
                case 'create-preset':
                    // Adapter injects UID
                    result = await presetRepository.create(payload);
                    settingsService.notifyPresetUpdate('created', result.id, payload.title);
                    break;
                case 'update-preset':
                    // Adapter injects UID
                    result = await presetRepository.update(payload.id, payload.data);
                    settingsService.notifyPresetUpdate('updated', payload.id, payload.data.title);
                    break;
                case 'delete-preset':
                    // Adapter injects UID
                    result = await presetRepository.delete(payload);
                    settingsService.notifyPresetUpdate('deleted', payload);
                    break;
                
                // BATCH
                case 'get-batch-data':
                    const includes = payload ? payload.split(',').map(item => item.trim()) : ['profile', 'presets', 'sessions'];
                    const promises = {};
            
                    if (includes.includes('profile')) {
                        // Adapter injects UID
                        promises.profile = userRepository.getById();
                    }
                    if (includes.includes('presets')) {
                        // Adapter injects UID
                        promises.presets = presetRepository.getPresets();
                    }
                    if (includes.includes('sessions')) {
                        // Adapter injects UID
                        promises.sessions = sessionRepository.getAllByUserId();
                    }
                    
                    const batchResult = {};
                    const promiseResults = await Promise.all(Object.values(promises));
                    Object.keys(promises).forEach((key, index) => {
                        batchResult[key] = promiseResults[index];
                    });

                    result = batchResult;
                    break;

                default:
                    throw new Error(`Unknown web data channel: ${channel}`);
            }
            eventBridge.emit(responseChannel, { success: true, data: result });
        } catch (error) {
            console.error(`Error handling web data request for ${channel}:`, error);
            eventBridge.emit(responseChannel, { success: false, error: error.message });
        }
    };
    
    eventBridge.on('web-data-request', handleRequest);
}

async function handleCustomUrl(url) {
    try {
        console.log('🔗 [Custom URL] DEEP LINK RECEIVED! Processing URL:', url);
        
        // Validate and clean URL
        if (!url || typeof url !== 'string' || !url.startsWith('leviousa://')) {
            console.error('[Custom URL] Invalid URL format:', url);
            return;
        }
        
        // Clean up URL by removing problematic characters
        const cleanUrl = url.replace(/[\\₩]/g, '');
        
        // Additional validation
        if (cleanUrl !== url) {
            console.log('[Custom URL] Cleaned URL from:', url, 'to:', cleanUrl);
            url = cleanUrl;
        }
        
        const urlObj = new URL(url);
        const action = urlObj.hostname;
        const params = Object.fromEntries(urlObj.searchParams);
        
        console.log('[Custom URL] Action:', action, 'Params:', params);

        switch (action) {
            case 'login':
            case 'auth-success':
                await handleFirebaseAuthCallback(params);
                break;
            case 'server-auth-success':
                await handleServerSideAuthCallback(params);
                break;
            case 'personalize':
                handlePersonalizeFromUrl(params);
                break;
            default:
                const { windowPool } = require('./window/windowManager.js');
                const header = windowPool.get('header');
                if (header) {
                    if (header.isMinimized()) header.restore();
                    header.focus();
                    
                    const webUrl = process.env.leviousa_WEB_URL || `http://localhost:${WEB_PORT}`;
                    const targetUrl = `${webUrl}/${action}`;
                    console.log(`[Custom URL] Navigating webview to: ${targetUrl}`);
                    header.webContents.loadURL(targetUrl);
                }
        }

    } catch (error) {
        console.error('[Custom URL] Error parsing URL:', error);
    }
}

async function handleFirebaseAuthCallback(params) {
    const userRepository = require('./features/common/repositories/user');
    const { verifyIdToken, createCustomToken } = require('./features/common/services/firebaseClient');
    const { token: idToken } = params;

    if (!idToken) {
        console.error('[Auth] Firebase auth callback is missing ID token.');
        return;
    }

    console.log('[Auth] Received ID token from deep link, verifying and creating custom token locally...');

    try {
        // 1. Verify the ID token using local Firebase Admin SDK
        const decodedToken = await verifyIdToken(idToken);
        console.log('[Auth] ID token verified for user:', decodedToken.uid);

        // 2. Create custom token using local Firebase Admin SDK
        const customToken = await createCustomToken(decodedToken.uid, {
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture
        });
        console.log('[Auth] Custom token created successfully');

        const firebaseUser = {
            uid: decodedToken.uid,
            email: decodedToken.email || 'no-email@example.com',
            displayName: decodedToken.name || 'User',
            photoURL: decodedToken.picture
        };

        // 3. Sync user data to local DB
        userRepository.findOrCreate(firebaseUser);
        console.log('[Auth] User data synced with local DB.');

        // 4. Sign in using the authService in the main process
        await authService.signInWithCustomToken(customToken);
        console.log('[Auth] Main process sign-in initiated. Waiting for onAuthStateChanged...');

        // 5. Focus the app window
        const { windowPool } = require('./window/windowManager.js');
        const header = windowPool.get('header');
        if (header) {
            if (header.isMinimized()) header.restore();
            header.focus();
        } else {
            console.error('[Auth] Header window not found after auth callback.');
        }
        
    } catch (error) {
        console.error('[Auth] Error during custom token exchange or sign-in:', error);
        // The UI will not change, and the user can try again.
        // Optionally, send a generic error event to the renderer.
        const { windowPool } = require('./window/windowManager.js');
        const header = windowPool.get('header');
        if (header) {
            header.webContents.send('auth-failed', { message: error.message });
        }
    }
}

async function handleServerSideAuthCallback(params) {
    const userRepository = require('./features/common/repositories/user');
    const { uid, email, displayName, photoURL } = params;

    if (!uid || !email) {
        console.error('[Auth] Server-side auth callback is missing user info.');
        return;
    }

    console.log('[Auth] Processing server-side authentication for user:', uid);

    try {
        const userInfo = {
            uid: uid,
            email: email,
            displayName: displayName || 'User',
            photoURL: photoURL || ''
        };

        // 1. Sync user data to local DB
        userRepository.findOrCreate(userInfo);
        console.log('[Auth] User data synced with local DB.');

        // 2. Use the server-side authentication method with Firebase Admin SDK
        const result = await authService.authenticateWithServerSideToken(userInfo);
        
        if (result.success) {
            console.log('[Auth] Server-side authentication successful');
        } else {
            throw new Error(result.error || 'Server-side authentication failed');
        }

        // 3. Focus the app window
        const { windowPool } = require('./window/windowManager.js');
        const header = windowPool.get('header');
        if (header) {
            if (header.isMinimized()) header.restore();
            header.focus();
        } else {
            console.error('[Auth] Header window not found after server-side auth callback.');
        }
        
    } catch (error) {
        console.error('[Auth] Error during server-side authentication:', error);
        // Send error event to the renderer
        const { windowPool } = require('./window/windowManager.js');
        const header = windowPool.get('header');
        if (header) {
            header.webContents.send('auth-failed', { message: error.message });
        }
    }
}

function handlePersonalizeFromUrl(params) {
    console.log('[Custom URL] Personalize params:', params);
    
    const { windowPool } = require('./window/windowManager.js');
    const header = windowPool.get('header');
    
    if (header) {
        if (header.isMinimized()) header.restore();
        header.focus();
        
        const personalizeUrl = `http://localhost:${WEB_PORT}/settings`;
        console.log(`[Custom URL] Navigating to personalize page: ${personalizeUrl}`);
        header.webContents.loadURL(personalizeUrl);
        
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('enter-personalize-mode', {
                message: 'Personalization mode activated',
                params: params
            });
        });
    } else {
        console.error('[Custom URL] Header window not found for personalize');
    }
}


async function startWebStack() {
  console.log('NODE_ENV =', process.env.NODE_ENV); 
  const isDev = !app.isPackaged;

  const getAvailablePort = () => {
    return new Promise((resolve, reject) => {
      const server = require('net').createServer();
      server.listen(0, (err) => {
        if (err) reject(err);
        const port = server.address().port;
        server.close(() => resolve(port));
      });
    });
  };

  // Always use Firebase hosting for frontend to avoid OAuth issues
  let apiPort, frontendPort, webUrl;
  
  // Always use Firebase hosting domain for consistent OAuth behavior
  apiPort = isDev ? 9001 : await getAvailablePort();
  frontendPort = 3000; // Not used when using Firebase hosting
  webUrl = 'https://leviousa-101.web.app'; // Always use Firebase hosting domain
  
  console.log(`🔧 Using Firebase hosting for all builds: API=${apiPort}`);
  console.log(`🌐 Web URL: ${webUrl}`);

  process.env.leviousa_API_PORT = apiPort.toString();
  process.env.leviousa_API_URL = `http://localhost:${apiPort}`;
  process.env.leviousa_WEB_PORT = frontendPort.toString();
  process.env.leviousa_WEB_URL = webUrl;

  console.log(`🌍 Environment variables set:`, {
    leviousa_API_URL: process.env.leviousa_API_URL,
    leviousa_WEB_URL: process.env.leviousa_WEB_URL
  });

  const createBackendApp = require('../leviousa_web/backend_node');
  const nodeApi = createBackendApp(eventBridge);

  // No local frontend server needed - always use Firebase hosting
  console.log(`🔥 Using Firebase hosting at ${webUrl}`);
  console.log(`📋 Frontend is served from Firebase hosting`);
  console.log(`📋 API runs locally on http://localhost:${apiPort}`);

  const apiSrv = express();
  apiSrv.use(nodeApi);

  const apiServer = await new Promise((resolve, reject) => {
    const server = apiSrv.listen(apiPort, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
    app.once('before-quit', () => server.close());
  });

  console.log(`✅ API server started on http://localhost:${apiPort}`);

  console.log(`🚀 All services ready:
   Frontend: ${webUrl} (Firebase Hosting)
   API:      http://localhost:${apiPort} (Local)`);

  return frontendPort;
}

// Auto-update initialization
async function initAutoUpdater() {
    if (process.env.NODE_ENV === 'development') {
        console.log('Development environment, skipping auto-updater.');
        return;
    }

    try {
        await autoUpdater.checkForUpdates();
        autoUpdater.on('update-available', () => {
            console.log('Update available!');
            autoUpdater.downloadUpdate();
        });
        autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, date, url) => {
            console.log('Update downloaded:', releaseNotes, releaseName, date, url);
            dialog.showMessageBox({
                type: 'info',
                title: 'Application Update',
                message: `A new version of Leviousa (${releaseName}) has been downloaded. It will be installed the next time you launch the application.`,
                buttons: ['Restart', 'Later']
            }).then(response => {
                if (response.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });
        autoUpdater.on('error', (err) => {
            console.error('Error in auto-updater:', err);
        });
    } catch (err) {
        console.error('Error initializing auto-updater:', err);
    }
}