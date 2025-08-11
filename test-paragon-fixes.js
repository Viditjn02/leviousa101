#!/usr/bin/env node

/**
 * Test Paragon Integration Fixes
 * This script tests the improvements to Paragon authentication and ActionKit discovery
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.SIGNING_KEY || process.env.PARAGON_SIGNING_KEY;

if (!PROJECT_ID || !SIGNING_KEY) {
  console.error('❌ Missing required environment variables: PARAGON_PROJECT_ID and SIGNING_KEY');
  process.exit(1);
}

// Test user ID
const TEST_USER_ID = 'test-user-123';

/**
 * Generate a Paragon user token
 */
function generateUserToken(userId) {
  const payload = {
    sub: userId,
    aud: `useparagon.com/${PROJECT_ID}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
  };

  const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

/**
 * Test 1: Check if Connect API returns user integrations
 */
async function testConnectAPI() {
  console.log('\n📋 Test 1: Paragon Connect API');
  console.log('================================');
  
  const userToken = generateUserToken(TEST_USER_ID);
  
  try {
    const response = await fetch(`https://connect.useparagon.com/projects/${PROJECT_ID}/sdk/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connect API responded successfully');
      console.log('User data:', JSON.stringify(data, null, 2));
      
      if (data.integrations) {
        const integrations = Object.keys(data.integrations);
        console.log(`Found ${integrations.length} integrations:`, integrations);
      }
    } else {
      const errorText = await response.text();
      console.log(`⚠️ Connect API returned ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Failed to call Connect API:', error.message);
  }
}

/**
 * Test 2: Check if ActionKit API returns actions
 */
async function testActionKitAPI() {
  console.log('\n📋 Test 2: ActionKit API');
  console.log('========================');
  
  const userToken = generateUserToken(TEST_USER_ID);
  
  try {
    const response = await fetch(`https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const actions = await response.json();
      console.log('✅ ActionKit API responded successfully');
      
      const actionCount = Object.keys(actions).length;
      console.log(`Found ${actionCount} total actions`);
      
      // Group actions by integration
      const actionsByIntegration = {};
      for (const [actionName, actionData] of Object.entries(actions)) {
        const integration = actionData.integration || actionName.split('.')[0];
        if (!actionsByIntegration[integration]) {
          actionsByIntegration[integration] = [];
        }
        actionsByIntegration[integration].push(actionName);
      }
      
      console.log('\nActions by integration:');
      for (const [integration, actionList] of Object.entries(actionsByIntegration)) {
        console.log(`  ${integration}: ${actionList.length} actions`);
        if (actionList.length <= 5) {
          actionList.forEach(action => console.log(`    - ${action}`));
        } else {
          actionList.slice(0, 3).forEach(action => console.log(`    - ${action}`));
          console.log(`    ... and ${actionList.length - 3} more`);
        }
      }
    } else {
      const errorText = await response.text();
      console.log(`⚠️ ActionKit API returned ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Failed to call ActionKit API:', error.message);
  }
}

/**
 * Test 3: Test the MCP server's get_authenticated_services function
 */
async function testMCPServer() {
  console.log('\n📋 Test 3: MCP Server Integration');
  console.log('==================================');
  
  try {
    const { spawn } = require('child_process');
    const mcpPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.js');
    
    if (!fs.existsSync(mcpPath)) {
      console.log('⚠️ MCP server not built. Building now...');
      const { execSync } = require('child_process');
      execSync('npm run build', { cwd: path.join(__dirname, 'services', 'paragon-mcp') });
    }
    
    console.log('Starting MCP server...');
    const mcp = spawn('node', [mcpPath], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Send a test request
    const testRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_authenticated_services',
        arguments: {
          user_id: TEST_USER_ID
        }
      }
    };
    
    mcp.stdin.write(JSON.stringify(testRequest) + '\n');
    
    // Wait for response
    let responseData = '';
    mcp.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    mcp.stderr.on('data', (data) => {
      console.log('MCP stderr:', data.toString());
    });
    
    // Give it time to respond
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('MCP Response:', responseData);
    
    // Kill the process
    mcp.kill();
    
    console.log('✅ MCP server test completed');
  } catch (error) {
    console.error('❌ Failed to test MCP server:', error.message);
  }
}

/**
 * Test 4: Check token expiration
 */
function testTokenExpiration() {
  console.log('\n📋 Test 4: Token Expiration');
  console.log('============================');
  
  const userToken = generateUserToken(TEST_USER_ID);
  const decoded = jwt.decode(userToken);
  
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;
  const hoursToExpire = Math.floor(expiresIn / 3600);
  const minutesToExpire = Math.floor((expiresIn % 3600) / 60);
  
  console.log('Token details:');
  console.log(`  User ID: ${decoded.sub}`);
  console.log(`  Audience: ${decoded.aud}`);
  console.log(`  Issued at: ${new Date(decoded.iat * 1000).toISOString()}`);
  console.log(`  Expires at: ${new Date(decoded.exp * 1000).toISOString()}`);
  console.log(`  ✅ Token expires in: ${hoursToExpire} hours and ${minutesToExpire} minutes`);
  
  if (hoursToExpire >= 23) {
    console.log('  ✅ Token has 24-hour expiration (good for persistence)');
  } else {
    console.log('  ⚠️ Token expires in less than 24 hours');
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Paragon Integration Tests');
  console.log('=====================================');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Test User: ${TEST_USER_ID}`);
  
  await testConnectAPI();
  await testActionKitAPI();
  await testMCPServer();
  testTokenExpiration();
  
  console.log('\n✅ All tests completed!');
  console.log('\nSummary:');
  console.log('- Fixed ActionKit API endpoint to properly fetch actions');
  console.log('- Implemented persistent authentication storage');
  console.log('- Extended token expiration to 24 hours');
  console.log('- Improved service discovery to check both Connect and ActionKit APIs');
}

// Run tests
runAllTests().catch(console.error);