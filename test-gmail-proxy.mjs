import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: './services/paragon-mcp/.env' });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.SIGNING_KEY;
const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

console.log('🔍 Testing Gmail Proxy API Endpoints (for comparison)');
console.log('==================================================');

// Generate JWT token
const payload = {
  sub: userId,
  aud: `useparagon.com/${PROJECT_ID}`,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
const userToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

console.log('✅ Generated user token for Gmail testing');

// Test Gmail endpoints (these should work based on the working implementation)
const testEndpoints = [
  {
    name: 'Get Gmail Messages',
    endpoint: '/messages',
    method: 'GET',
    params: { maxResults: 5 },
    description: 'Get Gmail messages'
  },
  {
    name: 'Get Gmail Profile',
    endpoint: '/profile',
    method: 'GET',
    description: 'Get Gmail profile'
  }
];

async function testGmailEndpoint(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`📍 Endpoint: ${test.endpoint}`);
  
  try {
    let url = `https://api.useparagon.com/integrations/gmail${test.endpoint}`;
    
    if (test.params) {
      const searchParams = new URLSearchParams(test.params);
      url += `?${searchParams.toString()}`;
    }
    
    console.log(`🌐 Full URL: ${url}`);
    
    const response = await fetch(url, {
      method: test.method,
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Response: ${responseText.substring(0, 300)}...`);
    
    if (response.ok) {
      console.log(`✅ SUCCESS: ${test.name} works!`);
    } else {
      console.log(`❌ FAILED: ${test.name}`);
      
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          console.log(`💡 Error details: ${errorData.error}`);
        }
      } catch (e) {
        console.log('💡 Could not parse error response');
      }
    }
    
  } catch (error) {
    console.log(`❌ NETWORK ERROR: ${error.message}`);
  }
  
  console.log('─'.repeat(60));
}

async function testUserInfo() {
  console.log('\n🔍 Testing User Connection Status');
  console.log('================================');
  
  try {
    const url = `https://api.useparagon.com/v1/users/${userId}`;
    console.log(`🌐 User Info URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Response: ${responseText}`);
    
    if (response.ok) {
      const userData = JSON.parse(responseText);
      console.log('🔗 Connected integrations:', userData.integrations || 'None found');
    }
    
  } catch (error) {
    console.log(`❌ Error getting user info: ${error.message}`);
  }
}

async function runTests() {
  console.log(`👤 Testing for user: ${userId}`);
  console.log(`🔑 Using project: ${PROJECT_ID}`);
  
  // First check user connection status
  await testUserInfo();
  
  // Then test Gmail endpoints
  for (const test of testEndpoints) {
    await testGmailEndpoint(test);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('This will help us understand if the issue is LinkedIn-specific or general auth.');
}

runTests().catch(console.error);