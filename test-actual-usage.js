#!/usr/bin/env node

/**
 * Test to show what happens when users try to actually use the service tools
 */

const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function testActualUsage() {
    console.log('🧪 Testing Actual Service Usage vs Authentication Detection\n');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'; // Real Firebase user ID
        
        console.log('📋 AUTHENTICATION STATUS:');
        console.log('='.repeat(50));
        
        // Check authentication status
        const authResult = await service.mcpClient.callTool('get_authenticated_services', { user_id: userId });
        console.log('Authenticated services:', JSON.parse(authResult.content[0].text).authenticated_services);
        
        console.log('\n📧 ACTUAL TOOL USAGE TESTS:');
        console.log('='.repeat(50));
        
        // Test 1: Try to send Gmail email
        console.log('\n1. Testing Gmail - Send Email:');
        try {
            const gmailResult = await service.mcpClient.callTool('gmail_send_email', {
                user_id: userId,
                to: 'test@example.com',
                subject: 'Test Email',
                body: 'This is a test email'
            });
            console.log('   Result:', JSON.parse(gmailResult.content[0].text));
        } catch (error) {
            console.log('   Error:', error.message);
        }
        
        // Test 2: Try to list Google Drive files
        console.log('\n2. Testing Google Drive - List Files:');
        try {
            const driveResult = await service.mcpClient.callTool('googledrive_list_files', {
                user_id: userId,
                limit: 10
            });
            console.log('   Result:', JSON.parse(driveResult.content[0].text));
        } catch (error) {
            console.log('   Error:', error.message);
        }
        
        // Test 3: Try to create Google Calendar event
        console.log('\n3. Testing Google Calendar - Create Event:');
        try {
            const calendarResult = await service.mcpClient.callTool('googlecalendar_create_event', {
                user_id: userId,
                title: 'Test Meeting',
                start_time: '2024-01-20T10:00:00Z',
                end_time: '2024-01-20T11:00:00Z'
            });
            console.log('   Result:', JSON.parse(calendarResult.content[0].text));
        } catch (error) {
            console.log('   Error:', error.message);
        }
        
        // Test 4: Try with a fake user ID
        console.log('\n4. Testing with Fake User ID:');
        try {
            const fakeResult = await service.mcpClient.callTool('gmail_send_email', {
                user_id: 'fake-user-12345',
                to: 'test@example.com',
                subject: 'Test Email',
                body: 'This is a test email'
            });
            console.log('   Result:', JSON.parse(fakeResult.content[0].text));
        } catch (error) {
            console.log('   Error:', error.message);
        }
        
        console.log('\n📝 ANALYSIS:');
        console.log('='.repeat(50));
        console.log('• Authentication detection shows services as "authenticated"');
        console.log('• But actual tool calls are simulated/mock responses');
        console.log('• Tools accept any user_id (real or fake) without validation');
        console.log('• No real API calls are made to user accounts');
        console.log('• Implementation is in stub/placeholder phase');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testActualUsage();