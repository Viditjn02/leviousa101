#!/usr/bin/env node

/**
 * Test the messageContent Parameter Fix
 * Verify that body content now appears correctly
 */

const { spawn } = require('child_process');
const path = require('path');

async function testMessageContentFix() {
  console.log('🔧 Testing messageContent Parameter Fix');
  console.log('======================================');

  const mcpPath = path.join(__dirname, 'services', 'paragon-mcp', 'dist', 'index.js');
  const mcp = spawn('node', [mcpPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responses = [];
  let debugOutput = [];

  mcp.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      // Collect debug output
      debugOutput.push(line);
      
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

  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`📧 Sending test email with messageContent parameter (${timestamp})...`);
  
  const testRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'GMAIL_SEND_EMAIL',
      arguments: {
        to: ['viditjn02@gmail.com'],
        subject: `messageContent Fix Test - ${timestamp}`,
        body: `BODY CONTENT USING messageContent PARAMETER!\n\nTimestamp: ${timestamp}\n\nThis should now appear in the email body! 🎉\n\nTest with emojis: 😊 🚀 ✅`,
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
      }
    }
  };

  mcp.stdin.write(JSON.stringify(testRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Show parameter being used
  const payloadLines = debugOutput.filter(line => 
    line.includes('🚀 Sending payload to ActionKit') ||
    line.includes('"messageContent"') ||
    line.includes('ActionKit response')
  );
  
  if (payloadLines.length > 0) {
    console.log('\n🔍 Parameter Debug Info:');
    payloadLines.forEach(line => console.log(line));
  }

  const lastResponse = responses[responses.length - 1];
  if (lastResponse && lastResponse.result && lastResponse.result.content) {
    const content = lastResponse.result.content[0]?.text;
    try {
      const result = JSON.parse(content);
      if (result.success && result.data && result.data.id) {
        console.log('\n✅ SUCCESS: Email sent with ID:', result.data.id);
        console.log('📧 Check Gmail inbox for:');
        console.log(`   - Subject: "messageContent Fix Test - ${timestamp}"`);
        console.log('   - Body: Should contain "BODY CONTENT USING messageContent PARAMETER!"');
        console.log('\n🎯 Using messageContent parameter - this should fix the empty body issue!');
      } else {
        console.log('\n❌ Failed:', result);
      }
    } catch (e) {
      console.log('\nResponse:', content);
    }
  } else {
    console.log('\n❌ No response received');
  }

  mcp.kill();
}

testMessageContentFix().catch(console.error);