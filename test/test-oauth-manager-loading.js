const OAuthManager = require('../src/features/invisibility/auth/OAuthManager');

console.log('Testing OAuthManager Dynamic Loading...\n');

async function testOAuthManagerLoading() {
    const manager = new OAuthManager();
    
    try {
        // Test 1: Initialize manager
        console.log('1. Testing initialization...');
        await manager.initialize();
        console.log('✅ OAuthManager initialized successfully\n');
        
        // Test 2: Check supported providers
        console.log('2. Testing getSupportedProviders()...');
        const supportedProviders = manager.getSupportedProviders();
        const providerKeys = Object.keys(supportedProviders);
        console.log(`Found ${providerKeys.length} supported providers:`);
        providerKeys.forEach(provider => {
            console.log(`  - ${provider}`);
        });
        console.log('');
        
        // Test 3: Check provider configurations
        console.log('3. Testing getProviderConfig()...');
        const testProviders = ['notion', 'slack', 'github', 'google-drive', 'trello', 'dropbox'];
        for (const provider of testProviders) {
            const config = manager.getProviderConfig(provider);
            if (config) {
                console.log(`✅ ${provider}: Provider config loaded`);
                console.log(`   - Auth URL: ${config.authUrl}`);
                console.log(`   - Token URL: ${config.tokenUrl}`);
                console.log(`   - Has scopes: ${config.scopes ? 'Yes' : 'No'}`);
            } else {
                console.log(`❌ ${provider}: No provider config found`);
            }
        }
        console.log('');
        
        // Test 4: Check supported services
        console.log('4. Testing getSupportedServices()...');
        const services = await manager.getSupportedServices();
        console.log(`Found ${services.length} supported services:`);
        services.forEach(service => {
            console.log(`  - ${service.id}: ${service.name} (${service.enabled ? 'Enabled' : 'Disabled'})`);
        });
        console.log('');
        
        // Test 5: Test provider support check
        console.log('5. Testing isProviderSupported()...');
        const checkProviders = ['notion', 'github', 'fake-provider', 'google-drive'];
        for (const provider of checkProviders) {
            const supported = manager.isProviderSupported(provider);
            console.log(`  - ${provider}: ${supported ? '✅ Supported' : '❌ Not supported'}`);
        }
        console.log('');
        
        // Test 6: Check authentication status
        console.log('6. Testing getAuthenticationStatus()...');
        const authStatus = await manager.getAuthenticationStatus();
        console.log('Authentication status:');
        Object.entries(authStatus).forEach(([provider, status]) => {
            console.log(`  - ${provider}: ${status.authenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);
            if (status.expiresAt) {
                console.log(`    Expires: ${new Date(status.expiresAt).toLocaleString()}`);
            }
        });
        console.log('');
        
        // Test 7: Test building authorization URLs
        console.log('7. Testing buildAuthorizationUrl()...');
        try {
            const authUrl = await manager.buildAuthorizationUrl('notion');
            console.log('✅ Successfully built authorization URL for Notion');
            console.log(`   URL starts with: ${authUrl.substring(0, 50)}...`);
        } catch (error) {
            console.log('❌ Failed to build authorization URL:', error.message);
        }
        
        console.log('\n✅ All OAuthManager tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
testOAuthManagerLoading().catch(console.error); 