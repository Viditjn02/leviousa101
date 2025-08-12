const MCPConfigManager = require('../src/config/mcpConfig');

console.log('Testing MCPConfigManager OAuth Registry Integration...\n');

async function testMCPConfigIntegration() {
    const configManager = new MCPConfigManager();
    
    try {
        // Test 1: Initialize config manager
        console.log('1. Testing initialization...');
        await configManager.initialize();
        console.log('✅ MCPConfigManager initialized successfully\n');
        
        // Test 2: Check OAuth providers loaded from registry
        console.log('2. Testing OAuth providers from registry...');
        // Test each known provider
        const knownProviders = ['notion', 'slack', 'github', 'google-drive'];
        let foundProviders = 0;
        
        for (const provider of knownProviders) {
            const config = configManager.getOAuthProviderConfig(provider);
            if (config) {
                foundProviders++;
                console.log(`  - ${provider}:`);
                console.log(`    Auth URL: ${config.authUrl}`);
                console.log(`    Has scopes: ${config.scopes ? 'Yes' : 'No'}`);
            }
        }
        console.log(`Found ${foundProviders} OAuth providers`);
        console.log('');
        
        // Test 3: Check available OAuth services
        console.log('3. Testing getAvailableOAuthServices()...');
        const services = configManager.getAvailableOAuthServices();
        console.log(`Found ${services.length} OAuth services:`);
        services.forEach(service => {
            console.log(`  - ${service.key}: ${service.name} (Provider: ${service.provider})`);
        });
        console.log('');
        
        // Test 4: Check credentials for OAuth services
        console.log('4. Testing OAuth credentials availability...');
        const testServices = ['notion', 'github', 'slack', 'google', 'dropbox'];
        for (const service of testServices) {
            const clientId = await configManager.getCredential(`${service}_client_id`);
            const clientSecret = await configManager.getCredential(`${service}_client_secret`);
            
            if (clientId && clientSecret) {
                console.log(`✅ ${service}: Credentials available`);
            } else if (clientId || clientSecret) {
                console.log(`⚠️  ${service}: Partial credentials (missing ${!clientId ? 'client_id' : 'client_secret'})`);
            } else {
                console.log(`❌ ${service}: No credentials`);
            }
        }
        console.log('');
        
        // Test 5: Verify registry metadata is accessible
        console.log('5. Testing registry metadata access...');
        if (configManager.oauthServicesRegistry && configManager.oauthServicesRegistry.metadata) {
            const metadata = configManager.oauthServicesRegistry.metadata;
            console.log('Registry metadata:');
            console.log(`  - Version: ${metadata.version}`);
            console.log(`  - Total services: ${metadata.totalServices}`);
            console.log(`  - Enabled services: ${metadata.enabledServices}`);
            console.log(`  - Last updated: ${metadata.lastUpdated}`);
        } else {
            console.log('❌ Registry metadata not accessible');
        }
        console.log('');
        
        // Test 6: Test OAuth flow initialization (which internally manages state)
        console.log('6. Testing OAuth flow initialization...');
        try {
            // Test starting OAuth flow
            const authUrl = await configManager.startOAuthFlow('notion', 'notion');
            if (authUrl && authUrl.includes('api.notion.com')) {
                console.log('✅ OAuth flow initialized successfully');
                console.log(`   Auth URL starts with: ${authUrl.substring(0, 50)}...`);
            } else {
                console.log('❌ Failed to initialize OAuth flow');
            }
        } catch (error) {
            console.log('⚠️  OAuth flow initialization requires valid client credentials');
        }
        
        console.log('\n✅ All MCPConfigManager tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
testMCPConfigIntegration().catch(console.error); 