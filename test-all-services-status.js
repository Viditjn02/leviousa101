#!/usr/bin/env node

/**
 * Test ALL Paragon Services Status
 * Test Gmail, LinkedIn, Google Calendar, Calendly, and Notion
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function testAllServicesStatus() {
    console.log('🧪 TESTING ALL PARAGON SERVICES STATUS');
    console.log('=====================================\n');
    
    let mcpClient;
    const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    
    try {
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        console.log(`👤 Testing with User ID: ${testUserId}\n`);
        
        const results = {
            working: [],
            failing: [],
            notTested: []
        };
        
        // Test 1: Gmail (we know this works)
        console.log('📧 Test 1: Gmail - Get Emails');
        console.log('=============================');
        try {
            const emailsResult = await mcpClient.invokeTool('gmail_get_emails', {
                user_id: testUserId,
                maxResults: 3
            });
            
            if (emailsResult.content && emailsResult.content[0]) {
                const response = JSON.parse(emailsResult.content[0].text);
                
                // Check for new success format
                if (response.success === true) {
                    console.log('✅ Gmail: WORKING - New format');
                    console.log(`📬 Total results: ${response.total_results || 0} emails`);
                    results.working.push('Gmail');
                }
                // Check for old status format
                else if (response.status === 200 && response.output) {
                    console.log('✅ Gmail: WORKING - Old format');
                    if (response.output.messages) {
                        console.log(`📬 Found ${response.output.messages.length} messages`);
                    }
                    results.working.push('Gmail');
                } else {
                    console.log('❌ Gmail: API call succeeded but unexpected response');
                    console.log(`   Response keys: ${Object.keys(response).join(', ')}`);
                    results.failing.push('Gmail');
                }
            } else {
                console.log('❌ Gmail: No response content');
                results.failing.push('Gmail');
            }
        } catch (error) {
            console.log(`❌ Gmail: Failed - ${error.message}`);
            results.failing.push('Gmail');
        }
        console.log('');
        
        // Test 2: LinkedIn Profile
        console.log('🔗 Test 2: LinkedIn - Get Profile');
        console.log('=================================');
        try {
            const linkedinResult = await mcpClient.invokeTool('linkedin_get_profile', {
                user_id: testUserId
            });
            
            if (linkedinResult.content && linkedinResult.content[0]) {
                const response = JSON.parse(linkedinResult.content[0].text);
                if (response.success && response.profile) {
                    console.log('✅ LinkedIn: WORKING - Got profile data');
                    results.working.push('LinkedIn');
                } else {
                    console.log('❌ LinkedIn: API call succeeded but no profile data');
                    console.log(`   Response: ${JSON.stringify(response).substring(0, 200)}...`);
                    results.failing.push('LinkedIn');
                }
            } else {
                console.log('❌ LinkedIn: No response content');
                results.failing.push('LinkedIn');
            }
        } catch (error) {
            console.log(`❌ LinkedIn: Failed - ${error.message}`);
            results.failing.push('LinkedIn');
        }
        console.log('');
        
        // Test 3: Google Calendar Create Event (ActionKit)
        console.log('📅 Test 3: Google Calendar - Create Event');
        console.log('=========================================');
        try {
            const calendarResult = await mcpClient.invokeTool('google_calendar_create_event', {
                user_id: testUserId,
                title: 'Test Event from MCP',
                description: 'Testing Google Calendar integration',
                start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                end_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
                location: 'Virtual Meeting'
            });
            
            if (calendarResult.content && calendarResult.content[0]) {
                const response = JSON.parse(calendarResult.content[0].text);
                if (response.success) {
                    console.log('✅ Google Calendar: WORKING - Event created');
                    results.working.push('Google Calendar');
                } else {
                    console.log('❌ Google Calendar: API call succeeded but event not created');
                    console.log(`   Response: ${JSON.stringify(response).substring(0, 200)}...`);
                    results.failing.push('Google Calendar');
                }
            } else {
                console.log('❌ Google Calendar: No response content');
                results.failing.push('Google Calendar');
            }
        } catch (error) {
            console.log(`❌ Google Calendar: Failed - ${error.message}`);
            results.failing.push('Google Calendar');
        }
        console.log('');
        
        // Test 4: Calendly Get Event Types
        console.log('🗓️ Test 4: Calendly - Get Event Types');
        console.log('=====================================');
        try {
            const calendlyResult = await mcpClient.invokeTool('calendly_get_event_types', {
                user_id: testUserId
            });
            
            if (calendlyResult.content && calendlyResult.content[0]) {
                const response = JSON.parse(calendlyResult.content[0].text);
                if (response.success || response.collection) {
                    console.log('✅ Calendly: WORKING - Got event types');
                    results.working.push('Calendly');
                } else {
                    console.log('❌ Calendly: API call succeeded but no event types');
                    console.log(`   Response: ${JSON.stringify(response).substring(0, 200)}...`);
                    results.failing.push('Calendly');
                }
            } else {
                console.log('❌ Calendly: No response content');
                results.failing.push('Calendly');
            }
        } catch (error) {
            console.log(`❌ Calendly: Failed - ${error.message}`);
            results.failing.push('Calendly');
        }
        console.log('');
        
        // Test 5: Check available tools to see what Notion tools exist
        console.log('📝 Test 5: Checking Available Notion Tools');
        console.log('==========================================');
        try {
            // First let's see what tools are available
            const tools = await mcpClient.client.request(
                { method: 'tools/list' },
                { schema: require('@modelcontextprotocol/sdk/types').ListToolsRequestSchema }
            );
            
            const notionTools = tools.tools.filter(tool => tool.name.toLowerCase().includes('notion'));
            if (notionTools.length > 0) {
                console.log(`📝 Found ${notionTools.length} Notion tools:`);
                notionTools.forEach(tool => console.log(`   • ${tool.name}: ${tool.description}`));
                results.notTested.push('Notion (tools found but not tested)');
            } else {
                console.log('❌ No Notion tools found in available tools');
                results.failing.push('Notion');
            }
        } catch (error) {
            console.log(`❌ Failed to check Notion tools: ${error.message}`);
            results.failing.push('Notion');
        }
        console.log('');
        
        // Final Summary
        console.log('📊 FINAL SERVICE STATUS SUMMARY');
        console.log('===============================');
        console.log(`✅ WORKING SERVICES (${results.working.length}):`);
        results.working.forEach(service => console.log(`   • ${service}`));
        console.log('');
        
        console.log(`❌ FAILING SERVICES (${results.failing.length}):`);
        results.failing.forEach(service => console.log(`   • ${service}`));
        console.log('');
        
        if (results.notTested.length > 0) {
            console.log(`⚠️ NOT TESTED (${results.notTested.length}):`);
            results.notTested.forEach(service => console.log(`   • ${service}`));
            console.log('');
        }
        
        console.log('🎯 NEXT STEPS:');
        if (results.failing.length > 0) {
            console.log('• Fix failing services by updating their endpoints/methods');
            console.log('• Consider switching failing services to ActionKit if supported');
        }
        if (results.notTested.length > 0) {
            console.log('• Test remaining services individually');
        }
        console.log('• All services should be working since user is connected in Paragon dashboard');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
    }
}

// Run the test
testAllServicesStatus().catch(console.error);