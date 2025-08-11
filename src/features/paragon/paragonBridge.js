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
            
            // Open integrations flow in-app to allow CSP patching
            const { BrowserWindow, session } = require('electron');
            const path = require('path');
            
            // Get current user ID for the integrations page
            const authService = require('../common/services/authService');
            const userId = authService.getCurrentUserId() || 'default-user';
            
            // Determine web URL based on environment: use localhost in development, else the configured web URL
            const webUrl = process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000'
              : (process.env.leviousa_WEB_URL || 'https://leviousa-101.web.app');
            // Include userId for context if available
            const params = new URLSearchParams({ service, action: 'connect', ...(userId ? { userId } : {}) });
            const authUrl = `${webUrl}/integrations?${params.toString()}`;
            console.log(`[ParagonBridge] 🌐 Opening working Paragon integration in-window: ${authUrl}`);
            const connectWin = new BrowserWindow({
              width: 1200,
              height: 800,
              show: true,
              parent: require('../../window/windowManager').windowPool.header,
              modal: true,
              webPreferences: {
                preload: path.join(__dirname, '..', '..', 'connect-preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                // Use the default session which already has CSP patches
                session: session.defaultSession
              }
            });
            
            console.log(`[ParagonBridge] 🔧 Connect window using session with CSP patches`);
            await connectWin.loadURL(authUrl);
            
            // Return success immediately - the external browser will handle the auth
            return { 
                success: true, 
                message: `Opening ${service} authentication in browser...`,
                authUrl: authUrl
            };
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