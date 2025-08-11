#!/usr/bin/env node

/**
 * Debug Gmail ActionKit Parameters
 * Find out the exact parameter names expected by the GMAIL_SEND_EMAIL action
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

// Real user ID 
const USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

/**
 * Generate a Paragon user token
 */
function generateUserToken(userId) {
  const payload = {
    sub: userId,
    aud: `useparagon.com/${PROJECT_ID}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 3600),
  };

  const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

/**
 * Get the schema for Gmail send action
 */
async function getGmailActionSchema() {
  console.log('🔍 Getting Gmail Action Schema from ActionKit');
  console.log('===============================================');
  
  const userToken = generateUserToken(USER_ID);
  
  try {
    // Get all actions
    const response = await fetch(`https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to get actions: ${response.status}`);
      return;
    }
    
    const actions = await response.json();
    console.log('📋 All available actions:', Object.keys(actions));
    
    // Look for Gmail send action
    const gmailActions = Object.entries(actions).filter(([name, data]) => 
      name.toLowerCase().includes('gmail') && name.toLowerCase().includes('send')
    );
    
    if (gmailActions.length === 0) {
      console.log('❌ No Gmail send actions found');
      return;
    }
    
    gmailActions.forEach(([actionName, actionData]) => {
      console.log(`\n📧 Gmail Action: ${actionName}`);
      console.log('Schema:', JSON.stringify(actionData, null, 2));
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Test different parameter combinations
 */
async function testParameterCombinations() {
  console.log('\n🧪 Testing Different Parameter Combinations');
  console.log('===========================================');
  
  const userToken = generateUserToken(USER_ID);
  
  const testCombinations = [
    {
      name: 'Combination 1: messageContent',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: 'Parameter Test 1',
        messageContent: 'Testing messageContent parameter'
      }
    },
    {
      name: 'Combination 2: body',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: 'Parameter Test 2', 
        body: 'Testing body parameter'
      }
    },
    {
      name: 'Combination 3: textBody',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: 'Parameter Test 3',
        textBody: 'Testing textBody parameter'
      }
    },
    {
      name: 'Combination 4: message with body object',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: 'Parameter Test 4',
        message: {
          body: 'Testing message.body parameter'
        }
      }
    },
    {
      name: 'Combination 5: content',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: 'Parameter Test 5',
        content: 'Testing content parameter'
      }
    }
  ];
  
  for (const combination of testCombinations) {
    console.log(`\n📧 Testing: ${combination.name}`);
    console.log('Parameters:', JSON.stringify(combination.parameters, null, 2));
    
    try {
      const payload = {
        action: 'GMAIL_SEND_EMAIL',
        integration: 'gmail',
        parameters: combination.parameters
      };
      
      const response = await fetch(`https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      console.log(`Response (${response.status}):`, responseText);
      
      if (response.ok) {
        console.log('✅ SUCCESS: This parameter combination works!');
        try {
          const result = JSON.parse(responseText);
          if (result.id) {
            console.log('📧 Email sent with ID:', result.id);
          }
        } catch (e) {
          // Response not JSON
        }
      } else {
        console.log('❌ Failed with this combination');
      }
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

async function runDebug() {
  await getGmailActionSchema();
  await testParameterCombinations();
  
  console.log('\n📝 Summary');
  console.log('==========');
  console.log('This test helps identify:');
  console.log('1. The exact parameter names expected by Gmail ActionKit');
  console.log('2. Which parameter combination successfully sends emails');
  console.log('3. The correct body parameter name to use');
}

runDebug().catch(console.error);