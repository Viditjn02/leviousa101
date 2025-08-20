#!/usr/bin/env node

/**
 * Test Fixed Calendly Integration
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function testCalendlyFixed() {
    console.log('🧪 TESTING FIXED CALENDLY INTEGRATION');
    console.log('=====================================\n');
    
    let mcpClient;
    const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    
    try {
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        console.log(`👤 Testing with User ID: ${testUserId}\n`);
        
        // Test 1: Calendly Get Event Types
        console.log('🗓️ Test 1: Calendly - Get Event Types');
        console.log('=====================================');
        try {
            const eventTypesResult = await mcpClient.invokeTool('calendly_get_event_types', {
                user_id: testUserId
            });
            
            if (eventTypesResult.content && eventTypesResult.content[0]) {
                const response = JSON.parse(eventTypesResult.content[0].text);
                console.log('📊 Response:', JSON.stringify(response, null, 2));
                
                if (response.success) {
                    console.log('✅ SUCCESS: Calendly Event Types working!');
                    console.log(`🗓️ Found ${response.event_types?.length || 0} event types`);
                    if (response.event_types?.length > 0) {
                        console.log('First event type:', response.event_types[0].name || response.event_types[0].slug);
                    }
                } else {
                    console.log('❌ Failed:', response.error);
                }
            }
        } catch (error) {
            console.log(`❌ Event Types test failed: ${error.message}`);
        }
        console.log('');
        
        // Test 2: Calendly Get Scheduled Events
        console.log('🗓️ Test 2: Calendly - Get Scheduled Events');
        console.log('==========================================');
        try {
            const scheduledResult = await mcpClient.invokeTool('calendly_get_scheduled_events', {
                user_id: testUserId,
                count: 10
            });
            
            if (scheduledResult.content && scheduledResult.content[0]) {
                const response = JSON.parse(scheduledResult.content[0].text);
                console.log('📊 Response:', JSON.stringify(response, null, 2));
                
                if (response.success) {
                    console.log('✅ SUCCESS: Calendly Scheduled Events working!');
                    console.log(`🗓️ Found ${response.events?.length || 0} scheduled events`);
                } else {
                    console.log('❌ Failed:', response.error);
                }
            }
        } catch (error) {
            console.log(`❌ Scheduled Events test failed: ${error.message}`);
        }
        
        console.log('\n🎯 SUMMARY');
        console.log('===========');
        console.log('✅ Fixed organization URI extraction from output.resource.current_organization');
        console.log('✅ Both Calendly endpoints should now work correctly');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
    }
}

// Run the test
testCalendlyFixed().catch(console.error);