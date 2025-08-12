#!/usr/bin/env node

/**
 * Test just the JWT generation to isolate the private key issue
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔑 Testing JWT Generation Only\n');

function testJWTGeneration() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting Paragon MCP server for JWT test...');
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                // Use our environment variables
                PARAGON_PROJECT_ID: 'db5e019e-0558-4378-93de-f212a73e0606',
                PARAGON_JWT_SECRET: process.env.PARAGON_JWT_SECRET || 'test'
            }
        });

        let output = '';
        let errorOutput = '';

        server.stdout.on('data', (data) => {
            output += data.toString();
        });

        server.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            console.log('📊 Server Log:', text.trim());
        });

        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            reject(error);
        });

        // Just initialize and call one tool to see the JWT logs
        setTimeout(() => {
            console.log('🔧 Initializing...');
            
            const initRequest = JSON.stringify({
                jsonrpc: "2.0",
                id: 0,
                method: "initialize",
                params: {
                    protocolVersion: "2025-06-18",
                    capabilities: {},
                    clientInfo: { name: "jwt-test", version: "1.0.0" }
                }
            }) + '\n';
            
            server.stdin.write(initRequest);
            
            setTimeout(() => {
                console.log('📡 Testing JWT generation...');
                const toolRequest = JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: {
                        name: "get_authenticated_services",
                        arguments: { user_id: "test-user" }
                    }
                }) + '\n';
                
                server.stdin.write(toolRequest);
                
                setTimeout(() => {
                    server.kill();
                    resolve({ output, errorOutput });
                }, 3000);
            }, 1000);
        }, 1000);
    });
}

// Run test
testJWTGeneration().then(({ output, errorOutput }) => {
    console.log('\n📊 Analysis Complete');
    console.log('Look at the logs above for JWT key format information');
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});