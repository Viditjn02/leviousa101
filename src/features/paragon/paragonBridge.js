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
            const { BrowserWindow, session, app } = require('electron');
            const path = require('path');
            
            // Get current user ID and Firebase token for the integrations page
            const authService = require('../common/services/authService');
            const userId = authService.getCurrentUserId() || 'default-user';
            
            // Get Firebase token for proper auth in BrowserWindow
            let firebaseToken = null;
            try {
                const firebaseUser = authService.getFirebaseUser();
                if (firebaseUser) {
                    firebaseToken = await firebaseUser.getIdToken();
                    console.log('[ParagonBridge] 🔑 Got Firebase token for integrations popup');
                }
            } catch (error) {
                console.warn('[ParagonBridge] ⚠️ Could not get Firebase token:', error.message);
            }
            
            // Use localhost for dev, production domain for packaged app
            const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
            const webUrl = isDev ? 'http://localhost:3000' : 'https://leviousa.com';
            console.log(`[ParagonBridge] 🌐 Using ${isDev ? 'localhost (dev)' : 'production domain (packaged)'} for integrations: ${webUrl}`);
            // Include userId and token for context if available
            // Use 'authenticate' parameter to trigger auto-connect instead of manual connect
            const params = new URLSearchParams({ 
                authenticate: service,  // This triggers auto-connect
                action: 'connect', 
                ...(userId ? { userId } : {}),
                ...(firebaseToken ? { token: firebaseToken } : {})
            });
            const authUrl = `${webUrl}/integrations?${params.toString()}`;
            console.log(`[ParagonBridge] 🌐 Opening Paragon integration with auth: ${authUrl.split('token=')[0]}token=***`);
            const connectWin = new BrowserWindow({
              width: 1200,
              height: 800,
              show: true,
              frame: true, // Proper window frame with controls ✅
              transparent: false, // Solid window (not overlay) ✅
              webPreferences: {
                preload: path.join(__dirname, '..', '..', 'connect-preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                // Use the default session which already has CSP patches
                session: session.defaultSession
              },
              // Proper window behavior (not overlay)
              parent: undefined, // Independent window
              modal: false, // Not modal - user can switch away
              alwaysOnTop: false, // Normal layering ✅ (fixes OAuth popup issue)
              skipTaskbar: false, // Show in taskbar ✅ 
              hasShadow: true, // Normal window shadow ✅
              resizable: true,
              minimizable: true, // Minimize button ✅
              maximizable: true, // Maximize button ✅
              closable: true, // Close button ✅
              focusable: true,
              title: `Connect ${service} - Leviousa`
            });
            
            // Set up window close on Escape key like listen overlay
            connectWin.webContents.on('before-input-event', (event, input) => {
                if (input.key === 'Escape' && input.type === 'keyDown') {
                    connectWin.close();
                }
            });
            
            // Add beforeunload and close hooks to capture final connected state
            connectWin.webContents.once('will-navigate', async (event, navigationUrl) => {
                console.log('[ParagonBridge] Integration window navigating, checking for final auth state...');
                
                // If navigating away from integrations (like after OAuth), capture final state
                if (!navigationUrl.includes('/integrations')) {
                    setTimeout(async () => {
                        await captureAndBroadcastFinalAuthState();
                    }, 500);
                }
            });
            
            connectWin.on('closed', async () => {
                console.log('[ParagonBridge] Integration window closed, capturing final auth state...');
                setTimeout(async () => {
                    await captureAndBroadcastFinalAuthState();
                }, 500);
            });
            
            // Function to capture and broadcast final auth state
            const captureAndBroadcastFinalAuthState = async () => {
                try {
                    const allWindows = require('electron').BrowserWindow.getAllWindows();
                    
                    // Find any window with integrations URL that has Paragon SDK loaded
                    for (const window of allWindows) {
                        if (window.isDestroyed()) continue;
                        
                        const url = window.webContents.getURL();
                        console.log(`[ParagonBridge] Checking window for auth state: ${url}`);
                        
                        // Try to get final auth state from this window
                        try {
                            const result = await window.webContents.executeJavaScript(`
                                (function() {
                                    try {
                                        if (typeof paragon !== 'undefined' && paragon.getUser) {
                                            const user = paragon.getUser();
                                            console.log('[ParagonBridge] Final auth state from window:', user);
                                            return {
                                                success: true,
                                                user: user,
                                                authenticated: user.authenticated,
                                                integrations: user.integrations || {},
                                                windowUrl: window.location.href
                                            };
                                        } else {
                                            return { success: false, error: 'Paragon SDK not available', windowUrl: window.location.href };
                                        }
                                    } catch (error) {
                                        return { success: false, error: error.message, windowUrl: window.location.href };
                                    }
                                })();
                            `);
                            
                            console.log(`[ParagonBridge] Auth state from ${url}:`, result);
                            
                            // If we got valid integration data, broadcast it
                            if (result && result.success) {
                                console.log('[ParagonBridge] Broadcasting final auth state to all windows');
                                allWindows.forEach(targetWindow => {
                                    if (!targetWindow.isDestroyed()) {
                                        console.log(`[ParagonBridge] Sending refresh event to: ${targetWindow.webContents.getURL()}`);
                                        targetWindow.webContents.send('paragon:final-auth-state', {
                                            service,
                                            user: result.user,
                                            integrations: result.integrations || {},
                                            sourceWindow: url,
                                            timestamp: new Date().toISOString()
                                        });
                                        
                                        // Also send a simple refresh trigger
                                        targetWindow.webContents.send('paragon:force-refresh', {
                                            service,
                                            timestamp: new Date().toISOString()
                                        });
                                    }
                                });
                                return; // Success, exit function
                            }
                        } catch (jsError) {
                            console.log(`[ParagonBridge] JavaScript execution failed in ${url}:`, jsError.message);
                        }
                    }
                    
                    console.log('[ParagonBridge] Could not capture final auth state from any window');
                } catch (error) {
                    console.error('[ParagonBridge] Error capturing final auth state:', error);
                }
            };
            
            console.log(`[ParagonBridge] 🔧 Connect window using session with CSP patches`);
            await connectWin.loadURL(authUrl);
            
            // Native window controls are used - no custom close button needed
            
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