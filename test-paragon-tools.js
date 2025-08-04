#!/usr/bin/env node

/**
 * Test script to verify Paragon MCP server tools are properly defined
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Paragon MCP server tool definitions...\n');

// Test the MCP server
function testMCPServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting Paragon MCP server...');
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PARAGON_PROJECT_ID: 'test-project',
                PARAGON_JWT_SECRET: 'test-secret'
            }
        });

        let output = '';
        let errorOutput = '';

        server.stdout.on('data', (data) => {
            output += data.toString();
        });

        server.stderr.on('data', (data) => {
            errorOutput += data.toString();
            if (errorOutput.includes('Paragon MCP server running on stdio')) {
                console.log('✅ Server started successfully');
                
                // Initialize the server
                console.log('🔧 Initializing MCP protocol...');
                const initRequest = JSON.stringify({
                    jsonrpc: "2.0",
                    id: 0,
                    method: "initialize",
                    params: {
                        protocolVersion: "2025-06-18",
                        capabilities: {},
                        clientInfo: {
                            name: "test-client",
                            version: "1.0.0"
                        }
                    }
                }) + '\n';
                
                server.stdin.write(initRequest);
                
                // Wait a moment then request tools
                setTimeout(() => {
                    console.log('📋 Requesting list of tools...');
                    const listToolsRequest = JSON.stringify({
                        jsonrpc: "2.0",
                        id: 1,
                        method: "tools/list",
                        params: {}
                    }) + '\n';
                    
                    server.stdin.write(listToolsRequest);

                    // Wait for response
                    setTimeout(() => {
                        server.kill();
                        
                        console.log('\n📥 Server output:');
                        console.log(output);
                        
                        // Parse and analyze the response
                        const hasGetAuthServices = output.includes('get_authenticated_services');
                        const hasGoogleDriveTools = output.includes('googledrive_create_file') && 
                                                   output.includes('googledrive_list_files');
                        const hasSheetsTools = output.includes('googlesheets_create_spreadsheet') && 
                                             output.includes('googlesheets_get_values');
                        const hasInputSchemas = output.includes('inputSchema');
                        
                        // Count total tools
                        const toolMatches = output.match(/"name":"[^"]+"/g);
                        const toolCount = toolMatches ? toolMatches.length : 0;
                        
                        console.log('\n🔍 Analysis:');
                        console.log(`📊 Total tools found: ${toolCount}`);
                        console.log(`🔧 Authentication service: ${hasGetAuthServices ? '✅' : '❌'}`);
                        console.log(`📁 Google Drive tools: ${hasGoogleDriveTools ? '✅' : '❌'}`);
                        console.log(`📊 Google Sheets tools: ${hasSheetsTools ? '✅' : '❌'}`);
                        console.log(`🔌 Input schemas defined: ${hasInputSchemas ? '✅' : '❌'}`);
                        
                        if (hasGetAuthServices && hasGoogleDriveTools && hasSheetsTools && hasInputSchemas && toolCount >= 29) {
                            console.log('\n🎉 SUCCESS: All tools properly defined!');
                            resolve(true);
                        } else {
                            console.log('\n❌ FAILED: Some tools or schemas are missing');
                            resolve(false);
                        }
                    }, 3000);
                }, 1000);
            }
        });

        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            reject(error);
        });
    });
}

// Run the test
async function runTest() {
    try {
        console.log('🏁 Starting Paragon MCP tool definition test...\n');
        
        const success = await testMCPServer();
        
        console.log('\n📊 Test Results:');
        if (success) {
            console.log('✅ ALL TESTS PASSED - Tools are properly defined!');
            process.exit(0);
        } else {
            console.log('❌ TESTS FAILED - Tool definitions incomplete');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
        process.exit(1);
    }
}

runTest();