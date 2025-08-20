#!/usr/bin/env node

/**
 * Test Calendly API specifically to see if it works better than Google Calendar
 */

require('dotenv').config();

console.log('📅 TESTING CALENDLY API DIRECTLY');
console.log('=================================');

async function testCalendlyAPI() {
    try {
        // Use the working email test pattern for MCP client
        const { MCPMigrationBridge } = require('./src/features/invisibility/mcp/MCPMigrationBridge');
        const mcpClient = new MCPMigrationBridge();
        
        console.log('🚀 Initializing MCP Client...');
        await mcpClient.initialize();
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        console.log('✅ MCP Client initialized');
        console.log('');
        
        // Test Calendly endpoints
        const calendlyTests = [
            {
                name: 'Get Calendly User Info',
                tool: 'calendly_get_user_info',
                args: { user_id: userId }
            },
            {
                name: 'List Calendly Event Types',
                tool: 'calendly_list_event_types', 
                args: { user_id: userId }
            },
            {
                name: 'List Calendly Scheduled Events',
                tool: 'calendly_list_scheduled_events',
                args: { user_id: userId }
            }
        ];
        
        let successCount = 0;
        
        for (const test of calendlyTests) {
            console.log(`🧪 ${test.name}...`);
            try {
                const result = await mcpClient.invokeTool(test.tool, test.args);
                console.log('✅ SUCCESS');
                console.log('📊 Response preview:', result.content[0].text.substring(0, 150) + '...');
                successCount++;
            } catch (error) {
                console.log('❌ FAILED:', error.message);
            }
            console.log('');
        }
        
        console.log(`🏁 CALENDLY TEST RESULTS: ${successCount}/${calendlyTests.length} passed`);
        
        await mcpClient.shutdown();
        return successCount > 0;
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        return false;
    }
}

testCalendlyAPI().then(success => {
    if (success) {
        console.log('✅ CALENDLY API WORKING!');
    } else {
        console.log('❌ CALENDLY API FAILED!');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});