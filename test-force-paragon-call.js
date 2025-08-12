// Force a call to trigger Paragon API and see detailed logs
const InvisibilityService = require('./src/features/invisibility/invisibilityService');

async function testForceParagonCall() {
    console.log('🧪 Forcing Paragon API call to see enhanced logs...');
    
    try {
        const service = new InvisibilityService();
        await service.initialize();
        console.log('✅ Service initialized');
        
        if (!service.mcpClient) {
            console.log('❌ MCP client not available');
            return;
        }
        
        console.log('\n📡 Step 1: First call (should trigger Paragon API with full logging)');
        const userIdForCheck = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        const result1 = await service.mcpClient.callTool('get_authenticated_services', { user_id: userIdForCheck });
        console.log('📊 Result 1:', result1);
        
        console.log('\n⏱️  Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n📡 Step 2: Second call (to see if anything changed)');
        const result2 = await service.mcpClient.callTool('get_authenticated_services', { user_id: userIdForCheck });
        console.log('📊 Result 2:', result2);
        
        // Try with different user IDs to see if that's the issue
        console.log('\n📡 Step 3: Testing with "default-user"');
        const result3 = await service.mcpClient.callTool('get_authenticated_services', { user_id: 'default-user' });
        console.log('📊 Result 3:', result3);
        
        console.log('\n📡 Step 4: Testing with simplified user ID');
        const result4 = await service.mcpClient.callTool('get_authenticated_services', { user_id: 'test-user' });
        console.log('📊 Result 4:', result4);
        
        console.log('\n✅ Force test completed - check server logs for Paragon API responses');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    process.exit(0);
}

testForceParagonCall();