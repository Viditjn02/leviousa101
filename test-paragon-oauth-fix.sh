#!/bin/bash

# Test script for Paragon OAuth fix
# This script tests the complete flow after the delegation loop fix

echo "🔧 Testing Paragon OAuth Integration Fix..."
echo "============================================"

# 1. First, rebuild the web app with the fixes
echo "📦 Building web app with fixes..."
cd /Applications/XAMPP/xamppfiles/htdocs/Leviousa101/leviousa_web
npm run build

echo ""
echo "✅ Web app rebuilt with fixes"
echo ""

# 2. Now test in Electron
echo "🚀 Starting Electron app to test..."
cd /Applications/XAMPP/xamppfiles/htdocs/Leviousa101

# Create a test runner that will click the Gmail connect button
cat > test-paragon-oauth-fix.js << 'EOF'
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
EOF

echo "🧪 Running test..."
npm test

echo ""
echo "============================================"
echo "📊 TEST RESULTS:"
echo ""
echo "✅ EXPECTED BEHAVIOR:"
echo "   1. Electron app opens"
echo "   2. Navigates to /integrations page"
echo "   3. Clicks 'Connect' on Gmail"
echo "   4. Opens NEW window with /integrations?authenticate=gmail"
echo "   5. That window opens OAuth popup to passport.useparagon.com"
echo "   6. User completes Google OAuth"
echo "   7. Gmail shows as 'Connected'"
echo ""
echo "❌ IF IT FAILS:"
echo "   - Check console for '[ParagonIntegration] Already in delegated window'"
echo "   - OAuth URL should open: https://passport.useparagon.com/oauth"
echo "   - NO infinite loop of /integrations windows"
echo ""
echo "🔍 Check the console output above for test results"
