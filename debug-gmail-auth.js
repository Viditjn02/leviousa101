#!/usr/bin/env node

/**
 * Debug Gmail Authentication Status
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

// Real user ID from the logs
const REAL_USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

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
 * Check user authentication status
 */
async function checkUserAuth() {
  console.log('🔍 Checking User Authentication Status');
  console.log('======================================');
  
  const userToken = generateUserToken(REAL_USER_ID);
  
  // Try different API endpoints to check authentication
  const endpoints = [
    { name: 'Paragon Users API', url: `https://api.useparagon.com/users/${REAL_USER_ID}`, headers: { 'X-Paragon-Project': PROJECT_ID } },
    { name: 'Paragon v1/users/me', url: `https://api.useparagon.com/v1/users/me`, headers: { 'X-Paragon-Project-Id': PROJECT_ID } },
    { name: 'Connect API', url: `https://connect.useparagon.com/users/me`, headers: {} }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint.name}`);
    console.log(`URL: ${endpoint.url}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...endpoint.headers
        }
      });
      
      const responseText = await response.text();
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('✅ Success! Data:', JSON.stringify(data, null, 2));
          
          if (data.integrations && data.integrations.gmail) {
            console.log('📧 Gmail integration status:', data.integrations.gmail);
          }
        } catch {
          console.log('✅ Success! Response:', responseText);
        }
      } else {
        console.log('❌ Error:', responseText);
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
  }
}

/**
 * Check available integrations in the project
 */
async function checkProjectIntegrations() {
  console.log('\n🔧 Checking Project Integrations');
  console.log('=================================');
  
  const userToken = generateUserToken(REAL_USER_ID);
  
  try {
    const response = await fetch(`https://api.useparagon.com/projects/${PROJECT_ID}/integrations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await response.text();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Project integrations:', JSON.stringify(data, null, 2));
      } catch {
        console.log('✅ Response:', responseText);
      }
    } else {
      console.log('❌ Error:', responseText);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

// Run debug
async function runDebug() {
  console.log(`🔍 Debugging Gmail Authentication for User: ${REAL_USER_ID}`);
  console.log(`📋 Project ID: ${PROJECT_ID}\n`);
  
  await checkUserAuth();
  await checkProjectIntegrations();
  
  console.log('\n📝 Summary');
  console.log('==========');
  console.log('To enable Gmail actions in ActionKit:');
  console.log('1. User must authenticate with Gmail via Paragon Connect Portal');
  console.log('2. Gmail integration must be configured in the Paragon project');
  console.log('3. User must grant Gmail permissions (send email scope)');
  console.log('4. Once authenticated, Gmail actions will appear in ActionKit API');
}

runDebug().catch(console.error);