#!/usr/bin/env node

/**
 * Test if the environment variable fix works
 */

const { spawn } = require('child_process');
const path = require('path');

async function testEnvFix() {
    console.log('🧪 Testing Environment Variable Fix\n');
    
    return new Promise((resolve) => {
        console.log('🚀 Starting server to test environment loading...');
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env
            }
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
            console.log('🔴 STDERR:', text.trim());
        });
        
        // Give server time to start and show initialization logs
        setTimeout(() => {
            console.log('\n🔧 Sending test request...');
            
            const initRequest = {
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: { name: "test-client", version: "1.0.0" }
                }
            };
            
            server.stdin.write(JSON.stringify(initRequest) + '\n');
            
            setTimeout(() => {
                const toolRequest = {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "tools/call",
                    params: {
                        name: "get_authenticated_services",
                        arguments: { user_id: "vqLrzGnqajPGlX9Wzq89SgqVPsN2" }
                    }
                };
                
                server.stdin.write(JSON.stringify(toolRequest) + '\n');
                
                setTimeout(() => {
                    console.log('\n📋 ANALYSIS:');
                    console.log('='.repeat(50));
                    
                    // Check if .env file was loaded
                    if (output.includes('Loading .env from:')) {
                        console.log('✅ Server is attempting to load .env file');
                        
                        if (output.includes('Loaded .env file successfully')) {
                            console.log('✅ .env file loaded successfully');
                        } else {
                            console.log('❌ .env file failed to load');
                        }
                    } else {
                        console.log('❌ No .env loading attempt found');
                    }
                    
                    // Check JWT secret length
                    const jwtMatch = output.match(/JWT Secret length: (\d+)/);
                    if (jwtMatch) {
                        const length = parseInt(jwtMatch[1]);
                        console.log(`📊 JWT Secret length: ${length}`);
                        
                        if (length > 100) {
                            console.log('✅ JWT Secret appears to be the real private key (correct length)');
                        } else {
                            console.log('❌ JWT Secret is still the placeholder (wrong length)');
                        }
                    }
                    
                    // Check for placeholder credentials
                    if (output.includes('Using placeholder credentials')) {
                        console.log('❌ STILL USING PLACEHOLDER CREDENTIALS');
                    } else {
                        console.log('✅ Not using placeholder credentials');
                    }
                    
                    // Check if API calls are being made
                    if (output.includes('Making credentials API call')) {
                        console.log('✅ SERVER IS MAKING REAL API CALLS');
                        
                        // Check API response
                        if (output.includes('Credentials API response: 200')) {
                            console.log('✅ API CALL SUCCESSFUL');
                            
                            // Check if credentials were found
                            const credMatch = output.match(/Raw credentials array length: (\d+)/);
                            if (credMatch) {
                                console.log(`📊 Found ${credMatch[1]} credentials`);
                                
                                if (parseInt(credMatch[1]) > 0) {
                                    console.log('🎉 SUCCESS! USER HAS AUTHENTICATED SERVICES!');
                                } else {
                                    console.log('❌ No credentials found for user');
                                }
                            }
                        } else {
                            console.log('❌ API call failed');
                        }
                    } else {
                        console.log('❌ No API calls being made');
                    }
                    
                    server.kill();
                    resolve();
                }, 3000);
            }, 1000);
        }, 1000);
    });
}

testEnvFix().catch(console.error);