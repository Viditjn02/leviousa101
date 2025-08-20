#!/usr/bin/env node

/**
 * Debug and test Google Calendar functionality through Paragon MCP
 */

require('dotenv').config();
const { spawn } = require('child_process');

// Test configuration - Use real connected user ID
const TEST_USER_ID = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
const MCP_PATH = './services/paragon-mcp';

console.log('🔍 GOOGLE CALENDAR DEBUG TEST SUITE');
console.log('=====================================\n');

/**
 * Helper to call MCP tool with proper JSON-RPC format
 */
async function callMCPTool(toolName, params) {
    return new Promise((resolve, reject) => {
        const mcp = spawn('node', ['dist/index.js'], {
            cwd: MCP_PATH,
            env: { ...process.env },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let responseData = '';
        let errorData = '';
        let hasResponded = false;

        // Send JSON-RPC request
        const request = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: params
            },
            id: 1
        };

        mcp.stdout.on('data', (data) => {
            responseData += data.toString();
            
            // Try to parse each line as it comes
            const lines = responseData.split('\n');
            for (const line of lines) {
                if (line.trim() && !hasResponded) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.id === 1) {
                            hasResponded = true;
                            mcp.kill();
                            
                            if (parsed.error) {
                                reject(new Error(parsed.error.message || 'MCP error'));
                            } else {
                                resolve(parsed.result);
                            }
                        }
                    } catch (e) {
                        // Continue accumulating data
                    }
                }
            }
        });

        mcp.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        mcp.on('error', (error) => {
            reject(error);
        });

        mcp.on('close', (code) => {
            if (!hasResponded) {
                if (errorData) {
                    reject(new Error(`MCP error: ${errorData}`));
                } else if (responseData) {
                    // Try to parse the complete response
                    try {
                        const lines = responseData.split('\n').filter(l => l.trim());
                        for (const line of lines) {
                            try {
                                const parsed = JSON.parse(line);
                                if (parsed.result) {
                                    resolve(parsed.result);
                                    return;
                                }
                            } catch (e) {}
                        }
                        reject(new Error(`Invalid response: ${responseData}`));
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${responseData}`));
                    }
                } else {
                    reject(new Error(`MCP exited with code ${code}`));
                }
            }
        });

        // Send the request
        mcp.stdin.write(JSON.stringify(request) + '\n');
        mcp.stdin.end();
    });
}

/**
 * Test different date/time formats
 */
function getTestDateFormats() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    return {
        // RFC3339 format (Google Calendar standard)
        rfc3339: {
            today: now.toISOString(),
            tomorrow: tomorrow.toISOString(),
            weekFromNow: weekFromNow.toISOString()
        },
        // ISO 8601 format
        iso8601: {
            today: now.toISOString().split('.')[0] + 'Z',
            tomorrow: tomorrow.toISOString().split('.')[0] + 'Z',
            weekFromNow: weekFromNow.toISOString().split('.')[0] + 'Z'
        },
        // Date only format
        dateOnly: {
            today: now.toISOString().split('T')[0],
            tomorrow: tomorrow.toISOString().split('T')[0],
            weekFromNow: weekFromNow.toISOString().split('T')[0]
        },
        // Unix timestamp
        unix: {
            today: Math.floor(now.getTime() / 1000),
            tomorrow: Math.floor(tomorrow.getTime() / 1000),
            weekFromNow: Math.floor(weekFromNow.getTime() / 1000)
        }
    };
}

/**
 * Test calendar list events with different parameters
 */
async function testListEvents() {
    console.log('📅 Testing LIST EVENTS functionality');
    console.log('------------------------------------');
    
    const dateFormats = getTestDateFormats();
    const testCases = [
        {
            name: 'Basic list (no params)',
            params: {
                user_id: TEST_USER_ID
            }
        },
        {
            name: 'With calendar_id',
            params: {
                user_id: TEST_USER_ID,
                calendar_id: 'primary'
            }
        },
        {
            name: 'With RFC3339 time range',
            params: {
                user_id: TEST_USER_ID,
                calendar_id: 'primary',
                timeMin: dateFormats.rfc3339.today,
                timeMax: dateFormats.rfc3339.weekFromNow
            }
        },
        {
            name: 'With ISO 8601 time range',
            params: {
                user_id: TEST_USER_ID,
                calendar_id: 'primary',
                timeMin: dateFormats.iso8601.today,
                timeMax: dateFormats.iso8601.weekFromNow
            }
        },
        {
            name: 'With maxResults',
            params: {
                user_id: TEST_USER_ID,
                maxResults: 5
            }
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🧪 Test: ${testCase.name}`);
        console.log(`   Params: ${JSON.stringify(testCase.params, null, 2)}`);
        
        try {
            const result = await callMCPTool('google_calendar_list_events', testCase.params);
            
            // Parse the result
            const content = result.content?.[0]?.text;
            if (content) {
                const parsed = JSON.parse(content);
                console.log(`   ✅ Success! Got ${parsed.items?.length || 0} events`);
                
                if (parsed.error) {
                    console.log(`   ⚠️  API Error: ${parsed.error}`);
                } else if (parsed.items?.length > 0) {
                    console.log(`   📌 First event: ${parsed.items[0].summary || 'No title'}`);
                }
            } else {
                console.log(`   ⚠️  Empty response`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            console.log(`   📝 Error details: ${JSON.stringify(error, null, 2)}`);
        }
    }
}

/**
 * Test event creation with different formats
 */
async function testCreateEvent() {
    console.log('\n\n📝 Testing CREATE EVENT functionality');
    console.log('-------------------------------------');
    
    const dateFormats = getTestDateFormats();
    
    // Create start and end times (1 hour event)
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    
    const testCases = [
        {
            name: 'Basic event with RFC3339',
            params: {
                user_id: TEST_USER_ID,
                summary: 'Test Event (RFC3339)',
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString()
            }
        },
        {
            name: 'Event with all fields',
            params: {
                user_id: TEST_USER_ID,
                calendar_id: 'primary',
                summary: 'Complete Test Event',
                description: 'This is a test event with all fields',
                location: 'Virtual Meeting Room',
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                attendees: ['test@example.com']
            }
        },
        {
            name: 'Event with timezone',
            params: {
                user_id: TEST_USER_ID,
                summary: 'Test Event with Timezone',
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                timeZone: 'America/New_York'
            }
        }
    ];
    
    const createdEvents = [];
    
    for (const testCase of testCases) {
        console.log(`\n🧪 Test: ${testCase.name}`);
        console.log(`   Params: ${JSON.stringify(testCase.params, null, 2)}`);
        
        try {
            const result = await callMCPTool('google_calendar_create_event', testCase.params);
            
            // Parse the result
            const content = result.content?.[0]?.text;
            if (content) {
                const parsed = JSON.parse(content);
                
                if (parsed.error) {
                    console.log(`   ⚠️  API Error: ${parsed.error}`);
                } else if (parsed.id) {
                    console.log(`   ✅ Success! Event created with ID: ${parsed.id}`);
                    createdEvents.push(parsed.id);
                } else {
                    console.log(`   ⚠️  Unexpected response: ${JSON.stringify(parsed).substring(0, 100)}`);
                }
            } else {
                console.log(`   ⚠️  Empty response`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    return createdEvents;
}

/**
 * Test update and delete operations
 */
async function testUpdateAndDelete(eventIds) {
    console.log('\n\n🔄 Testing UPDATE & DELETE functionality');
    console.log('----------------------------------------');
    
    if (!eventIds || eventIds.length === 0) {
        console.log('⚠️  No events to test update/delete');
        return;
    }
    
    const eventId = eventIds[0];
    
    // Test update
    console.log('\n🧪 Test: Update event');
    const updateParams = {
        user_id: TEST_USER_ID,
        event_id: eventId,
        summary: 'Updated Test Event',
        description: 'This event has been updated'
    };
    
    console.log(`   Params: ${JSON.stringify(updateParams, null, 2)}`);
    
    try {
        const result = await callMCPTool('google_calendar_update_event', updateParams);
        const content = result.content?.[0]?.text;
        
        if (content) {
            const parsed = JSON.parse(content);
            if (parsed.error) {
                console.log(`   ⚠️  API Error: ${parsed.error}`);
            } else if (parsed.id) {
                console.log(`   ✅ Success! Event updated`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test delete
    console.log('\n🧪 Test: Delete event');
    const deleteParams = {
        user_id: TEST_USER_ID,
        event_id: eventId
    };
    
    console.log(`   Params: ${JSON.stringify(deleteParams, null, 2)}`);
    
    try {
        const result = await callMCPTool('google_calendar_delete_event', deleteParams);
        const content = result.content?.[0]?.text;
        
        if (content === 'Event deleted successfully') {
            console.log(`   ✅ Success! Event deleted`);
        } else {
            console.log(`   ⚠️  Unexpected response: ${content}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

/**
 * Test workflow vs proxy API patterns
 */
async function testPatterns() {
    console.log('\n\n🔬 Testing WORKFLOW vs PROXY patterns');
    console.log('--------------------------------------');
    
    // Test workflow pattern (list events uses this)
    console.log('\n📋 Workflow Pattern Test (list_events):');
    console.log('   Uses: makeWorkflowRequest()');
    console.log('   URL: https://zeus.useparagon.com/projects/{project}/sdk/triggers/{workflow}');
    
    try {
        const result = await callMCPTool('google_calendar_list_events', {
            user_id: TEST_USER_ID,
            maxResults: 2
        });
        
        const content = result.content?.[0]?.text;
        if (content) {
            const parsed = JSON.parse(content);
            if (parsed.error) {
                console.log(`   ❌ Workflow Error: ${parsed.error}`);
            } else {
                console.log(`   ✅ Workflow Success`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Workflow Failed: ${error.message}`);
    }
    
    // Test proxy pattern (create event uses this)
    console.log('\n📋 Proxy Pattern Test (create_event):');
    console.log('   Uses: makeParagonRequest()');
    console.log('   URL: https://proxy.useparagon.com/projects/{project}/sdk/proxy/{service}{endpoint}');
    
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    
    try {
        const result = await callMCPTool('google_calendar_create_event', {
            user_id: TEST_USER_ID,
            summary: 'Proxy Pattern Test',
            start_time: now.toISOString(),
            end_time: later.toISOString()
        });
        
        const content = result.content?.[0]?.text;
        if (content) {
            const parsed = JSON.parse(content);
            if (parsed.error) {
                console.log(`   ❌ Proxy Error: ${parsed.error}`);
            } else {
                console.log(`   ✅ Proxy Success`);
                
                // Clean up
                if (parsed.id) {
                    await callMCPTool('google_calendar_delete_event', {
                        user_id: TEST_USER_ID,
                        event_id: parsed.id
                    });
                }
            }
        }
    } catch (error) {
        console.log(`   ❌ Proxy Failed: ${error.message}`);
    }
}

/**
 * Main test execution
 */
async function runTests() {
    try {
        // Check MCP service is available
        console.log('🔌 Checking MCP service...');
        const fs = require('fs');
        const path = require('path');
        
        const mcpIndexPath = path.join(MCP_PATH, 'dist', 'index.js');
        if (!fs.existsSync(mcpIndexPath)) {
            console.log('⚠️  MCP service not built. Building now...');
            const { execSync } = require('child_process');
            execSync('npm run build', { cwd: MCP_PATH, stdio: 'inherit' });
        }
        
        console.log('✅ MCP service ready\n');
        
        // Run test suites
        await testListEvents();
        const createdEvents = await testCreateEvent();
        await testUpdateAndDelete(createdEvents);
        await testPatterns();
        
        // Summary
        console.log('\n\n📊 TEST SUMMARY');
        console.log('===============');
        console.log('✅ Test suite completed');
        console.log('📝 Review the results above for any errors or format issues');
        console.log('\n💡 Common issues found:');
        console.log('   - Date format mismatches (RFC3339 vs ISO 8601)');
        console.log('   - Missing required parameters');
        console.log('   - Workflow configuration issues');
        console.log('   - Authentication token problems');
        
    } catch (error) {
        console.error('\n❌ TEST SUITE FAILED:', error.message);
        console.error(error.stack);
    }
}

// Run tests
console.log('🚀 Starting Google Calendar debug tests...\n');
runTests().then(() => {
    console.log('\n✅ Debug test suite completed');
}).catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});