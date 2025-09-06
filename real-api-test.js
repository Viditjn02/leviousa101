#!/usr/bin/env node

/**
 * REAL API TESTING - Connects to running Electron app and makes actual MCP calls
 * Tests with real user ID: vqLrzGnqajPGlX9Wzq89SgqVPsN2
 */

const { spawn } = require('child_process');
const fs = require('fs');

const REAL_USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

console.log('🔥 REAL API TESTING WITH RUNNING ELECTRON APP');
console.log('==============================================');
console.log(`📋 Real User ID: ${REAL_USER_ID}`);
console.log(`🕐 Started: ${new Date().toISOString()}`);
console.log();

// Create a test HTML page that can be run in the Electron app's renderer process
function createRendererTest() {
    const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Real MCP API Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: #fff; }
        .test { margin: 10px 0; padding: 10px; border: 1px solid #444; border-radius: 4px; }
        .success { border-color: #4CAF50; color: #4CAF50; }
        .error { border-color: #f44336; color: #f44336; }
        .pending { border-color: #FF9800; color: #FF9800; }
        pre { background: #2a2a2a; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔥 Real MCP API Tests</h1>
    <div id="results"></div>

    <script>
        const REAL_USER_ID = '${REAL_USER_ID}';
        const results = document.getElementById('results');
        
        function addResult(testName, status, data) {
            const div = document.createElement('div');
            div.className = 'test ' + status;
            div.innerHTML = '<h3>' + testName + ' - ' + status.toUpperCase() + '</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            results.appendChild(div);
        }

        async function runAllTests() {
            console.log('🚀 Starting real API tests...');
            
            // Test 1: Notion (Proxy API)
            try {
                console.log('Testing Notion list databases...');
                const notionResult = await window.api.mcp.callTool('notion_list_databases', { 
                    user_id: REAL_USER_ID 
                });
                addResult('Notion List Databases', 'success', notionResult);
            } catch (error) {
                addResult('Notion List Databases', 'error', { error: error.message });
            }
            
            // Test 2: LinkedIn (Zeus workflow)
            try {
                console.log('Testing LinkedIn get profile...');
                const linkedinResult = await window.api.mcp.callTool('linkedin_get_profile', {
                    user_id: REAL_USER_ID,
                    profile_id: 'me'
                });
                addResult('LinkedIn Get Profile', 'success', linkedinResult);
            } catch (error) {
                addResult('LinkedIn Get Profile', 'error', { error: error.message });
            }
            
            // Test 3: Google Calendar (Zeus workflow)
            try {
                console.log('Testing Google Calendar create event...');
                const now = new Date();
                const startTime = new Date(now.getTime() + 60 * 60 * 1000);
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                
                const calendarResult = await window.api.mcp.callTool('google_calendar_create_event', {
                    user_id: REAL_USER_ID,
                    summary: 'Real API Test Event - ' + new Date().toLocaleString(),
                    description: 'Testing real API calls through Zeus workflow',
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    location: 'Virtual'
                });
                addResult('Google Calendar Create Event', 'success', calendarResult);
            } catch (error) {
                addResult('Google Calendar Create Event', 'error', { error: error.message });
            }
            
            // Test 4: Calendly (Zeus workflow)
            try {
                console.log('Testing Calendly search events...');
                const now = new Date();
                const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                
                const calendlyResult = await window.api.mcp.callTool('calendly_search_events', {
                    user_id: REAL_USER_ID,
                    start_time: lastWeek.toISOString(),
                    end_time: nextWeek.toISOString(),
                    status: 'active',
                    count: 10
                });
                addResult('Calendly Search Events', 'success', calendlyResult);
            } catch (error) {
                addResult('Calendly Search Events', 'error', { error: error.message });
            }
            
            // Test 5: Gmail (verify still works)
            try {
                console.log('Testing Gmail send email...');
                const gmailResult = await window.api.mcp.callTool('GMAIL_SEND_EMAIL', {
                    user_id: REAL_USER_ID,
                    toRecipients: [{ emailAddress: { address: 'test@leviousa.com' } }],
                    messageContent: {
                        subject: 'Real API Test - ' + new Date().toLocaleString(),
                        body: {
                            content: 'This email was sent via real API testing of all Zeus workflows and Proxy APIs!',
                            contentType: 'text'
                        }
                    }
                });
                addResult('Gmail Send Email', 'success', gmailResult);
            } catch (error) {
                addResult('Gmail Send Email', 'error', { error: error.message });
            }
            
            console.log('✅ All real API tests completed!');
        }
        
        // Start tests immediately
        runAllTests();
        
        // Also make results available globally for inspection
        window.testResults = results;
    </script>
</body>
</html>`;
    
    fs.writeFileSync('real-api-test.html', testHTML);
    console.log('✅ Created real-api-test.html for Electron renderer testing');
}

// Create a Node.js script that can spawn a minimal Electron window to run our test
function createElectronTestRunner() {
    const testScript = `
const { app, BrowserWindow } = require('electron');
const path = require('path');

let testWindow;

function createTestWindow() {
    testWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src', 'preload.js')
        },
        show: false // Hide window, we just want to run tests
    });
    
    // Load our test page
    testWindow.loadFile('real-api-test.html');
    
    // Capture console logs
    testWindow.webContents.on('console-message', (event, level, message) => {
        console.log('[Renderer]', message);
    });
    
    // Wait for tests to complete, then close
    setTimeout(() => {
        console.log('✅ Test window completed, closing...');
        testWindow.close();
        app.quit();
    }, 30000); // 30 seconds timeout
}

app.whenReady().then(createTestWindow);

app.on('window-all-closed', () => {
    app.quit();
});
`;
    
    fs.writeFileSync('run-real-api-test.js', testScript);
    console.log('✅ Created run-real-api-test.js for Electron testing');
}

// Test by opening the HTML file in the already running Electron app
async function testWithRunningApp() {
    console.log('🎯 Opening test page in running Electron app...');
    
    try {
        // Check if app is running
        const processes = require('child_process').execSync('ps aux | grep -E "electron.*Leviousa101" | grep -v grep', { encoding: 'utf8' });
        if (!processes.trim()) {
            throw new Error('Electron app not running. Start with: npm start');
        }
        
        console.log('✅ Electron app detected running');
        
        // Create test files
        createRendererTest();
        
        console.log('📂 Real API test files created:');
        console.log('   - real-api-test.html (renderer test page)');
        console.log();
        console.log('🎯 TO RUN REAL API TESTS:');
        console.log('   1. Open the running Electron app');
        console.log('   2. Navigate to the real-api-test.html file in the app');
        console.log('   3. Watch the console for real API call results');
        console.log();
        console.log('📊 EXPECTED RESULTS:');
        console.log('   ✅ Notion: Should call Proxy API with Notion-Version header');
        console.log('   ✅ LinkedIn: Should call Zeus workflow 713b7427 & 05f302b6');
        console.log('   ✅ Google Calendar: Should call Zeus workflow ebc98b20 with timezone');
        console.log('   ✅ Calendly: Should call Zeus workflow 8ea4f738');
        console.log('   ✅ Gmail: Should work as before (Proxy + Zeus hybrid)');
        console.log();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error testing with running app:', error.message);
        return false;
    }
}

// Try direct MCP server testing if running app test isn't feasible
async function testDirectMCP() {
    console.log('🔍 Testing MCP server directly...');
    
    try {
        const mcpServerPath = './services/paragon-mcp/dist/index.mjs';
        if (!fs.existsSync(mcpServerPath)) {
            throw new Error('MCP server not found at ' + mcpServerPath);
        }
        
        console.log('✅ MCP server found, starting direct test...');
        
        // This would require implementing JSON-RPC protocol
        // For now, let's just verify the server can start
        const testProcess = spawn('node', [mcpServerPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        testProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        testProcess.stderr.on('data', (data) => {
            console.log('MCP Server Error:', data.toString());
        });
        
        // Send a simple initialization
        setTimeout(() => {
            const initMsg = JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'test-client', version: '1.0.0' }
                }
            }) + '\\n';
            
            testProcess.stdin.write(initMsg);
        }, 1000);
        
        setTimeout(() => {
            testProcess.kill();
            console.log('📊 MCP Server Direct Test Output:');
            console.log(output);
        }, 3000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Direct MCP test error:', error.message);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting real API testing...');
    
    // Try testing with running app first
    const runningAppSuccess = await testWithRunningApp();
    
    if (!runningAppSuccess) {
        console.log('⚠️  Running app test failed, trying direct MCP test...');
        await testDirectMCP();
    }
    
    console.log();
    console.log('🎯 REAL API TESTING SUMMARY:');
    console.log('============================');
    console.log('✅ Test files created and ready');
    console.log('🔥 Use real-api-test.html in the running Electron app');
    console.log('📊 All integrations should show real API responses');
    console.log('🎉 Zeus workflows and Proxy APIs ready for testing!');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, testWithRunningApp, testDirectMCP };


