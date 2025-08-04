#!/usr/bin/env node

/**
 * Test the fixed Paragon authentication detection
 */

const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function testFixedAuthentication() {
    console.log('🧪 Testing Fixed Paragon Authentication Detection\n');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2'; // Real Firebase user ID
        
        console.log('📋 TESTING FIXED IMPLEMENTATION');
        console.log('='.repeat(60));
        
        // Test the fixed get_authenticated_services
        console.log('🔍 Calling get_authenticated_services with fixed logic...');
        try {
            const result = await service.mcpClient.callTool('get_authenticated_services', { user_id: userId });
            
            console.log('✅ Tool call successful!');
            console.log('📄 Raw result:', JSON.stringify(result, null, 2));
            
            // Parse the response
            if (result.content && result.content.length > 0) {
                try {
                    const parsedContent = JSON.parse(result.content[0].text);
                    console.log('\n📊 Parsed result:');
                    console.log(`   Success: ${parsedContent.success}`);
                    console.log(`   User ID: ${parsedContent.user_id}`);
                    console.log(`   Authenticated Services: ${JSON.stringify(parsedContent.authenticated_services)}`);
                    console.log(`   Message: ${parsedContent.message}`);
                    
                    if (parsedContent.authenticated_services && parsedContent.authenticated_services.length > 0) {
                        console.log('\n🎉 SUCCESS! User has authenticated services:');
                        parsedContent.authenticated_services.forEach((service, index) => {
                            console.log(`   ${index + 1}. ${service}`);
                        });
                    } else {
                        console.log('\n❌ Still showing no authenticated services');
                    }
                } catch (parseError) {
                    console.log('❌ Failed to parse response:', parseError.message);
                }
            } else {
                console.log('❌ No content in response');
            }
            
        } catch (toolError) {
            console.log('❌ Tool call failed:', toolError.message);
        }
        
        console.log('\n📋 TESTING SERVICE INTEGRATION UI');
        console.log('='.repeat(60));
        console.log('💡 Expected behavior:');
        console.log('   - Gmail should show as "Connected" (green dot)');
        console.log('   - Notion should show as "Connected" (green dot)');
        console.log('   - Other services should show as "Disconnected" (red dot)');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testFixedAuthentication().catch(console.error);