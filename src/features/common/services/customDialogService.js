/**
 * Custom Branded Dialog Service
 * 
 * Replaces generic Electron dialogs with custom branded dialogs using Leviousa colors and design
 */

const { BrowserWindow } = require('electron');
const path = require('path');

class CustomDialogService {
    constructor() {
        this.activeDialogs = new Map();
    }

    /**
     * Show custom upgrade dialog with Leviousa branding
     * @param {Object} options - Dialog options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Main message
     * @param {string} options.detail - Detail text
     * @param {string} options.featureType - Type of feature (cmd_l, browser, etc.)
     * @param {Object} options.usage - Usage data {used, limit, remaining}
     * @returns {Promise} Promise that resolves with user's choice
     */
    async showUpgradeDialog(options) {
        const {
            title = 'Usage Limit Reached',
            message,
            detail = 'Upgrade to Pro for unlimited access',
            featureType,
            usage
        } = options;

        return new Promise((resolve) => {
            console.log('[CustomDialogService] 🎯 Creating upgrade dialog as proper overlay window');
            
            // Create upgrade dialog as a proper overlay window (like settings/browser)
            const { BrowserWindow, screen } = require('electron');
            const { windowPool } = require('../../../window/windowManager');
            const path = require('path');
            
            // Check if upgrade dialog already exists
            if (windowPool.has('upgrade-dialog')) {
                const existingDialog = windowPool.get('upgrade-dialog');
                if (existingDialog && !existingDialog.isDestroyed()) {
                    existingDialog.focus();
                    resolve('existing');
                    return;
                }
            }
            
            const dialogId = Date.now().toString();
            
            // Create proper overlay window with same properties as other overlays
            const upgradeDialog = new BrowserWindow({
                width: 500,
                height: 600,
                resizable: false,
                movable: true,
                minimizable: false,
                maximizable: false,
                fullscreenable: false,
                show: false, // Start hidden, will show after setup
                frame: false,
                transparent: true,
                hasShadow: false,
                webSecurity: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    preload: path.join(__dirname, '../../../preload.js')
                }
            });
            
            // Apply same privacy protection as other overlays (CRITICAL for hiding from screenshots)
            try {
                const { isContentProtectionOn } = require('../../../window/windowManager');
                upgradeDialog.setContentProtection(isContentProtectionOn || true); // Always protect by default
                console.log('[CustomDialogService] ✅ Content protection applied - dialog hidden from screenshots');
            } catch (err) {
                console.warn('[CustomDialogService] Could not get content protection setting:', err.message);
                // Fallback: Always enable content protection for security
                upgradeDialog.setContentProtection(true);
            }
            
            // Make invisible like other overlays
            upgradeDialog.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
            upgradeDialog.setSkipTaskbar(true); // Hide from taskbar like other overlays
            
            // Set always on top like other overlays
            if (process.platform === 'darwin') {
                upgradeDialog.setAlwaysOnTop(true, 'screen-saver');
            } else {
                upgradeDialog.setAlwaysOnTop(true);
            }
            
            // Add to window pool for proper management
            windowPool.set('upgrade-dialog', upgradeDialog);
            
            // Create the upgrade dialog HTML content
            const htmlContent = this.createUpgradeDialogHTML({
                title,
                message,
                detail,
                featureType,
                usage,
                dialogId
            });
            
            // Load HTML content into the overlay window
            upgradeDialog.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
            
            // Position the dialog window (centered on screen)
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
            
            upgradeDialog.setBounds({
                x: Math.round((screenWidth - 500) / 2),
                y: Math.round((screenHeight - 600) / 2),
                width: 500,
                height: 600
            });
            
            // Show the window after setup
            upgradeDialog.once('ready-to-show', () => {
                upgradeDialog.show();
                upgradeDialog.focus();
                console.log('[CustomDialogService] ✅ Upgrade dialog overlay window shown');
            });
            
            // Store dialog reference for cleanup
            this.activeDialogs.set(dialogId, { type: 'window', windowRef: upgradeDialog });

            // Handle dialog actions via IPC
            const { ipcMain } = require('electron');
            
            const handleUpgrade = () => {
                console.log(`[CustomDialogService] Upgrade button clicked for dialog: ${dialogId}`);
                
                // Clean up window
                if (upgradeDialog && !upgradeDialog.isDestroyed()) {
                    upgradeDialog.close();
                }
                windowPool.delete('upgrade-dialog');
                this.activeDialogs.delete(dialogId);
                
                // Remove IPC listeners  
                ipcMain.removeAllListeners(`dialog-upgrade-${dialogId}`);
                ipcMain.removeAllListeners(`dialog-cancel-${dialogId}`);
                
                // Open upgrade page
                const { shell } = require('electron');
                shell.openExternal('https://www.leviousa.com/settings/billing');
                resolve('upgrade');
            };

            const handleCancel = () => {
                console.log(`[CustomDialogService] Cancel button clicked for dialog: ${dialogId}`);
                
                // Clean up window
                if (upgradeDialog && !upgradeDialog.isDestroyed()) {
                    upgradeDialog.close();
                }
                windowPool.delete('upgrade-dialog');
                this.activeDialogs.delete(dialogId);
                
                // Remove IPC listeners
                ipcMain.removeAllListeners(`dialog-upgrade-${dialogId}`);
                ipcMain.removeAllListeners(`dialog-cancel-${dialogId}`);
                
                resolve('cancel');
            };

            // Register IPC listeners with CORRECT event names (matching HTML)
            ipcMain.once(`dialog-upgrade-${dialogId}`, handleUpgrade);
            ipcMain.once(`dialog-cancel-${dialogId}`, handleCancel);
            
            // Handle window close event (X button or programmatic close)
            upgradeDialog.on('closed', () => {
                console.log(`[CustomDialogService] Upgrade dialog window closed`);
                windowPool.delete('upgrade-dialog');
                this.activeDialogs.delete(dialogId);
                
                // Clean up IPC listeners
                ipcMain.removeAllListeners(`dialog-upgrade-${dialogId}`);
                ipcMain.removeAllListeners(`dialog-cancel-${dialogId}`);
                
                resolve('closed');
            });
            
            // Auto-cleanup after 60 seconds
            setTimeout(() => {
                if (upgradeDialog && !upgradeDialog.isDestroyed()) {
                    console.log('[CustomDialogService] Auto-closing upgrade dialog after timeout');
                    upgradeDialog.close();
                }
            }, 60000);
        });
    }

    /**
     * Create HTML content for the upgrade dialog
     */
    createUpgradeDialogHTML(options) {
        const { title, message, detail, featureType, usage, dialogId } = options;

        // Feature-specific messaging
        const featureDisplayNames = {
            'cmd_l': 'Auto Answer (Cmd+L)',
            'browser': 'Browser Automation',
            'integration': 'Premium Integrations',
            'general': 'Premium Features'
        };

        const featureName = featureDisplayNames[featureType] || 'Premium Features';
        
        // Usage progress calculation (only for features with usage limits)
        const progressPercent = usage ? Math.min((usage.used / usage.limit) * 100, 100) : 100;
        const showUsageBar = usage && featureType !== 'integration';

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <title>${title}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    overflow: hidden;
                }

                .dialog-container {
                    background: linear-gradient(135deg, #905151 0%, #724040 100%);
                    border-radius: 16px;
                    padding: 2px;
                    box-shadow: 0 20px 60px rgba(144, 81, 81, 0.4);
                    animation: slideIn 0.3s ease-out;
                }

                .dialog-content {
                    background: white;
                    border-radius: 14px;
                    padding: 32px;
                    width: 440px;
                    text-align: center;
                    position: relative;
                }

                .dialog-icon {
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #905151 0%, #724040 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    color: white;
                    font-size: 28px;
                    font-weight: bold;
                }

                .dialog-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: #905151;
                    margin-bottom: 12px;
                    line-height: 1.3;
                }

                .dialog-message {
                    font-size: 16px;
                    color: #4a4a4a;
                    margin-bottom: 8px;
                    line-height: 1.4;
                }

                .dialog-detail {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 24px;
                    line-height: 1.4;
                }

                .usage-info {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 24px;
                    border-left: 4px solid #667eea;
                }

                .usage-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 8px;
                }

                .usage-bar {
                    background: #e9ecef;
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }

                .usage-progress {
                    height: 100%;
                    background: linear-gradient(90deg, #905151 0%, #724040 100%);
                    border-radius: 4px;
                    width: ${progressPercent}%;
                    transition: width 0.3s ease;
                }

                .usage-text {
                    font-size: 12px;
                    color: #666;
                    display: flex;
                    justify-content: space-between;
                }

                .integration-info {
                    background: linear-gradient(135deg, rgba(144, 81, 81, 0.08) 0%, rgba(114, 64, 64, 0.08) 100%);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 24px;
                    text-align: center;
                    border: 1px solid rgba(144, 81, 81, 0.2);
                }

                .integration-icon {
                    font-size: 32px;
                    margin-bottom: 12px;
                }

                .integration-text h4 {
                    color: #333;
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .integration-text p {
                    color: #555;
                    font-size: 14px;
                    line-height: 1.4;
                }

                .pro-benefits {
                    background: linear-gradient(135deg, rgba(144, 81, 81, 0.08) 0%, rgba(114, 64, 64, 0.08) 100%);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 24px;
                    text-align: left;
                    border: 1px solid rgba(144, 81, 81, 0.15);
                }

                .pro-benefits h4 {
                    color: #333;
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .pro-benefits ul {
                    list-style: none;
                    color: #555;
                    font-size: 13px;
                }

                .pro-benefits li {
                    margin-bottom: 4px;
                    padding-left: 16px;
                    position: relative;
                }

                .pro-benefits li:before {
                    content: "✓";
                    position: absolute;
                    left: 0;
                    color: #905151;
                    font-weight: bold;
                }

                .dialog-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }

                .dialog-button {
                    padding: 12px 24px;
                    border-radius: 8px;
                    border: none;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-width: 100px;
                }

                .dialog-button.primary {
                    background: linear-gradient(45deg, #905151, #724040);
                    color: white;
                }

                .dialog-button.primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(144, 81, 81, 0.4);
                    background: linear-gradient(45deg, #724040, #5a3232);
                }

                .dialog-button.secondary {
                    background: #f8f9fa;
                    color: #666;
                    border: 1px solid #dee2e6;
                }

                .dialog-button.secondary:hover {
                    background: #e9ecef;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .close-button {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: #999;
                    cursor: pointer;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .close-button:hover {
                    background: #f0f0f0;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="dialog-container">
                <div class="dialog-content">
                    <button class="close-button" onclick="handleAction('cancel')">&times;</button>
                    
                    <div class="dialog-icon">⚡</div>
                    
                    <h2 class="dialog-title">${title}</h2>
                    <p class="dialog-message">${message}</p>
                    <p class="dialog-detail">${detail}</p>

                    ${showUsageBar ? `
                    <div class="usage-info">
                        <div class="usage-label">${featureName} Usage</div>
                        <div class="usage-bar">
                            <div class="usage-progress"></div>
                        </div>
                        <div class="usage-text">
                            <span>Daily limit reached</span>
                            <span>Resets in 24 hours</span>
                        </div>
                    </div>
                    ` : ''}

                    ${featureType === 'integration' ? `
                    <div class="integration-info">
                        <div class="integration-icon">🔗</div>
                        <div class="integration-text">
                            <h4>Access 130+ Premium Integrations</h4>
                            <p>Connect Gmail, Google Calendar, Notion, LinkedIn, Slack, Salesforce, HubSpot and many more with Leviousa Pro.</p>
                        </div>
                    </div>
                    ` : ''}

                    <div class="pro-benefits">
                        <h4>🚀 Leviousa Pro Benefits:</h4>
                        <ul>
                            ${featureType === 'integration' ? '<li>130+ Premium Integrations (Gmail, Notion, Slack, etc.)</li>' : ''}
                            <li>Unlimited Auto Answer (Cmd+L)</li>
                            <li>Unlimited Browser Automation</li>
                            ${featureType !== 'integration' ? '<li>Access to All Integrations</li>' : ''}
                            <li>Priority Support</li>
                            <li>Advanced AI Models</li>
                        </ul>
                    </div>

                    <div class="dialog-actions">
                        <button class="dialog-button secondary" onclick="handleAction('cancel')">
                            Maybe Later
                        </button>
                        <button class="dialog-button primary" onclick="handleAction('upgrade')">
                            🚀 Upgrade to Pro
                        </button>
                    </div>
                </div>
            </div>

            <script>
                function handleAction(action) {
                    console.log('Dialog action clicked:', action);
                    if (window.api && window.api.send) {
                        if (action === 'upgrade') {
                            console.log('Sending upgrade event for dialog: ${dialogId}');
                            window.api.send('dialog-upgrade-${dialogId}');
                        } else {
                            console.log('Sending cancel event for dialog: ${dialogId}');
                            window.api.send('dialog-cancel-${dialogId}');
                        }
                    } else {
                        console.error('window.api.send not available');
                    }
                }

                // Handle keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        handleAction('cancel');
                    } else if (e.key === 'Enter') {
                        handleAction('upgrade');
                    }
                });

                // Focus on upgrade button
                document.addEventListener('DOMContentLoaded', () => {
                    document.querySelector('.dialog-button.primary').focus();
                });
            </script>
        </body>
        </html>
        `;
        
        // Replace dialogId placeholders with actual dialogId  
        return html.replace(/\$\{dialogId\}/g, dialogId);
    }

    /**
     * Close all active dialogs
     */
    closeAllDialogs() {
        for (const [id, window] of this.activeDialogs) {
            if (!window.isDestroyed()) {
                window.close();
            }
            this.activeDialogs.delete(id);
        }
    }
}

// Create singleton instance
const customDialogService = new CustomDialogService();

module.exports = customDialogService;
