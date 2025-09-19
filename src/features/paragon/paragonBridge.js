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
            
            // BACK TO BROWSERWINDOW - With HTTP notification system!
            const { BrowserWindow, session } = require('electron');
            const path = require('path');
            
            // Get current user ID and Firebase token for the integrations page
            const authService = require('../common/services/authService');
            const userId = authService.getCurrentUserId() || 'default-user';
            
            // Get Firebase token for proper auth
            let firebaseToken = null;
            try {
                const firebaseUser = authService.getFirebaseUser();
                if (firebaseUser) {
                    firebaseToken = await firebaseUser.getIdToken();
                    console.log('[ParagonBridge] 🔑 Got Firebase token for BrowserWindow auth');
                }
            } catch (error) {
                console.warn('[ParagonBridge] ⚠️ Could not get Firebase token:', error.message);
            }
            
            // Always use production web URL (has our API endpoints for tokens)
            const webUrl = 'https://www.leviousa.com';
            
            // Include userId and token for context - NO browserMode (Electron context)
            const params = new URLSearchParams({ 
                authenticate: service,  // Trigger auto-connect
                action: 'connect', 
                ...(userId ? { userId } : {}),
                ...(firebaseToken ? { token: firebaseToken } : {})
            });
            const authUrl = `${webUrl}/integrations?${params.toString()}`;
            console.log(`[ParagonBridge] 🌐 Opening Paragon integration in BrowserWindow: ${authUrl.split('token=')[0]}token=***`);
            
            // Create BrowserWindow with working CSP patches
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
                    webSecurity: false, // Disable for Paragon Connect Portal
                    nativeWindowOpen: true, // Enable OAuth popups
                    session: session.defaultSession // Use session with CSP patches
                }
            });
            
            // Enable OAuth popup domains
            connectWin.webContents.setWindowOpenHandler(({ url }) => {
                console.log(`[ParagonBridge] 🔍 OAuth popup request: ${url}`);
                
                const allowedDomains = [
                    'https://passport.useparagon.com',
                    'https://connect.useparagon.com', 
                    'https://zeus.useparagon.com',
                    'https://api.useparagon.com',
                    'https://dashboard.useparagon.com',
                    'https://accounts.google.com',
                    'about:blank'
                ];
                
                const isAllowed = allowedDomains.some(domain => url.startsWith(domain));
                return { action: isAllowed ? 'allow' : 'deny' };
            });
            
            // Load integrations page
            await connectWin.loadURL(authUrl);
            console.log(`[ParagonBridge] ✅ BrowserWindow loaded - Connect Portal + HTTP notifications enabled`);
            
            // Return success immediately
            return { 
                success: true, 
                message: `Opening ${service} authentication in BrowserWindow - HTTP notifications enabled`,
                authUrl: authUrl,
                method: 'electron_browserwindow_http'
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
            const allWindows = require('electron').BaseWindow.getAllWindows();
            allWindows.forEach(window => {
                if (window.webContents) {
                    window.webContents.send('paragon:service-disconnected', { service });
                }
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
                const allWindows = require('electron').BaseWindow.getAllWindows();
                allWindows.forEach(window => {
                    if (window.webContents) {
                        window.webContents.send('paragon:auth-status-updated', {
                            success: true,
                            service: response.service,
                            message: response.message
                        });
                    }
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