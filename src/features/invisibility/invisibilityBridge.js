const { ipcMain } = require('electron');

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
            const openResult = await shell.openExternal(authUrl);
            console.log(`[InvisibilityBridge] 📥 shell.openExternal result:`, openResult);
            
            // shell.openExternal resolves with void on success, so check for exceptions
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
    
    // Tool operations
    ipcMain.handle('mcp:callTool', async (event, toolName, args) => {
        try {
            const service = getInvisibilityService();
            if (!service || !service.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const result = await service.mcpClient.invokeTool(toolName, args);
            return { success: true, result };
        } catch (error) {
            console.error('[InvisibilityBridge] Error calling tool:', error);
            return { success: false, error: error.message };
        }
    });
    
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
                    
                    // Forward to all windows
                    BrowserWindow.getAllWindows().forEach(window => {
                        if (!window.isDestroyed()) {
                            window.webContents.send('mcp:ui-resource-available', data);
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
            
            const actions = service.mcpUIIntegration.getContextualActions(context);
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