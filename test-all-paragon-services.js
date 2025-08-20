#!/usr/bin/env node

/**
 * Test ALL Paragon Services with Correct Endpoints
 * Based on research from official Paragon documentation
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🎯 COMPLETE PARAGON SERVICES TEST');
console.log('==================================\n');

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

async function testAllParagonServices() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('👤 User ID:', userId);
    console.log('🔑 Token length:', userToken.length);
    console.log('');

    // Test all services with correct endpoints from documentation
    const tests = [
        {
            name: '✅ Gmail - List Messages (WORKING)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/gmail/v1/users/me/messages`,
            method: 'GET',
            params: '?maxResults=3',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '🔗 LinkedIn - Get Profile (Profile API)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin/v2/people/~`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
                'X-RestLi-Protocol-Version': '2.0.0'
            }
        },
        {
            name: '🔗 LinkedIn - Alternative Profile Path',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin/v2/people/(id:~)`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
                'X-RestLi-Protocol-Version': '2.0.0'
            }
        },
        {
            name: '📅 Google Calendar - List Calendars',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendar/v3/users/me/calendarList`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '📅 Google Calendar - List Events (Primary)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/googleCalendar/calendar/v3/calendars/primary/events`,
            method: 'GET',
            params: '?maxResults=3',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '📝 Notion - List Databases',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/notion/v1/databases`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            }
        },
        {
            name: '📝 Notion - Search',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/notion/v1/search`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: {
                query: "",
                page_size: 5
            }
        },
        {
            name: '🗓️ Calendly - List Scheduled Events',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/scheduled_events`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        },
        {
            name: '🗓️ Calendly - Get User Info',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/users/me`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        }
    ];

    let workingServices = [];
    let failedServices = [];

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
                    
                    if (test.name.includes('Gmail') && test.name.includes('List')) {
                        console.log(`📧 Found ${jsonResponse.messages?.length || 0} messages`);
                    } else if (test.name.includes('LinkedIn')) {
                        console.log(`👤 LinkedIn Profile Data Keys: ${Object.keys(jsonResponse).join(', ')}`);
                    } else if (test.name.includes('Calendar') && test.name.includes('List Events')) {
                        console.log(`📅 Found ${jsonResponse.items?.length || 0} calendar events`);
                    } else if (test.name.includes('Calendar') && test.name.includes('List Calendars')) {
                        console.log(`📅 Found ${jsonResponse.items?.length || 0} calendars`);
                    } else if (test.name.includes('Notion')) {
                        console.log(`📝 Notion results: ${jsonResponse.results?.length || 0} items`);
                    } else if (test.name.includes('Calendly')) {
                        if (jsonResponse.collection) {
                            console.log(`🗓️ Found ${jsonResponse.collection.length} scheduled events`);
                        } else if (jsonResponse.resource) {
                            console.log(`🗓️ User: ${jsonResponse.resource.name || 'N/A'}`);
                        } else {
                            console.log(`🗓️ Response keys: ${Object.keys(jsonResponse).join(', ')}`);
                        }
                    }
                } catch (e) {
                    console.log('📋 Raw response preview:', responseText.substring(0, 150));
                }
            } else {
                console.log('❌ ERROR');
                failedServices.push(test.name);
                
                try {
                    const errorJson = JSON.parse(responseText);
                    console.log('📋 Error details:', errorJson);
                    
                    if (errorJson.error?.code === 'invalid_grant') {
                        console.log('🔴 AUTHENTICATION ISSUE: User needs to re-authenticate');
                    } else if (response.status === 403) {
                        console.log('🔴 PERMISSION ISSUE: Check OAuth scopes');
                    } else if (response.status === 404) {
                        console.log('🔴 ENDPOINT ISSUE: Endpoint may not exist or wrong path');
                    }
                } catch (e) {
                    console.log('📋 Error response:', responseText.substring(0, 200));
                }
            }
            
        } catch (error) {
            console.log('❌ NETWORK ERROR:', error.message);
            failedServices.push(test.name);
        }
        
        console.log('');
    }
    
    console.log('📊 FINAL RESULTS SUMMARY');
    console.log('========================');
    console.log(`✅ Working Services: ${workingServices.length}`);
    workingServices.forEach(service => console.log(`   • ${service}`));
    
    console.log(`❌ Failed Services: ${failedServices.length}`);
    failedServices.forEach(service => console.log(`   • ${service}`));
    
    console.log('');
    console.log('🎯 CONCLUSION:');
    if (workingServices.length >= 5) {
        console.log('🎉 EXCELLENT! Most services are working correctly!');
    } else if (workingServices.length >= 3) {
        console.log('✅ GOOD! Several services working, minor fixes needed.');
    } else {
        console.log('⚠️ More troubleshooting needed for endpoints.');
    }
}

// Run the test
testAllParagonServices().then(() => {
    console.log('🏁 Complete Paragon services test finished');
}).catch(error => {
    console.log('💥 Test failed:', error.message);
});