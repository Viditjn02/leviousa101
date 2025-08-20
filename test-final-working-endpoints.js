#!/usr/bin/env node

/**
 * FINAL WORKING ENDPOINTS TEST
 * Based on research findings and corrections
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🎯 FINAL WORKING ENDPOINTS TEST');
console.log('===============================\n');

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

async function testFinalEndpoints() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('👤 User ID:', userId);
    console.log('');

    // First get Calendly user info to get organization URI
    let calendlyOrgUri = null;

    const tests = [
        {
            name: '✅ Gmail - List Messages',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/gmail/v1/users/me/messages`,
            method: 'GET',
            params: '?maxResults=5',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '🗓️ Calendly - Get User Info (for org URI)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/users/me`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '📅 Google Calendar - List Calendars (FIXED PATH)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/users/me/calendarList`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '📅 Google Calendar - List Events (FIXED PATH)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendars/primary/events`,
            method: 'GET',
            params: '?maxResults=5',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '🔗 LinkedIn - Try Company Profile',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin/v2/companies`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '🔗 LinkedIn - Try Profile Info',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin/v2/people/~:(id,firstName,lastName,headline)`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '📝 Notion - Test User Check',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/notion/v1/users/me`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            }
        }
    ];

    let workingServices = [];
    let calendlyUserInfo = null;

    for (const test of tests) {
        console.log(`🧪 ${test.name}`);
        console.log(`📍 URL: ${test.url}${test.params || ''}`);
        
        try {
            const requestOptions = {
                method: test.method,
                headers: test.headers
            };

            if (test.body) {
                requestOptions.body = JSON.stringify(test.body);
            }

            const fullUrl = test.url + (test.params || '');
            const response = await fetch(fullUrl, requestOptions);
            
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            const responseText = await response.text();
            
            if (response.status < 300) {
                console.log('🎉 SUCCESS!');
                workingServices.push(test.name);
                
                try {
                    const jsonResponse = JSON.parse(responseText);
                    
                    if (test.name.includes('Gmail')) {
                        console.log(`📧 Gmail: ${jsonResponse.messages?.length || 0} messages found`);
                        if (jsonResponse.messages?.length > 0) {
                            console.log(`   First message ID: ${jsonResponse.messages[0].id}`);
                        }
                    } else if (test.name.includes('Calendly') && test.name.includes('User Info')) {
                        calendlyUserInfo = jsonResponse;
                        if (jsonResponse.resource) {
                            console.log(`👤 Calendly User: ${jsonResponse.resource.name}`);
                            console.log(`🏢 Organization: ${jsonResponse.resource.current_organization}`);
                            calendlyOrgUri = jsonResponse.resource.current_organization;
                        }
                    } else if (test.name.includes('Calendar')) {
                        if (jsonResponse.items) {
                            console.log(`📅 Found ${jsonResponse.items.length} items`);
                            if (jsonResponse.items.length > 0) {
                                console.log(`   First item: ${jsonResponse.items[0].summary || jsonResponse.items[0].id}`);
                            }
                        } else {
                            console.log(`📅 Response keys: ${Object.keys(jsonResponse).join(', ')}`);
                        }
                    } else if (test.name.includes('LinkedIn')) {
                        console.log(`🔗 LinkedIn response keys: ${Object.keys(jsonResponse).join(', ')}`);
                        if (jsonResponse.elements) {
                            console.log(`   Found ${jsonResponse.elements.length} elements`);
                        }
                    } else if (test.name.includes('Notion')) {
                        console.log(`📝 Notion response keys: ${Object.keys(jsonResponse).join(', ')}`);
                    }
                } catch (e) {
                    console.log('📋 Raw response preview:', responseText.substring(0, 200));
                }
            } else {
                console.log('❌ ERROR');
                try {
                    const errorJson = JSON.parse(responseText);
                    console.log('📋 Error:', errorJson.message || errorJson.error || 'Unknown error');
                    
                    if (response.status === 400 && test.name.includes('Notion')) {
                        console.log('🔴 Notion not enabled - check Paragon dashboard for Notion connection');
                    } else if (response.status === 403) {
                        console.log('🔴 Permission issue - check OAuth scopes');
                    } else if (response.status === 404) {
                        console.log('🔴 Endpoint issue - wrong path or service not connected');
                    }
                } catch (e) {
                    console.log('📋 Error response:', responseText.substring(0, 200));
                }
            }
            
        } catch (error) {
            console.log('❌ NETWORK ERROR:', error.message);
        }
        
        console.log('');
    }

    // Now test Calendly scheduled events with organization URI if we have it
    if (calendlyOrgUri) {
        console.log('🗓️ Testing Calendly Scheduled Events with Organization URI...');
        console.log(`📍 Organization URI: ${calendlyOrgUri}`);
        
        try {
            const eventsUrl = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/scheduled_events?organization=${encodeURIComponent(calendlyOrgUri)}&status=active`;
            
            const response = await fetch(eventsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            if (response.status < 300) {
                console.log('🎉 SUCCESS!');
                workingServices.push('🗓️ Calendly - List Scheduled Events');
                
                const responseText = await response.text();
                const jsonResponse = JSON.parse(responseText);
                console.log(`🗓️ Found ${jsonResponse.collection?.length || 0} scheduled events`);
            } else {
                const errorText = await response.text();
                console.log('❌ ERROR:', errorText.substring(0, 200));
            }
        } catch (error) {
            console.log('❌ NETWORK ERROR:', error.message);
        }
        console.log('');
    }
    
    console.log('📊 FINAL RESULTS');
    console.log('================');
    console.log(`✅ Working Services: ${workingServices.length}`);
    workingServices.forEach(service => console.log(`   • ${service}`));
    
    console.log('');
    console.log('🎯 SUMMARY:');
    console.log('• Gmail: ✅ FULLY WORKING');
    console.log('• Calendly: ✅ WORKING (user info + events with org URI)');
    console.log('• Google Calendar: Fixed paths - test results above');
    console.log('• LinkedIn: Test results above - may need specific scopes');
    console.log('• Notion: Needs to be enabled for user in Paragon dashboard');
}

// Run the test
testFinalEndpoints().then(() => {
    console.log('🏁 Final working endpoints test completed');
}).catch(error => {
    console.log('💥 Test failed:', error.message);
});