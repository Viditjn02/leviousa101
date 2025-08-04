const { ipcMain } = require('electron');
const authService = require('../common/services/authService');

function initializeInvisibilityBridge() {
    console.log('[InvisibilityBridge] Initializing IPC handlers');

    // Get invisibility service instance
    const getInvisibilityService = () => {
        return global.invisibilityService;
    };

    // Enable/disable invisibility mode
    ipcMain.handle('invisibility:enable', async () => {
        try {
            const service = getInvisibilityService();
            if (!service) {
                return { success: false, error: 'Invisibility service not available' };
            }
            
            await service.enableInvisibilityMode();
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error enabling invisibility mode:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('invisibility:disable', async () => {
        try {
            const service = getInvisibilityService();
            if (!service) {
                return { success: false, error: 'Invisibility service not available' };
            }
            
            await service.disableInvisibilityMode();
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error disabling invisibility mode:', error);
            return { success: false, error: error.message };
        }
    });

    // Get status
    ipcMain.handle('invisibility:getStatus', async () => {
        try {
            const service = getInvisibilityService();
            if (!service) {
                return { 
                    success: false, 
                    error: 'Invisibility service not available',
                    status: {
                        isInvisibilityModeActive: false,
                        isMonitoring: false,
                        isProcessingQuestion: false,
                        lastRemoteAccessState: false
                    }
                };
            }
            
            const status = service.getStatus();
            return { success: true, status };
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting status:', error);
            return { success: false, error: error.message };
        }
    });

    // Update configuration
    ipcMain.handle('invisibility:updateConfig', async (event, newConfig) => {
        try {
            const service = getInvisibilityService();
            if (!service) {
                return { success: false, error: 'Invisibility service not available' };
            }
            
            service.updateConfig(newConfig);
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // Manual trigger for question processing
    ipcMain.handle('invisibility:processQuestion', async () => {
        try {
            const service = getInvisibilityService();
            if (!service) {
                return { success: false, error: 'Invisibility service not available' };
            }
            
            await service.processQuestionAndAnswer();
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error processing question:', error);
            return { success: false, error: error.message };
        }
    });

    // Test methods for debugging
    ipcMain.handle('invisibility:testQuestionDetection', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.questionDetector) {
                return { success: false, error: 'Question detector not available' };
            }
            
            const testText = "What is the time complexity of binary search algorithm?";
            const result = await service.questionDetector.testQuestionDetection(testText);
            return { success: true, result };
        } catch (error) {
            console.error('[InvisibilityBridge] Error testing question detection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('invisibility:testFieldDetection', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.fieldFinder) {
                return { success: false, error: 'Field finder not available' };
            }
            
            const result = await service.fieldFinder.testFieldDetection();
            return { success: true, result };
        } catch (error) {
            console.error('[InvisibilityBridge] Error testing field detection:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('invisibility:testTyping', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.humanTyper) {
                return { success: false, error: 'Human typer not available' };
            }
            
            await service.humanTyper.testTyping();
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error testing typing:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('invisibility:testAnswerGeneration', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                return { success: false, error: 'MCP client not available' };
            }
            
            const result = await service.mcpClient.testAnswerGeneration();
            return { success: true, result };
        } catch (error) {
            console.error('[InvisibilityBridge] Error testing answer generation:', error);
            return { success: false, error: error.message };
        }
    });

    // Remote access detection test
    ipcMain.handle('invisibility:testRemoteAccessDetection', async () => {
        try {
            const service = getInvisibilityService();
            if (!service) {
                return { success: false, error: 'Invisibility service not available' };
            }
            
            const isRemoteAccess = await service.detectRemoteAccess();
            return { 
                success: true, 
                remoteAccessDetected: isRemoteAccess,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[InvisibilityBridge] Error testing remote access detection:', error);
            return { success: false, error: error.message };
        }
    });

    // Enhanced MCP server management with authentication
    ipcMain.handle('mcp:getServerStatus', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                return { servers: {}, availableServers: [], tools: [] };
            }
            
            const serverStatus = service.mcpClient.getServerStatus();
            const authStatus = service.mcpClient.getAuthenticationStatus();
            
            // Check which OAuth credentials are configured
            const requiredCredentials = [
                'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
                'NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET', 
                'SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET',
                'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'
            ];
            
            const configuredCredentials = {};
            requiredCredentials.forEach(cred => {
                configuredCredentials[cred] = !!(process.env[cred] && process.env[cred].trim());
            });
            
            return {
                ...serverStatus,
                authentication: {
                    ...authStatus,
                    configuredCredentials
                }
            };
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting server status:', error.message);
            return { error: error.message };
        }
    });

    // Disconnect service handler
    ipcMain.handle('mcp:disconnectService', async (event, serviceName) => {
        try {
            console.log(`[InvisibilityBridge] 🔄 Disconnecting service: ${serviceName}`);
            
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const result = await service.mcpClient.disconnectService(serviceName);
            console.log(`[InvisibilityBridge] 📥 Disconnect result for ${serviceName}:`, result);
            
            return result;
        } catch (error) {
            console.error(`[InvisibilityBridge] ❌ Error disconnecting service ${serviceName}:`, error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    });

    // Authentication and configuration management
    ipcMain.handle('mcp:setupExternalService', async (event, serviceName, authType = 'oauth') => {
        try {
            console.log(`[InvisibilityBridge] 🔄 Setting up external service: ${serviceName} (authType: ${authType})`);
            
            const service = getInvisibilityService();
            if (!service) {
                console.error('[InvisibilityBridge] ❌ Invisibility service not available');
                throw new Error('Invisibility service not available');
            }
            
            if (!service.mcpClient) {
                console.error('[InvisibilityBridge] ❌ MCP client not available');
                throw new Error('MCP client not available');
            }
            
            console.log(`[InvisibilityBridge] 📡 Calling mcpClient.setupExternalService...`);
            const result = await service.mcpClient.setupExternalService(serviceName, authType);
            console.log(`[InvisibilityBridge] 📥 Setup result for ${serviceName}:`, result);
            
            // If this returns an OAuth URL, also test protocol handling
            if (result.requiresAuth && result.authUrl) {
                console.log(`[InvisibilityBridge] 🔗 Testing protocol handling before OAuth flow...`);
                const protocolTest = await testProtocolHandling();
                if (!protocolTest.success) {
                    console.warn(`[InvisibilityBridge] ⚠️ Protocol handling test failed:`, protocolTest.error);
                    result.protocolWarning = `Custom protocol handling may not work properly: ${protocolTest.error}`;
                }
            }
            
            return result;
        } catch (error) {
            console.error(`[InvisibilityBridge] ❌ Error setting up external service ${serviceName}:`, error);
            console.error(`[InvisibilityBridge] 📋 Error details:`, {
                message: error.message,
                stack: error.stack,
                serviceName,
                authType
            });
            
            return { 
                success: false, 
                error: error.message,
                details: {
                    serviceName,
                    authType,
                    originalError: error.message
                }
            };
        }
    });

    // Add protocol testing handler for debugging
    ipcMain.handle('mcp:testProtocolHandling', async () => {
        try {
            console.log('[InvisibilityBridge] 🧪 Testing protocol handling...');
            
            // Test if the protocol is registered
            const { app } = require('electron');
            const isRegistered = app.isDefaultProtocolClient('leviousa');
            console.log('[InvisibilityBridge] 🔍 Protocol registered:', isRegistered);
            
            // Create a test URL and try to open it
            const testUrl = 'leviousa://test?source=protocol-test&timestamp=' + Date.now();
            console.log('[InvisibilityBridge] 🔗 Test URL:', testUrl);
            
            const { shell } = require('electron');
            await shell.openExternal(testUrl);
            
            return {
                success: true,
                isRegistered,
                testUrl,
                message: 'Protocol test initiated - check logs for protocol handler activity'
            };
        } catch (error) {
            console.error('[InvisibilityBridge] 🧪 Protocol test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('mcp:handleOAuthCallback', async (event, code, state) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const result = await service.mcpClient.handleOAuthCallback(code, state);
            
            // Notify all windows of authentication status update
            const allWindows = require('electron').BrowserWindow.getAllWindows();
            allWindows.forEach(window => {
                window.webContents.send('mcp:auth-status-updated', result);
            });
            
            return result;
        } catch (error) {
            console.error('[InvisibilityBridge] Error handling OAuth callback:', error.message);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('mcp:setCredential', async (event, key, value) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            await service.mcpClient.setCredential(key, value);
            
            // Notify all windows of credential update
            const allWindows = require('electron').BrowserWindow.getAllWindows();
            allWindows.forEach(window => {
                window.webContents.send('mcp:credential-updated', { key });
            });
            
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error setting credential:', error.message);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('mcp:removeCredential', async (event, key) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            await service.mcpClient.removeCredential(key);
            
            // Notify all windows of credential removal
            const allWindows = require('electron').BrowserWindow.getAllWindows();
            allWindows.forEach(window => {
                window.webContents.send('mcp:credential-removed', { key });
            });
            
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error removing credential:', error.message);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('mcp:getSupportedServices', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                return {};
            }
            
            const supportedServices = service.mcpClient.getSupportedServices();
            
            // Serialize the configuration by removing functions and making it IPC-safe
            const serializedServices = {};
            
            for (const [serviceName, config] of Object.entries(supportedServices)) {
                serializedServices[serviceName] = {
                    name: config.name,
                    command: config.command,
                    args: config.args,
                    requires_oauth: config.requires_oauth,
                    oauth_provider: config.oauth_provider,
                    oauth_service: config.oauth_service,
                    setup_instructions: config.setup_instructions,
                    // Convert env functions to descriptive strings
                    env: config.env ? Object.keys(config.env).reduce((acc, key) => {
                        acc[key] = typeof config.env[key] === 'function' ? 
                            '<credential_resolver>' : config.env[key];
                        return acc;
                    }, {}) : {}
                };
            }
            
            return serializedServices;
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting supported services:', error.message);
            return {};
        }
    });

    ipcMain.handle('mcp:getRegistryServices', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient || !service.mcpClient.oauthManager || !service.mcpClient.oauthManager.configManager) {
                return null;
            }
            
            // Get the full OAuth services registry
            const registry = service.mcpClient.oauthManager.configManager.getOAuthServicesRegistry();
            
            if (!registry) {
                console.log('[InvisibilityBridge] OAuth services registry not loaded');
                return null;
            }
            
            return registry;
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting registry services:', error.message);
            return null;
        }
    });

    ipcMain.handle('mcp:getAuthenticationStatus', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                return { 
                    pendingAuthentications: [], 
                    configurationIssues: [], 
                    hasValidConfig: false 
                };
            }
            
            return service.mcpClient.getAuthenticationStatus();
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting authentication status:', error.message);
            return { 
                pendingAuthentications: [], 
                configurationIssues: [error.message], 
                hasValidConfig: false 
            };
        }
    });

    // OAuth flow helpers
    ipcMain.handle('mcp:openOAuthWindow', async (event, authUrl, provider, service) => {
        try {
            console.log(`[InvisibilityBridge] 🚀 Opening OAuth window for ${provider}:${service}`);
            console.log(`[InvisibilityBridge] 🔗 OAuth URL:`, authUrl);
            
            // Validate inputs
            if (!authUrl || typeof authUrl !== 'string') {
                throw new Error(`Invalid OAuth URL: ${authUrl}`);
            }
            
            if (!authUrl.startsWith('http://') && !authUrl.startsWith('https://')) {
                throw new Error(`OAuth URL must be HTTP/HTTPS: ${authUrl}`);
            }
            
            if (!provider || !service) {
                throw new Error(`Provider and service are required: ${provider}, ${service}`);
            }
            
            const { shell } = require('electron');
            
            console.log(`[InvisibilityBridge] 📡 Calling shell.openExternal...`);
            
            // Open OAuth URL in default browser
            // If this is Paragon Connect Portal, create a proper OAuth window with modified user agent
            if (authUrl.includes('passport.useparagon.com') || authUrl.includes('connect.useparagon.com')) {
                console.log(`[InvisibilityBridge] 🌐 Creating OAuth window for Paragon Connect Portal for ${service}`);
                const { BrowserWindow } = require('electron');
                
                // Create a new browser window specifically for Paragon OAuth
                const oauthWindow = new BrowserWindow({
                    width: 500,
                    height: 700,
                    show: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        enableRemoteModule: false,
                        webSecurity: true
                    },
                    title: `Connect ${service}`,
                    modal: true,
                    parent: BrowserWindow.getAllWindows()[0]
                });
                
                // Set user agent to avoid Electron detection by Paragon Connect Portal
                // This prevents the "this browser or app may not be secure" error
                const originalUserAgent = oauthWindow.webContents.getUserAgent();
                const chromeUserAgent = originalUserAgent.replace(/Electron\/[^\s]+\s/, '').replace(/leviousa\/[^\s]+\s/, '');
                oauthWindow.webContents.setUserAgent(chromeUserAgent);
                
                console.log(`[InvisibilityBridge] 🔧 Original UA: ${originalUserAgent}`);
                console.log(`[InvisibilityBridge] 🔧 Modified UA: ${chromeUserAgent}`);
                
                // Load the Paragon Connect Portal
                oauthWindow.loadURL(authUrl);
                
                // Handle the OAuth callback by listening for navigation to callback URL
                oauthWindow.webContents.on('will-navigate', (event, navigationUrl) => {
                    console.log(`[InvisibilityBridge] 🔄 Navigation to: ${navigationUrl}`);
                    
                    if (navigationUrl.includes('127.0.0.1:54321/paragon/callback')) {
                        console.log(`[InvisibilityBridge] ✅ OAuth callback detected for ${service}`);
                        // Close the OAuth window
                        oauthWindow.close();
                        
                        // The callback will be handled by our callback server
                        event.preventDefault();
                    }
                });
                
                // Handle window closed
                oauthWindow.on('closed', () => {
                    console.log(`[InvisibilityBridge] 🔒 OAuth window closed for ${service}`);
                });
                
                return {
                    success: true,
                    message: `Paragon Connect Portal OAuth window opened for ${service}`
                };
            }
            // Fallback for non-Paragon OAuth
            const openResult = await shell.openExternal(authUrl);
            console.log(`[InvisibilityBridge] 📥 shell.openExternal result:`, openResult);
            console.log(`[InvisibilityBridge] ✅ OAuth URL opened successfully in browser`);
            return { 
                success: true, 
                message: `OAuth flow started for ${provider}:${service}`,
                url: authUrl 
            };
            
        } catch (error) {
            console.error(`[InvisibilityBridge] ❌ Error opening OAuth window for ${provider}:${service}:`, error);
            console.error(`[InvisibilityBridge] 📋 Error details:`, {
                message: error.message,
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
                stack: error.stack
            });
            
            return { 
                success: false, 
                error: `Failed to open OAuth URL: ${error.message}`,
                details: {
                    url: authUrl,
                    provider,
                    service,
                    originalError: error.message
                }
            };
        }
    });

    // Configuration validation and management
    ipcMain.handle('mcp:validateConfiguration', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                return { valid: false, issues: ['MCP client not available'] };
            }
            
            const authStatus = service.mcpClient.getAuthenticationStatus();
            return {
                valid: authStatus.hasValidConfig,
                issues: authStatus.configurationIssues,
                pendingAuth: authStatus.pendingAuthentications
            };
        } catch (error) {
            console.error('[InvisibilityBridge] Error validating configuration:', error.message);
            return { valid: false, issues: [error.message] };
        }
    });

    // Server management with authentication
    ipcMain.handle('mcp:addServer', async (event, serverName, serverConfig) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient || !service.mcpClient.configManager) {
                throw new Error('MCP configuration manager not available');
            }
            
            service.mcpClient.configManager.addServer(serverName, serverConfig);
            await service.mcpClient.configManager.saveConfiguration();
            
            // Notify all windows of server addition
            const allWindows = require('electron').BrowserWindow.getAllWindows();
            allWindows.forEach(window => {
                window.webContents.send('mcp:server-added', { serverName, serverConfig });
            });
            
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error adding server:', error.message);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('mcp:removeServer', async (event, serverName) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient || !service.mcpClient.configManager) {
                throw new Error('MCP configuration manager not available');
            }
            
            service.mcpClient.configManager.removeServer(serverName);
            await service.mcpClient.configManager.saveConfiguration();
            
            // Notify all windows of server removal
            const allWindows = require('electron').BrowserWindow.getAllWindows();
            allWindows.forEach(window => {
                window.webContents.send('mcp:server-removed', { serverName });
            });
            
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error removing server:', error.message);
            return { success: false, error: error.message };
        }
    });

    // Add manual OAuth processing for debugging/fallback
    ipcMain.handle('mcp:processOAuthManually', async (event, code, state) => {
        try {
            console.log('[InvisibilityBridge] 🔧 Processing OAuth manually with code:', code?.substring(0, 10) + '...', 'state:', state);
            
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP service not available for manual OAuth processing');
            }
            
            const result = await service.mcpClient.handleOAuthCallback(code, state);
            
            if (result.success) {
                console.log('[InvisibilityBridge] ✅ Manual OAuth processing successful');
                return {
                    success: true,
                    message: 'OAuth processed successfully via manual method',
                    data: result
                };
            } else {
                throw new Error(result.error || 'Manual OAuth processing failed');
            }
        } catch (error) {
            console.error('[InvisibilityBridge] ❌ Manual OAuth processing failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // OAuth callback server management
    ipcMain.handle('mcp:startOAuthServer', async () => {
        try {
            if (!global.invisibilityService?.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const port = await global.invisibilityService.mcpClient.startOAuthCallbackServer();
            console.log(`[Invisibility Bridge] OAuth server started on port ${port}`);
            return port;
        } catch (error) {
            console.error('[Invisibility Bridge] Failed to start OAuth server:', error);
            throw error;
        }
    });

    ipcMain.handle('mcp:stopOAuthServer', async () => {
        try {
            if (global.invisibilityService?.mcpClient) {
                await global.invisibilityService.mcpClient.stopOAuthCallbackServer();
                console.log('[Invisibility Bridge] OAuth server stopped');
            }
        } catch (error) {
            console.error('[Invisibility Bridge] Failed to stop OAuth server:', error);
            throw error;
        }
    });

    ipcMain.handle('mcp:generateOAuthUrl', async (event, { provider, service, scopes = [] }) => {
        try {
            if (!global.invisibilityService?.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const configManager = global.invisibilityService.mcpClient.configManager;
            if (!configManager) {
                throw new Error('MCP config manager not available');
            }
            
            const oauthUrl = configManager.generateOAuthUrl(provider, service, scopes);
            console.log(`[Invisibility Bridge] Generated OAuth URL for ${provider}:${service}:`, oauthUrl);
            return oauthUrl;
        } catch (error) {
            console.error('[Invisibility Bridge] Failed to generate OAuth URL:', error);
            throw error;
        }
    });
    
    // Tool operations - handled by leviousaBridge.js
    
    ipcMain.handle('mcp:getAvailableTools', async () => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const tools = service.mcpClient.toolRegistry.getAllTools();
            return { success: true, tools };
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting available tools:', error);
            return { success: false, error: error.message };
        }
    });

    // Events forwarding (from service to renderer)
    const service = getInvisibilityService();
    if (service) {
        // Forward service events to all windows
        const { BrowserWindow } = require('electron');
        
        service.on('invisibility-mode-enabled', () => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('invisibility:mode-enabled');
                }
            });
        });

        service.on('invisibility-mode-disabled', () => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('invisibility:mode-disabled');
                }
            });
        });

        service.on('remote-access-detected', () => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('invisibility:remote-access-detected');
                }
            });
        });

        service.on('remote-access-ended', () => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('invisibility:remote-access-ended');
                }
            });
        });

        service.on('overlay-hidden', (data) => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('invisibility:overlay-hidden', data);
                }
            });
        });

        service.on('overlay-shown', (data) => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('invisibility:overlay-shown', data);
                }
            });
        });

        service.on('config-updated', (config) => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('invisibility:config-updated', config);
                }
            });
        });

        // MCP server events
        if (service.mcpClient) {
            service.mcpClient.on('serversUpdated', (status) => {
                BrowserWindow.getAllWindows().forEach(window => {
                    if (!window.isDestroyed()) {
                        window.webContents.send('mcp:servers-updated', status);
                    }
                });
            });

            // OAuth authentication events
            service.mcpClient.on('authSuccess', (authResult) => {
                console.log('[InvisibilityBridge] OAuth authentication successful, notifying UI:', authResult);
                BrowserWindow.getAllWindows().forEach(window => {
                    if (!window.isDestroyed()) {
                        window.webContents.send('mcp:auth-status-updated', authResult);
                    }
                });
            });
        }
        
        // Initialize MCP UI Bridge
        let mcpUIBridge = null;
        try {
            const mcpUIModule = require('../mcp-ui/services/MCPUIBridge');
            mcpUIBridge = mcpUIModule.default || mcpUIModule.mcpUIBridge;
            
            // Connect MCPUIBridge to MCP client
            if (service.mcpClient && mcpUIBridge) {
                mcpUIBridge.initialize(service.mcpClient);
                console.log('[InvisibilityBridge] MCP UI Bridge initialized');
                
                // Listen for UI resource events from MCP client
                service.mcpClient.on('ui-resource-received', (event) => {
                    const { toolName, result } = event;
                    
                    // Register the resource with the UI bridge
                    if (result && result.resource) {
                        const resourceId = mcpUIBridge.registerUIResource(
                            toolName.split('.')[0], // Extract server name
                            toolName,
                            result.resource
                        );
                        
                        // Notify all windows about new UI resource
                        BrowserWindow.getAllWindows().forEach(window => {
                            if (!window.isDestroyed()) {
                                window.webContents.send('mcp:ui-resource-available', {
                                    resourceId,
                                    toolName,
                                    resource: result.resource
                                });
                            }
                        });
                    }
                });
            }
            
            // Listen for UI resource events from MCP UI Integration Service
            if (service.mcpUIIntegration) {
                service.mcpUIIntegration.on('ui-resource-ready', (data) => {
                    console.log('[InvisibilityBridge] UI resource ready:', data);
                    // Register resource in the MCP UI Bridge
                    try {
                      const { default: mcpUIBridge } = require('../mcp-ui/services/MCPUIBridge');
                      mcpUIBridge.registerUIResource(data.serverId, data.tool, data.resource);
                    } catch (e) {
                      console.error('[InvisibilityBridge] Error registering UI resource with bridge:', e);
                    }

                    // Forward to all windows
                    BrowserWindow.getAllWindows().forEach(window => {
                        if (!window.isDestroyed()) {
                            // Strip non-serializable fields before IPC
                            const { onAction, ...payload } = data;
                            // Only send to AskView and other relevant windows, not all of them
                            if (window.title !== 'Main Header') {
                              window.webContents.send('mcp:ui-resource-available', payload);
                            }
                        }
                    });
                });
            }
        } catch (error) {
            console.warn('[InvisibilityBridge] MCP UI Bridge initialization failed:', error.message);
            console.log('[InvisibilityBridge] MCP UI features will be disabled');
        }
    }

    // MCP UI IPC handlers
    ipcMain.handle('mcp:ui:getActiveResources', async () => {
        try {
            const mcpUIModule = require('../mcp-ui/services/MCPUIBridge');
            const mcpUIBridge = mcpUIModule.default || mcpUIModule.mcpUIBridge;
            
            if (!mcpUIBridge) {
                return { success: false, error: 'MCP UI Bridge not available' };
            }
            
            const resources = mcpUIBridge.getActiveUIResources();
            return { success: true, resources };
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting UI resources:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('mcp:ui:invokeAction', async (event, actionData) => {
        try {
            const mcpUIModule = require('../mcp-ui/services/MCPUIBridge');
            const mcpUIBridge = mcpUIModule.default || mcpUIModule.mcpUIBridge;
            
            if (!mcpUIBridge) {
                return { success: false, error: 'MCP UI Bridge not available' };
            }
            
            const { serverId, tool, params } = actionData;
            
            // Invoke the tool through MCP
            const result = await mcpUIBridge.invokeMCPTool(serverId, tool, params);
            
            return { success: true, result };
        } catch (error) {
            console.error('[InvisibilityBridge] Error invoking UI action:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('mcp:ui:removeResource', async (event, resourceId) => {
        try {
            const mcpUIModule = require('../mcp-ui/services/MCPUIBridge');
            const mcpUIBridge = mcpUIModule.default || mcpUIModule.mcpUIBridge;
            
            if (!mcpUIBridge) {
                return { success: false, error: 'MCP UI Bridge not available' };
            }
            
            mcpUIBridge.removeUIResource(resourceId);
            
            // Notify all windows about resource removal
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('mcp:ui-resource-removed', { resourceId });
                }
            });
            
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] Error removing UI resource:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('mcp:ui:getToolUICapabilities', async (event, toolName) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const toolRegistry = service.mcpClient.toolRegistry;
            if (!toolRegistry) {
                throw new Error('Tool registry not available');
            }
            
            const capabilities = toolRegistry.getToolUICapabilities(toolName);
            const supportsUI = toolRegistry.toolSupportsUI(toolName);
            
            return { 
                success: true, 
                supportsUI,
                capabilities 
            };
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting tool UI capabilities:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('mcp:ui:getContextualActions', async (event, context) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpUIIntegration) {
                throw new Error('MCP UI Integration not available');
            }
            
            // Use async method for LLM-based classification
            const actions = await service.mcpUIIntegration.getContextualActions(context);
            return { success: true, actions };
        } catch (error) {
            console.error('[InvisibilityBridge] Error getting contextual actions:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('mcp:ui:executeAction', async (event, actionId, context) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpUIIntegration) {
                throw new Error('MCP UI Integration not available');
            }
            
            const result = await service.mcpUIIntegration.executeAction(actionId, context);
            return { success: true, result };
        } catch (error) {
            console.error('[InvisibilityBridge] Error executing action:', error);
            return { success: false, error: error.message };
        }
    });

    // Paragon Service Management IPC handlers
    ipcMain.handle('mcp:getParagonServiceStatus', async () => {
        try {
            console.log('[InvisibilityBridge] 🚀 Getting Paragon service status...');
            
            // Get the current state of individual Paragon services by calling the MCP tool
            if (service?.mcpClient) {
                try {
                    // Get the current authenticated user ID to check proper authentication status
                    const statusRealUserId = authService.getCurrentUserId();
                    // Try to get real user ID from Firebase auth or use email as fallback
        let userIdForCheck = statusRealUserId;
        
        if (!userIdForCheck) {
            // Try Firebase auth first
            try {
                const authService = require('../common/services/authService');
                const currentUser = await authService.getCurrentUser();
                if (currentUser && currentUser.uid) {
                    userIdForCheck = currentUser.uid;
                    console.log(`[InvisibilityBridge] 🔍 Using Firebase user ID: ${userIdForCheck}`);
                } else if (currentUser && currentUser.email) {
                    userIdForCheck = currentUser.email;
                    console.log(`[InvisibilityBridge] 🔍 Using Firebase email as user ID: ${userIdForCheck}`);
                }
            } catch (authError) {
                console.log(`[InvisibilityBridge] ⚠️ Could not get Firebase user:`, authError.message);
            }
            
            // Final fallback to default-user
            if (!userIdForCheck) {
                userIdForCheck = 'default-user';
                console.log(`[InvisibilityBridge] ⚠️ Using fallback user ID: ${userIdForCheck}`);
            }
        }
                    
                    console.log(`[InvisibilityBridge] 📡 Calling get_authenticated_services tool for user: ${userIdForCheck}...`);
                    console.log(`[InvisibilityBridge] 🔍 DEBUG: User ID being sent to Paragon API: "${userIdForCheck}"`);
                    const authResult = await service.mcpClient.callTool('get_authenticated_services', { user_id: userIdForCheck });
                    console.log('[InvisibilityBridge] 📥 get_authenticated_services result:', authResult);
                    
                    if (authResult && authResult.content && authResult.content[0] && authResult.content[0].text) {
                        try {
                            // Parse the nested response structure
                            let servicesData;
                            const responseText = authResult.content[0].text;
                            
                            try {
                                const mcpResponse = JSON.parse(responseText);
                                if (mcpResponse.content && mcpResponse.content[0] && mcpResponse.content[0].text) {
                                    servicesData = JSON.parse(mcpResponse.content[0].text);
                                } else {
                                    servicesData = mcpResponse;
                                }
                            } catch (e) {
                                servicesData = JSON.parse(responseText);
                            }
                            
                            console.log('[InvisibilityBridge] 📊 Parsed services data:', servicesData);
                            console.log(`[InvisibilityBridge] 🔍 DEBUG: Paragon API returned authenticated_services:`, servicesData.authenticated_services);
                            
                            // Convert to status format - use only authenticated services from Paragon
                            const serviceStatus = {};
                            
                            // Don't use hardcoded list - dynamically get services from authenticated_services
                            const authenticatedServices = servicesData.authenticated_services || [];
                            console.log('[InvisibilityBridge] 🔍 Authenticated services from Paragon:', authenticatedServices);
                            
                            // Initialize service status - map raw Paragon service names to UI names
                            const serviceNameMapping = {
                                'googledrive': 'googleDrive',
                                'googlesheets': 'googleSheets',
                                'googlecalendar': 'googleCalendar',
                                'googledocs': 'googleDocs',
                                'googletasks': 'googleTasks'
                            };
                            
                            // Map each raw service name and dedupe
                            const allPossibleServices = [...new Set(
                                authenticatedServices.map(rawName => 
                                    serviceNameMapping[rawName.toLowerCase()] || rawName
                                )
                            )];
                            
                            // Initialize with false/default
                            allPossibleServices.forEach(mappedName => {
                                serviceStatus[mappedName] = { authenticated: false, toolsCount: 0 };
                            });
                            
                            // Update status for authenticated services
                            if (servicesData.authenticated_services && Array.isArray(servicesData.authenticated_services)) {
                                for (const serviceName of servicesData.authenticated_services) {
                                        // The authenticated_services array may contain either plain strings or rich objects.
                                        let rawName;
                                        let connectionCount = -1; // -1 means "unknown, needs verification"
                                        
                                    if (typeof serviceName === 'string') {
                                            rawName = serviceName;
                                            // For string services, the Paragon MCP server should have already filtered
                                            // out services with no connected users, so we tentatively trust it
                                            console.log(`[InvisibilityBridge] 🔍 String service ${serviceName} - trusting Paragon MCP filtering`);
                                        } else if (typeof serviceName === 'object' && serviceName !== null) {
                                            rawName = serviceName.key || serviceName.name || serviceName.service || '';
                                            connectionCount = serviceName.connected_users || serviceName.connectedUsers || serviceName.userCount || 0;
                                        }
                                        
                                        if (!rawName) {
                                            console.log(`[InvisibilityBridge] ⚠️ Skipping service with no name:`, serviceName);
                                            continue;
                                        }

                                        // Map service names from MCP server format to UI format
                                        const serviceNameMapping = {
                                            'googledrive': 'googleDrive',
                                            'googlesheets': 'googleSheets',
                                            'googlecalendar': 'googleCalendar',
                                            'googledocs': 'googleDocs',
                                            'googletasks': 'googleTasks'
                                        };
                                        const mappedServiceName = serviceNameMapping[rawName.toLowerCase()] || rawName;

                                        // Skip services with explicitly 0 connected users
                                        if (connectionCount === 0) {
                                            console.log(`[InvisibilityBridge] ⚠️ ${mappedServiceName} has 0 connected users – skipping authentication`);
                                            continue;
                                        }
                                        
                                        console.log(`[InvisibilityBridge] ✅ Processing service ${mappedServiceName} with ${connectionCount} connected users (or unknown)`);
                                        
                                        if (serviceStatus[mappedServiceName]) {
                                            // Get actual tool count by discovering tools from MCP server
                                            let toolsCount = 0;
                                            try {
                                                if (service?.mcpClient) {
                                                    console.log(`[InvisibilityBridge] 🔍 Discovering tools for ${serviceName}...`);
                                                    
                                                    // Use proper MCP tool call to list tools
                                                    const toolsResult = await service.mcpClient.callTool('list_tools', {});
                                                    
                                                    if (toolsResult && toolsResult.content && toolsResult.content[0]) {
                                                        let toolsData;
                                                        
                                                        // Debug the raw response structure
                                                        console.log(`[InvisibilityBridge] 🔍 Raw tools response for ${serviceName}:`, {
                                                            hasContent: !!toolsResult.content,
                                                            contentLength: toolsResult.content ? toolsResult.content.length : 0,
                                                            firstItemKeys: toolsResult.content[0] ? Object.keys(toolsResult.content[0]) : [],
                                                            firstItemType: toolsResult.content[0] ? toolsResult.content[0].type : 'undefined',
                                                            hasText: toolsResult.content[0] ? !!toolsResult.content[0].text : false
                                                        });
                                                        
                                                        try {
                                                            // Extract the text from the MCP response format
                                                            const textContent = toolsResult.content[0].text;
                                                            if (!textContent) {
                                                                throw new Error('No text content found in response');
                                                            }
                                                            
                                                            console.log(`[InvisibilityBridge] 🔍 Attempting to parse JSON for ${serviceName}...`);
                                                            console.log(`[InvisibilityBridge] 🔍 Text content sample for ${serviceName}:`, textContent.substring(0, 200) + '...');
                                                            
                                                            // First parse the outer JSON structure
                                                            const outerParsed = JSON.parse(textContent);
                                                            
                                                            // Check for nested structures (can be double or triple-nested)
                                                            let actualToolsData;
                                                            if (outerParsed.content && Array.isArray(outerParsed.content) && outerParsed.content[0] && outerParsed.content[0].text) {
                                                                console.log(`[InvisibilityBridge] 🔍 Found double-nested structure for ${serviceName}, extracting inner JSON...`);
                                                                const innerParsed = JSON.parse(outerParsed.content[0].text);
                                                                
                                                                // Check if there's another layer of nesting
                                                                if (innerParsed.content && Array.isArray(innerParsed.content) && innerParsed.content[0] && innerParsed.content[0].text) {
                                                                    console.log(`[InvisibilityBridge] 🔍 Found triple-nested structure for ${serviceName}, extracting deepest JSON...`);
                                                                    actualToolsData = JSON.parse(innerParsed.content[0].text);
                                                                } else {
                                                                    actualToolsData = innerParsed;
                                                                }
                                                            } else if (outerParsed.tools) {
                                                                console.log(`[InvisibilityBridge] 🔍 Found direct tools structure for ${serviceName}`);
                                                                actualToolsData = outerParsed;
                                                            } else if (outerParsed.authenticated_services) {
                                                                console.log(`[InvisibilityBridge] 🔍 Found authenticated_services structure for ${serviceName}`);
                                                                actualToolsData = outerParsed;
                                                            } else {
                                                                console.log(`[InvisibilityBridge] 🔍 Unknown structure for ${serviceName}, using as-is`);
                                                                actualToolsData = outerParsed;
                                                            }
                                                            
                                                            toolsData = actualToolsData;
                                                            
                                                            console.log(`[InvisibilityBridge] 🔍 Successfully parsed JSON object for ${serviceName}:`, {
                                                                success: actualToolsData.success,
                                                                hasTools: !!actualToolsData.tools,
                                                                toolsType: typeof actualToolsData.tools,
                                                                toolsIsArray: Array.isArray(actualToolsData.tools),
                                                                toolsLength: actualToolsData.tools ? actualToolsData.tools.length : 'N/A',
                                                                keys: Object.keys(actualToolsData)
                                                            });
                                                            
                                                            console.log(`[InvisibilityBridge] 🔍 Final toolsData for ${serviceName}:`, {
                                                                success: toolsData.success,
                                                                hasTools: !!toolsData.tools,
                                                                toolsType: typeof toolsData.tools,
                                                                toolsIsArray: Array.isArray(toolsData.tools),
                                                                toolsLength: toolsData.tools ? toolsData.tools.length : 'N/A',
                                                                keys: Object.keys(toolsData)
                                                            });
                                                        } catch (parseError) {
                                                            console.error(`[InvisibilityBridge] ❌ Failed to parse tools response for ${serviceName}:`, {
                                                                error: parseError.message,
                                                                rawContent: toolsResult.content[0],
                                                                textContent: toolsResult.content[0] ? toolsResult.content[0].text : 'undefined'
                                                            });
                                                            // Don't fall back to raw content, set toolsData to null to trigger proper error handling
                                                            toolsData = null;
                                                        }
                                                        
                                                        if (toolsData && toolsData.authenticated_services && Array.isArray(toolsData.authenticated_services)) {
                                                            // Check if the current service is in the authenticated services list
                                                            const isAuthenticated = toolsData.authenticated_services.some(authService => {
                                                                const authServiceLower = authService.toLowerCase();
                                                                const serviceNameLower = serviceName.toLowerCase();
                                                                const mappedServiceLower = mappedServiceName.toLowerCase();
                                                                
                                                                return authServiceLower === serviceNameLower || 
                                                                       authServiceLower === mappedServiceLower ||
                                                                       // Handle variations like 'googlecalendar' vs 'googleCalendar'
                                                                       authServiceLower.replace(/[^a-z]/g, '') === serviceNameLower.replace(/[^a-z]/g, '') ||
                                                                       authServiceLower.replace(/[^a-z]/g, '') === mappedServiceLower.replace(/[^a-z]/g, '');
                                                            });
                                                            
                                                            if (isAuthenticated) {
                                                                toolsCount = 1; // Service is authenticated, set tools count to 1
                                                                console.log(`[InvisibilityBridge] 🔧 Service ${serviceName} is authenticated in Paragon`);
                                                            } else {
                                                                toolsCount = 0;
                                                                console.log(`[InvisibilityBridge] ⚠️ Service ${serviceName} not found in authenticated services:`, toolsData.authenticated_services);
                                                            }
                                                        } else if (toolsData && toolsData.tools && Array.isArray(toolsData.tools)) {
                                                            // DEBUG: Log all available tools first
                                                            console.log(`[InvisibilityBridge] 🔍 DEBUG: All available tools for ${mappedServiceName}:`, 
                                                                      toolsData.tools.map(t => ({ name: t.name, description: t.description })));
                                                            
                                                            // Filter tools that are relevant to this specific service
                                                            const serviceSpecificTools = toolsData.tools.filter(tool => {
                                                                const toolNameRaw = tool.name.toLowerCase();
                                                                const descriptionRaw = tool.description?.toLowerCase() || '';
                                                                const serviceNameClean = mappedServiceName.toLowerCase().replace(/[^a-z]/g, '');
                                                                const toolNameClean = toolNameRaw.replace(/[^a-z]/g, '');
                                                                
                                                                // DEBUG: Log matching attempts
                                                                const directMatch = toolNameRaw.includes(mappedServiceName.toLowerCase());
                                                                const cleanMatch = toolNameClean.includes(serviceNameClean);
                                                                const descMatch = descriptionRaw.includes(mappedServiceName.toLowerCase());
                                                                
                                                                if (directMatch || cleanMatch || descMatch) {
                                                                    console.log(`[InvisibilityBridge] 🎯 MATCH for ${mappedServiceName}: tool="${tool.name}" (direct:${directMatch}, clean:${cleanMatch}, desc:${descMatch})`);
                                                                }
                                                                
                                                                // Match raw names or cleaned (hyphen/underscore removed) names
                                                                return directMatch || cleanMatch || descMatch;
                                                            });
                                                            
                                                            toolsCount = serviceSpecificTools.length;
                                                            console.log(`[InvisibilityBridge] 🔧 Found ${toolsCount} tools for ${mappedServiceName} (${serviceName}):`, 
                                                                      serviceSpecificTools.map(t => t.name));
                                                            
                                                            if (toolsCount === 0) {
                                                                console.log(`[InvisibilityBridge] ⚠️  No tools found for ${mappedServiceName}. This service is authenticated in Paragon but no tools are implemented in the MCP server.`);
                                                            }
                                                        } else if (toolsData && Array.isArray(toolsData)) {
                                                            // Direct array of tools
                                                            const serviceSpecificTools = toolsData.filter(tool => {
                                                                const toolName = tool.name.toLowerCase();
                                                                const serviceNameLower = serviceName.toLowerCase();
                                                                const mappedServiceLower = mappedServiceName.toLowerCase();
                                                                
                                                                return toolName.includes(serviceNameLower) || 
                                                                       toolName.includes(mappedServiceLower) ||
                                                                       (tool.description && tool.description.toLowerCase().includes(serviceNameLower));
                                                            });
                                                            
                                                            toolsCount = serviceSpecificTools.length;
                                                            console.log(`[InvisibilityBridge] 🔧 Found ${toolsCount} tools for ${serviceName}:`, 
                                                                      serviceSpecificTools.map(t => t.name));
                                                        } else {
                                                            console.log(`[InvisibilityBridge] ⚠️ No tools array found in response for ${serviceName}:`, toolsData);
                                                        }
                                                    } else {
                                                        console.log(`[InvisibilityBridge] ⚠️ No tools content returned from MCP server for ${serviceName}`);
                                                    }
                                                } else {
                                                    console.log(`[InvisibilityBridge] ⚠️ No MCP client available for tool discovery`);
                                                }
                                            } catch (toolDiscoveryError) {
                                                console.error(`[InvisibilityBridge] ❌ Tool discovery failed for ${serviceName}:`, toolDiscoveryError.message);
                                            }
                                            
                                            serviceStatus[mappedServiceName] = {
                                                authenticated: true,  // Service is in the authenticated list
                                                toolsCount: toolsCount  // Actual discovered tool count
                                            };
                                            console.log(`[InvisibilityBridge] ✅ Service ${serviceName} -> ${mappedServiceName} is authenticated with ${toolsCount} discovered tools`);
                                        } else {
                                            console.log(`[InvisibilityBridge] ⚠️ Service ${serviceName} (mapped to ${mappedServiceName}) not found in serviceStatus`);
                                        }

                                }
                            }
                            
                            console.log('[InvisibilityBridge] 📊 Final service status:', serviceStatus);
                            return { success: true, services: serviceStatus };
                        } catch (parseError) {
                            console.error('[InvisibilityBridge] ❌ Error parsing authentication response:', parseError);
                        }
                    }
                } catch (toolError) {
                    console.error('[InvisibilityBridge] ❌ Error calling get_authenticated_services:', toolError);
                }
            }
            
            // Return default status if MCP client not available or error occurred
            const defaultStatus = {
                    'gmail': { authenticated: false, toolsCount: 0 },
                    'googleCalendar': { authenticated: false, toolsCount: 0 },
                    'googleDrive': { authenticated: false, toolsCount: 0 },
                    'googleDocs': { authenticated: false, toolsCount: 0 },
                    'googleSheets': { authenticated: false, toolsCount: 0 },
                    'googleTasks': { authenticated: false, toolsCount: 0 },
                    'notion': { authenticated: false, toolsCount: 0 },
                    'linkedin': { authenticated: false, toolsCount: 0 }
            };
            
            console.log('[InvisibilityBridge] 📊 Returning default status:', defaultStatus);
            return { success: true, services: defaultStatus };
        } catch (error) {
            console.error('[InvisibilityBridge] ❌ Error getting Paragon service status:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('mcp:authenticateParagonService', async (event, serviceKey, options = {}) => {
        try {
            console.log(`[InvisibilityBridge] 🚀 Authenticating Paragon service: ${serviceKey}`);
            
            // Instead of manually constructing URLs, use the MCP client to get the proper setup URL
            // This is the correct approach according to Paragon ActionKit documentation
            
            try {
                // First, check if the service is already authenticated
                // Get the real authenticated user ID for consistent checking
                const authCheckRealUserId = authService.getCurrentUserId();
                // Try to get real user ID from Firebase auth or use email as fallback
        let userIdForStatusCheck = authCheckRealUserId;
        
        if (!userIdForStatusCheck) {
            try {
                const authService = require('../common/services/authService');
                const currentUser = await authService.getCurrentUser();
                if (currentUser && currentUser.uid) {
                    userIdForStatusCheck = currentUser.uid;
                } else if (currentUser && currentUser.email) {
                    userIdForStatusCheck = currentUser.email;
                }
            } catch (authError) {
                console.log(`[InvisibilityBridge] ⚠️ Could not get Firebase user for status check:`, authError.message);
            }
            
            if (!userIdForStatusCheck) {
                userIdForStatusCheck = 'default-user';
            }
        }
                
                console.log(`[InvisibilityBridge] 🔍 Checking authentication status for user: ${userIdForStatusCheck}`);
                const statusResult = await service.mcpClient.callTool('get_authenticated_services', { user_id: userIdForStatusCheck });
                console.log('[InvisibilityBridge] 🔍 Authentication status check:', statusResult);
                
                // Parse the status result to check if already authenticated
                if (statusResult && statusResult.content && statusResult.content[0] && statusResult.content[0].text) {
                    try {
                        // Handle nested MCP response structure
                        let services;
                        const responseText = statusResult.content[0].text;
                        
                        // Try to parse as nested MCP response first
                        try {
                            const mcpResponse = JSON.parse(responseText);
                            if (mcpResponse.content && mcpResponse.content[0] && mcpResponse.content[0].text) {
                                services = JSON.parse(mcpResponse.content[0].text);
                            } else {
                                // Fallback to direct parsing
                                services = mcpResponse;
                            }
                        } catch (e) {
                            // Fallback to direct parsing
                            services = JSON.parse(responseText);
                        }
                        
                        console.log('[InvisibilityBridge] 🔍 Parsed services:', services);
                        
                        if (Array.isArray(services)) {
                            const targetService = services.find(s => s.id === serviceKey);
                            
                            if (targetService && targetService.status === 'authenticated') {
                                return {
                                    success: true,
                                    message: `${serviceKey} is already authenticated`,
                                    serviceKey: serviceKey,
                                    alreadyAuthenticated: true
                                };
                            }
                        } else {
                            console.log('[InvisibilityBridge] ⚠️ Services is not an array:', services);
                        }
                    } catch (parseError) {
                        console.log('[InvisibilityBridge] ⚠️ Failed to parse services response:', parseError.message);
                        // Continue with authentication attempt even if parsing fails
                    }
                }
                
                // Service needs authentication - call the connect_service tool
                console.log(`[InvisibilityBridge] 🔐 ${serviceKey} requires authentication, generating Connect Portal URL...`);
                
                // Get the real authenticated user ID from auth service
                const connectRealUserId = authService.getCurrentUserId();
                const customerUserId = options.userId || connectRealUserId || 'default-user';
                
                console.log(`[InvisibilityBridge] 🔑 Using customer ID: ${customerUserId}`);
                
                const authResult = await service.mcpClient.callTool('connect_service', {
                    service: serviceKey,
                    user_id: customerUserId,
                    // redirectUrl override removed to use MCP default ('https://passport.useparagon.com/oauth')
                });
                
                console.log(`[InvisibilityBridge] 🔗 Connect service result:`, authResult);
                
                // Parse the authentication response
                if (authResult && authResult.content && authResult.content[0] && authResult.content[0].text) {
                    try {
                        // Handle nested MCP response structure for connect_service
                        let response;
                        const responseText = authResult.content[0].text;
                        
                        // Try to parse as nested MCP response first
                        try {
                            const mcpResponse = JSON.parse(responseText);
                            if (mcpResponse.content && mcpResponse.content[0] && mcpResponse.content[0].text) {
                                response = JSON.parse(mcpResponse.content[0].text);
                            } else {
                                // Fallback to direct parsing
                                response = mcpResponse;
                            }
                        } catch (e) {
                            // Fallback to direct parsing
                            response = JSON.parse(responseText);
                        }
                        
                        console.log('[InvisibilityBridge] 🔍 Parsed connect_service response:', response);
                        
                        if (response.success && response.authUrl) {
                            console.log(`[InvisibilityBridge] 🔗 Using web app authentication for ${serviceKey}`);
                            
                            try {
                                // Open system browser instead of redirecting Electron window
                                // Use localhost:3000 where the working Paragon auth is running
                                const { shell } = require('electron');
                                const webAppUrl = 'http://localhost:3000'; // Working Paragon auth location
                                
                                // Check if localhost:3000 is likely available by testing the URL first
                                try {
                                    const http = require('http');
                                    const testReq = http.request({
                                        hostname: 'localhost',
                                        port: 3000,
                                        path: '/integrations',
                                        method: 'HEAD',
                                        timeout: 2000
                                    }, (res) => {
                                        console.log(`[InvisibilityBridge] ✅ localhost:3000 is available (status: ${res.statusCode})`);
                                    });
                                    
                                    testReq.on('error', (err) => {
                                        console.warn(`[InvisibilityBridge] ⚠️ localhost:3000 may not be running:`, err.message);
                                    });
                                    
                                    testReq.end();
                                } catch (testError) {
                                    console.warn(`[InvisibilityBridge] ⚠️ Could not test localhost:3000:`, testError.message);
                                }
                                
                                // Navigate to integrations page with service context
                                const integrationsUrl = `${webAppUrl}/integrations?authenticate=${serviceKey}`;
                                console.log(`[InvisibilityBridge] 🌐 Opening dedicated BrowserWindow to: ${integrationsUrl}`);
                                
                                // Open in dedicated BrowserWindow with CSP patches (like quick-debug)
                                const { BrowserWindow, session } = require('electron');
                                const path = require('path');
                                
                                const connectWin = new BrowserWindow({
                                  width: 1200,
                                  height: 800,
                                  show: true,
                                  webPreferences: {
                                    preload: path.join(__dirname, '..', '..', 'connect-preload.js'),
                                    contextIsolation: true,
                                    nodeIntegration: false,
                                    // CRITICAL: Use the same session as main app to get CSP patches
                                    session: session.defaultSession
                                  }
                                });
                                
                                console.log(`[InvisibilityBridge] 🔧 Connect window using session with CSP patches`);
                                await connectWin.loadURL(integrationsUrl);
                                console.log(`[InvisibilityBridge] ✅ Dedicated window opened successfully`);

                            return {
                                success: true,
                                    message: `Opened system browser for ${serviceKey} authentication. Make sure Next.js dev server is running on localhost:3000.`,
                                    serviceKey: serviceKey,
                                    redirectUrl: integrationsUrl
                                };
                            } catch (openError) {
                                console.error(`[InvisibilityBridge] ❌ Failed to open system browser:`, openError);
                                
                                let errorMsg = `Failed to open browser for ${serviceKey}: ${openError.message}`;
                                let suggestion = 'Make sure Next.js dev server is running: cd leviousa_web && npm run dev';
                                
                                return {
                                    success: false,
                                    error: errorMsg,
                                    suggestion: suggestion,
                                    serviceKey: serviceKey
                                };
                            }
                        } else if (response.action_required === 'connect_integration') {
                            // Handle the case where user needs to connect integration first
                            console.log(`[InvisibilityBridge] 🔗 User needs to connect ${serviceKey} integration first - redirecting to web app`);
                            
                            try {
                                // Open system browser instead of redirecting Electron window
                                const { shell } = require('electron');
                                const webAppUrl = 'http://localhost:3000'; // Working Paragon auth location
                                
                                // Navigate to integrations page with service context for connection
                                const integrationsUrl = `${webAppUrl}/integrations?connect=${serviceKey}`;
                                console.log(`[InvisibilityBridge] 🌐 Opening dedicated BrowserWindow to: ${integrationsUrl}`);
                                
                                // Open in dedicated BrowserWindow with CSP patches (like quick-debug)
                                const { BrowserWindow, session } = require('electron');
                                const path = require('path');
                                
                                const connectWin = new BrowserWindow({
                                  width: 1200,
                                  height: 800,
                                  show: true,
                                  webPreferences: {
                                    preload: path.join(__dirname, '..', '..', 'connect-preload.js'),
                                    contextIsolation: true,
                                    nodeIntegration: false,
                                    // CRITICAL: Use the same session as main app to get CSP patches
                                    session: session.defaultSession
                                  }
                                });
                                
                                console.log(`[InvisibilityBridge] 🔧 Connect window using session with CSP patches`);
                                await connectWin.loadURL(integrationsUrl);
                                console.log(`[InvisibilityBridge] ✅ Dedicated window opened successfully`);

                            return {
                                success: true,
                                    message: `Opened system browser to connect ${serviceKey} integration. Make sure Next.js dev server is running on localhost:3000.`,
                                serviceKey: serviceKey,
                                    action_required: 'connect_integration',
                                    redirectUrl: integrationsUrl
                                };
                            } catch (openError) {
                                console.error(`[InvisibilityBridge] ❌ Failed to open system browser:`, openError);
                                
                                let errorMsg = `Failed to open browser for ${serviceKey}: ${openError.message}`;
                                let suggestion = 'Make sure Next.js dev server is running: cd leviousa_web && npm run dev';
                                
                                return {
                                    success: false,
                                    error: errorMsg,
                                    suggestion: suggestion,
                                    serviceKey: serviceKey
                                };
                            }
                        } else {
                            throw new Error(response.message || 'Failed to generate authentication URL');
                        }
                    } catch (parseError) {
                        console.log('[InvisibilityBridge] ⚠️ Failed to parse connect_service response:', parseError.message);
                        throw new Error('Failed to parse authentication response');
                    }
                } else {
                    throw new Error('Invalid response from connect_service tool');
                }
                
            } catch (authError) {
                console.log(`[InvisibilityBridge] 🔐 Authentication tool error:`, authError.message);
                throw new Error(`Authentication failed for ${serviceKey}: ${authError.message}`);
            }
            
        } catch (error) {
            console.error(`[InvisibilityBridge] ❌ Error authenticating ${serviceKey}:`, error);
            
            // Provide more specific error handling
            let errorMessage = `Failed to authenticate ${serviceKey}: ${error.message}`;
            let suggestion = 'Please ensure Paragon MCP server is running and properly configured.';
            
            if (error.message.includes('PROJECT_ID')) {
                errorMessage = `Paragon PROJECT_ID not configured. Please check services/paragon-mcp/.env file.`;
                suggestion = 'Add a valid PROJECT_ID to services/paragon-mcp/.env and restart the application.';
            } else if (error.message.includes('ECONNREFUSED')) {
                errorMessage = `Cannot connect to Paragon MCP server on http://localhost:3002`;
                suggestion = 'Please ensure the Paragon MCP server is running.';
            }
            
            return { 
                success: false, 
                error: errorMessage,
                serviceKey: serviceKey,
                suggestion: suggestion
            };
        }
    });

    ipcMain.handle('mcp:disconnectParagonService', async (event, serviceKey) => {
        try {
            console.log(`[InvisibilityBridge] 🔌 Disconnecting Paragon service: ${serviceKey}`);
            
            // Revoke the service authentication through Paragon
            if (service?.mcpClient) {
                const result = await service.mcpClient.disconnectParagonService(serviceKey);
                return { success: true, message: `${serviceKey} disconnected successfully.` };
            }
            
            // Fallback: just return success for now
            return { success: true, message: `${serviceKey} disconnected.` };
            
        } catch (error) {
            console.error(`[InvisibilityBridge] ❌ Error disconnecting ${serviceKey}:`, error);
            return { success: false, error: error.message };
        }
    });

    // Note: Removed manual Connect Portal URL generation 
    // Now using proper Paragon MCP server setup endpoint approach
    // The MCP server handles authentication setup via GET /setup endpoint

    // Handle authentication completion notifications from web app
    ipcMain.handle('mcp:notifyAuthenticationComplete', async (event, data) => {
        try {
            console.log(`[InvisibilityBridge] 🎉 Authentication completed for service: ${data.serviceKey}`);
            
            const service = getInvisibilityService();
            if (service && service.mcpClient) {
                // Refresh server status to pick up new authentication
                const serverStatus = service.mcpClient.getServerStatus();
                
                // CRITICAL: Force refresh of authenticated services cache
                console.log(`[InvisibilityBridge] 🔄 Force refreshing authenticated services cache for ${data.serviceKey}`)
                try {
                    // Call get_authenticated_services to refresh the cache
                    const userId = data.userId || global.currentUserId || 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
                    const refreshResult = await service.mcpClient.callTool('get_authenticated_services', { user_id: userId })
                    console.log(`[InvisibilityBridge] ✅ Refreshed authenticated services:`, refreshResult)
                } catch (refreshError) {
                    console.warn(`[InvisibilityBridge] ⚠️ Failed to refresh authenticated services:`, refreshError.message)
                }
                
                // Notify all windows of authentication update
                const { BrowserWindow } = require('electron');
                BrowserWindow.getAllWindows().forEach(window => {
                    if (!window.isDestroyed()) {
                        window.webContents.send('mcp:auth-status-updated', {
                            serviceKey: data.serviceKey,
                            status: 'authenticated',
                            timestamp: new Date().toISOString()
                        });
                    }
                });
                
                console.log(`[InvisibilityBridge] ✅ Notified all windows of ${data.serviceKey} authentication`);
            }
            
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] ❌ Error handling authentication completion:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('mcp:notifyAuthenticationFailed', async (event, data) => {
        try {
            console.log(`[InvisibilityBridge] ❌ Authentication failed for service: ${data.serviceKey}`);
            
            // Notify all windows of authentication failure
            const { BrowserWindow } = require('electron');
            BrowserWindow.getAllWindows().forEach(window => {
                if (!window.isDestroyed()) {
                    window.webContents.send('mcp:auth-status-updated', {
                        serviceKey: data.serviceKey,
                        status: 'failed',
                        error: data.error,
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
            return { success: true };
        } catch (error) {
            console.error('[InvisibilityBridge] ❌ Error handling authentication failure:', error);
            return { success: false, error: error.message };
        }
    });

    // Paragon JWT generation handler
    ipcMain.handle('paragon:getJWT', async (event) => {
        try {
            console.log('[InvisibilityBridge] 📋 Generating Paragon JWT token...');
            
            const paragonJwtService = require('./mcp/paragonJwtService');
            
            // Get current user
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                console.error('[InvisibilityBridge] ❌ No authenticated user for JWT generation');
                return { success: false, error: 'No authenticated user' };
            }
            
            console.log(`[InvisibilityBridge] 👤 Generating JWT for user: ${currentUser.uid}`);
            
            // Initialize JWT service if needed
            if (!paragonJwtService.initialized) {
                console.log('[InvisibilityBridge] 🔧 Initializing Paragon JWT service...');
                const config = {
                    projectId: process.env.PARAGON_PROJECT_ID, // Must be defined in environment
                    signingKey: process.env.PARAGON_SIGNING_KEY
                };
                const initialized = paragonJwtService.initialize(config);
                if (!initialized) {
                    console.error('[InvisibilityBridge] ❌ Failed to initialize Paragon JWT service');
                    return { success: false, error: 'Failed to initialize JWT service' };
                }
            }
            
            // Generate JWT
            const token = paragonJwtService.generateUserToken(currentUser.uid);
            if (!token) {
                console.error('[InvisibilityBridge] ❌ Failed to generate JWT token');
                return { success: false, error: 'Failed to generate JWT' };
            }
            
            console.log('[InvisibilityBridge] ✅ JWT token generated successfully');
            return { success: true, token };
            
        } catch (error) {
            console.error('[InvisibilityBridge] ❌ Error generating Paragon JWT:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[InvisibilityBridge] IPC handlers initialized');
}

// Helper function to test protocol handling
async function testProtocolHandling() {
    try {
        const { app } = require('electron');
        
        // Check if app is registered as default protocol client
        const isDefaultClient = app.isDefaultProtocolClient('leviousa');
        
        if (!isDefaultClient) {
            return {
                success: false,
                error: 'App is not registered as default protocol client for leviousa://',
                details: {
                    isDefaultClient: false,
                    platform: process.platform,
                    suggestion: 'Protocol registration may have failed during startup'
                }
            };
        }
        
        // Additional platform-specific checks
        let platformDetails = {
            isDefaultClient: true,
            platform: process.platform
        };
        
        if (process.platform === 'darwin') {
            // On macOS, we can test if the open-url event would be triggered
            platformDetails.macOSNote = 'Protocol handling depends on macOS open-url event';
        } else if (process.platform === 'win32') {
            // On Windows, we rely on second-instance event
            platformDetails.windowsNote = 'Protocol handling depends on second-instance event';
        }
        
        return {
            success: true,
            message: 'Protocol handling appears to be properly configured',
            details: platformDetails
        };
        
    } catch (error) {
        return {
            success: false,
            error: `Protocol test failed: ${error.message}`,
            details: {
                platform: process.platform,
                errorType: error.constructor.name
            }
        };
    }
}

module.exports = {
    initializeInvisibilityBridge
}; 