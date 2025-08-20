#!/usr/bin/env node

/**
 * TEST NEWLY DEPLOYED GOOGLE CALENDAR WORKFLOWS
 * Testing the 5 workflows just deployed in Paragon dashboard
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🚀 TESTING DEPLOYED GOOGLE CALENDAR WORKFLOWS');
console.log('==============================================\n');

function generateUserToken(userId) {
    const payload = {
        sub: userId,
        aud: `useparagon.com/${PROJECT_ID}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (1 * 3600), // 1 hour
    };

    const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function testDeployedWorkflows() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('👤 User ID:', userId);
    console.log('📅 Testing workflows deployed 3-6 minutes ago...\n');

    // Test the 5 deployed Google Calendar workflows
    const workflowTests = [
        {
            name: '📋 List Calendar Events',
            // Using the ActionKit endpoint pattern your workflows should be using
            url: `https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions`,
            method: 'POST',
            body: {
                action: 'GOOGLE_CALENDAR_LIST_EVENTS',
                user_id: userId,
                parameters: {
                    calendar_id: 'primary',
                    maxResults: 10
                }
            }
        },
        {
            name: '🔍 Get Single Calendar Event',  
            url: `https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions`,
            method: 'POST',
            body: {
                action: 'GOOGLE_CALENDAR_GET_EVENT',
                user_id: userId,
                parameters: {
                    calendar_id: 'primary',
                    event_id: 'test_event_id' // Will fail but test connectivity
                }
            }
        },
        {
            name: '➕ Create Calendar Event',
            url: `https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions`,
            method: 'POST',
            body: {
                action: 'GOOGLE_CALENDAR_CREATE_EVENT',
                user_id: userId,
                parameters: {
                    calendar_id: 'primary',
                    summary: 'Test Event from Workflow',
                    description: 'Testing newly deployed workflow',
                    start: {
                        dateTime: '2025-01-20T14:00:00Z',
                        timeZone: 'America/New_York'
                    },
                    end: {
                        dateTime: '2025-01-20T15:00:00Z', 
                        timeZone: 'America/New_York'
                    }
                }
            }
        },
        {
            name: '✏️ Update Calendar Event',
            url: `https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions`,
            method: 'POST',
            body: {
                action: 'GOOGLE_CALENDAR_UPDATE_EVENT',
                user_id: userId,
                parameters: {
                    calendar_id: 'primary',
                    event_id: 'test_event_id',
                    summary: 'Updated Test Event'
                }
            }
        },
        {
            name: '🗑️ Delete Calendar Event',
            url: `https://actionkit.useparagon.com/projects/${PROJECT_ID}/actions`,
            method: 'POST', 
            body: {
                action: 'GOOGLE_CALENDAR_DELETE_EVENT',
                user_id: userId,
                parameters: {
                    calendar_id: 'primary',
                    event_id: 'test_event_id'
                }
            }
        }
    ];

    let workingWorkflows = [];
    let needsWorkflowSetup = [];

    for (const test of workflowTests) {
        console.log(`🧪 ${test.name}`);
        console.log(`📍 URL: ${test.url}`);
        
        try {
            const response = await fetch(test.url, {
                method: test.method,
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(test.body)
            });
            
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            const responseText = await response.text();
            
            if (response.status === 200) {
                console.log('🎉 WORKFLOW IS WORKING!');
                workingWorkflows.push(test.name);
                try {
                    const jsonResponse = JSON.parse(responseText);
                    console.log('✅ Response received:', Object.keys(jsonResponse).join(', '));
                } catch (e) {
                    console.log('📋 Response preview:', responseText.substring(0, 150));
                }
            } else if (response.status === 402) {
                console.log('💰 ActionKit not enabled - confirmed limitation');
                needsWorkflowSetup.push(test.name);
            } else if (response.status === 404) {
                console.log('❌ Workflow not found - needs to be created/deployed');
                needsWorkflowSetup.push(test.name);
            } else {
                console.log('❌ ERROR');
                try {
                    const errorJson = JSON.parse(responseText);
                    console.log('📋 Error:', errorJson.message || errorJson.error);
                } catch (e) {
                    console.log('📋 Error response:', responseText.substring(0, 150));
                }
                needsWorkflowSetup.push(test.name);
            }
            
        } catch (error) {
            console.log('❌ NETWORK ERROR:', error.message);
            needsWorkflowSetup.push(test.name);
        }
        
        console.log('');
    }

    console.log('📊 DEPLOYED WORKFLOW TEST RESULTS');
    console.log('==================================');
    console.log(`✅ Working Workflows: ${workingWorkflows.length}/5`);
    workingWorkflows.forEach(workflow => console.log(`   • ${workflow}`));
    
    console.log(`❌ Workflows Needing Setup: ${needsWorkflowSetup.length}/5`);
    needsWorkflowSetup.forEach(workflow => console.log(`   • ${workflow}`));
    
    console.log('\n🎯 NEXT STEPS:');
    
    if (workingWorkflows.length === 5) {
        console.log('🎉 ALL GOOGLE CALENDAR WORKFLOWS ARE WORKING!');
        console.log('✅ You can now proceed to LinkedIn and Calendly workflows');
    } else if (workingWorkflows.length > 0) {
        console.log(`✅ ${workingWorkflows.length} workflows working, ${needsWorkflowSetup.length} need attention`);
        console.log('🔧 Check workflow configuration in Paragon dashboard');
    } else {
        console.log('❌ No workflows working yet');
        console.log('🔧 Verify workflow deployment and ActionKit access');
    }
}

// Run the test
testDeployedWorkflows().then(() => {
    console.log('\n🏁 Deployed workflow test completed');
}).catch(error => {
    console.log('💥 Test failed:', error.message);
});
