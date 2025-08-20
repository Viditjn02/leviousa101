#!/usr/bin/env node

/**
 * Test Google Calendar API directly through MCP
 */

require('dotenv').config();

console.log('📅 TESTING GOOGLE CALENDAR API DIRECTLY');
console.log('=======================================');

async function testCalendarDirect() {
    try {
        // Initialize MCP client using the same pattern as working email test
        const { MCPMigrationBridge } = require('./src/features/invisibility/mcp/MCPMigrationBridge');
        const mcpClient = new MCPMigrationBridge();
        
        console.log('🚀 Initializing MCP Client...');
        await mcpClient.initialize();
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        console.log('✅ MCP Client initialized');
        console.log('');
        
        // Test 1: List calendars
        console.log('🧪 Test 1: List Google Calendars');
        try {
            const calendarsResult = await mcpClient.invokeTool('google_calendar_list_calendars', {
                user_id: userId
            });
            console.log('✅ List calendars SUCCESS');
            console.log('📊 Response:', calendarsResult.content[0].text.substring(0, 200) + '...');
        } catch (error) {
            console.log('❌ List calendars FAILED:', error.message);
        }
        console.log('');
        
        // Test 2: List events for August 25th
        console.log('🧪 Test 2: List Events for August 25th');
        try {
            const eventsResult = await mcpClient.invokeTool('google_calendar_list_events', {
                user_id: userId,
                timeMin: '2025-08-25T00:00:00Z',
                timeMax: '2025-08-25T23:59:59Z'
            });
            console.log('✅ List events SUCCESS');
            console.log('📊 Response:', eventsResult.content[0].text.substring(0, 200) + '...');
        } catch (error) {
            console.log('❌ List events FAILED:', error.message);
        }
        console.log('');
        
        // Test 3: List events without date filter
        console.log('🧪 Test 3: List Events (no date filter)');
        try {
            const allEventsResult = await mcpClient.invokeTool('google_calendar_list_events', {
                user_id: userId,
                maxResults: 5
            });
            console.log('✅ List all events SUCCESS');
            console.log('📊 Response:', allEventsResult.content[0].text.substring(0, 200) + '...');
        } catch (error) {
            console.log('❌ List all events FAILED:', error.message);
        }
        
        console.log('');
        console.log('🏁 CALENDAR API TEST COMPLETED');
        
        await mcpClient.shutdown();
        return true;
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

testCalendarDirect().then(success => {
    if (success) {
        console.log('✅ CALENDAR API TEST PASSED!');
    } else {
        console.log('❌ CALENDAR API TEST FAILED!');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});