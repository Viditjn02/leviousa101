#!/usr/bin/env node

const { spawn } = require('child_process');

// Test emoji encoding
async function testEmojiEmail() {
  console.log('🔍 Testing email with emojis...\n');
  
  const mcpProcess = spawn('node', [
    '/Applications/XAMPP/xamppfiles/htdocs/Leviousa101/services/paragon-mcp/dist/index.mjs'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseReceived = false;

  mcpProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('"id":3')) {
      console.log('📨 Response:', output);
      if (output.includes('success') && output.includes('true')) {
        console.log('\n✅ Email sent successfully with emojis!');
        responseReceived = true;
      } else if (output.includes('error')) {
        console.log('\n❌ Error sending email');
        responseReceived = true;
      }
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Sending payload')) {
      console.log('📤 Payload being sent to ActionKit');
    }
  });

  // Initialize
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

  // Send email with lots of emojis
  const emailRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'gmail_send_email',
      arguments: {
        to: ['viditjn02@gmail.com'],
        subject: '🎉 Emoji Test Email 🚀 Unicode Works! 💌',
        body: 'Hello! 👋\n\n' +
              'This email tests emoji encoding: 🎯✅🔥🌟💪\n\n' +
              'Various emojis:\n' +
              '• Faces: 😀😎🤔😍🥳\n' +
              '• Objects: 📧📱💻🎮🎨\n' +
              '• Nature: 🌈🌺🦋🐱🦄\n' +
              '• Food: 🍕🍔🍰☕🥗\n' +
              '• Flags: 🇺🇸🇬🇧🇯🇵🇮🇳🇫🇷\n\n' +
              'Special characters: © ® ™ € £ ¥ § ¶\n' +
              'Accented: café, naïve, résumé, Zürich\n\n' +
              'Best regards,\n' +
              'Leviousa Team 🚀',
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
      }
    }
  };
  
  console.log('📧 Sending email with emojis...');
  console.log('Subject:', emailRequest.params.arguments.subject);
  console.log('Body preview:', emailRequest.params.arguments.body.substring(0, 100) + '...\n');
  
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

testEmojiEmail().catch(console.error);