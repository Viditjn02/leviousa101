#!/usr/bin/env node

/**
 * Debug by checking actual MCP server output
 */

const { spawn } = require('child_process');
const path = require('path');

async function debugServerLogs() {
    console.log('🔍 Debugging Paragon MCP Server Output\n');
    
    return new Promise((resolve) => {
        console.log('🚀 Starting Paragon MCP server to see debug output...');
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env
            }
        });
        
        let allOutput = '';
        
        // Capture all output
        server.stdout.on('data', (data) => {
            const text = data.toString();
            allOutput += text;
            console.log('📤 STDOUT:', text.trim());
        });
        
        server.stderr.on('data', (data) => {
            const text = data.toString();
            allOutput += text;
            console.log('🔴 STDERR:', text.trim());
        });
        
        // Give server time to start
        setTimeout(() => {
            console.log('\n🔧 Sending initialize request...');
            
            const initRequest = {
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: {
                        name: "debug-client",
                        version: "1.0.0"
                    }
                }
            };
            
            server.stdin.write(JSON.stringify(initRequest) + '\n');
            
            // Wait a moment then send tool call
            setTimeout(() => {
                console.log('\n🔧 Sending get_authenticated_services request...');
                
                const toolRequest = {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "tools/call",
                    params: {
                        name: "get_authenticated_services",
                        arguments: {
                            user_id: "vqLrzGnqajPGlX9Wzq89SgqVPsN2"
                        }
                    }
                };
                
                server.stdin.write(JSON.stringify(toolRequest) + '\n');
                
                // Wait for response
                setTimeout(() => {
                    console.log('\n📋 COMPLETE SERVER OUTPUT:');
                    console.log('='.repeat(80));
                    console.log(allOutput);
                    console.log('='.repeat(80));
                    
                    server.kill();
                    resolve();
                }, 3000);
                
            }, 1000);
            
        }, 1000);
    });
}

debugServerLogs().catch(console.error);