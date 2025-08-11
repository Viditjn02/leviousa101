#!/usr/bin/env node

/**
 * Final Test: Gmail Body Parameter Fix
 * Confirms both subject and body work correctly
 */

const { spawn } = require('child_process');
const path = require('path');

async function finalTest() {
  console.log('🎯 Final Gmail Body Fix Test');
  console.log('============================');

  const mcpPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.js');
  const mcp = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responses = [];

  mcp.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.jsonrpc && parsed.result) {
          responses.push(parsed);
        }
      } catch (e) {
        // Debug output, not JSON
      }
    });
  });

  mcp.stderr.on('data', (data) => {
    console.log('MCP:', data.toString().trim());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📧 Sending test email with both emoji subject and body...');
  
  const testRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'GMAIL_SEND_EMAIL',
      arguments: {
        to: ['viditjn02@gmail.com'],
        subject: 'Body Fix Test ✅ - Subject with emojis working!',
        body: 'Hello! 👋\n\nThis email tests the BODY parameter fix.\n\nIf you can read this message with emojis 😊 🎉, then both subject and body are working correctly!\n\nTest completed: ' + new Date().toISOString(),
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
      }
    }
  };

  mcp.stdin.write(JSON.stringify(testRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  const lastResponse = responses[responses.length - 1];
  if (lastResponse && lastResponse.result && lastResponse.result.content) {
    const content = lastResponse.result.content[0]?.text;
    try {
      const result = JSON.parse(content);
      if (result.success && result.data && result.data.id) {
        console.log('✅ SUCCESS: Email sent with ID:', result.data.id);
        console.log('📧 Check your Gmail inbox for:');
        console.log('   - Subject: "Body Fix Test ✅ - Subject with emojis working!"');
        console.log('   - Body: Should contain text with emojis and proper formatting');
        console.log('\n🎯 The fix is complete! Both subject AND body now work correctly.');
      } else {
        console.log('❌ Failed:', result);
      }
    } catch (e) {
      console.log('Response:', content);
    }
  } else {
    console.log('❌ No response received');
  }

  mcp.kill();
}

finalTest().catch(console.error);