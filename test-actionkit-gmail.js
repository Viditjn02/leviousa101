#!/usr/bin/env node

/**
 * Test ActionKit Gmail API format
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.SIGNING_KEY || process.env.PARAGON_SIGNING_KEY;

if (!PROJECT_ID || !SIGNING_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Test user ID
const TEST_USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

/**
 * Generate a Paragon user token
 */
function generateUserToken(userId) {
  const payload = {
    sub: userId,
    aud: `useparagon.com/${PROJECT_ID}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
  };

  const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

/**
 * Test getting ActionKit actions
 */
async function getActionKitActions() {
  console.log('\n📋 Getting ActionKit Actions Schema');
  console.log('====================================');
  
  const userToken = generateUserToken(TEST_USER_ID);
  
  try {
    // First, get all actions to see the schema
    const response = await fetch(`https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const actions = await response.json();
      
      // Find Gmail send action
      const gmailSendAction = Object.entries(actions).find(([key, value]) => 
        key.includes('GMAIL_SEND') || key.includes('gmail.send')
      );
      
      if (gmailSendAction) {
        console.log('\n✅ Found Gmail Send Action:');
        console.log(JSON.stringify(gmailSendAction, null, 2));
      } else {
        console.log('⚠️ No Gmail send action found in actions list');
        console.log('\nAll available actions:');
        console.log(Object.keys(actions));
      }
    } else {
      const errorText = await response.text();
      console.log(`⚠️ ActionKit API returned ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Failed to get ActionKit actions:', error.message);
  }
}

/**
 * Test different email formats
 */
async function testEmailFormats() {
  console.log('\n📧 Testing Different Email Formats');
  console.log('===================================');
  
  const userToken = generateUserToken(TEST_USER_ID);
  
  // Test different formats
  const formats = [
    {
      name: 'Format 1: Direct parameters',
      payload: {
        action: 'GMAIL_SEND_EMAIL',
        integration: 'gmail',
        parameters: {
          to: ['viditjn02@gmail.com'],
          subject: 'Test Email - Format 1',
          body: 'Testing direct parameters format'
        }
      }
    },
    {
      name: 'Format 2: toRecipients array',
      payload: {
        action: 'GMAIL_SEND_EMAIL',
        integration: 'gmail',
        parameters: {
          toRecipients: ['viditjn02@gmail.com'],
          subject: 'Test Email - Format 2',
          body: 'Testing toRecipients array format'
        }
      }
    },
    {
      name: 'Format 3: String format',
      payload: {
        action: 'GMAIL_SEND_EMAIL',
        integration: 'gmail',
        parameters: {
          to: 'viditjn02@gmail.com',
          subject: 'Test Email - Format 3',
          body: 'Testing string format'
        }
      }
    },
    {
      name: 'Format 4: ActionKit direct call',
      payload: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: 'Test Email - Format 4',
        body: 'Testing ActionKit direct format'
      }
    }
  ];
  
  for (const format of formats) {
    console.log(`\nTesting: ${format.name}`);
    console.log('Payload:', JSON.stringify(format.payload, null, 2));
    
    try {
      const response = await fetch(`https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions/GMAIL_SEND_EMAIL`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(format.payload)
      });
      
      const responseText = await response.text();
      console.log(`Response (${response.status}):`, responseText);
      
      if (response.ok) {
        console.log('✅ Format worked!');
        break;
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

// Run tests
async function runTests() {
  await getActionKitActions();
  await testEmailFormats();
}

runTests().catch(console.error);