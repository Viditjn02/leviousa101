#!/usr/bin/env node

/**
 * Comprehensive debug to capture all server output and identify root cause
 */

const { spawn } = require('child_process');
const path = require('path');

async function debugComprehensive() {
    console.log('🔍 COMPREHENSIVE DEBUG - Capturing ALL Server Output\n');
    
    return new Promise((resolve) => {
        console.log('🚀 Starting Paragon MCP server with comprehensive debugging...');
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env
            }
        });
        
        let allOutput = '';
        let allErrors = '';
        
        // Capture all output with timestamps
        server.stdout.on('data', (data) => {
            const text = data.toString();
            allOutput += text;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] STDOUT:`, text.trim());
        });
        
        server.stderr.on('data', (data) => {
            const text = data.toString();
            allErrors += text;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] STDERR:`, text.trim());
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
            
            // Wait for initialization then send our test
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
                
                // Wait for response and then analyze
                setTimeout(() => {
                    console.log('\n' + '='.repeat(100));
                    console.log('📋 COMPREHENSIVE ANALYSIS');
                    console.log('='.repeat(100));
                    
                    console.log('\n🔍 CHECKING FOR KEY ISSUES:');
                    
                    // Check if using placeholder credentials
                    if (allOutput.includes('Using placeholder credentials')) {
                        console.log('❌ ISSUE FOUND: Server is using placeholder credentials!');
                        console.log('   This means environment variables are not being loaded properly.');
                    } else {
                        console.log('✅ Server is not using placeholder credentials');
                    }
                    
                    // Check JWT secret loading
                    const jwtSecretMatch = allOutput.match(/JWT Secret length: (\d+)/);
                    if (jwtSecretMatch) {
                        console.log(`✅ JWT Secret loaded with length: ${jwtSecretMatch[1]}`);
                    } else {
                        console.log('❌ ISSUE: JWT Secret length not found in logs');
                    }
                    
                    // Check API calls
                    if (allOutput.includes('Making credentials API call')) {
                        console.log('✅ Server is making credentials API call');
                        
                        // Check API response status
                        const statusMatch = allOutput.match(/Credentials API response: (\d+)/);
                        if (statusMatch) {
                            const status = statusMatch[1];
                            console.log(`📊 API Response Status: ${status}`);
                            if (status === '200') {
                                console.log('✅ API call successful');
                            } else {
                                console.log(`❌ ISSUE: API call failed with status ${status}`);
                            }
                        }
                    } else {
                        console.log('❌ ISSUE: Server is NOT making credentials API call');
                    }
                    
                    // Check credentials processing
                    if (allOutput.includes('Successfully parsed credentials JSON')) {
                        console.log('✅ Credentials JSON parsed successfully');
                        
                        // Check credentials count
                        const credentialsMatch = allOutput.match(/Raw credentials array length: (\d+)/);
                        if (credentialsMatch) {
                            console.log(`📊 Credentials count: ${credentialsMatch[1]}`);
                        }
                    } else {
                        console.log('❌ ISSUE: Credentials JSON not parsed or not found');
                    }
                    
                    // Look for the final authenticated services
                    if (allOutput.includes('Final authenticated services array')) {
                        console.log('✅ Final processing completed');
                        const finalMatch = allOutput.match(/Final authenticated services array: \[(.*?)\]/);
                        if (finalMatch) {
                            console.log(`📊 Final services: [${finalMatch[1]}]`);
                        }
                    } else {
                        console.log('❌ ISSUE: Final processing not completed');
                    }
                    
                    console.log('\n📄 FULL OUTPUT FOR ANALYSIS:');
                    console.log('='.repeat(100));
                    console.log('STDOUT:', allOutput);
                    console.log('='.repeat(100));
                    console.log('STDERR:', allErrors);
                    console.log('='.repeat(100));
                    
                    server.kill();
                    resolve();
                }, 5000);
                
            }, 1000);
            
        }, 1000);
    });
}

debugComprehensive().catch(console.error);