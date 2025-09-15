#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test Paragon ActionKit API directly
const PROJECT_ID = 'f7e139ca-5ef0-4211-9118-2d65154fc2a6';
const USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

// Read and parse the signing key properly
let SIGNING_KEY = null;
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  
  // Find the SIGNING_KEY line
  let keyStartIndex = lines.findIndex(line => line.startsWith('SIGNING_KEY='));
  if (keyStartIndex === -1) {
    keyStartIndex = lines.findIndex(line => line.startsWith('PARAGON_SIGNING_KEY='));
  }
  
  if (keyStartIndex !== -1) {
    // Extract multi-line key
    let keyLines = [];
    let inKey = false;
    
    for (let i = keyStartIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('BEGIN PRIVATE KEY')) {
        inKey = true;
        keyLines.push(line.split('=')[1]?.replace(/^"|"$/, '') || line);
      } else if (inKey) {
        if (line.includes('END PRIVATE KEY')) {
          keyLines.push(line.replace(/^"|"$/, ''));
          break;
        } else {
          keyLines.push(line);
        }
      }
    }
    
    SIGNING_KEY = keyLines.join('\n').replace(/^"|"$/g, '');
  }
} catch (error) {
  console.error('Error reading .env file:', error);
}

if (!SIGNING_KEY) {
  console.error('❌ Could not find SIGNING_KEY in .env file');
  process.exit(1);
}

// Generate JWT token
function generateUserToken(userId) {
  const payload = {
    sub: userId,
    aud: `useparagon.com/${PROJECT_ID}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
  };

  return jwt.sign(payload, SIGNING_KEY, { algorithm: 'RS256' });
}

async function testActionKit() {
  console.log('🔍 Testing Paragon ActionKit API...\n');
  console.log('📋 Configuration:');
  console.log(`  Project ID: ${PROJECT_ID}`);
  console.log(`  User ID: ${USER_ID}`);
  
  const userToken = generateUserToken(USER_ID);
  console.log(`\n🔑 Generated JWT Token`);
  
  // Decode token to verify
  const decoded = jwt.decode(userToken);
  console.log('\n📝 Decoded Token:');
  console.log(JSON.stringify(decoded, null, 2));

  // Test sending email via ActionKit
  console.log('\n📧 Testing Gmail Send via ActionKit...');
  
  const payload = {
    action: "GMAIL_SEND_EMAIL",
    parameters: {
      toRecipients: ["viditjn02@gmail.com"],
      subject: "Test Email from ActionKit Debug 🎯",
      messageContent: "This is a test email sent directly through Paragon ActionKit API.\n\nIf you receive this, the integration is working!\n\nBest regards,\nLeviousa Team",
      additionalHeaders: {}
    }
  };

  try {
    const url = `https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions/#GMAIL_SEND_EMAIL`;
    console.log(`\n🌐 URL: ${url}`);
    console.log('\n📤 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log(`\n📨 Response Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('📋 Response Body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ Email sent successfully via ActionKit!');
    } else {
      console.log('\n❌ Failed to send email via ActionKit');
      
      if (response.status === 401) {
        console.log('\n🔍 Possible causes for 401:');
        console.log('  1. User has not connected Gmail in Paragon');
        console.log('  2. JWT token is not properly signed');
        console.log('  3. Project ID mismatch');
        console.log('  4. User ID mismatch');
      } else if (response.status === 404) {
        console.log('\n🔍 404 suggests the endpoint or action name might be wrong');
      }
    }
  } catch (error) {
    console.log('\n❌ Error calling ActionKit:', error.message);
  }

  // Also test the workflow/proxy endpoint that the MCP server might be using
  console.log('\n\n📧 Testing alternative endpoint (workflow/proxy)...');
  
  try {
    const proxyUrl = `https://api.useparagon.com/workflow/proxy`;
    const proxyPayload = {
      workflowId: 'GMAIL_SEND_EMAIL',
      projectId: PROJECT_ID,
      userId: USER_ID,
      parameters: {
        to: ["viditjn02@gmail.com"],
        subject: "Test Email via Proxy 🎯",
        body: "This is a test email sent through the proxy endpoint.\n\nBest regards,\nLeviousa Team"
      }
    };
    
    console.log(`\n🌐 URL: ${proxyUrl}`);
    console.log('\n📤 Payload:', JSON.stringify(proxyPayload, null, 2));
    
    const proxyResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyPayload)
    });

    console.log(`\n📨 Response Status: ${proxyResponse.status} ${proxyResponse.statusText}`);
    
    const proxyResponseText = await proxyResponse.text();
    console.log('📋 Response Body:', proxyResponseText);
    
    if (proxyResponse.ok) {
      console.log('\n✅ Email sent successfully via proxy!');
    } else {
      console.log('\n❌ Failed to send email via proxy');
    }
  } catch (error) {
    console.log('\n❌ Error calling proxy:', error.message);
  }
}

testActionKit().catch(console.error);