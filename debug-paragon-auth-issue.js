#!/usr/bin/env node

/**
 * Comprehensive debug script to identify why Paragon authentication 
 * isn't being detected by get_authenticated_services
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Debugging Paragon Authentication Detection Issue\n');

// Read environment variables from the paragon-mcp service
const envPath = path.join(__dirname, 'services', 'paragon-mcp', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
    }
});

console.log('📋 Environment Configuration:');
console.log(`   Project ID: ${envVars.PARAGON_PROJECT_ID}`);
console.log(`   JWT Secret: ${envVars.PARAGON_JWT_SECRET ? '[LOADED]' : '[MISSING]'}`);
console.log(`   Web URL: ${envVars.PARAGON_WEB_URL}\n`);

// Function to test the MCP server directly
function testMCPServer(testUserId) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Testing MCP server with user ID: ${testUserId}`);
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                ...envVars
            }
        });

        let output = '';
        let errorOutput = '';
        let responses = [];

        server.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            
            // Try to parse JSON responses
            const lines = text.split('\n');
            lines.forEach(line => {
                if (line.trim() && line.includes('"jsonrpc"')) {
                    try {
                        const parsed = JSON.parse(line.trim());
                        responses.push(parsed);
                    } catch (e) {
                        // Not JSON, that's ok
                    }
                }
            });
        });

        server.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            reject(error);
        });

        // Wait for server to start
        setTimeout(() => {
            console.log('🔧 Initializing MCP protocol...');
            
            // Initialize
            const initRequest = JSON.stringify({
                jsonrpc: "2.0",
                id: 0,
                method: "initialize",
                params: {
                    protocolVersion: "2025-06-18",
                    capabilities: {},
                    clientInfo: {
                        name: "debug-client",
                        version: "1.0.0"
                    }
                }
            }) + '\n';
            
            server.stdin.write(initRequest);
            
            // Call get_authenticated_services
            setTimeout(() => {
                console.log(`📡 Calling get_authenticated_services for user: ${testUserId}`);
                const toolRequest = JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: {
                        name: "get_authenticated_services",
                        arguments: {
                            user_id: testUserId
                        }
                    }
                }) + '\n';
                
                server.stdin.write(toolRequest);
                
                // Wait for response and cleanup
                setTimeout(() => {
                    server.kill();
                    
                    console.log('\n📊 Raw Server Output:');
                    console.log(output);
                    console.log('\n📊 Server Error Output:');
                    console.log(errorOutput);
                    console.log('\n📨 Parsed Responses:');
                    responses.forEach((resp, idx) => {
                        console.log(`Response ${idx + 1}:`, JSON.stringify(resp, null, 2));
                    });
                    
                    resolve({ output, errorOutput, responses });
                }, 5000);
            }, 2000);
        }, 1000);
    });
}

// Function to test direct Paragon API call
async function testDirectParagonAPI(userId) {
    console.log(`\n🌐 Testing direct Paragon API call for user: ${userId}`);
    
    try {
        const jwt = require('jsonwebtoken');
        
        const payload = {
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        };

        const token = jwt.sign(payload, envVars.PARAGON_JWT_SECRET);
        console.log(`🔑 Generated JWT token for user ${userId}`);
        
        const url = `https://api.useparagon.com/projects/${envVars.PARAGON_PROJECT_ID}/sdk/integrations`;
        console.log(`📡 Calling: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📈 Response Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Error Response: ${errorText}`);
            return null;
        }

        const data = await response.json();
        console.log(`📊 API Response:`, JSON.stringify(data, null, 2));
        
        return data;
        
    } catch (error) {
        console.error(`❌ Direct API call failed:`, error);
        return null;
    }
}

// Run comprehensive test
async function runComprehensiveTest() {
    try {
        console.log('🏁 Starting comprehensive Paragon authentication debug...\n');
        
        const testUserIds = [
            'vqLrzGnqajPGlX9Wzq89SgqVPsN2', // The one from logs
            'test-user',
            'default-user',
            'gmail-test'
        ];
        
        for (const userId of testUserIds) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🧪 Testing with User ID: ${userId}`);
            console.log(`${'='.repeat(60)}\n`);
            
            // Test 1: Direct API call
            await testDirectParagonAPI(userId);
            
            // Test 2: MCP server call
            await testMCPServer(userId);
            
            console.log(`\n✅ Completed test for user: ${userId}`);
        }
        
        console.log('\n🎯 Test Analysis:');
        console.log('Look for patterns in the responses above to identify:');
        console.log('1. Whether the Paragon API is returning integration data');
        console.log('2. Whether user IDs affect the response');
        console.log('3. Whether the MCP server is processing the data correctly');
        console.log('4. Whether there are any authentication/authorization issues');
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
runComprehensiveTest().then(() => {
    console.log('\n✅ Debug test completed!');
    process.exit(0);
});