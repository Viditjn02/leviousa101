#!/usr/bin/env node

/**
 * Test the MCP server directly to see our debug output
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔧 Testing Paragon MCP Server Directly\n');

function testMCPServerDirect() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting MCP server...');
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env
            },
            cwd: __dirname
        });

        let output = '';
        let errorOutput = '';

        server.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('📤 STDOUT:', text.trim());
        });

        server.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            console.log('📤 STDERR:', text.trim());
        });

        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            reject(error);
        });

        // Initialize the server
        setTimeout(() => {
            console.log('\n🔧 Initializing MCP protocol...');
            const initRequest = JSON.stringify({
                jsonrpc: "2.0",
                id: 0,
                method: "initialize",
                params: {
                    protocolVersion: "2025-06-18",
                    capabilities: {},
                    clientInfo: { name: "direct-test", version: "1.0.0" }
                }
            }) + '\n';
            
            server.stdin.write(initRequest);
            
            setTimeout(() => {
                console.log('\n📡 Calling get_authenticated_services...');
                const toolRequest = JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: {
                        name: "get_authenticated_services",
                        arguments: { user_id: "vqLrzGnqajPGlX9Wzq89SgqVPsN2" }
                    }
                }) + '\n';
                
                server.stdin.write(toolRequest);
                
                setTimeout(() => {
                    console.log('\n⏹️ Stopping server...');
                    server.kill();
                    resolve({ output, errorOutput });
                }, 5000);
            }, 2000);
        }, 1000);
    });
}

testMCPServerDirect().then(({ output, errorOutput }) => {
    console.log('\n📊 Final Summary:');
    console.log('Look for our debug messages in the output above');
    console.log('Expected: "[ParagonMCP] 🔍 Private key loaded:", "[ParagonMCP] 🔑 JWT key format check:"');
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});