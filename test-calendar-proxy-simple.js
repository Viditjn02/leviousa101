const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;
const USER_ID = process.env.TEST_USER_ID || 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

if (!PROJECT_ID || !SIGNING_KEY || !USER_ID) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

function generateUserToken(userId) {
  const payload = {
    iss: PROJECT_ID,
    sub: userId,
    aud: [`proxy.useparagon.com/${PROJECT_ID}`],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  return jwt.sign(payload, SIGNING_KEY, { algorithm: 'RS256' });
}

async function testCalendarProxyEndpoints() {
  console.log('🧪 Testing Calendar Proxy Endpoints');
  console.log('=' .repeat(50));
  
  const userToken = generateUserToken(USER_ID);
  console.log('✅ Generated user token');

  const tests = [
    {
      name: '📅 Google Calendar - List Calendars (Fixed Path)',
      url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/users/me/calendarList`,
      method: 'GET'
    },
    {
      name: '📅 Google Calendar - List Events (Fixed Path)',
      url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events?maxResults=5`,
      method: 'GET'
    },
    {
      name: '📆 Calendly - Get User Info',
      url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/users/me`,
      method: 'GET'
    },
    {
      name: '📆 Calendly - List Event Types (need org)',
      url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/event_types`,
      method: 'GET'
    },
    {
      name: '📆 Calendly - List Scheduled Events',
      url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/scheduled_events?count=5`,
      method: 'GET'
    }
  ];

  for (const test of tests) {
    console.log(`\n🧪 ${test.name}`);
    console.log('-'.repeat(40));
    
    try {
      const startTime = Date.now();
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('✅ SUCCESS');
          
          if (data.items) {
            console.log(`📋 Found ${data.items.length} items`);
          } else if (data.collection) {
            console.log(`📋 Found ${data.collection.length} items`);
          } else if (data.resource) {
            console.log(`📋 Resource data available`);
          } else {
            console.log('📋 Data received');
          }
          
        } catch (parseError) {
          console.log('✅ SUCCESS (non-JSON response)');
          console.log(`📝 Response: ${responseText.substring(0, 200)}...`);
        }
      } else {
        console.log('❌ FAILED');
        console.log(`📝 Response: ${responseText}`);
      }
      
    } catch (error) {
      console.log('❌ ERROR');
      console.log(`📝 ${error.message}`);
    }
  }

  console.log('\n🎯 Summary');
  console.log('=' .repeat(50));
  console.log('✅ Tested proxy endpoints for Google Calendar and Calendly');
  console.log('✅ No ActionKit dependencies - using pure proxy API');
  console.log('📋 Endpoint pattern: proxy.useparagon.com/projects/{id}/sdk/proxy/{service}/{path}');
}

testCalendarProxyEndpoints().catch(console.error);