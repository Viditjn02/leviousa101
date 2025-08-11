#!/usr/bin/env node

/**
 * Test Gmail Authentication Fix
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test the MCP server's Gmail send with unauthenticated user
async function testGmailAuthFix() {
  console.log('🔧 Testing Gmail Authentication Fix');
  console.log('===================================');

  const mcpPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.js');
  
  if (!fs.existsSync(mcpPath)) {
    console.error('❌ MCP server build not found');
    return;
  }

  console.log('Starting MCP server...');
  const mcp = spawn('node', [mcpPath], {
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Test 1: get_authenticated_services
  console.log('\n📋 Test 1: get_authenticated_services');
  const testRequest1 = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_authenticated_services',
      arguments: {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
      }
    }
  };

  mcp.stdin.write(JSON.stringify(testRequest1) + '\n');

  // Test 2: Gmail send email (should fail with auth message)
  setTimeout(() => {
    console.log('\n📧 Test 2: GMAIL_SEND_EMAIL (should fail with auth message)');
    const testRequest2 = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'GMAIL_SEND_EMAIL',
        arguments: {
          to: ['viditjn02@gmail.com'],
          subject: 'Test Email',
          body: 'This should fail with auth error',
          user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
        }
      }
    };

    mcp.stdin.write(JSON.stringify(testRequest2) + '\n');
  }, 2000);

  // Collect responses
  let responseData = '';
  mcp.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  mcp.stderr.on('data', (data) => {
    const stderrOutput = data.toString();
    if (!stderrOutput.includes('[ParagonMCP] Server started')) {
      console.log('MCP stderr:', stderrOutput);
    }
  });

  // Wait for responses
  setTimeout(() => {
    console.log('\n📤 MCP Responses:');
    console.log('==================');
    
    const responses = responseData.trim().split('\n').filter(line => line.trim());
    responses.forEach((response, index) => {
      try {
        const parsed = JSON.parse(response);
        console.log(`\nResponse ${index + 1}:`);
        console.log(JSON.stringify(parsed, null, 2));
        
        // Analyze the response
        if (parsed.result && parsed.result.content) {
          const content = parsed.result.content[0]?.text;
          if (content) {
            try {
              const contentObj = JSON.parse(content);
              console.log('Parsed content:', JSON.stringify(contentObj, null, 2));
              
              // Check if it's the authentication error we expect
              if (contentObj.needsAuth) {
                console.log('✅ SUCCESS: Auth error properly handled!');
                console.log('📋 Auth URL provided:', contentObj.authUrl);
              } else if (contentObj.authenticated_services !== undefined) {
                console.log('📊 Authenticated services:', contentObj.authenticated_services.length);
              }
            } catch (e) {
              console.log('Content (raw):', content);
            }
          }
        }
      } catch (e) {
        console.log('Raw response:', response);
      }
    });

    // Kill the process
    mcp.kill();
    
    console.log('\n✅ Test completed!');
    console.log('\n📝 Expected Results:');
    console.log('1. get_authenticated_services should return empty array (user not authenticated)');
    console.log('2. GMAIL_SEND_EMAIL should return authentication error with needsAuth=true');
    console.log('3. Should provide authUrl for user to authenticate');
  }, 5000);
}

testGmailAuthFix().catch(console.error);