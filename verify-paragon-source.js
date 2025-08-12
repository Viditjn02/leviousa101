#!/usr/bin/env node

/**
 * Verify that the authentication results are actually coming from Paragon
 * and not from cached OAuth tokens or other sources
 */

const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function verifyParagonSource() {
    console.log('🔍 Verifying Paragon Authentication Source\n');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        console.log('🔍 Step 1: Check if OAuth manager has stored tokens');
        const oauthStatus = service.mcpClient.oauthManager ? service.mcpClient.oauthManager.getStatus() : {};
        console.log('OAuth Manager Status:', oauthStatus);
        
        console.log('\n🔍 Step 2: Call Paragon directly with test user ID');
        const testResult = await service.mcpClient.callTool('get_authenticated_services', { 
            user_id: 'test-nonexistent-user-12345' 
        });
        
        console.log('📊 Result for nonexistent user:', JSON.stringify(testResult, null, 2));
        
        console.log('\n🔍 Step 3: Check if there are any stored credentials');
        const configManager = service.mcpClient.oauthManager?.configManager;
        if (configManager) {
            const config = configManager.getConfig();
            console.log('Stored credentials keys:', Object.keys(config.credentials || {}));
        }
        
        console.log('\n🔍 Step 4: Test with different Paragon user IDs');
        const testUsers = ['user1', 'user2', 'nonexistent-user'];
        
        for (const testUser of testUsers) {
            const result = await service.mcpClient.callTool('get_authenticated_services', { 
                user_id: testUser 
            });
            
            if (result.content && result.content[0] && result.content[0].text) {
                const parsedOuter = JSON.parse(result.content[0].text);
                if (parsedOuter.content && parsedOuter.content[0] && parsedOuter.content[0].text) {
                    const serviceData = JSON.parse(parsedOuter.content[0].text);
                    console.log(`User ${testUser}: ${serviceData.authenticated_services?.length || 0} services`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    
    console.log('\n✅ Verification completed');
    process.exit(0);
}

verifyParagonSource();