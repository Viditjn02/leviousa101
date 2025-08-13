import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: './services/paragon-mcp/.env' });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.SIGNING_KEY;
const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

console.log('🔍 Testing Fixed LinkedIn Integration');
console.log('===================================');

// Generate JWT token
const payload = {
  sub: userId,
  aud: `useparagon.com/${PROJECT_ID}`,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
const userToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

console.log('✅ Generated user token for testing');

// Test with the NEW SDK proxy format that should work
const testEndpoints = [
  {
    name: 'Get My Profile',
    endpoint: '/v2/me',
    method: 'GET',
    description: 'Get current user LinkedIn profile'
  },
  {
    name: 'Test Profile Search (should gracefully handle)',
    endpoint: '/v2/people/(id:shubhan-dua)',
    method: 'GET',
    description: 'Test getting profile by username format'
  }
];

async function testLinkedInEndpoint(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`📍 Endpoint: ${test.endpoint}`);
  console.log(`📝 Description: ${test.description}`);
  
  try {
    // Use the NEW SDK proxy format from the fixed MCP service
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin${test.endpoint}`;
    
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
    console.log(`📄 Response: ${responseText.substring(0, 800)}${responseText.length > 800 ? '...' : ''}`);
    
    if (response.ok) {
      console.log(`✅ SUCCESS: ${test.name} works!`);
      try {
        const jsonData = JSON.parse(responseText);
        if (jsonData && typeof jsonData === 'object') {
          console.log(`📋 Data keys: ${Object.keys(jsonData).join(', ')}`);
          
          // If it's a profile response, show some key info
          if (jsonData.localizedFirstName || jsonData.firstName) {
            console.log(`👤 Profile found: ${jsonData.localizedFirstName || jsonData.firstName} ${jsonData.localizedLastName || jsonData.lastName}`);
          }
        }
      } catch (e) {
        console.log('📋 Response is not JSON');
      }
    } else {
      console.log(`❌ FAILED: ${test.name}`);
      
      // Show error details
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          console.log(`💡 Error details:`, errorData);
        } catch (e) {
          console.log(`💡 Raw error: ${responseText}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ NETWORK ERROR: ${error.message}`);
  }
  
  console.log('─'.repeat(60));
}

async function runTests() {
  console.log(`👤 Testing for user: ${userId}`);
  console.log(`🔑 Using project: ${PROJECT_ID}`);
  console.log(`🔧 Using NEW SDK proxy format from the fixed MCP service`);
  
  for (const test of testEndpoints) {
    await testLinkedInEndpoint(test);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('Testing the updated LinkedIn integration with:');
  console.log('1. Correct SDK proxy URL format');
  console.log('2. Proper endpoint handling');
  console.log('3. Authentication verification');
  
  console.log('\nIf /v2/me works, LinkedIn authentication is functional!');
}

runTests().catch(console.error);