#!/usr/bin/env node

const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const path = require('path');

// Load environment from main .env file (has properly formatted SIGNING_KEY)
dotenv.config();

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.SIGNING_KEY;
const PROXY_ENABLED = process.env.ENABLE_PROXY_API_TOOL === 'true';

console.log('🔧 [Test] Environment Check:');
console.log(`   Project ID: ${PROJECT_ID ? '✅ Present' : '❌ Missing'}`);
console.log(`   Signing Key: ${SIGNING_KEY ? '✅ Present' : '❌ Missing'}`);
console.log(`   Proxy API: ${PROXY_ENABLED ? '✅ Enabled' : '❌ Disabled'}`);
console.log('');

if (!PROJECT_ID || !SIGNING_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

if (!PROXY_ENABLED) {
  console.error('❌ Proxy API is disabled. Set ENABLE_PROXY_API_TOOL=true');
  process.exit(1);
}

function generateUserToken(userId) {
  const payload = {
    sub: userId,
    aud: PROJECT_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  // Handle newline characters in the private key
  const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
  
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function testLinkedInProxyAPI(userId) {
  console.log(`🚀 [Test] Testing LinkedIn Proxy API access for user: ${userId}`);
  
  try {
    // Generate user token
    const userToken = generateUserToken(userId);
    console.log(`🔑 [Test] Generated user token: ${userToken.substring(0, 50)}...`);

    // Test 1: Get LinkedIn Profile
    console.log('\n📋 [Test 1] Testing LinkedIn Profile Access...');
    try {
      const profileUrl = `https://api.useparagon.com/proxy/linkedin/v2/me`;
      const profileResponse = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      const profileText = await profileResponse.text();
      console.log(`   Status: ${profileResponse.status}`);
      console.log(`   Response: ${profileText}`);
      
      if (profileResponse.ok) {
        console.log(`   ✅ Profile access successful!`);
      } else {
        console.log(`   ❌ Profile access failed: ${profileText}`);
      }
    } catch (error) {
      console.log(`   ❌ Profile test error: ${error.message}`);
    }

    // Test 2: Get LinkedIn Connections
    console.log('\n🔗 [Test 2] Testing LinkedIn Connections Access...');
    try {
      const connectionsUrl = `https://api.useparagon.com/proxy/linkedin/v2/connections?q=viewer&start=0&count=10`;
      const connectionsResponse = await fetch(connectionsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      const connectionsText = await connectionsResponse.text();
      console.log(`   Status: ${connectionsResponse.status}`);
      console.log(`   Response: ${connectionsText}`);
      
      if (connectionsResponse.ok) {
        console.log(`   ✅ Connections access successful!`);
      } else {
        console.log(`   ❌ Connections access failed: ${connectionsText}`);
      }
    } catch (error) {
      console.log(`   ❌ Connections test error: ${error.message}`);
    }

    // Test 3: Direct MCP Server Test
    console.log('\n🔧 [Test 3] Testing MCP Server...');
    try {
      const { spawn } = require('child_process');
      const mcpServerPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.mjs');
      
      console.log(`   Starting MCP server: ${mcpServerPath}`);
      
      const mcpProcess = spawn('node', [mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, 'services', 'paragon-mcp')
      });

      // Test MCP initialization
      const initMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      mcpProcess.stdin.write(JSON.stringify(initMessage) + '\n');

      // Wait for response
      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          console.log(`   ❌ MCP server timeout`);
          mcpProcess.kill();
        }
      }, 5000);

      mcpProcess.stdout.on('data', (data) => {
        responseReceived = true;
        clearTimeout(timeout);
        console.log(`   ✅ MCP server response: ${data.toString().trim()}`);
        mcpProcess.kill();
      });

      mcpProcess.stderr.on('data', (data) => {
        console.log(`   📝 MCP server log: ${data.toString().trim()}`);
      });

      mcpProcess.on('close', (code) => {
        console.log(`   📋 MCP server exited with code: ${code}`);
      });

    } catch (error) {
      console.log(`   ❌ MCP server test error: ${error.message}`);
    }

  } catch (error) {
    console.error(`❌ [Test] Overall test failed: ${error.message}`);
  }
}

// Run the test
const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'; // Firebase user ID from the logs
testLinkedInProxyAPI(testUserId);
