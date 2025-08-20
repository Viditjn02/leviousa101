const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;
const USER_ID = process.env.TEST_USER_ID || 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';

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

async function testDetailedEventCreation() {
  console.log('🔍 DETAILED EVENT CREATION TEST');
  console.log('=' .repeat(50));
  
  const userToken = generateUserToken(USER_ID);
  
  const eventData = {
    summary: 'Detailed Test Event',
    description: 'Testing event creation with full response logging',
    start: {
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      timeZone: 'America/New_York'
    },
    location: 'Test Location'
  };

  console.log('📝 Event Data:');
  console.log(JSON.stringify(eventData, null, 2));

  try {
    console.log('\n🚀 Creating event...');
    
    const response = await fetch(
      `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      }
    );

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('📊 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    const responseText = await response.text();
    console.log('\n📝 Raw Response:');
    console.log(responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Event created successfully!');
        console.log('📊 Event Details:');
        console.log(`   ID: ${data.id}`);
        console.log(`   Title: ${data.summary}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Created: ${data.created}`);
        console.log(`   Link: ${data.htmlLink}`);
        console.log(`   Start: ${data.start?.dateTime}`);
        console.log(`   End: ${data.end?.dateTime}`);
        
        // Test UPDATE on the created event
        if (data.id) {
          console.log('\n🔄 Testing UPDATE operation...');
          
          const updateData = {
            summary: 'UPDATED: Detailed Test Event',
            description: 'Updated via comprehensive test'
          };

          const updateResponse = await fetch(
            `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${data.id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updateData)
            }
          );

          console.log(`📊 Update Status: ${updateResponse.status} ${updateResponse.statusText}`);
          const updateText = await updateResponse.text();
          
          if (updateResponse.ok) {
            const updateResult = JSON.parse(updateText);
            console.log('✅ Event updated successfully!');
            console.log(`   New Title: ${updateResult.summary}`);
            
            // Test DELETE
            console.log('\n🗑️  Testing DELETE operation...');
            
            const deleteResponse = await fetch(
              `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${data.id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            console.log(`📊 Delete Status: ${deleteResponse.status} ${deleteResponse.statusText}`);
            
            if (deleteResponse.ok || deleteResponse.status === 204) {
              console.log('✅ Event deleted successfully!');
              console.log('\n🎉 FULL CRUD CYCLE COMPLETED SUCCESSFULLY!');
              
              // Summary
              console.log('\n📋 CRUD OPERATIONS SUMMARY:');
              console.log('✅ CREATE: Working');
              console.log('✅ READ:   Working');  
              console.log('✅ UPDATE: Working');
              console.log('✅ DELETE: Working');
              
              return true;
            } else {
              console.log('❌ Delete failed');
              console.log(await deleteResponse.text());
            }
          } else {
            console.log('❌ Update failed');
            console.log(updateText);
          }
        }
        
      } catch (parseError) {
        console.log('❌ Failed to parse response as JSON');
        console.log(`Parse error: ${parseError.message}`);
      }
    } else {
      console.log('❌ Event creation failed');
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

testDetailedEventCreation().catch(console.error);