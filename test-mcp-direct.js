#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// Test MCP server directly
async function testMCPServer() {
  console.log('🔍 Testing MCP server directly...\n');
  
  const mcpProcess = spawn('node', [
    '/Applications/XAMPP/xamppfiles/htdocs/Leviousa101/services/paragon-mcp/dist/index.mjs'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const rl = readline.createInterface({
    input: mcpProcess.stdout,
    crlfDelay: Infinity
  });

  // Send initialization
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('📤 Sending initialize request...');
  mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  // List tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('📤 Sending tools/list request...');
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test gmail_send_email
  const sendEmailRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'gmail_send_email',
      arguments: {
        to: ['viditjn02@gmail.com'],
        subject: 'Direct MCP Test 🎯',
        body: 'This is a test email sent directly to MCP server.\n\nBest regards,\nLeviousa Team',
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
      }
    }
  };

  console.log('📤 Sending gmail_send_email request...');
  console.log('   Args:', JSON.stringify(sendEmailRequest.params.arguments, null, 2));
  mcpProcess.stdin.write(JSON.stringify(sendEmailRequest) + '\n');

  // Capture all output
  let outputBuffer = '';
  
  rl.on('line', (line) => {
    console.log('📨 MCP Response:', line);
    outputBuffer += line + '\n';
    
    try {
      const response = JSON.parse(line);
      if (response.error) {
        console.log('❌ Error:', response.error);
      } else if (response.result) {
        console.log('✅ Result:', JSON.stringify(response.result, null, 2));
      }
    } catch (e) {
      // Not JSON, just log it
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.log('⚠️ MCP stderr:', data.toString());
  });

  // Wait for responses
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Clean up
  mcpProcess.kill();
  
  console.log('\n📋 Full output buffer:');
  console.log(outputBuffer);
}

testMCPServer().catch(console.error);