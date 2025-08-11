#!/usr/bin/env node

/**
 * Test Gmail Authentication Fix - Version 2
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test the MCP server's Gmail send with unauthenticated user
async function testGmailAuthFix() {
  console.log('🔧 Testing Gmail Authentication Fix v2');
  console.log('======================================');

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

  let allOutput = [];
  let jsonResponses = [];

  // Collect all output
  mcp.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      allOutput.push(line);
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(line);
        if (parsed.jsonrpc) {
          jsonResponses.push(parsed);
        }
      } catch (e) {
        // Not JSON, probably debug output
      }
    });
  });

  mcp.stderr.on('data', (data) => {
    const stderrOutput = data.toString();
    console.log('MCP stderr:', stderrOutput);
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test Gmail send email (should fail with auth message)
  console.log('\n📧 Testing GMAIL_SEND_EMAIL (should fail with auth message)');
  const testRequest = {
    jsonrpc: '2.0',
    id: 1,
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

  mcp.stdin.write(JSON.stringify(testRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 8000));

  console.log('\n📤 All Output:');
  console.log('===============');
  allOutput.forEach((line, index) => {
    console.log(`${index + 1}: ${line}`);
  });

  console.log('\n📋 JSON Responses:');
  console.log('==================');
  jsonResponses.forEach((response, index) => {
    console.log(`\nResponse ${index + 1}:`);
    console.log(JSON.stringify(response, null, 2));
    
    // Analyze the response
    if (response.result && response.result.content) {
      const content = response.result.content[0]?.text;
      if (content) {
        try {
          const contentObj = JSON.parse(content);
          console.log('✅ Parsed content:', JSON.stringify(contentObj, null, 2));
          
          // Check if it's the authentication error we expect
          if (contentObj.needsAuth) {
            console.log('🎯 SUCCESS: Auth error properly handled!');
            console.log('📋 Auth URL provided:', contentObj.authUrl);
          } else if (contentObj.error) {
            console.log('❌ Error received:', contentObj.error);
          }
        } catch (e) {
          console.log('Content (raw):', content);
        }
      }
    }
  });

  // Kill the process
  mcp.kill();
  
  console.log('\n✅ Test completed!');
}

testGmailAuthFix().catch(console.error);