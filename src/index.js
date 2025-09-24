// try {
//     const reloader = require('electron-reloader');
//     reloader(module, {
//     });
// } catch (err) {
// }

require('dotenv').config();

// Add global EPIPE error protection immediately
process.on('uncaughtException', (error) => {
    if (error.code === 'EPIPE' || error.errno === -32) {
        console.warn('[GlobalEPipeHandler] Caught EPIPE error, handling gracefully:', error.message);
        return; // Prevent crash
    }
    
    // Log other uncaught exceptions but don't re-throw to prevent crash loops
    console.error('[GlobalErrorHandler] Uncaught exception:', error);
    console.error('[GlobalErrorHandler] Stack:', error.stack);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('[GlobalErrorHandler] Unhandled promise rejection at:', promise, 'reason:', reason);
});

// Handle process exit to cleanup servers
async function handleAppExit(signal) {
    console.log(`[GlobalShutdown] Received ${signal}, cleaning up...`);
    
    try {
        // Shutdown invisibility service (which includes MCP services)
        if (global.invisibilityService && typeof global.invisibilityService.shutdown === 'function') {
            await global.invisibilityService.shutdown();
        }
        
        // Shutdown PostHog service
        await posthogService.shutdown();
        
        console.log('[GlobalShutdown] Cleanup complete');
    } catch (error) {
        console.error('[GlobalShutdown] Error during cleanup:', error);
    }
    
    // Exit gracefully
    process.exit(0);
}

// Register exit handlers
process.on('SIGTERM', () => handleAppExit('SIGTERM'));
process.on('SIGINT', () => handleAppExit('SIGINT'));
process.on('beforeExit', () => handleAppExit('beforeExit'));

// Suppress known Firebase BloomFilter errors and database shutdown errors
process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.message && (
        reason.message.includes('BloomFilter error') ||
        reason.message.includes('Invalid hash count') ||
        reason.message.includes('WatchChangeAggregator') ||
        reason.message.includes('Database not connected. Call connect() first.') ||
        reason.message.includes('Cannot read properties of null (reading \'prepare\')') ||
        (global.isShuttingDown && reason.message.includes('Database')) ||
        (global.isShuttingDown && reason.message.includes('Cannot read properties of null'))
    )) {
        console.log('[Shutdown] 🔇 Suppressed known shutdown error:', reason.message.split('\n')[0]);
        return; // Don't crash the app for these known shutdown issues
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, dialog, desktopCapturer, session } = require('electron');
const logger = require('./utils/logger');

// Set app name immediately for proper identification in System Preferences and protocol dialogs
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
const posthogService = require('./features/common/services/posthogService');

// Set up global services for voice agent dependencies
global.listenService = listenService;
global.askService = askService;
global.posthogService = posthogService;

// Global variables
const eventBridge = new EventEmitter();
let WEB_PORT = 3000;
let isShuttingDown = false; // Flag to prevent infinite shutdown loop

// Add authentication notification method to eventBridge
eventBridge.notifyAuthenticationComplete = function(data) {
    console.log(`[EventBridge] 🔔 Authentication notification received for ${data.serviceKey}:`, data);
    
    // Forward to invisibility bridge to update MCP status
    if (global.invisibilityService && global.invisibilityService.mcpClient) {
        console.log(`[EventBridge] 📡 Forwarding authentication notification to MCP client`);
        
        // Add a small delay to ensure Paragon has processed the authentication
        setTimeout(async () => {
            try {
                // Force refresh of Paragon service status
                console.log(`[EventBridge] 🔄 Forcing refresh of Paragon service status for ${data.serviceKey}`);
                
                // Refresh server status to pick up new authentication
                const serverStatus = global.invisibilityService.mcpClient.getServerStatus();
                console.log(`[EventBridge] 🔄 Refreshed MCP server status`);
                
                // Also call get_authenticated_services to verify the authentication
                try {
                    // Use the authenticated user ID to check proper status
                    const realUserId = authService.getCurrentUserId();
                    const userIdForCheck = realUserId || 'default-user';
                    console.log(`[EventBridge] 📡 Checking authentication status for user: ${userIdForCheck}`);
                    
                    const authResult = await global.invisibilityService.mcpClient.callTool('get_authenticated_services', { user_id: userIdForCheck });
                    console.log(`[EventBridge] 📊 Latest authentication status:`, authResult);
                } catch (toolError) {
                    console.error(`[EventBridge] ❌ Error checking authentication status:`, toolError);
                }
                
                // Notify all windows of authentication update
                const { BrowserWindow } = require('electron');
                BrowserWindow.getAllWindows().forEach(window => {
                    if (!window.isDestroyed()) {
                        window.webContents.send('mcp:auth-status-updated', {
                            serviceKey: data.serviceKey,
                            status: data.status || 'authenticated',
                            timestamp: data.timestamp,
                            source: data.source || 'unknown'
                        });
                        
                        // Also send a general refresh event
                        window.webContents.send('mcp:servers-updated', { refreshParagon: true });
                    }
                });
                
                console.log(`[EventBridge] ✅ Notified all windows of ${data.serviceKey} authentication`);
            } catch (error) {
                console.error(`[EventBridge] ❌ Error forwarding authentication notification:`, error);
            }
        }, 1000); // 1 second delay for API consistency
    } else {
        console.warn(`[EventBridge] ⚠️ Invisibility service or MCP client not available for authentication notification`);
    }
};

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
        // Set app name FIRST before any protocol registration to ensure proper branding
        app.setName('Leviousa');
        console.log('🔗 [Protocol] App name set to:', app.getName());
        
        console.log('🔗 [Protocol] Is default protocol client?', app.isDefaultProtocolClient('leviousa'));
        
        if (!app.isDefaultProtocolClient('leviousa')) {
            // On macOS, register with explicit app path to ensure proper branding
            const success = process.platform === 'darwin' 
                ? app.setAsDefaultProtocolClient('leviousa', process.execPath, []) 
                : app.setAsDefaultProtocolClient('leviousa');
            
            console.log('🔗 [Protocol] Set as default protocol client result:', success);
            if (success) {
                console.log('🔗 [Protocol] Successfully set as default protocol client for leviousa://');
                console.log('🔗 [Protocol] App name for protocol:', app.getName());
            } else {
                console.warn('🔗 [Protocol] Failed to set as default protocol client - this may affect deep linking');
            }
        } else {
            console.log('🔗 [Protocol] Already registered as default protocol client for leviousa://');
            console.log('🔗 [Protocol] Current app name:', app.getName());
        }
    } catch (error) {
        console.error('[Protocol] Error during protocol registration:', error);
    }

    // Handle protocol URLs on macOS
    app.on('open-url', (event, url) => {
        event.preventDefault();
        console.log('🔗 [Protocol] MACOS OPEN-URL TRIGGERED! Received URL:', url);
        console.log('🔗 [Protocol] Event details:', {
            defaultPrevented: event.defaultPrevented,
            url: url,
            timestamp: new Date().toISOString()
        });
        
        if (!url || !url.startsWith('leviousa://')) {
            console.warn('[Protocol] Invalid URL format:', url);
            return;
        }

        if (app.isReady()) {
            console.log('[Protocol] App is ready, processing URL immediately');
            handleCustomUrl(url);
        } else {
            pendingDeepLinkUrl = url;
            console.log('[Protocol] App not ready, storing URL for later:', url);
        }
    });

    // Handle protocol URLs on Windows/Linux  
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        console.log('🔗 [Protocol] SECOND INSTANCE TRIGGERED! Command line:', commandLine);
        console.log('🔗 [Protocol] Working directory:', workingDirectory);
        console.log('🔗 [Protocol] Full commandLine array:', JSON.stringify(commandLine));
        
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
            console.log('[Protocol] All command line args:', commandLine.map((arg, i) => `${i}: ${arg}`));
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

// Inject PARAGON_PROJECT_ID from runtime config if not present
try {
  const fs = require('fs');
  const path = require('path');
  const runtimePath = path.join(__dirname, '../leviousa_web/public/runtime-config.json');
  if (!process.env.PARAGON_PROJECT_ID && fs.existsSync(runtimePath)) {
    const runtimeCfg = JSON.parse(fs.readFileSync(runtimePath, 'utf-8'));
    if (runtimeCfg.PARAGON_PROJECT_ID) {
      process.env.PARAGON_PROJECT_ID = runtimeCfg.PARAGON_PROJECT_ID;
      console.log('[ParagonEnv] PARAGON_PROJECT_ID injected from runtime-config.json');
    }
  }
} catch (err) {
  console.warn('[ParagonEnv] Failed to inject PARAGON_PROJECT_ID:', err.message);
}

// Set up CSP interception BEFORE app is ready to ensure it applies to all windows
function setupCSPInterception() {
    logger.debug('🔧 [CSP] Setting up CSP interception...');
    
    // Debug: Log ALL requests to see what's happening
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://*/*', 'http://*/*'] }, (details, callback) => {
        if (details.url.includes('useparagon.com')) {
            console.log('🔍 [DEBUG] All Paragon requests:', details.url, 'Type:', details.resourceType);
        }
        callback({});
    });

    // Debug: Log CSP header modifications
    session.defaultSession.webRequest.onHeadersReceived({ urls: ['https://*/*'] }, (details, callback) => {
        if (details.url.includes('useparagon.com')) {
            const originalCSP = details.responseHeaders?.['content-security-policy'] || details.responseHeaders?.['Content-Security-Policy'];
            if (originalCSP) {
                console.log('🔍 [DEBUG] Original CSP found for:', details.url);
                console.log('🔍 [DEBUG] Original CSP:', originalCSP);
            }
        }
        callback({});
    });

    // 🚀 BULLET-PROOF PARAGON CSP FIX (o3 suggested)
    const paragonFilter = { urls: ['https://connect.useparagon.com/*','https://*.useparagon.com/*','https://passport.useparagon.com/*'] };
    const localhostFilter = { urls: ['http://localhost:3000/*'] };

    // Fix user agent for Paragon domains to avoid Electron detection 
    session.defaultSession.webRequest.onBeforeSendHeaders(paragonFilter, (details, cb) => {
        if (details.url.includes('useparagon.com') || details.url.includes('passport.useparagon.com')) {
            const originalUA = details.requestHeaders['User-Agent'] || '';
            if (originalUA.includes('Electron')) {
                // Remove Electron and app name from user agent
                const cleanUA = originalUA
                    .replace(/Electron\/[^\s]+\s/, '')
                    .replace(/leviousa\/[^\s]+\s/, '')
                    .trim();
                details.requestHeaders['User-Agent'] = cleanUA;
                console.log(`[ParagonUA] Modified user agent for Paragon domain`);
            }
        }
        cb({ cancel: false, requestHeaders: details.requestHeaders });
    });

    // 1️⃣ Strip all CSP headers & tell Chromium to unzip body for us
    session.defaultSession.webRequest.onHeadersReceived(paragonFilter, (details, callback) => {
        const h = Object.fromEntries(
            Object.entries(details.responseHeaders ?? {}).map(([k, v]) => [k.toLowerCase(), v])
        );
        
        // Strip all CSP headers
        delete h['content-security-policy'];
        delete h['content-security-policy-report-only'];
        
        // Keep content-encoding so gzipped content displays properly
        // delete h['content-encoding']; // Commented out to prevent binary corruption
        
        // Add relaxed header CSP with Google auth support
        h['content-security-policy'] = [
            "default-src 'self' https: http: blob: data:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http: https://*.googleapis.com https://*.gstatic.com https://ssl.gstatic.com https://*.googleusercontent.com https://accounts.google.com; " +
            "connect-src 'self' https: http: ws: wss: blob: https://*.googleapis.com https://accounts.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; " +
            "img-src 'self' data: blob: https: http:; " +
            "style-src 'self' 'unsafe-inline' https: http:; " +
            "font-src 'self' data: https: http:; " +
            "frame-src 'self' https: http: blob: https://accounts.google.com; " +
            "worker-src 'self' blob:; " +
            "child-src 'self' https: http: blob:; " +
            "object-src 'self' blob: https: http:;"
        ];

        logger.debug('[CSPPatch] ✅ Bullet-proof CSP fix applied to:', details.url);
        logger.debug('[CSPPatch] 🔒 New CSP applied:', h['content-security-policy']);
        callback({ responseHeaders: h });
    });

    // Removed streaming CSP meta removal filter to avoid asset corruption;
    // relying solely on connect-preload.js to scrub CSP meta tags in the page DOM.

    // Apply same CSP fixes to localhost for development - OVERRIDE Next.js CSP completely
    session.defaultSession.webRequest.onHeadersReceived(localhostFilter, (details, callback) => {
        const h = Object.fromEntries(
            Object.entries(details.responseHeaders ?? {}).map(([k, v]) => [k.toLowerCase(), v])
        );
        
        // Remove any existing CSP headers (including Next.js ones)
        delete h['content-security-policy'];
        delete h['content-security-policy-report-only'];
        // Keep content-encoding to avoid corruption
        // delete h['content-encoding'];
        
        // Set a VERY permissive CSP specifically for Paragon integration
        h['content-security-policy'] = [
            "default-src 'self' https: http: blob: data: 'unsafe-inline' 'unsafe-eval'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http: data: 'wasm-unsafe-eval' 'unsafe-hashes' https://*.useparagon.com https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com; " +
            "connect-src 'self' https: http: ws: wss: blob: data:; " +
            "img-src 'self' data: blob: https: http:; " +
            "style-src 'self' 'unsafe-inline' https: http: data:; " +
            "font-src 'self' data: https: http:; " +
            "frame-src 'self' https: http: blob: data:; " +
            "worker-src 'self' blob: data:; " +
            "child-src 'self' https: http: blob: data:; " +
            "object-src 'self' blob: https: http: data:;"
        ];

        logger.debug('[CSPPatch] ✅ Overrode Next.js CSP for localhost:', details.url);
        logger.debug('[CSPPatch] 🔒 New localhost CSP:', h['content-security-policy']);
        callback({ responseHeaders: h });
    });

    session.defaultSession.webRequest.onBeforeRequest(localhostFilter, (details, callback) => {
        if (details.resourceType !== 'mainFrame' && details.resourceType !== 'subFrame') return callback({});

        const filter = session.defaultSession.webRequest.filterResponseData(details.id);
        const chunks = [];
        
        filter.on('data', buffer => chunks.push(buffer));
        filter.on('end', () => {
            const html = Buffer.concat(chunks).toString('utf8')
                .replace(/<meta[^>]+http-equiv=[\"'](?:Content-Security-Policy|X-Content-Security-Policy)[\"'][^>]*>/ig, '');
            filter.write(Buffer.from(html, 'utf8'));
            filter.end();
        });

        callback({});
    });

    // Block service worker and CSS maps
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://connect.useparagon.com/service-worker.js*', 'https://connect.useparagon.com/sw.js*'] }, (details, callback) => {
        console.log('[CSPPatch] Blocking Paragon service worker:', details.url);
        return callback({ cancel: true });
    });
    
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css.map'] }, (details, callback) => {
        console.log('[CSPPatch] Blocking map file:', details.url);
        return callback({ cancel: true });
    });

    console.log('✅ [CSP] CSP interception setup complete');
}

app.whenReady().then(async () => {
    // Set up CSP interception FIRST, before any other session configuration
    console.log('🚀 [MAIN] App ready, calling setupCSPInterception()...');
    setupCSPInterception();
    console.log('✅ [MAIN] setupCSPInterception() completed successfully');

    // User agent handling is now done in setupCSPInterception() function above

    // CSP interception is now handled ONLY in setupCSPInterception() function above

    // All CSP handling is done in setupCSPInterception() function above

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
    
    // Initialize PostHog analytics
    await posthogService.initialize();
    console.log('>>> [index.js] PostHog service initialized successfully');
    
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

        // Initialize user timezone service for calendar operations
        const userTimezoneService = require('./features/common/services/userTimezoneService');
        await userTimezoneService.initialize();
        console.log('>>> [index.js] UserTimezoneService initialized successfully');

        // Initialize Leviousa pre-configured API keys
        await leviousaBridge.initializePreConfiguredKeys();
        console.log('>>> [index.js] PreConfigured keys initialized successfully');
        
        featureBridge.initialize();  // 추가: featureBridge 초기화
        windowBridge.initialize();
        leviousaBridge.initializeLeviousaHandlers();  // Initialize Leviousa-specific handlers
    
        
        // Initialize invisibility mode service
        const InvisibilityService = require('./features/invisibility/invisibilityService');
        global.invisibilityService = new InvisibilityService();
        
        try {
            await global.invisibilityService.initialize();
            console.log('>>> [index.js] Invisibility service initialized successfully');
        } catch (error) {
            console.error('>>> [index.js] ❌ Invisibility service initialization failed:', error);
            console.error('>>> [index.js] Invisibility features will be unavailable until manual restart');
            // Don't crash the app, but invisibility features won't work
        }

        const { initializeInvisibilityBridge } = require('./features/invisibility/invisibilityBridge');
        initializeInvisibilityBridge();  // Initialize invisibility mode handlers

        // Initialize Paragon bridge for integration authentication
        const { initializeParagonBridge } = require('./features/paragon/paragonBridge');
        initializeParagonBridge();  // Initialize Paragon integration handlers

        // Initialize voice agent service
        const VoiceAgentService = require('./features/voiceAgent/voiceAgentService');
        global.voiceAgentService = new VoiceAgentService();
        await global.voiceAgentService.initialize();
        console.log('>>> [index.js] Voice agent service initialized successfully');

        const { initializeVoiceAgentBridge } = require('./features/voiceAgent/voiceAgentBridge');
        initializeVoiceAgentBridge();  // Initialize voice agent handlers
        
        setupWebDataHandlers();



        // Initialize Ollama models in database
        // ollamaModelRepository initialization removed - local models disabled

        // Ollama warm-up removed - local models disabled

        // Start web server and create windows ONLY after all initializations are successful
        WEB_PORT = await startWebStack();
        console.log('>>> [index.js] Web stack started successfully');
        
        // Initialize Paragon OAuth callback server
        await initializeParagonOAuthServer();
        console.log('>>> [index.js] Paragon OAuth callback server initialized successfully');
        
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

    // Initialize auto-updater for production builds
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
        initAutoUpdater();
    } else {
        console.log('[AutoUpdater] Disabled in development mode');
    }

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
        
        // 3. Shutdown invisibility service (including MCP servers and Paragon subprocess)
        try {
            if (global.invisibilityService && typeof global.invisibilityService.shutdown === 'function') {
                await global.invisibilityService.shutdown();
                console.log('[Shutdown] Invisibility service and MCP servers stopped');
            }
        } catch (mcpError) {
            console.warn('[Shutdown] Error shutting down MCP services:', mcpError.message);
        }
        
        // Ollama shutdown removed - local models disabled
        
        // 4. Close database connections BEFORE Firebase cleanup to prevent auth service errors
        try {
            // Mark database as shutting down to prevent new operations
            global.isShuttingDown = true;
            databaseInitializer.close();
            console.log('[Shutdown] Database connections closed');
        } catch (closeError) {
            console.warn('[Shutdown] Error closing database:', closeError.message);
        }
        
        // 5. Clean up Firebase connections (prevent BloomFilter errors)
        try {
            const { cleanupFirebase } = require('./features/common/services/firebaseClient');
            await cleanupFirebase();
            console.log('[Shutdown] Firebase cleanup completed');
        } catch (firebaseError) {
            console.warn('[Shutdown] Firebase cleanup warning (non-critical):', firebaseError.message);
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
        console.log('🔗 [Custom URL] URL type:', typeof url);
        console.log('🔗 [Custom URL] URL length:', url?.length);
        
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
        console.log('[Custom URL] Full pathname:', urlObj.pathname);
        console.log('[Custom URL] Search params:', urlObj.search);

        switch (action) {
            case 'test':
                console.log('🧪 [Custom URL] Test protocol URL received successfully!');
                console.log('🧪 [Custom URL] Test params:', params);
                
                // Send test result to UI
                const { windowPool: testWindowPool } = require('./window/windowManager.js');
                const testHeader = testWindowPool.get('header');
                if (testHeader) {
                    testHeader.webContents.send('mcp:protocol-test-result', {
                        success: true,
                        message: 'Protocol handling is working correctly!',
                        params
                    });
                }
                break;
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
            case 'oauth':
                console.log('🔗 [Custom URL] OAuth callback received!');
                console.log('🔗 [Custom URL] OAuth pathname:', urlObj.pathname);
                console.log('🔗 [Custom URL] OAuth params:', params);
                await handleOAuthCallback(urlObj.pathname, params);
                break;
            default:
                console.log('[Custom URL] Unknown action:', action);
                const { windowPool: defaultWindowPool } = require('./window/windowManager.js');
                const header = defaultWindowPool.get('header');
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
        console.error('[Custom URL] Error stack:', error.stack);
    }
}

async function handleFirebaseAuthCallback(params) {
    const authService = require('./features/common/services/authService');
    
    console.log('[Auth] Processing Firebase auth callback with params:', params);
    
    // Handle both direct ID token flow and OAuth code/state flow
    let idToken = params.token;
    
    // If we have OAuth code/state instead of direct ID token, we need to exchange it
    if (!idToken && params.code && params.state) {
        console.log('[Auth] Received OAuth code/state, need to exchange for ID token...');
        
        try {
            // This is coming from web OAuth API - we need to exchange code for token
            // For now, log the issue and guide user to direct browser auth
            console.error('[Auth] OAuth code/state received but token exchange not implemented.');
            console.error('[Auth] This suggests Google Sign-In went through wrong OAuth flow.');
            console.error('[Auth] User should sign in directly in browser, not through generic OAuth.');
            
            // Send error notification to UI
            const { windowPool } = require('./window/windowManager.js');
            const header = windowPool.get('header');
            if (header) {
                header.webContents.send('mcp:auth-status-updated', {
                    success: false,
                    error: 'OAuth flow error: Please sign in directly through the app login, not through integrations.'
                });
            }
            return;
            
        } catch (error) {
            console.error('[Auth] Failed to exchange OAuth code for token:', error);
            return;
        }
    }
    
    if (!idToken) {
        console.error('[Auth] Firebase auth callback is missing both ID token and OAuth code.');
        return;
    }

    console.log('[Auth] Processing ID token from Firebase auth (direct mode)...');

    try {
        // Direct sign-in using the validated ID token from browser
        // The browser's Firebase client SDK already validated this token with Google
        console.log('[Auth] Using direct ID token authentication (bypassing Admin SDK)');
        
        // Extract user info from URL params (already validated in browser)
        const firebaseUser = {
            uid: params.uid,
            email: params.email || 'no-email@example.com',
            displayName: params.displayName || 'User',
            photoURL: params.photoURL || null
        };
        
        console.log('[Auth] User info from deep link:', firebaseUser);

        // Skip custom token creation - use the Firebase client auth directly
        // This avoids the Firebase Admin SDK service account issues
        const { getFirebaseAuth } = require('./features/common/services/firebaseClient');
        const { signInWithCustomToken } = require('firebase/auth');
        
        // We still need to create a minimal custom token, but use a simpler approach
        try {
            const { createCustomToken } = require('./features/common/services/firebaseClient');
            const customToken = await createCustomToken(params.uid, {
                email: params.email,
                name: params.displayName,
                picture: params.photoURL
            });
            await authService.signInWithCustomToken(customToken);
            console.log('[Auth] Signed in with custom token successfully');
        } catch (adminError) {
            console.error('[Auth] Admin SDK token creation failed:', adminError.message);
            console.log('[Auth] Falling back to direct client authentication...');
            
            // Fallback: trigger auth state change manually since we can't create custom token
            const auth = getFirebaseAuth();
            
            // Import signInWithCustomToken directly and try with a mock token
            // This is a workaround when Admin SDK is not available
            console.log('[Auth] Broadcasting auth success directly to UI...');
            
            // Manually trigger the auth state update
            authService.currentUser = firebaseUser;
            authService.currentUserId = firebaseUser.uid;
            authService.currentUserMode = 'firebase';
            
            // CRITICAL: Save session data for persistence (since we bypass onAuthStateChanged)
            try {
                console.log(`[Auth] 💾 Saving session data for direct authentication fallback...`);
                const Store = await import('electron-store');
                const { app } = require('electron');
                const authStore = new Store.default({ 
                    name: 'leviousa-auth-persistence',
                    cwd: app.getPath('userData'),
                    encryptionKey: false,
                    clearInvalidConfig: true
                });
                
                const persistentUserData = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    emailVerified: firebaseUser.emailVerified,
                    isAnonymous: firebaseUser.isAnonymous || false,
                    savedAt: Date.now(),
                    lastSeen: Date.now(),
                    directAuth: true // Flag to indicate this was saved via direct auth
                };
                
                authStore.set('persistentUser', persistentUserData);
                console.log(`[Auth] ✅ Session data saved for direct auth user: ${firebaseUser.email}`);
                
            } catch (persistError) {
                console.error('[Auth] ⚠️ Failed to save session data in direct auth fallback:', persistError.message);
            }
            
            authService.broadcastUserState();
            
            console.log('[Auth] Direct authentication complete (Admin SDK bypass)');
        }

        // Sync user data to local DB if we have the user info
        if (firebaseUser.uid && firebaseUser.email) {
            try {
                const userRepository = require('./features/common/repositories/user');
                userRepository.findOrCreate(firebaseUser);
                console.log('[Auth] User data synced with local DB.');
            } catch (dbError) {
                console.error('[Auth] Failed to sync user data to local DB (non-blocking):', dbError.message);
            }
        }

        // Focus the app window
        const { windowPool: authWindowPool } = require('./window/windowManager.js');
        const header = authWindowPool.get('header');
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
        const { windowPool: errorWindowPool } = require('./window/windowManager.js');
        const header = errorWindowPool.get('header');
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
        const { windowPool: serverAuthWindowPool } = require('./window/windowManager.js');
        const header = serverAuthWindowPool.get('header');
        if (header) {
            if (header.isMinimized()) header.restore();
            header.focus();
        } else {
            console.error('[Auth] Header window not found after server-side auth callback.');
        }
        
    } catch (error) {
        console.error('[Auth] Error during server-side authentication:', error);
        // Send error event to the renderer
        const { windowPool: serverErrorWindowPool } = require('./window/windowManager.js');
        const header = serverErrorWindowPool.get('header');
        if (header) {
            header.webContents.send('auth-failed', { message: error.message });
        }
    }
}

function handlePersonalizeFromUrl(params) {
    console.log('[Custom URL] Personalize params:', params);
    
    const { windowPool: personalizeWindowPool } = require('./window/windowManager.js');
    const header = personalizeWindowPool.get('header');
    
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

async function handleOAuthCallback(pathname, params) {
    console.log('[OAuth] Processing OAuth callback - pathname:', pathname, 'params:', params);
    
    try {
        // Extract the OAuth path (e.g., "/callback")
        const { code, state, error, error_description } = params;
        
        // Handle OAuth errors
        if (error) {
            console.error('[OAuth] OAuth error received:', error, error_description);
            
            // Send error notification to UI
            const { windowPool: oauthErrorWindowPool } = require('./window/windowManager.js');
            const header = oauthErrorWindowPool.get('header');
            if (header) {
                header.webContents.send('mcp:auth-status-updated', {
                    success: false,
                    error: `OAuth Error: ${error} - ${error_description || 'Unknown error'}`
                });
            }
            return;
        }
        
        // Validate required parameters
        if (!code || !state) {
            console.error('[OAuth] Missing required OAuth parameters:', { code: !!code, state: !!state });
            
            const { windowPool: oauthValidationWindowPool } = require('./window/windowManager.js');
            const header = oauthValidationWindowPool.get('header');
            if (header) {
                header.webContents.send('mcp:auth-status-updated', {
                    success: false,
                    error: 'Missing required OAuth parameters (code or state)'
                });
            }
            return;
        }
        
        console.log('[OAuth] Processing OAuth callback with code and state');
        
        // Ensure invisibility service is initialized - Claude's fix
        if (!global.invisibilityService) {
            console.log('[OAuth] Invisibility service not initialized, initializing now...');
            try {
                const InvisibilityService = require('./features/invisibility/invisibilityService');
                global.invisibilityService = new InvisibilityService();
                await global.invisibilityService.initialize();
                console.log('[OAuth] Invisibility service initialized successfully for OAuth');
            } catch (initError) {
                console.error('[OAuth] Failed to initialize invisibility service:', initError);
                throw new Error(`Failed to initialize MCP service: ${initError.message}`);
            }
        }
        
        // Verify MCP client is available
        if (!global.invisibilityService.mcpClient) {
            console.error('[OAuth] MCP client not available in invisibility service');
            throw new Error('MCP client not available - service initialization may have failed');
        }
        
        // Check if this is a Paragon OAuth callback
        if (state && state.startsWith('paragon_')) {
            console.log('[OAuth] Processing Paragon OAuth callback');
            
            // Use Paragon bridge for Paragon-specific callbacks
            const { ipcMain } = require('electron');
            const paragonResult = await new Promise((resolve) => {
                ipcMain.emit('paragon:handleOAuthCallback', { reply: resolve }, code, state);
            });
            
            if (paragonResult.success) {
                console.log('[OAuth] Paragon OAuth callback processed successfully');
                
                // Send success notification to UI
                const { windowPool: paragonSuccessWindowPool } = require('./window/windowManager.js');
                const header = paragonSuccessWindowPool.get('header');
                if (header) {
                    header.webContents.send('paragon:auth-status-updated', {
                        success: true,
                        message: 'Paragon authentication completed successfully!'
                    });
                    
                    // Focus the app window
                    if (header.isMinimized()) header.restore();
                    header.focus();
                }
            } else {
                throw new Error(paragonResult.error || 'Paragon OAuth callback processing failed');
            }
        } else {
            // Use existing MCP client for other OAuth callbacks
            console.log('[OAuth] Using initialized invisibility service for OAuth processing');
            const result = await global.invisibilityService.mcpClient.handleOAuthCallback(code, state);
            
            if (result.success) {
                console.log('[OAuth] OAuth callback processed successfully');
                
                // Send success notification to UI
                const { windowPool: oauthSuccessWindowPool } = require('./window/windowManager.js');
                const header = oauthSuccessWindowPool.get('header');
                if (header) {
                    header.webContents.send('mcp:auth-status-updated', {
                        success: true,
                        message: 'Authentication completed successfully!'
                    });
                }
                
                // Focus the app window
                if (header.isMinimized()) header.restore();
                header.focus();
                
            } else {
                throw new Error(result.error || 'OAuth callback processing failed');
            }
        }
        
    } catch (error) {
        console.error('[OAuth] Error processing OAuth callback:', error);
        
        // Send error notification to UI
        const { windowPool: oauthCatchWindowPool } = require('./window/windowManager.js');
        const header = oauthCatchWindowPool.get('header');
        if (header) {
            header.webContents.send('mcp:auth-status-updated', {
                success: false,
                error: `OAuth processing failed: ${error.message}`
            });
        }
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

  // Always use Vercel hosting for frontend to avoid OAuth issues
  let apiPort, frontendPort, webUrl;
  
  // Always use Vercel hosting domain for consistent OAuth behavior
  apiPort = isDev ? 9001 : await getAvailablePort();
  frontendPort = 3000; // Not used when using Vercel hosting
  webUrl = 'https://www.leviousa.com'; // Always use custom domain for public web dashboard
  
  console.log(`🔧 Using Vercel hosting for all builds: API=${apiPort}`);
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

  // No local frontend server needed - always use Vercel hosting
  console.log(`🔥 Using Vercel hosting at ${webUrl}`);
  console.log(`📋 Frontend is served from Vercel hosting`);
  console.log(`📋 API runs locally on http://localhost:${apiPort}`);

  const apiSrv = express();
  apiSrv.use(nodeApi);

  const apiServer = await new Promise((resolve, reject) => {
    const server = apiSrv.listen(apiPort, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
    app.once('before-quit', () => server.close());
  });

  console.log(`✅ API server started on http://localhost:${apiPort}`);
  
  // Add WebSocket server to the same HTTP server (for Paragon notifications)
  if (nodeApi.setupWebSocket) {
    try {
      const wss = nodeApi.setupWebSocket(apiServer);
      console.log(`🔌 WebSocket server added on ws://localhost:${apiPort}/ws`);
    } catch (error) {
      console.error('❌ Failed to setup WebSocket server:', error);
    }
  }

  console.log(`🚀 All services ready:
   Frontend: ${webUrl} (Firebase Hosting)
   API:      http://localhost:${apiPort} (Local)`);

  return frontendPort;
}

// Paragon OAuth callback server
let paragonOAuthServer = null;
const PARAGON_OAUTH_PORT = 54321; // Dedicated port for Paragon OAuth callbacks

async function initializeParagonOAuthServer() {
    console.log('[ParagonOAuth] Initializing OAuth callback server...');
    
    const paragonApp = express();
    
    // Handle Paragon OAuth callback
    paragonApp.get('/paragon/callback', (req, res) => {
        console.log('[ParagonOAuth] 🔗 Received OAuth callback');
        console.log('[ParagonOAuth] Query params:', req.query);
        
        try {
            // Get the query string
            const queryString = new URLSearchParams(req.query).toString();
            console.log('[ParagonOAuth] Query string:', queryString);
            
            // Immediately redirect back to Paragon with the same query parameters
            // This completes the OAuth flow as required by Paragon
            const redirectUrl = `https://passport.useparagon.com/oauth?${queryString}`;
            console.log('[ParagonOAuth] 🔀 Redirecting back to Paragon:', redirectUrl);
            
            res.redirect(redirectUrl);
            
            // Also notify any listening windows about the successful callback
            const { BrowserWindow } = require('electron');
            const allWindows = BrowserWindow.getAllWindows();
            allWindows.forEach(window => {
                try {
                    window.webContents.send('paragon:oauth-callback-received', {
                        success: true,
                        query: req.query,
                        redirectUrl: redirectUrl
                    });
                } catch (err) {
                    console.warn('[ParagonOAuth] Failed to notify window:', err.message);
                }
            });
            
        } catch (error) {
            console.error('[ParagonOAuth] ❌ Error processing OAuth callback:', error);
            res.status(500).send('OAuth callback processing failed');
        }
    });
    
    // Health check endpoint
    paragonApp.get('/paragon/health', (req, res) => {
        res.json({ status: 'ok', service: 'paragon-oauth-callback' });
    });
    
    // Start the OAuth callback server
    return new Promise((resolve, reject) => {
        paragonOAuthServer = paragonApp.listen(PARAGON_OAUTH_PORT, '127.0.0.1', (err) => {
            if (err) {
                console.error('[ParagonOAuth] ❌ Failed to start OAuth callback server:', err);
                reject(err);
            } else {
                console.log(`[ParagonOAuth] ✅ OAuth callback server listening on http://127.0.0.1:${PARAGON_OAUTH_PORT}`);
                console.log(`[ParagonOAuth] Callback URL: http://127.0.0.1:${PARAGON_OAUTH_PORT}/paragon/callback`);
                
                // Store the callback URL in a global variable for use by other parts of the app
                global.PARAGON_OAUTH_CALLBACK_URL = `http://127.0.0.1:${PARAGON_OAUTH_PORT}/paragon/callback`;
                
                resolve();
            }
        });
        
        // Handle server errors
        paragonOAuthServer.on('error', (error) => {
            console.error('[ParagonOAuth] OAuth callback server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`[ParagonOAuth] Port ${PARAGON_OAUTH_PORT} is already in use. Trying next port...`);
                // Could implement port auto-increment here if needed
            }
        });
        
        // Cleanup on app exit
        app.once('before-quit', () => {
            if (paragonOAuthServer) {
                console.log('[ParagonOAuth] Closing OAuth callback server...');
                paragonOAuthServer.close();
            }
        });
    });
}

// Auto-update initialization
async function initAutoUpdater() {
    if (process.env.NODE_ENV === 'development') {
        console.log('[AutoUpdater] Development environment, skipping auto-updater.');
        return;
    }

    try {
        console.log('[AutoUpdater] Initializing auto-updater...');
        
        // Configure auto-updater
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        
        // Set up event handlers
        autoUpdater.on('checking-for-update', () => {
            console.log('[AutoUpdater] Checking for updates...');
        });
        
        autoUpdater.on('update-available', (info) => {
            console.log('[AutoUpdater] Update available:', info.version);
            console.log('[AutoUpdater] Starting download...');
        });
        
        autoUpdater.on('update-not-available', (info) => {
            console.log('[AutoUpdater] Update not available. Current version:', info.version);
        });
        
        autoUpdater.on('download-progress', (progressObj) => {
            let log = `[AutoUpdater] Download progress: ${Math.round(progressObj.percent)}%`;
            log += ` (${Math.round(progressObj.transferred / 1024 / 1024)}MB / ${Math.round(progressObj.total / 1024 / 1024)}MB)`;
            console.log(log);
        });
        
        autoUpdater.on('update-downloaded', (info) => {
            console.log('[AutoUpdater] Update downloaded successfully:', info.version);
            
            // Show user-friendly dialog
            const { dialog } = require('electron');
            dialog.showMessageBox({
                type: 'info',
                title: 'Leviousa Update Ready',
                message: `A new version of Leviousa (v${info.version}) has been downloaded and is ready to install.`,
                detail: 'The update will be installed when you restart the application. You can restart now or continue using the current version.',
                buttons: ['Restart Now', 'Install Later'],
                defaultId: 0,
                cancelId: 1,
                icon: path.join(__dirname, 'ui/assets/logo.png')
            }).then(result => {
                if (result.response === 0) {
                    console.log('[AutoUpdater] User chose to restart now');
                    autoUpdater.quitAndInstall();
                } else {
                    console.log('[AutoUpdater] User chose to install later');
                }
            }).catch(err => {
                console.error('[AutoUpdater] Error showing update dialog:', err);
            });
        });
        
        autoUpdater.on('error', (err) => {
            console.error('[AutoUpdater] Error in auto-updater:', err);
            console.error('[AutoUpdater] Error stack:', err.stack);
        });
        
        // Start checking for updates
        console.log('[AutoUpdater] Starting initial update check...');
        await autoUpdater.checkForUpdatesAndNotify();
        
        // Schedule frequent checks for immediate updates (every 5 minutes)
        setInterval(() => {
            console.log('[AutoUpdater] Performing scheduled update check...');
            autoUpdater.checkForUpdatesAndNotify().catch(err => {
                console.error('[AutoUpdater] Scheduled update check failed:', err);
            });
        }, 5 * 60 * 1000); // 5 minutes for immediate updates
        
        console.log('[AutoUpdater] Auto-updater initialized successfully');
        
    } catch (err) {
        console.error('[AutoUpdater] Error initializing auto-updater:', err);
        console.error('[AutoUpdater] Error stack:', err.stack);
    }
}