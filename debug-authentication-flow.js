#!/usr/bin/env node

/**
 * Debug the complete authentication flow to identify the gap
 */

const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function debugAuthenticationFlow() {
    console.log('🔍 Debugging Complete Authentication Flow\n');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'; // Real Firebase user ID
        
        console.log('📋 STEP 1: Test MCP Server Connection');
        console.log('='.repeat(60));
        
        // Test basic MCP server connection
        try {
            const tools = await service.mcpClient.getAvailableTools();
            console.log('✅ MCP server connected, tools available:', tools.length);
            
            const paragonTools = tools.filter(t => t.includes('paragon'));
            console.log('🔧 Paragon tools:', paragonTools);
        } catch (error) {
            console.log('❌ MCP server connection failed:', error.message);
            return;
        }
        
        console.log('\n📋 STEP 2: Test Raw Paragon MCP Server');
        console.log('='.repeat(60));
        
        // Test the Paragon MCP server directly
        const { spawn } = require('child_process');
        const path = require('path');
        
        console.log('🚀 Starting Paragon MCP server directly...');
        
        const serverPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
        const server = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env
            }
        });
        
        // Give server time to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Send initialize request
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
        
        let serverOutput = '';
        server.stdout.on('data', (data) => {
            serverOutput += data.toString();
        });
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📤 Server response (first 500 chars):', serverOutput.slice(0, 500));
        
        // Test get_authenticated_services tool
        const toolRequest = {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
                name: "get_authenticated_services",
                arguments: {
                    user_id: userId
                }
            }
        };
        
        server.stdin.write(JSON.stringify(toolRequest) + '\n');
        
        // Wait for tool response
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔧 Tool call response (last 1000 chars):', serverOutput.slice(-1000));
        
        server.kill();
        
        console.log('\n📋 STEP 3: Check Environment Variables');
        console.log('='.repeat(60));
        
        // Check if environment variables are loaded correctly
        const fs = require('fs');
        const envPath = path.join(__dirname, 'services', 'paragon-mcp', '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        console.log('📁 Environment file exists:', fs.existsSync(envPath));
        console.log('📏 Environment file size:', envContent.length, 'characters');
        
        const envVars = {};
        envContent.split('\n').forEach(line => {
            if (line.trim() && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
                }
            }
        });
        
        console.log('🔑 PARAGON_PROJECT_ID loaded:', !!envVars.PARAGON_PROJECT_ID);
        console.log('🔐 PARAGON_JWT_SECRET loaded:', !!envVars.PARAGON_JWT_SECRET);
        console.log('📏 JWT Secret length:', envVars.PARAGON_JWT_SECRET ? envVars.PARAGON_JWT_SECRET.length : 0);
        
        console.log('\n📋 STEP 4: Test JWT Generation');
        console.log('='.repeat(60));
        
        // Test JWT generation
        const jwt = require('jsonwebtoken');
        
        try {
            const payload = {
                sub: userId,
                aud: `useparagon.com/${envVars.PARAGON_PROJECT_ID}`,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
            };
            
            let formattedPrivateKey = envVars.PARAGON_JWT_SECRET;
            if (formattedPrivateKey.includes('\\n')) {
                formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
            }
            
            const token = jwt.sign(payload, formattedPrivateKey, { algorithm: 'RS256' });
            console.log('✅ JWT token generated successfully');
            console.log('📏 Token length:', token.length);
            console.log('🎫 Token preview:', token.slice(0, 50) + '...');
            
            // Test API call with this token
            console.log('\n📋 STEP 5: Test Direct API Call');
            console.log('='.repeat(60));
            
            const fetch = require('node-fetch');
            const response = await fetch(`https://api.useparagon.com/projects/${envVars.PARAGON_PROJECT_ID}/sdk/credentials`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 API Response Status:', response.status);
            console.log('📋 API Response Headers:', Object.fromEntries(response.headers.entries()));
            
            const responseText = await response.text();
            console.log('📄 API Response Body:', responseText.slice(0, 500));
            
            if (response.ok) {
                try {
                    const data = JSON.parse(responseText);
                    console.log('✅ Credentials API successful');
                    console.log('📊 Parsed data:', JSON.stringify(data, null, 2));
                } catch (parseError) {
                    console.log('❌ Failed to parse JSON response:', parseError.message);
                }
            } else {
                console.log('❌ API call failed');
            }
            
        } catch (jwtError) {
            console.log('❌ JWT generation failed:', jwtError.message);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugAuthenticationFlow().catch(console.error);