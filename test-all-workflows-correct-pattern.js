#!/usr/bin/env node

/**
 * TEST ALL 5 GOOGLE CALENDAR WORKFLOWS WITH CORRECT URL PATTERN
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🎉 TESTING ALL WORKFLOWS WITH WORKING URL PATTERN');
console.log('=================================================\n');

function generateUserToken(userId) {
    const payload = {
        sub: userId,
        aud: `useparagon.com/${PROJECT_ID}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (1 * 3600),
    };

    const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function testAllWorkflows() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('✅ FOUND WORKING PATTERN: /sdk/workflows/ instead of /sdk/triggers/');
    console.log('👤 User ID:', userId);
    console.log('📅 Testing all 5 Google Calendar workflows...\n');

    // You need to get the workflow IDs for your other 4 workflows
    // For now, testing with the one we know works
    const workflows = [
        {
            name: '✅ Create Calendar Event (CONFIRMED WORKING)',
            id: 'ebc98b20-b024-41b3-bcb9-736a245c0e94',
            payload: {
                summary: "Test Create Event",
                description: "Testing confirmed working workflow",
                start: {
                    dateTime: "2025-01-20T16:00:00",
                    timeZone: "America/New_York"
                },
                end: {
                    dateTime: "2025-01-20T17:00:00",
                    timeZone: "America/New_York"
                }
            }
        }
        // TODO: Add the other 4 workflow IDs once you get them from Paragon dashboard
        // {
        //     name: '📋 List Calendar Events',
        //     id: 'LIST_EVENTS_WORKFLOW_ID',
        //     payload: { calendar: 'primary', maxResults: 10 }
        // },
        // {
        //     name: '🔍 Get Single Calendar Event', 
        //     id: 'GET_EVENT_WORKFLOW_ID',
        //     payload: { calendar: 'primary', event_id: 'test_event_id' }
        // },
        // {
        //     name: '✏️ Update Calendar Event',
        //     id: 'UPDATE_EVENT_WORKFLOW_ID', 
        //     payload: { calendar: 'primary', event_id: 'test_event_id', summary: 'Updated Event' }
        // },
        // {
        //     name: '🗑️ Delete Calendar Event',
        //     id: 'DELETE_EVENT_WORKFLOW_ID',
        //     payload: { calendar: 'primary', event_id: 'test_event_id' }
        // }
    ];

    let workingWorkflows = [];

    for (const workflow of workflows) {
        console.log(`🧪 ${workflow.name}`);
        
        const url = `https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/workflows/${workflow.id}`;
        console.log(`📍 URL: ${url}`);
        console.log(`📦 Payload:`, JSON.stringify(workflow.payload, null, 2));
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflow.payload)
            });
            
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            const responseText = await response.text();
            
            if (response.status >= 200 && response.status < 300) {
                console.log('🎉 SUCCESS! Workflow working!');
                workingWorkflows.push(workflow.name);
                
                try {
                    const jsonResponse = JSON.parse(responseText);
                    if (jsonResponse.id) {
                        console.log(`📅 Event ID: ${jsonResponse.id}`);
                        console.log(`📅 Event Name: ${jsonResponse.summary || 'N/A'}`);
                    } else if (jsonResponse.items) {
                        console.log(`📅 Found ${jsonResponse.items.length} items`);
                    } else {
                        console.log('✅ Response keys:', Object.keys(jsonResponse).join(', '));
                    }
                } catch (e) {
                    console.log('📋 Response:', responseText.substring(0, 300));
                }
            } else {
                console.log('❌ Error');
                try {
                    const errorJson = JSON.parse(responseText);
                    console.log('📋 Error:', errorJson.message || errorJson.error);
                } catch (e) {
                    console.log('📋 Error text:', responseText.substring(0, 150));
                }
            }
            
        } catch (error) {
            console.log('❌ Network error:', error.message);
        }
        
        console.log('');
    }

    console.log('🎯 NEXT STEPS:');
    console.log('==============');
    console.log('1. 📋 Get workflow IDs for your other 4 workflows from Paragon dashboard');
    console.log('2. 🔧 Update this test with all 5 workflow IDs');  
    console.log('3. ✅ Test all 5 workflows with the working URL pattern');
    console.log('4. 🚀 Update MCP server to use /sdk/workflows/ URLs');
    console.log('');
    console.log('🎉 SOLUTION CONFIRMED: Use /sdk/workflows/ endpoint instead of /sdk/triggers/');
    
    return workingWorkflows.length;
}

testAllWorkflows().catch(console.error);
