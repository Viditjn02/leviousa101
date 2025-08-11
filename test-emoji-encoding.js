#!/usr/bin/env node

/**
 * Test Emoji Encoding Fix for Gmail
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test the MCP server's Gmail send with emojis
async function testEmojiEncoding() {
  console.log('🔧 Testing Emoji Encoding Fix');
  console.log('==============================');

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

  // Test email with emojis and Unicode characters
  console.log('\n📧 Testing Gmail with Emojis and Unicode');
  const testRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'GMAIL_SEND_EMAIL',
      arguments: {
        to: ['viditjn02@gmail.com'],
        subject: 'Test Email with Emojis 🚀✨ and Unicode: café, naïve, résumé',
        body: 'Hello! 👋\n\nThis is a test email with:\n- Emojis: 😊 🎉 🔥 💯\n- Unicode: café naïve résumé\n- Special chars: €£¥\n\nBest regards! 🌟',
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'
      }
    }
  };

  mcp.stdin.write(JSON.stringify(testRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 8000));

  console.log('\n📤 Debug Output (encoding info):');
  console.log('==================================');
  
  // Filter for encoding-related debug output
  const encodingOutput = allOutput.filter(line => 
    line.includes('MIME message preview') || 
    line.includes('Subject (original)') ||
    line.includes('Subject (encoded)') ||
    line.includes('Body length') ||
    line.includes('Full MIME preview') ||
    line.includes('ActionKit response')
  );
  
  encodingOutput.forEach(line => console.log(line));

  console.log('\n📋 Final Result:');
  console.log('=================');
  const lastResponse = jsonResponses[jsonResponses.length - 1];
  if (lastResponse && lastResponse.result && lastResponse.result.content) {
    const content = lastResponse.result.content[0]?.text;
    if (content) {
      try {
        const result = JSON.parse(content);
        console.log('✅ Email sent successfully!');
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.success && result.data && result.data.id) {
          console.log('🎯 SUCCESS: Email sent with ID:', result.data.id);
          console.log('📧 Subject encoding should now handle emojis properly');
          console.log('📝 Body encoding should preserve Unicode characters');
        }
      } catch (e) {
        console.log('Content (raw):', content);
      }
    }
  } else {
    console.log('❌ No valid response received');
  }

  // Kill the process
  mcp.kill();
  
  console.log('\n✅ Test completed!');
  console.log('\n📝 What to Check:');
  console.log('1. Subject should display emojis correctly in Gmail');
  console.log('2. Body should show all emojis and Unicode characters properly');
  console.log('3. No empty body or garbled characters');
}

testEmojiEncoding().catch(console.error);