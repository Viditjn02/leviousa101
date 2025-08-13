import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: './services/paragon-mcp/.env' });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.SIGNING_KEY;
const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

console.log('🔍 Testing LinkedIn SDK Proxy API (Different URL Format)');
console.log('======================================================');

// Generate JWT token
const payload = {
  sub: userId,
  aud: `useparagon.com/${PROJECT_ID}`,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
const userToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

console.log('✅ Generated user token for LinkedIn SDK testing');

// Test with SDK proxy format: https://proxy.useparagon.com/projects/<Project ID>/sdk/proxy/<Integration>/<API path>
const testEndpoints = [
  {
    name: 'Get Profile (Me) - SDK Format',
    endpoint: '/v2/me',
    method: 'GET',
    description: 'Get current user profile using SDK proxy format'
  },
  {
    name: 'Get Profile (Me) - Original Format',
    endpoint: '/v2/me',
    method: 'GET',
    description: 'Get current user profile using original format',
    useOriginal: true
  }
];

async function testLinkedInEndpoint(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`📍 Endpoint: ${test.endpoint}`);
  console.log(`📝 Description: ${test.description}`);
  
  try {
    let url;
    
    if (test.useOriginal) {
      // Original format from MCP service
      url = `https://api.useparagon.com/integrations/linkedin${test.endpoint}`;
    } else {
      // SDK proxy format from documentation
      url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin${test.endpoint}`;
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
    console.log(`📄 Response: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    
    if (response.ok) {
      console.log(`✅ SUCCESS: ${test.name} works!`);
      try {
        const jsonData = JSON.parse(responseText);
        if (jsonData && typeof jsonData === 'object') {
          console.log(`📋 Data keys: ${Object.keys(jsonData).join(', ')}`);
        }
      } catch (e) {
        console.log('📋 Response is not JSON');
      }
    } else {
      console.log(`❌ FAILED: ${test.name}`);
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error || errorData.message) {
          console.log(`💡 Error details: ${errorData.error || errorData.message}`);
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

async function runTests() {
  console.log(`👤 Testing for user: ${userId}`);
  console.log(`🔑 Using project: ${PROJECT_ID}`);
  
  for (const test of testEndpoints) {
    await testLinkedInEndpoint(test);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('Comparing original vs SDK proxy format to identify the correct URL pattern.');
}

runTests().catch(console.error);