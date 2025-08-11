#!/usr/bin/env node

/**
 * Test Individual Parameters to Find Which Actually Delivers Body Content
 * Based on user feedback that only "subject parameter 1" (messageContent) worked
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.SIGNING_KEY || process.env.PARAGON_SIGNING_KEY;
const USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

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

async function testParameterDelivery() {
  console.log('🔍 Testing Which Parameter Actually Delivers Body Content');
  console.log('========================================================');
  
  const userToken = generateUserToken(USER_ID);
  const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
  
  // Test combinations with unique content to identify which one delivers
  const testCombinations = [
    {
      name: 'messageContent (Parameter 1 - User said this worked)',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: `Test 1 - ${timestamp}`,
        messageContent: `CONTENT FROM PARAMETER 1 (messageContent) - ${timestamp}`
      }
    },
    {
      name: 'body (Parameter 2)',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: `Test 2 - ${timestamp}`,
        body: `CONTENT FROM PARAMETER 2 (body) - ${timestamp}`
      }
    },
    {
      name: 'textBody (Parameter 3 - Current implementation)',
      parameters: {
        toRecipients: ['viditjn02@gmail.com'],
        subject: `Test 3 - ${timestamp}`,
        textBody: `CONTENT FROM PARAMETER 3 (textBody) - ${timestamp}`
      }
    }
  ];
  
  for (let i = 0; i < testCombinations.length; i++) {
    const combination = testCombinations[i];
    console.log(`\n📧 ${i + 1}. Testing: ${combination.name}`);
    console.log(`Subject: ${combination.parameters.subject}`);
    console.log(`Expected body content: "${Object.values(combination.parameters).find(v => typeof v === 'string' && v.includes('CONTENT FROM'))}"`);
    
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
      
      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          console.log(`✅ SUCCESS: Email sent with ID: ${result.id}`);
        } catch (e) {
          console.log(`✅ SUCCESS: ${responseText}`);
        }
      } else {
        console.log(`❌ FAILED: ${response.status} - ${responseText}`);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n📝 Summary');
  console.log('===========');
  console.log('Check your Gmail inbox for 3 emails with subjects:');
  console.log(`- "Test 1 - ${timestamp}" (messageContent)`);
  console.log(`- "Test 2 - ${timestamp}" (body)`);
  console.log(`- "Test 3 - ${timestamp}" (textBody)`);
  console.log('\n🔍 Look for which email(s) actually contain the expected body content:');
  console.log('- Parameter 1 should contain: "CONTENT FROM PARAMETER 1 (messageContent)"');
  console.log('- Parameter 2 should contain: "CONTENT FROM PARAMETER 2 (body)"');
  console.log('- Parameter 3 should contain: "CONTENT FROM PARAMETER 3 (textBody)"');
  console.log('\n📧 Report back which parameter(s) delivered the body content correctly!');
}

testParameterDelivery().catch(console.error);