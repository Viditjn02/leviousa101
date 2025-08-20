#!/usr/bin/env node

/**
 * Check authentication status through our working MCP system
 */

require('dotenv').config();

console.log('🔐 CHECKING PARAGON AUTHENTICATION STATUS');
console.log('==========================================');

async function checkAuthStatus() {
    try {
        // Use the working pattern from the email test
        const { MCPMigrationBridge } = require('./src/features/invisibility/mcp/MCPMigrationBridge');
        const mcpClient = new MCPMigrationBridge();
        
        console.log('🚀 Initializing MCP Client...');
        await mcpClient.initialize();
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        console.log('✅ MCP Client initialized');
        console.log('');
        
        // Check authenticated services
        console.log('🧪 Getting authenticated services...');
        try {
            // Use the method that worked in the logs
            const result = await mcpClient.callTool('get_authenticated_services', { user_id: userId });
            
            console.log('✅ Authentication check successful!');
            console.log('📊 Response:', result.content[0].text.substring(0, 300) + '...');
            
            // Parse the response to see what's connected
            const response = JSON.parse(result.content[0].text);
            if (response.success && response.services) {
                console.log('\n🔍 AUTHENTICATED SERVICES:');
                console.log('==========================');
                
                Object.entries(response.services).forEach(([service, info]) => {
                    console.log(`${info.authenticated ? '✅' : '❌'} ${service}: ${info.authenticated ? 'Connected' : 'Not Connected'}`);
                    if (info.integration_id) {
                        console.log(`   Integration ID: ${info.integration_id}`);
                    }
                });
                
                // Check specifically for Google Calendar
                if (response.services.google_calendar && response.services.google_calendar.authenticated) {
                    console.log('\n🎉 GOOGLE CALENDAR IS AUTHENTICATED!');
                    console.log('OAuth setup is working correctly.');
                    
                    // Now test if we can make a calendar API call
                    console.log('\n🧪 Testing Google Calendar API call...');
                    try {
                        const calendarResult = await mcpClient.callTool('google_calendar_list_calendars', { user_id: userId });
                        console.log('✅ Google Calendar API SUCCESS!');
                        console.log('📅 Calendar response preview:', calendarResult.content[0].text.substring(0, 200) + '...');
                    } catch (calError) {
                        console.log('❌ Google Calendar API FAILED:', calError.message);
                        console.log('This suggests the API might need workflow setup in Paragon dashboard');
                    }
                    
                } else {
                    console.log('\n❌ Google Calendar is not authenticated');
                }
                
            } else {
                console.log('❌ Unexpected response format');
            }
            
        } catch (error) {
            console.log('❌ Authentication check failed:', error.message);
        }
        
        await mcpClient.shutdown();
        return true;
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        return false;
    }
}

checkAuthStatus().then(success => {
    console.log('\n🏁 AUTHENTICATION STATUS CHECK COMPLETE');
    if (!success) {
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});