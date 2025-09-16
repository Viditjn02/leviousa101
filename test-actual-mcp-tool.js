#!/usr/bin/env node

/**
 * Test the ACTUAL MCP tool call - not just WebSocket communication
 * This will tell us if the app is using the NEW fixed MCP server
 */

const { spawn } = require('child_process');

console.log('🧪 Testing ACTUAL MCP tool call on running app...');

// Find the running app port
const { exec } = require('child_process');

exec("lsof -i | grep LISTEN | grep Leviousa | head -1", (error, stdout, stderr) => {
    if (error) {
        console.log('❌ Could not find running app:', error.message);
        process.exit(1);
    }
    
    const match = stdout.match(/:(\d+)/);
    if (!match) {
        console.log('❌ Could not parse app port from:', stdout);
        process.exit(1);
    }
    
    const port = match[1];
    console.log(`✅ Found app on port: ${port}`);
    
    // Test the actual MCP endpoint that calls get_authenticated_services
    console.log('📞 Testing ACTUAL MCP tool call via app API...');
    
    const curlTest = spawn('curl', [
        '-s', '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-H', 'X-User-ID: vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        '-d', JSON.stringify({
            tool: 'get_authenticated_services',
            args: {
                user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
            }
        }),
        `http://localhost:${port}/api/mcp/tools/call`
    ]);
    
    let mcpResponse = '';
    
    curlTest.stdout.on('data', (data) => {
        mcpResponse += data.toString();
    });
    
    curlTest.stderr.on('data', (data) => {
        console.log('📤 [CURL ERROR]:', data.toString());
    });
    
    curlTest.on('close', (code) => {
        console.log('📊 MCP Tool Call Response:', mcpResponse);
        
        try {
            const parsed = JSON.parse(mcpResponse);
            
            if (parsed.success && parsed.result) {
                // Look for the authenticated_services in the response
                const resultText = parsed.result.content?.[0]?.text;
                if (resultText) {
                    const serviceResult = JSON.parse(resultText);
                    console.log('🔍 Authenticated Services:', serviceResult.authenticated_services);
                    
                    if (serviceResult.authenticated_services && serviceResult.authenticated_services.length > 0) {
                        console.log('🎉 SUCCESS: MCP server now detects authenticated integrations!');
                        console.log('✅ Fixed services:', serviceResult.authenticated_services);
                    } else {
                        console.log('❌ STILL EMPTY: MCP server still returns empty authenticated_services');
                        console.log('🔧 This means the app is still using the OLD MCP server code');
                    }
                } else {
                    console.log('⚠️ Unexpected response format:', parsed);
                }
            } else {
                console.log('❌ MCP tool call failed:', parsed);
            }
        } catch (e) {
            console.log('❌ Invalid JSON response:', mcpResponse);
            
            // If JSON parsing fails, try a different endpoint
            console.log('\n🔄 Trying alternative MCP status endpoint...');
            testStatusEndpoint(port);
        }
        
        if (!mcpResponse.includes('authenticated_services')) {
            testStatusEndpoint(port);
        } else {
            process.exit(0);
        }
    });
});

function testStatusEndpoint(port) {
    const curlTest2 = spawn('curl', [
        '-s',
        `http://localhost:${port}/api/mcp/status`
    ]);
    
    let statusResponse = '';
    
    curlTest2.stdout.on('data', (data) => {
        statusResponse += data.toString();
    });
    
    curlTest2.on('close', (code) => {
        console.log('📊 MCP Status Response:', statusResponse);
        process.exit(0);
    });
}
