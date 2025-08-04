#!/usr/bin/env node

/**
 * Final test to verify the complete authentication detection fix
 */

const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function testFinalSolution() {
    console.log('🎯 FINAL TEST - Complete Authentication Detection Fix\n');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        console.log('📋 TESTING COMPLETE FIX');
        console.log('='.repeat(60));
        
        console.log('🔍 Calling get_authenticated_services...');
        const result = await service.mcpClient.callTool('get_authenticated_services', { user_id: userId });
        
        console.log('✅ Tool call successful!');
        
        // Parse the response properly
        if (result.content && result.content.length > 0) {
            try {
                // Parse the outer response if needed
                let responseData = result.content[0].text;
                
                // Check if it's double-nested JSON
                if (responseData.startsWith('{"content":[')) {
                    const outerParsed = JSON.parse(responseData);
                    responseData = outerParsed.content[0].text;
                }
                
                const finalData = JSON.parse(responseData);
                
                console.log('\n🎯 FINAL AUTHENTICATION RESULT:');
                console.log('='.repeat(60));
                console.log(`✅ Success: ${finalData.success}`);
                console.log(`👤 User ID: ${finalData.user_id}`);
                console.log(`🔗 Authenticated Services: ${JSON.stringify(finalData.authenticated_services)}`);
                console.log(`💬 Message: ${finalData.message}`);
                
                if (finalData.authenticated_services && finalData.authenticated_services.length > 0) {
                    console.log('\n🎉🎉🎉 COMPLETE SUCCESS! 🎉🎉🎉');
                    console.log('\n✅ USER HAS AUTHENTICATED SERVICES:');
                    finalData.authenticated_services.forEach((service, index) => {
                        console.log(`   ${index + 1}. ${service.toUpperCase()} ✅`);
                    });
                    
                    console.log('\n💡 EXPECTED UI BEHAVIOR:');
                    finalData.authenticated_services.forEach(service => {
                        console.log(`   - ${service}: Show as "Connected" with GREEN dot ✅`);
                    });
                    
                    console.log('\n🔧 ALL OTHER SERVICES:');
                    console.log('   - Show as "Disconnected" with RED dot ❌');
                    
                    console.log('\n🚀 THE AUTHENTICATION DETECTION IS NOW WORKING CORRECTLY!');
                    console.log('🎯 Users can authenticate through Paragon Connect Portal');
                    console.log('📊 The main app will now properly detect their authenticated services');
                    console.log('🔄 The integration page will show the correct connection status');
                    
                } else {
                    console.log('\n❌ STILL NO AUTHENTICATED SERVICES DETECTED');
                    console.log('🔍 This should not happen if the fix worked correctly');
                }
                
            } catch (parseError) {
                console.log('❌ Failed to parse response:', parseError.message);
                console.log('📄 Raw response:', result.content[0].text.slice(0, 300) + '...');
            }
        } else {
            console.log('❌ No content in response');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFinalSolution().catch(console.error);