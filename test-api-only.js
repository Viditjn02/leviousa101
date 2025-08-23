#!/usr/bin/env node

/**
 * Simple API Test - No Electron Dependencies
 * Tests just the web API functionality
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000'; // Test locally
// const BASE_URL = 'https://www.leviousa.com'; // Test production

// Mock Firebase ID token for testing
const MOCK_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ0ZXN0LXVpZCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInN1YiI6InRlc3QtdWlkIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjE3MDAwMDM1OTl9.mock';

async function testAPI(endpoint, method = 'GET', body = null) {
  console.log(`\n🧪 Testing ${method} ${endpoint}`);
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${MOCK_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api${endpoint}`, options);
    const data = await response.json();
    
    console.log(`📋 Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    if (response.ok) {
      console.log(`📊 Success:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Error:`, data);
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`❌ Network Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runAPITests() {
  console.log('🚀 Testing Referral System APIs');
  console.log('================================\n');

  // Core functionality tests
  await testAPI('/usage/status');
  await testAPI('/referrals/create', 'POST', { referred_email: 'test@example.com' });
  await testAPI('/referrals/create', 'POST', { referred_email: 'viditjn02@gmail.com' });
  await testAPI('/referrals/stats');
  await testAPI('/subscription/current');
  
  console.log('\n🎉 API Tests Complete!');
  console.log('======================\n');
  
  console.log('📊 To test locally:');
  console.log('1. Start your Next.js dev server: cd leviousa_web && npm run dev');
  console.log('2. Change BASE_URL to "http://localhost:3000" in this script');
  console.log('3. Run: node test-api-only.js');
  console.log('');
  console.log('🔗 To test webhooks locally:');
  console.log('./stripe listen --forward-to localhost:3000/api/stripe/webhook');
}

runAPITests().catch(console.error);


