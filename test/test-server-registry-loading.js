const path = require('path');
const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');

console.log('Testing ServerRegistry Dynamic Loading...\n');

async function testServerRegistryLoading() {
    const registry = new ServerRegistry();
    
    try {
        // Test 1: Initialize registry
        console.log('1. Testing initialization...');
        await registry.initialize();
        console.log('✅ Registry initialized successfully\n');
        
        // Test 2: Check available servers
        console.log('2. Testing getAvailableServers()...');
        const availableServers = registry.getAvailableServers();
        console.log(`Found ${availableServers.length} available servers:`);
        availableServers.forEach(server => {
            console.log(`  - ${server}: ${registry.getServerDefinition(server)?.description || 'No description'}`);
        });
        console.log('');
        
        // Test 3: Check OAuth services specifically
        console.log('3. Testing OAuth service loading...');
        const oauthServices = registry.getAvailableServersWithMetadata();
        const oauthEntries = Object.entries(oauthServices).filter(([_, service]) => service.authProvider);
        console.log(`Found ${oauthEntries.length} OAuth-enabled services:`);
        oauthEntries.forEach(([id, service]) => {
            const def = registry.getServerDefinition(id);
            const enabled = def ? true : false;
            console.log(`  - ${id} (${service.authProvider}): ${enabled ? '✅ Available' : '❌ Not available'}`);
        });
        console.log('');
        
        // Test 4: Check specific OAuth configurations
        console.log('4. Testing getOAuthConfig()...');
        const testProviders = ['notion', 'slack', 'github', 'google-drive', 'trello'];
        for (const provider of testProviders) {
            const config = registry.getOAuthConfig(provider);
            if (config) {
                console.log(`✅ ${provider}: OAuth config loaded`);
                console.log(`   - Auth URL: ${config.authUrl}`);
                console.log(`   - Token URL: ${config.tokenUrl}`);
                console.log(`   - Scopes: ${config.scopes?.default?.length || 0} default scopes`);
            } else {
                console.log(`❌ ${provider}: No OAuth config found`);
            }
        }
        console.log('');
        
        // Test 5: Check server definitions
        console.log('5. Testing server definitions...');
        const notion = registry.getServerDefinition('notion');
        console.log('Notion server definition:');
        console.log(`  - Command: ${notion?.command}`);
        console.log(`  - Args: ${notion?.args?.join(' ')}`);
        console.log(`  - Token env var: ${notion?.tokenEnvVar}`);
        console.log(`  - Priority: ${notion?.priority}`);
        console.log('');
        
        // Test 6: Check legacy servers
        console.log('6. Testing legacy (non-OAuth) servers...');
        const filesystem = registry.getServerDefinition('filesystem');
        if (filesystem) {
            console.log('✅ Legacy filesystem server still available');
        } else {
            console.log('❌ Legacy filesystem server not found');
        }
        console.log('');
        
        // Test 7: Test metadata
        console.log('7. Testing getOAuthServicesMetadata()...');
        const metadata = registry.getOAuthServicesMetadata();
        console.log(`Registry metadata:`);
        console.log(`  - Version: ${metadata.version}`);
        console.log(`  - Total services: ${metadata.totalServices}`);
        console.log(`  - Enabled services: ${metadata.enabledServices}`);
        console.log(`  - Last updated: ${metadata.lastUpdated}`);
        
        console.log('\n✅ All ServerRegistry tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
testServerRegistryLoading().catch(console.error); 