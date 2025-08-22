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
              : (process.env.leviousa_WEB_URL || 'https://www.leviousa.com');
            // Include userId for context if available
            // Use 'authenticate' parameter to trigger auto-connect instead of manual connect
            const params = new URLSearchParams({ 
                authenticate: service,  // This triggers auto-connect
                action: 'connect', 
                ...(userId ? { userId } : {}) 
            });
            const authUrl = `${webUrl}/integrations?${params.toString()}`;
            console.log(`[ParagonBridge] 🌐 Opening working Paragon integration in-window: ${authUrl}`);
            const connectWin = new BrowserWindow({
              width: 1200,
              height: 800,
              show: true,
              frame: false, // Frameless like listen overlay
              transparent: true, // Transparent like listen overlay
              webPreferences: {
                preload: path.join(__dirname, '..', '..', 'connect-preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                // Use the default session which already has CSP patches
                session: session.defaultSession
              },
              // Make it independent overlay like listen system
              parent: undefined, // No parent relationship like listen
              modal: false, // Not modal - independent like listen
              alwaysOnTop: true, // Always on top like listen overlay
              skipTaskbar: true, // Don't show in taskbar like listen overlay
              hasShadow: false,
              resizable: true,
              minimizable: false,
              maximizable: false,
              focusable: true,
              title: `Connect ${service} - Leviousa`
            });
            
            // Set up window close on Escape key like listen overlay
            connectWin.webContents.on('before-input-event', (event, input) => {
                if (input.key === 'Escape' && input.type === 'keyDown') {
                    connectWin.close();
                }
            });
            
            console.log(`[ParagonBridge] 🔧 Connect window using session with CSP patches`);
            await connectWin.loadURL(authUrl);
            
            // Add custom close button after page loads
            connectWin.webContents.once('did-finish-load', () => {
                connectWin.webContents.executeJavaScript(`
                    // Create close button container
                    const closeBtn = document.createElement('div');
                    closeBtn.id = 'leviousa-close-btn';
                    closeBtn.innerHTML = '✕';
                    closeBtn.style.cssText = \`
                        position: fixed !important;
                        top: 15px !important;
                        right: 15px !important;
                        width: 32px !important;
                        height: 32px !important;
                        background: rgba(0, 0, 0, 0.8) !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 50% !important;
                        cursor: pointer !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        font-size: 16px !important;
                        font-weight: bold !important;
                        z-index: 999999 !important;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                        transition: all 0.2s ease !important;
                    \`;
                    
                    // Add hover effects
                    closeBtn.addEventListener('mouseenter', () => {
                        closeBtn.style.background = 'rgba(255, 0, 0, 0.8)';
                        closeBtn.style.transform = 'scale(1.1)';
                    });
                    
                    closeBtn.addEventListener('mouseleave', () => {
                        closeBtn.style.background = 'rgba(0, 0, 0, 0.8)';
                        closeBtn.style.transform = 'scale(1)';
                    });
                    
                    // Close window when clicked
                    closeBtn.addEventListener('click', () => {
                        window.electronAPI?.closeWindow?.() || window.close();
                    });
                    
                    // Append to body
                    document.body.appendChild(closeBtn);
                    
                    console.log('[Leviousa] Close button added to popup window');
                `).catch(err => {
                    console.error('[ParagonBridge] Failed to inject close button:', err);
                });
            });
            
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