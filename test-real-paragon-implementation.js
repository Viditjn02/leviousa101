#!/usr/bin/env node

/**
 * Test the real Paragon ActionKit API implementation
 */

const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function testRealParagonImplementation() {
    console.log('🧪 Testing Real Paragon ActionKit API Implementation\n');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'; // Real Firebase user ID
        
        console.log('📋 STEP 1: Test Authentication Status (Real User Credentials)');
        console.log('='.repeat(60));
        
        // Test real authentication status
        console.log('\n🔍 Checking real user credentials...');
        try {
            const authResult = await service.mcpClient.callTool('get_authenticated_services', { user_id: userId });
            const authData = JSON.parse(authResult.content[0].text);
            console.log('✅ Authentication check result:', authData);
            
            if (authData.authenticated_services && authData.authenticated_services.length > 0) {
                console.log('🎉 User has authenticated services:', authData.authenticated_services);
            } else {
                console.log('📝 User has no authenticated services yet');
            }
        } catch (error) {
            console.log('❌ Authentication check failed:', error.message);
        }
        
        console.log('\n📧 STEP 2: Test Real ActionKit API Calls');
        console.log('='.repeat(60));
        
        // Test 1: Try Gmail send email with real ActionKit API
        console.log('\n🔄 Testing Gmail - Send Email (Real ActionKit API)...');
        try {
            const gmailResult = await service.mcpClient.callTool('gmail_send_email', {
                user_id: userId,
                to: 'test@example.com',
                subject: 'Test Email from ActionKit',
                body: 'This is a test email sent via Paragon ActionKit API'
            });
            
            const gmailData = JSON.parse(gmailResult.content[0].text);
            console.log('📧 Gmail API Result:', gmailData);
            
            if (gmailData.success) {
                console.log('✅ Gmail email sent successfully via ActionKit!');
            } else {
                console.log('❌ Gmail email failed:', gmailData.error);
            }
        } catch (error) {
            console.log('❌ Gmail API call failed:', error.message);
        }
        
        // Test 2: Try Google Drive list files
        console.log('\n🔄 Testing Google Drive - List Files (Real ActionKit API)...');
        try {
            const driveResult = await service.mcpClient.callTool('googledrive_list_files', {
                user_id: userId,
                limit: 10
            });
            
            const driveData = JSON.parse(driveResult.content[0].text);
            console.log('📁 Google Drive API Result:', driveData);
            
            if (driveData.success) {
                console.log('✅ Google Drive files retrieved successfully via ActionKit!');
                if (driveData.result && driveData.result.files) {
                    console.log(`📄 Found ${driveData.result.files.length} files`);
                }
            } else {
                console.log('❌ Google Drive API failed:', driveData.error);
            }
        } catch (error) {
            console.log('❌ Google Drive API call failed:', error.message);
        }
        
        // Test 3: Try Google Calendar list events 
        console.log('\n🔄 Testing Google Calendar - List Events (Real ActionKit API)...');
        try {
            const calendarResult = await service.mcpClient.callTool('googlecalendar_list_events', {
                user_id: userId,
                limit: 10
            });
            
            const calendarData = JSON.parse(calendarResult.content[0].text);
            console.log('📅 Google Calendar API Result:', calendarData);
            
            if (calendarData.success) {
                console.log('✅ Google Calendar events retrieved successfully via ActionKit!');
                if (calendarData.result && calendarData.result.events) {
                    console.log(`📅 Found ${calendarData.result.events.length} events`);
                }
            } else {
                console.log('❌ Google Calendar API failed:', calendarData.error);
            }
        } catch (error) {
            console.log('❌ Google Calendar API call failed:', error.message);
        }
        
        // Test 4: Test with fake user ID to verify authentication
        console.log('\n🔄 Testing with Fake User ID (Should Fail Authentication)...');
        try {
            const fakeResult = await service.mcpClient.callTool('gmail_send_email', {
                user_id: 'fake-user-12345',
                to: 'test@example.com',
                subject: 'Test Email',
                body: 'This should fail'
            });
            
            const fakeData = JSON.parse(fakeResult.content[0].text);
            console.log('🚫 Fake User API Result:', fakeData);
            
            if (!fakeData.success) {
                console.log('✅ Correctly rejected fake user - authentication working!');
            } else {
                console.log('⚠️ Fake user was accepted - authentication may not be working properly');
            }
        } catch (error) {
            console.log('✅ Fake user correctly rejected:', error.message);
        }
        
        console.log('\n📝 FINAL ANALYSIS:');
        console.log('='.repeat(60));
        console.log('✅ Real ActionKit API implementation has been deployed');
        console.log('🔍 Check the results above to see if:');
        console.log('   • User authentication is working properly');
        console.log('   • Real API calls are being made to user services');
        console.log('   • Fake users are being rejected');
        console.log('   • Error handling is working correctly');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testRealParagonImplementation();