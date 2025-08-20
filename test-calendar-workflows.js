#!/usr/bin/env node

/**
 * Test Google Calendar Paragon workflows properly
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Configuration
const USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔍 GOOGLE CALENDAR WORKFLOW TESTING');
console.log('====================================\n');

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

// Test 1: List events via WORKFLOW (zeus URL)
async function testListEventsWorkflow(userToken) {
    console.log('📅 Test 1: List Events (Workflow - Zeus)');
    console.log('-----------------------------------------');
    
    const workflowId = 'b3722478-58db-4d18-a75a-043664ead1f7';
    const url = `https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/triggers/${workflowId}`;
    
    // Try different parameter formats
    const testCases = [
        {
            name: 'Simple params',
            data: {
                calendar: 'primary',
                maxResults: 10
            }
        },
        {
            name: 'With time range',
            data: {
                calendar: 'primary',
                maxResults: 10,
                timeMin: new Date().toISOString(),
                timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
        },
        {
            name: 'Minimal params',
            data: {}
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n   Trying: ${testCase.name}`);
        console.log(`   Data: ${JSON.stringify(testCase.data, null, 2)}`);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testCase.data)
            });
            
            const responseText = await response.text();
            
            if (!response.ok) {
                console.log(`   ❌ Error ${response.status}`);
                try {
                    const error = JSON.parse(responseText);
                    console.log(`   Message: ${error.message || responseText.substring(0, 100)}`);
                } catch {
                    console.log(`   Response: ${responseText.substring(0, 100)}`);
                }
            } else {
                const data = JSON.parse(responseText);
                if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                    console.log(`   ✅ Success! Got data`);
                    console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
                    if (data.items) {
                        console.log(`   Events count: ${data.items.length}`);
                        if (data.items[0]) {
                            console.log(`   First event: ${data.items[0].summary || 'No title'}`);
                        }
                    }
                    return true;
                } else {
                    console.log(`   ⚠️  Empty response: ${JSON.stringify(data)}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Request failed: ${error.message}`);
        }
    }
    
    return false;
}

// Test 2: Create event via PROXY API
async function testCreateEventProxy(userToken) {
    console.log('\n📝 Test 2: Create Event (Proxy API)');
    console.log('------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events`;
    
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    
    const eventData = {
        summary: 'Test Event from Paragon Workflow Test',
        description: 'Testing Paragon Calendar integration',
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
    console.log(`   Method: POST`);
    
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
            try {
                const error = JSON.parse(responseText);
                console.log(`   Message: ${error.message || error.error || responseText.substring(0, 200)}`);
            } catch {
                console.log(`   Response: ${responseText.substring(0, 200)}`);
            }
            return null;
        } else {
            const data = JSON.parse(responseText);
            console.log(`   ✅ Success! Event created`);
            console.log(`   Event ID: ${data.id}`);
            console.log(`   Event link: ${data.htmlLink}`);
            return data.id;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    return null;
}

// Test 3: Get event via PROXY API
async function testGetEventProxy(userToken, eventId) {
    if (!eventId) return false;
    
    console.log('\n🔍 Test 3: Get Event (Proxy API)');
    console.log('---------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${eventId}`;
    
    console.log(`   URL: ${url}`);
    console.log(`   Method: GET`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            console.log(`   ❌ Error ${response.status}`);
            console.log(`   Response: ${responseText.substring(0, 200)}`);
            return false;
        } else {
            const data = JSON.parse(responseText);
            console.log(`   ✅ Success! Event retrieved`);
            console.log(`   Summary: ${data.summary}`);
            console.log(`   Status: ${data.status}`);
            return true;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    return false;
}

// Test 4: Update event via PROXY API
async function testUpdateEventProxy(userToken, eventId) {
    if (!eventId) return false;
    
    console.log('\n🔄 Test 4: Update Event (Proxy API)');
    console.log('------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${eventId}`;
    
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    
    const updateData = {
        summary: 'Updated Test Event - Workflow Test',
        description: 'This event has been updated via Paragon',
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
    console.log(`   Method: PUT`);
    
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
            console.log(`   ❌ Error ${response.status}`);
            console.log(`   Response: ${responseText.substring(0, 200)}`);
            
            // Try PATCH if PUT fails
            console.log('\n   Retrying with PATCH method...');
            const patchResponse = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ summary: 'Updated via PATCH' })
            });
            
            if (patchResponse.ok) {
                console.log(`   ✅ Success with PATCH!`);
                return true;
            }
            
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

// Test 5: Delete event via PROXY API
async function testDeleteEventProxy(userToken, eventId) {
    if (!eventId) return false;
    
    console.log('\n🗑️  Test 5: Delete Event (Proxy API)');
    console.log('------------------------------------');
    
    const url = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events/${eventId}`;
    
    console.log(`   URL: ${url}`);
    console.log(`   Method: DELETE`);
    
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
            console.log(`   ❌ Error ${response.status}`);
            console.log(`   Response: ${responseText.substring(0, 200)}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    return false;
}

// Main test execution
async function runTests() {
    try {
        console.log('🔑 Authentication Setup');
        console.log('----------------------');
        console.log(`   User ID: ${USER_ID}`);
        console.log(`   Project ID: ${PROJECT_ID}`);
        
        const userToken = generateUserToken(USER_ID);
        console.log(`   ✅ JWT token generated\n`);
        
        // Run tests
        const results = {
            listWorkflow: await testListEventsWorkflow(userToken),
            createProxy: false,
            getProxy: false,
            updateProxy: false,
            deleteProxy: false
        };
        
        // CRUD operations via proxy
        const eventId = await testCreateEventProxy(userToken);
        results.createProxy = !!eventId;
        
        if (eventId) {
            results.getProxy = await testGetEventProxy(userToken, eventId);
            results.updateProxy = await testUpdateEventProxy(userToken, eventId);
            results.deleteProxy = await testDeleteEventProxy(userToken, eventId);
        }
        
        // Summary
        console.log('\n\n' + '='.repeat(50));
        console.log('📊 FINAL TEST RESULTS');
        console.log('='.repeat(50));
        
        console.log('\n🔧 Working patterns:');
        console.log(`   ${results.listWorkflow ? '✅' : '❌'} List Events (Workflow): zeus.useparagon.com`);
        console.log(`   ${results.createProxy ? '✅' : '❌'} Create Event (Proxy): proxy.useparagon.com`);
        console.log(`   ${results.getProxy ? '✅' : '❌'} Get Event (Proxy): proxy.useparagon.com`);
        console.log(`   ${results.updateProxy ? '✅' : '❌'} Update Event (Proxy): proxy.useparagon.com`);
        console.log(`   ${results.deleteProxy ? '✅' : '❌'} Delete Event (Proxy): proxy.useparagon.com`);
        
        const allPassed = Object.values(results).every(r => r);
        
        if (allPassed) {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('Google Calendar integration is fully functional!');
        } else {
            console.log('\n⚠️  Some tests failed');
            console.log('\nPossible issues:');
            console.log('1. User may not have connected Google Calendar in Paragon');
            console.log('2. Workflow may need configuration in Paragon dashboard');
            console.log('3. API permissions may be restricted');
        }
        
        console.log('\n📝 Implementation notes:');
        console.log('- List events: Use workflow (zeus URL) with workflow ID');
        console.log('- CRUD operations: Use proxy API (proxy.useparagon.com)');
        console.log('- Integration name: "googleCalendar" (camelCase)');
        console.log('- Calendar paths: /calendars/primary/events (no /calendar/v3 prefix)');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests
console.log('🚀 Starting comprehensive workflow tests...\n');
runTests().then(() => {
    console.log('\n✅ Test suite completed');
}).catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});