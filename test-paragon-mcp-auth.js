#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

/**
 * Test script to verify Paragon MCP server integration
 */
async function testParagonMCP() {
    console.log('🧪 Testing Paragon MCP Server Integration...\n');
    
    try {
        // Test 1: Check if Paragon MCP server can start
        console.log('1️⃣ Testing Paragon MCP Server Startup...');
        const serverPath = path.join(__dirname, 'services/paragon-mcp/dist/index.mjs');
        
        const serverProcess = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });
        
        let serverOutput = '';
        let serverErrors = '';
        
        serverProcess.stdout.on('data', (data) => {
            serverOutput += data.toString();
        });
        
        serverProcess.stderr.on('data', (data) => {
            serverErrors += data.toString();
        });
        
        // Wait for server to initialize
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        if (serverErrors.includes('Starting Paragon MCP Server')) {
            console.log('✅ Paragon MCP Server started successfully');
        } else {
            console.log('❌ Paragon MCP Server failed to start');
            console.log('Server output:', serverOutput);
            console.log('Server errors:', serverErrors);
        }
        
        // Test 2: Try to communicate with the server via JSON-RPC
        console.log('\n2️⃣ Testing JSON-RPC Communication...');
        
        const initMessage = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    roots: {
                        listChanged: true
                    },
                    sampling: {}
                },
                clientInfo: {
                    name: 'leviousa-test-client',
                    version: '1.0.0'
                }
            }
        };
        
        serverProcess.stdin.write(JSON.stringify(initMessage) + '\n');
        
        // Test 3: List available tools
        setTimeout(() => {
            console.log('\n3️⃣ Testing Tool Discovery...');
            const listToolsMessage = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list'
            };
            
            serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
        }, 1000);
        
        // Test 4: Test get_authenticated_services tool
        setTimeout(() => {
            console.log('\n4️⃣ Testing get_authenticated_services Tool...');
            const callToolMessage = {
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'get_authenticated_services',
                    arguments: {}
                }
            };
            
            serverProcess.stdin.write(JSON.stringify(callToolMessage) + '\n');
        }, 2000);
        
        // Listen for responses
        let responseCount = 0;
        serverProcess.stdout.on('data', (data) => {
            const responses = data.toString().split('\n').filter(line => line.trim());
            responses.forEach(response => {
                if (response.trim()) {
                    try {
                        const parsed = JSON.parse(response);
                        responseCount++;
                        
                        console.log(`📨 Response ${responseCount}:`, JSON.stringify(parsed, null, 2));
                        
                        if (parsed.result && parsed.result.tools) {
                            const hasAuthTool = parsed.result.tools.some(tool => 
                                tool.name === 'get_authenticated_services'
                            );
                            if (hasAuthTool) {
                                console.log('✅ get_authenticated_services tool found!');
                            } else {
                                console.log('❌ get_authenticated_services tool not found');
                                console.log('Available tools:', parsed.result.tools.map(t => t.name));
                            }
                        }
                        
                        if (parsed.error) {
                            console.log('❌ Error response:', parsed.error);
                        }
                    } catch (e) {
                        console.log('📝 Raw output:', response);
                    }
                }
            });
        });
        
        // Clean up after 10 seconds
        setTimeout(() => {
            console.log('\n🧹 Cleaning up test...');
            serverProcess.kill();
            
            if (responseCount > 0) {
                console.log('\n✅ Test completed successfully - Server is responding to JSON-RPC calls');
            } else {
                console.log('\n❌ Test failed - No responses received from server');
            }
            
            process.exit(0);
        }, 10000);
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
testParagonMCP().catch(console.error); 