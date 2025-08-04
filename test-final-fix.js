#!/usr/bin/env node

/**
 * Test the final fix for Paragon authentication detection
 */

const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function testFinalFix() {
    console.log('🎯 Testing FINAL Paragon Authentication Fix\n');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        console.log('📋 TESTING FINAL IMPLEMENTATION');
        console.log('='.repeat(60));
        
        console.log('🔍 Calling get_authenticated_services...');
        const result = await service.mcpClient.callTool('get_authenticated_services', { user_id: userId });
        
        console.log('✅ Tool call successful!');
        console.log('📄 Raw result length:', JSON.stringify(result).length);
        
        // Parse the nested response
        if (result.content && result.content.length > 0) {
            try {
                // Parse the outer layer
                const outerParsed = JSON.parse(result.content[0].text);
                
                // Parse the inner layer
                let finalData;
                if (outerParsed.content && outerParsed.content.length > 0) {
                    finalData = JSON.parse(outerParsed.content[0].text);
                } else {
                    finalData = outerParsed;
                }
                
                console.log('\n📊 PARSED AUTHENTICATION RESULT:');
                console.log(`   ✅ Success: ${finalData.success}`);
                console.log(`   👤 User ID: ${finalData.user_id}`);
                console.log(`   🔗 Services: ${JSON.stringify(finalData.authenticated_services)}`);
                console.log(`   💬 Message: ${finalData.message}`);
                
                if (finalData.authenticated_services && finalData.authenticated_services.length > 0) {
                    console.log('\n🎉 🎉 🎉 SUCCESS! 🎉 🎉 🎉');
                    console.log('\n✅ User HAS AUTHENTICATED SERVICES:');
                    finalData.authenticated_services.forEach((service, index) => {
                        console.log(`   ${index + 1}. ${service} ✅`);
                    });
                    
                    console.log('\n💡 EXPECTED UI BEHAVIOR:');
                    console.log('   - These services should show as "Connected" (green dot)');
                    console.log('   - All other services should show as "Disconnected" (red dot)');
                    
                } else {
                    console.log('\n❌ Still returning empty array for authenticated services');
                    console.log('🔍 This means there\'s still an issue with the server logic');
                }
                
            } catch (parseError) {
                console.log('❌ Failed to parse response:', parseError.message);
                console.log('📄 Raw response:', result.content[0].text.slice(0, 200) + '...');
            }
        } else {
            console.log('❌ No content in response');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFinalFix().catch(console.error);