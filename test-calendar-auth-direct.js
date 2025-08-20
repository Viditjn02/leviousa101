#!/usr/bin/env node

/**
 * Direct test of Google Calendar with proper authentication
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Configuration
const USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔐 Testing Google Calendar with Authenticated User');
console.log('==================================================\n');

// Generate JWT token
function generateUserToken(userId) {
    try {
        if (!SIGNING_KEY) {
            throw new Error('SIGNING_KEY is not configured');
        }

        const payload = {
            sub: userId,
            aud: `useparagon.com/${PROJECT_ID}`,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
        };

        const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
        const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
        
        console.log('✅ JWT Token generated successfully');
        console.log(`   User ID: ${userId}`);
        console.log(`   Project ID: ${PROJECT_ID}`);
        console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...`);
        
        return token;
    } catch (error) {
        console.error('❌ Failed to generate JWT:', error.message);
        throw error;
    }
}

// Test list events via workflow
async function testListEventsWorkflow(userToken) {
    console.log('\n📅 Testing List Events (Workflow Pattern)');
    console.log('------------------------------------------');
    
    const workflowId = 'b3722478-58db-4d18-a75a-043664ead1f7';
    const url = `https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/triggers/${workflowId}`;
    
    const requestData = {
        calendar: 'primary',
        maxResults: 10
    };
    
    console.log(`   URL: ${url}`);
    console.log(`   Data: ${JSON.stringify(requestData, null, 2)}`);
    
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
            console.log(`   ❌ Error ${response.status}: ${response.statusText}`);
            console.log(`   Response: ${responseText}`);
            
            // Parse error details
            try {
                const errorData = JSON.parse(responseText);
                if (errorData.message) {
                    console.log(`   📝 Error message: ${errorData.message}`);
                }
                if (errorData.code === '24005') {
                    console.log(`   ⚠️  User needs to authenticate Google Calendar in Paragon`);
                }
            } catch (e) {}
        } else {
            const data = JSON.parse(responseText);
            console.log(`   ✅ Success! Response:`);
            console.log(`   ${JSON.stringify(data, null, 2).substring(0, 500)}...`);
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
}

// Test list events via proxy API
async function testListEventsProxy(userToken) {
    console.log('\n📅 Testing List Events (Proxy API Pattern)');
    console.log('-------------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendar/v3/calendars/primary/events`;
    
    const params = new URLSearchParams({
        maxResults: '10',
        timeMin: new Date().toISOString()
    });
    
    const fullUrl = `${url}?${params.toString()}`;
    
    console.log(`   URL: ${fullUrl}`);
    
    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.log(`   ❌ Error ${response.status}: ${response.statusText}`);
            console.log(`   Response: ${responseText}`);
        } else {
            const data = JSON.parse(responseText);
            console.log(`   ✅ Success! Got ${data.items?.length || 0} events`);
            
            if (data.items && data.items.length > 0) {
                console.log(`   📌 First event: ${data.items[0].summary || 'No title'}`);
                console.log(`      Start: ${data.items[0].start?.dateTime || data.items[0].start?.date}`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
}

// Test create event
async function testCreateEvent(userToken) {
    console.log('\n📝 Testing Create Event (Proxy API)');
    console.log('------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendar/v3/calendars/primary/events`;
    
    const now = new Date();
    const later = new Date(now.getTime() + 3600000); // 1 hour later
    
    const eventData = {
        summary: 'Test Event from Paragon',
        description: 'This is a test event created via Paragon API',
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
    console.log(`   Event: ${JSON.stringify(eventData, null, 2)}`);
    
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
            console.log(`   ❌ Error ${response.status}: ${response.statusText}`);
            console.log(`   Response: ${responseText}`);
            
            // Try to understand the error
            if (response.status === 400) {
                console.log(`   📝 Likely cause: Missing required fields or format issues`);
            } else if (response.status === 401) {
                console.log(`   📝 Likely cause: Authentication issue or expired token`);
            } else if (response.status === 403) {
                console.log(`   📝 Likely cause: No calendar permissions or user not connected`);
            }
        } else {
            const data = JSON.parse(responseText);
            console.log(`   ✅ Success! Event created`);
            console.log(`   Event ID: ${data.id}`);
            console.log(`   Link: ${data.htmlLink}`);
            
            return data.id; // Return for cleanup
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    return null;
}

// Test delete event
async function testDeleteEvent(userToken, eventId) {
    if (!eventId) {
        console.log('\n⚠️  No event to delete');
        return;
    }
    
    console.log('\n🗑️  Testing Delete Event');
    console.log('------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendar/v3/calendars/primary/events/${eventId}`;
    
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
            console.log(`   ✅ Event deleted successfully`);
        } else {
            const responseText = await response.text();
            console.log(`   ❌ Error ${response.status}: ${response.statusText}`);
            console.log(`   Response: ${responseText}`);
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
}

// Main test execution
async function runTests() {
    try {
        // Check environment
        if (!PROJECT_ID || !SIGNING_KEY) {
            throw new Error('Missing required environment variables: PARAGON_PROJECT_ID and SIGNING_KEY');
        }
        
        console.log('📋 Configuration:');
        console.log(`   User ID: ${USER_ID}`);
        console.log(`   Project ID: ${PROJECT_ID}`);
        console.log(`   Signing Key: ${SIGNING_KEY ? 'Configured' : 'Missing'}`);
        
        // Generate token
        const userToken = generateUserToken(USER_ID);
        
        // Run tests
        await testListEventsWorkflow(userToken);
        await testListEventsProxy(userToken);
        const eventId = await testCreateEvent(userToken);
        await testDeleteEvent(userToken, eventId);
        
        // Summary
        console.log('\n\n📊 SUMMARY');
        console.log('==========');
        console.log('✅ Tests completed');
        console.log('\n💡 Next steps:');
        console.log('1. If getting "Cache missing connectCredentialId" - User needs to connect Google Calendar in Paragon');
        console.log('2. If getting 400/401/403 errors - Check authentication and permissions');
        console.log('3. If proxy API works but workflow doesn\'t - Use proxy API pattern instead');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests
console.log('🚀 Starting tests...\n');
runTests().then(() => {
    console.log('\n✅ Test suite completed');
}).catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});