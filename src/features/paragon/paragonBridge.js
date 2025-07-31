const { ipcMain } = require('electron');

function initializeParagonBridge() {
    console.log('[ParagonBridge] Initializing Paragon IPC bridge...');
    
    // Get the Paragon service (similar to invisibility service pattern)
    function getParagonService() {
        return global.invisibilityService; // Use existing service for now
    }

    // Start Paragon service authentication
    ipcMain.handle('paragon:authenticate', async (event, service) => {
        try {
            console.log('[ParagonBridge] Starting Paragon authentication for service:', service);
            
            // Get the main window and trigger Paragon Connect Portal directly
            const { BrowserWindow } = require('electron');
            const mainWindow = BrowserWindow.getAllWindows().find(win => !win.isDestroyed());
            
            if (!mainWindow) {
                throw new Error('Main window not found');
            }
            
            // Execute paragon.connect() directly in the renderer process
            const executeScript = `
                (async () => {
                    try {
                        console.log('🚀 Executing paragon.connect("${service}") in renderer...');
                        
                        // Ensure paragon is available
                        if (typeof paragon === 'undefined') {
                            throw new Error('Paragon SDK not loaded');
                        }
                        
                        // Call paragon.connect() which will open the Connect Portal
                        await paragon.connect("${service}", {
                                overrideRedirectUrl: 'http://127.0.0.1:54321/paragon/callback',
                            onOpen: () => {
                                console.log('🌐 Paragon Connect Portal opened for ${service}');
                            },
                            onInstall: () => {
                                console.log('✅ ${service} integration installed successfully');
                            },
                            onError: (error) => {
                                console.error('❌ Paragon Connect Portal error:', error);
                            },
                            onClose: () => {
                                console.log('🔒 Paragon Connect Portal closed');
                            }
                        });
                        
                        return { success: true, message: 'Paragon Connect Portal launched' };
                    } catch (error) {
                        console.error('❌ Failed to execute paragon.connect():', error);
                        return { success: false, error: error.message };
                    }
                })();
            `;
            
            // Execute the script in the main window
            const result = await mainWindow.webContents.executeJavaScript(executeScript);
            
            console.log('[ParagonBridge] Paragon Connect Portal result:', result);
            
            return result || { success: true, message: 'Paragon Connect Portal triggered' };
        } catch (error) {
            console.error('[ParagonBridge] Error starting Paragon authentication:', error);
            return { success: false, error: error.message };
        }
    });

    // Disconnect Paragon service
    ipcMain.handle('paragon:disconnect', async (event, service) => {
        try {
            console.log('[ParagonBridge] Disconnecting Paragon service:', service);
            
            const mcpService = getParagonService();
            if (!mcpService || !mcpService.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const result = await mcpService.mcpClient.invokeTool('paragon-mcp', 'disconnect_service', {
                service: service
            });
            
            console.log('[ParagonBridge] Paragon service disconnected:', result);
            
            // Notify all windows of disconnection
            const allWindows = require('electron').BrowserWindow.getAllWindows();
            allWindows.forEach(window => {
                window.webContents.send('paragon:service-disconnected', { service });
            });
            
            return { success: true, result };
        } catch (error) {
            console.error('[ParagonBridge] Error disconnecting Paragon service:', error);
            return { success: false, error: error.message };
        }
    });

    // Get Paragon service status
    ipcMain.handle('paragon:status', async (event, service) => {
        try {
            console.log('[ParagonBridge] Getting Paragon status for service:', service);
            
            // This would check the actual status in a real implementation
            return {
                success: true,
                service: service,
                status: 'disconnected' // Default to disconnected for now
            };
        } catch (error) {
            console.error('[ParagonBridge] Error getting Paragon status:', error);
            return { success: false, error: error.message };
        }
    });

    // Handle OAuth callback specifically for Paragon
    ipcMain.handle('paragon:handleOAuthCallback', async (event, code, state) => {
        try {
            console.log('[ParagonBridge] Processing Paragon OAuth callback');
            
            // Validate that this is a Paragon callback
            if (!state || !state.startsWith('paragon_')) {
                console.log('[ParagonBridge] Not a Paragon OAuth callback, skipping');
                return { success: false, error: 'Not a Paragon OAuth callback' };
            }
            
            const mcpService = getParagonService();
            if (!mcpService || !mcpService.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const result = await mcpService.mcpClient.invokeTool('paragon-mcp', 'handle_oauth_callback', {
                code: code,
                state: state
            });
            
            console.log('[ParagonBridge] Paragon OAuth callback processed:', result);
            
            // Parse the response
            if (result && result.content && result.content[0]) {
                const response = JSON.parse(result.content[0].text);
                
                // Notify all windows of successful authentication
                const allWindows = require('electron').BrowserWindow.getAllWindows();
                allWindows.forEach(window => {
                    window.webContents.send('paragon:auth-status-updated', {
                        success: true,
                        service: response.service,
                        message: response.message
                    });
                });
                
                return { success: true, ...response };
            }
            
            return { success: true, result };
        } catch (error) {
            console.error('[ParagonBridge] Error processing Paragon OAuth callback:', error);
            return { success: false, error: error.message };
        }
    });

    console.log('[ParagonBridge] Paragon IPC bridge initialized successfully');
}

module.exports = { initializeParagonBridge };