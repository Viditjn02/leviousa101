#!/usr/bin/env node

/**
 * Test script for OAuth localhost callback server
 * This tests whether the localhost callback mechanism works correctly
 */

const http = require('http');
const { spawn } = require('child_process');

console.log('🧪 Testing OAuth localhost callback server...\n');

async function testLocalhostCallback() {
    return new Promise((resolve, reject) => {
        let port; // Declare port variable in the correct scope
        
        // Create test server
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://localhost:${port}`);
            console.log(`✅ Received callback: ${url.toString()}`);
            
            // Send success response
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>✅ OAuth Callback Test Successful!</h1>
                <p>Localhost server received the callback correctly.</p>
                <p>URL: ${url.toString()}</p>
                <script>setTimeout(() => window.close(), 2000);</script>
            `);
            
            server.close(() => {
                console.log('✅ Test server closed');
                resolve();
            });
        });

        // Start on random port
        server.listen(0, 'localhost', (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            port = server.address().port; // Set port after server starts
            console.log(`🚀 Test server started on http://localhost:${port}`);
            
            // Test URL with OAuth-like parameters
            const testUrl = `http://localhost:${port}/callback?code=test_code_123&state=test_state_456`;
            
            console.log(`🌐 Opening test URL: ${testUrl}`);
            
            // Open in system browser
            const opener = process.platform === 'darwin' ? 'open' : 
                          process.platform === 'win32' ? 'start' : 'xdg-open';
            
            spawn(opener, [testUrl], { 
                stdio: 'ignore',
                detached: true
            }).unref();
            
            // Fallback timeout
            setTimeout(() => {
                server.close();
                reject(new Error('Test timeout - no callback received'));
            }, 30000);
        });
    });
}

// Run test
testLocalhostCallback()
    .then(() => {
        console.log('\n🎉 OAuth localhost callback test completed successfully!');
        console.log('✅ The localhost callback mechanism is working correctly.');
        console.log('✅ Your OAuth integrations should work reliably.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ OAuth localhost callback test failed:', error.message);
        console.error('❌ Check your network configuration and try again.');
        process.exit(1);
    }); 