const { app, BrowserWindow } = require('electron');
const path = require('path');

app.on('ready', async () => {
    console.log('[TEST] Starting Paragon OAuth test...');
    
    // Initialize the app
    require('./src/index.js');
    
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get the main window
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows.find(w => !w.isDestroyed());
    
    if (mainWindow) {
        console.log('[TEST] Found main window, navigating to integrations...');
        
        // Navigate to integrations
        mainWindow.webContents.executeJavaScript(`
            // Trigger integrations navigation
            if (window.location.pathname !== '/integrations') {
                console.log('[TEST] Navigating to integrations page...');
                window.location.href = '/integrations';
            }
        `);
        
        // Wait for page load and then click Gmail connect
        setTimeout(() => {
            mainWindow.webContents.executeJavaScript(`
                console.log('[TEST] Looking for Gmail connect button...');
                const buttons = Array.from(document.querySelectorAll('button'));
                const gmailButton = buttons.find(btn => {
                    const parent = btn.closest('[class*="gmail"]') || btn.closest('div');
                    return parent && parent.textContent.includes('Gmail') && btn.textContent.includes('Connect');
                });
                
                if (gmailButton) {
                    console.log('[TEST] ✅ Found Gmail connect button, clicking...');
                    gmailButton.click();
                } else {
                    console.log('[TEST] ❌ Could not find Gmail connect button');
                    console.log('[TEST] Available buttons:', buttons.map(b => b.textContent));
                }
            `);
        }, 8000);
    }
    
    // Log window events
    app.on('browser-window-created', (event, window) => {
        console.log('[TEST] New window created:', window.getTitle());
        
        window.webContents.on('did-navigate', (event, url) => {
            console.log('[TEST] Window navigated to:', url);
            
            // Check if OAuth succeeded
            if (url.includes('passport.useparagon.com/oauth')) {
                console.log('[TEST] 🎯 OAuth URL detected! Paragon integration working!');
            }
        });
    });
});

// Keep app running
setInterval(() => {}, 1000);
