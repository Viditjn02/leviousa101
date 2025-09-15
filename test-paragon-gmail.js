#!/usr/bin/env node

const jwt = require('jsonwebtoken');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Test Paragon Gmail integration directly
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

async function testGmailConnection() {
  console.log('🔍 Testing Paragon Gmail connection...\n');
  console.log('📋 Configuration:');
  console.log(`  Project ID: ${PROJECT_ID}`);
  console.log(`  User ID: ${USER_ID}`);
  console.log(`  Signing Key: ${SIGNING_KEY.substring(0, 50)}...`);
  
  const userToken = generateUserToken(USER_ID);
  console.log(`\n🔑 Generated JWT Token (first 100 chars):`);
  console.log(`  ${userToken.substring(0, 100)}...`);

  // Decode token to verify
  const decoded = jwt.decode(userToken);
  console.log('\n📝 Decoded Token:');
  console.log(JSON.stringify(decoded, null, 2));

  // Test 1: Check user integrations
  console.log('\n📡 Test 1: Checking user integrations...');
  try {
    const integrationsResponse = await fetch(`https://api.useparagon.com/user/${USER_ID}/integrations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Status: ${integrationsResponse.status} ${integrationsResponse.statusText}`);
    
    if (integrationsResponse.ok) {
      const integrations = await integrationsResponse.json();
      console.log('  ✅ User integrations:');
      console.log(JSON.stringify(integrations, null, 2));
      
      const gmailIntegration = integrations.find(i => i.integration === 'gmail');
      if (gmailIntegration && gmailIntegration.enabled) {
        console.log('\n  ✅ Gmail is connected and enabled!');
      } else {
        console.log('\n  ⚠️ Gmail is not connected or enabled');
      }
    } else {
      const errorText = await integrationsResponse.text();
      console.log('  ❌ Failed to get integrations:', errorText);
    }
  } catch (error) {
    console.log('  ❌ Error checking integrations:', error.message);
  }

  // Test 2: Try to send a test email
  console.log('\n📧 Test 2: Attempting to send test email...');
  try {
    const emailPayload = {
      to: ['viditjn02@gmail.com'],
      subject: 'Test Email from Paragon Debug 🎯',
      body: 'This is a test email sent directly through Paragon API.\n\nIf you receive this, the integration is working!\n\nBest regards,\nLeviousa Team'
    };

    const sendResponse = await fetch(`https://api.useparagon.com/integrations/gmail/actions/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    console.log(`  Status: ${sendResponse.status} ${sendResponse.statusText}`);
    
    const responseText = await sendResponse.text();
    console.log('  Response:', responseText);
    
    if (sendResponse.ok) {
      console.log('\n  ✅ Email sent successfully!');
    } else {
      console.log('\n  ❌ Failed to send email');
      
      // If 401, it might be a token issue
      if (sendResponse.status === 401) {
        console.log('\n  🔍 Debugging 401 error:');
        console.log('  - Make sure the user has authorized Gmail in Paragon');
        console.log('  - Check if the signing key matches what Paragon expects');
        console.log('  - Verify the project ID is correct');
      }
    }
  } catch (error) {
    console.log('  ❌ Error sending email:', error.message);
  }

  // Test 3: Check Paragon user status
  console.log('\n👤 Test 3: Checking Paragon user status...');
  try {
    const userResponse = await fetch(`https://api.useparagon.com/user/${USER_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Status: ${userResponse.status} ${userResponse.statusText}`);
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('  ✅ User data:');
      console.log(JSON.stringify(userData, null, 2));
    } else {
      const errorText = await userResponse.text();
      console.log('  ❌ Failed to get user data:', errorText);
    }
  } catch (error) {
    console.log('  ❌ Error checking user:', error.message);
  }
}

testGmailConnection().catch(console.error);