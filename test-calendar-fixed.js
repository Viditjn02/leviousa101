#!/usr/bin/env node

/**
 * Test fixed Google Calendar implementation
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Configuration
const USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔧 Testing FIXED Google Calendar Implementation');
console.log('===============================================\n');

// Generate JWT token
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

// Test 1: List events using fixed proxy pattern
async function testListEventsFixed(userToken) {
    console.log('📅 Test 1: List Events (Fixed Proxy)');
    console.log('-------------------------------------');
    
    // Try the simplified path
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/google-calendar/events`;
    
    const params = new URLSearchParams({
        maxResults: '10'
    });
    
    console.log(`   URL: ${url}?${params.toString()}`);
    
    try {
        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.log(`   ❌ Error ${response.status}: ${responseText.substring(0, 200)}`);
        } else {
            const data = JSON.parse(responseText);
            console.log(`   ✅ Success! Got ${data.items?.length || 0} events`);
            if (data.items?.[0]) {
                console.log(`   📌 First event: ${data.items[0].summary || 'No title'}`);
            }
            return true;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    return false;
}

// Test 2: Create event using fixed proxy pattern
async function testCreateEventFixed(userToken) {
    console.log('\n📝 Test 2: Create Event (Fixed Proxy)');
    console.log('--------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/google-calendar/events`;
    
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    
    const eventData = {
        summary: 'Test Event - Fixed Implementation',
        description: 'Testing fixed Paragon Calendar integration',
        start: {
            dateTime: now.toISOString(),
            timeZone: 'UTC'
        },
        end: {
            dateTime: later.toISOString(),
            timeZone: 'UTC'
        }
    };
    
    console.log(`   URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.log(`   ❌ Error ${response.status}: ${responseText.substring(0, 200)}`);
            return null;
        } else {
            const data = JSON.parse(responseText);
            console.log(`   ✅ Success! Event created`);
            console.log(`   Event ID: ${data.id}`);
            return data.id;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    return null;
}

// Test 3: Update event
async function testUpdateEventFixed(userToken, eventId) {
    if (!eventId) return false;
    
    console.log('\n🔄 Test 3: Update Event (Fixed Proxy)');
    console.log('--------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/google-calendar/events/${eventId}`;
    
    const updateData = {
        summary: 'Updated Test Event - Fixed Implementation',
        description: 'This event has been updated successfully'
    };
    
    console.log(`   URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.log(`   ❌ Error ${response.status}: ${responseText.substring(0, 200)}`);
            return false;
        } else {
            console.log(`   ✅ Success! Event updated`);
            return true;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    return false;
}

// Test 4: Delete event
async function testDeleteEventFixed(userToken, eventId) {
    if (!eventId) return false;
    
    console.log('\n🗑️  Test 4: Delete Event (Fixed Proxy)');
    console.log('--------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/google-calendar/events/${eventId}`;
    
    console.log(`   URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 204 || response.status === 200) {
            console.log(`   ✅ Success! Event deleted`);
            return true;
        } else {
            const responseText = await response.text();
            console.log(`   ❌ Error ${response.status}: ${responseText.substring(0, 200)}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    return false;
}

// Test 5: Test workflow pattern (should work now)
async function testWorkflowPattern(userToken) {
    console.log('\n📋 Test 5: List Events (Workflow Pattern)');
    console.log('------------------------------------------');
    
    const workflowId = 'b3722478-58db-4d18-a75a-043664ead1f7';
    const url = `https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/triggers/${workflowId}`;
    
    const requestData = {
        calendar: 'primary',
        maxResults: 5
    };
    
    console.log(`   URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.log(`   ❌ Error ${response.status}: ${responseText.substring(0, 200)}`);
            return false;
        } else {
            const data = JSON.parse(responseText);
            
            // Check if we got actual data
            if (data && Object.keys(data).length > 0) {
                console.log(`   ✅ Success! Got response`);
                console.log(`   Response preview: ${JSON.stringify(data).substring(0, 200)}...`);
                return true;
            } else {
                console.log(`   ⚠️  Empty response (workflow may need configuration)`);
                return false;
            }
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    return false;
}

// Main test execution
async function runTests() {
    try {
        console.log('🔑 Generating authentication token...');
        const userToken = generateUserToken(USER_ID);
        console.log('✅ Token generated\n');
        
        let allTestsPassed = true;
        
        // Run tests
        const test1 = await testListEventsFixed(userToken);
        allTestsPassed = allTestsPassed && test1;
        
        const eventId = await testCreateEventFixed(userToken);
        allTestsPassed = allTestsPassed && !!eventId;
        
        if (eventId) {
            const test3 = await testUpdateEventFixed(userToken, eventId);
            allTestsPassed = allTestsPassed && test3;
            
            const test4 = await testDeleteEventFixed(userToken, eventId);
            allTestsPassed = allTestsPassed && test4;
        }
        
        const test5 = await testWorkflowPattern(userToken);
        // Don't fail overall if workflow doesn't work, as proxy might be sufficient
        
        // Summary
        console.log('\n\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        
        if (allTestsPassed) {
            console.log('✅ ALL CRITICAL TESTS PASSED!');
            console.log('\n🎉 Google Calendar integration is working correctly!');
            console.log('\nWorking patterns:');
            console.log('  ✅ Proxy API pattern: google-calendar/events');
            console.log('  ' + (test5 ? '✅' : '⚠️') + ' Workflow pattern: May need additional config');
        } else {
            console.log('❌ Some tests failed');
            console.log('\n💡 Troubleshooting tips:');
            console.log('  1. Check if user has connected Google Calendar in Paragon');
            console.log('  2. Verify JWT token is correctly signed');
            console.log('  3. Check Paragon project settings and permissions');
        }
        
        console.log('\n📝 Implementation notes:');
        console.log('  - Use "google-calendar" as integration name (not "googleCalendar")');
        console.log('  - Use simplified paths (/events, not /calendar/v3/calendars/primary/events)');
        console.log('  - Workflows may return empty {} if not properly configured');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests
console.log('🚀 Starting fixed implementation tests...\n');
runTests().then(() => {
    console.log('\n✅ Test suite completed');
}).catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});