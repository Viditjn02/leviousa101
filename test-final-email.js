#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// Test the complete email flow
async function testEmailFlow() {
  console.log('🔍 Testing complete email flow...\n');
  
  const mcpProcess = spawn('node', [
    '/Applications/XAMPP/xamppfiles/htdocs/Leviousa101/services/paragon-mcp/dist/index.mjs'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  const rl = readline.createInterface({
    input: mcpProcess.stdout,
    crlfDelay: Infinity
  });

  let responseReceived = false;

  rl.on('line', (line) => {
    console.log('📨 MCP:', line);
    try {
      const response = JSON.parse(line);
      if (response.id === 3) { // Our email request
        responseReceived = true;
        if (response.error) {
          console.log('\n❌ Email failed:', response.error);
        } else if (response.result) {
          const content = response.result.content?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed.error) {
              console.log('\n❌ Email failed:', parsed.error);
            } else if (parsed.id || parsed.success !== false) {
              console.log('\n✅ Email sent successfully!');
              console.log('Response:', content);
            }
          }
        }
      }
    } catch (e) {
      // Not JSON or parsing error
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('[ParagonMCP]')) {
      console.log('⚠️', output.trim());
    }
  });

  // Initialize
  console.log('📤 Initializing MCP...');
  mcpProcess.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' }
    }
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 500));

  // Send email
  console.log('\n📧 Sending test email...');
  const emailRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'gmail_send_email',
      arguments: {
        to: ['viditjn02@gmail.com'],
        subject: 'Test Email - Fixed! 🎉',
        body: 'This email was sent successfully using the ActionKit endpoint.\n\nThe fix is working!\n\nBest regards,\nLeviousa Team',
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
      }
    }
  };
  
  console.log('Request:', JSON.stringify(emailRequest.params.arguments, null, 2));
  mcpProcess.stdin.write(JSON.stringify(emailRequest) + '\n');

  // Wait for response
  let timeout = 10;
  while (!responseReceived && timeout > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    timeout--;
  }

  if (!responseReceived) {
    console.log('\n⏱️ Timeout waiting for response');
  }

  // Cleanup
  mcpProcess.kill();
}

testEmailFlow().catch(console.error);