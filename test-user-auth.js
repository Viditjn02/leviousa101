#!/usr/bin/env node

/**
 * Test User Authentication Status
 * Check what services are authenticated for the user ID
 */

const MCPClient = require('./src/features/invisibility/mcp/MCPClient');

async function testUserAuth() {
    console.log('🔐 USER AUTHENTICATION STATUS TEST');
    console.log('==================================\n');
    
    let mcpClient;
    
    try {
        // Initialize MCP client
        console.log('🚀 Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('✅ MCP Client initialized\n');
        
        const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        console.log(`🔍 Checking authenticated services for user: ${testUserId}`);
        console.log('');
        
        // Test get_authenticated_services
        const authResult = await mcpClient.invokeTool('get_authenticated_services', {
            user_id: testUserId
        });
        
        console.log('📊 Authentication Result:');
        console.log('=========================');
        
        if (authResult.content && authResult.content[0]) {
            const response = JSON.parse(authResult.content[0].text);
            
            if (response.error) {
                console.log('❌ Error getting authenticated services:', response.error);
                
                if (response.error.includes('401')) {
                    console.log('🔴 JWT Token Issue: Paragon rejects our authentication');
                } else if (response.error.includes('404')) {
                    console.log('🔴 Project/User Issue: User or project not found');
                }
            } else {
                console.log('✅ Successfully retrieved authentication status');
                console.log('');
                
                if (response.authenticated_services) {
                    console.log(`📋 Authenticated Services (${response.authenticated_services.length}):`);
                    
                    if (response.authenticated_services.length === 0) {
                        console.log('⚠️  NO SERVICES AUTHENTICATED');
                        console.log('🔴 This user has not connected any services to Paragon!');
                    } else {
                        response.authenticated_services.forEach((service, index) => {
                            console.log(`  ${index + 1}. ${service.service || service.name}`);
                            if (service.status) {
                                console.log(`     Status: ${service.status}`);
                            }
                            if (service.email) {
                                console.log(`     Email: ${service.email}`);
                            }
                            if (service.last_authenticated) {
                                console.log(`     Last Auth: ${service.last_authenticated}`);
                            }
                        });
                        
                        // Check specifically for Gmail
                        const gmailService = response.authenticated_services.find(s => 
                            s.service === 'gmail' || s.name === 'gmail' || 
                            s.service === 'google' || s.name === 'google'
                        );
                        
                        if (gmailService) {
                            console.log('');
                            console.log('✅ Gmail is authenticated!');
                            console.log('📧 Gmail service details:', JSON.stringify(gmailService, null, 2));
                        } else {
                            console.log('');
                            console.log('❌ Gmail is NOT authenticated');
                            console.log('🔴 User needs to connect Gmail through Paragon OAuth flow');
                        }
                    }
                } else {
                    console.log('⚠️  No authenticated_services field in response');
                    console.log('📋 Full response:', JSON.stringify(response, null, 2));
                }
            }
        } else {
            console.log('❓ No response content received');
        }
        
        console.log('');
        console.log('💡 If no services are authenticated:');
        console.log('   1. User needs to authenticate Gmail via Paragon OAuth');
        console.log('   2. Use connect_service tool to generate auth URL');
        console.log('   3. User visits the URL to connect their Gmail account');
        
    } catch (error) {
        console.log('❌ TEST FAILED:', error.message);
        
        if (error.message.includes('401')) {
            console.log('🔴 JWT Authentication Issue: Paragon rejects our tokens');
            console.log('💡 Check: Project ID, signing key, public key in Paragon dashboard');
        }
    } finally {
        if (mcpClient) {
            await mcpClient.shutdown();
        }
        console.log('');
        console.log('🏁 Authentication test completed');
    }
}

// Run test
testUserAuth();