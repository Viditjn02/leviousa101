const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');
const OAuthManager = require('../src/features/invisibility/auth/OAuthManager');
const MCPConfigManager = require('../src/config/mcpConfig');

console.log('Testing Backward Compatibility...\n');

async function testBackwardCompatibility() {
    try {
        // Test 1: Legacy server definitions still work
        console.log('1. Testing legacy server definitions...');
        const serverRegistry = new ServerRegistry();
        await serverRegistry.initialize();
        
        // Check legacy non-OAuth servers
        const legacyServers = ['everything', 'filesystem', 'sqlite'];
        console.log('Legacy non-OAuth servers:');
        for (const server of legacyServers) {
            const definition = serverRegistry.getServerDefinition(server);
            if (definition) {
                console.log(`  ✅ ${server}: ${definition.description}`);
            } else {
                console.log(`  ❌ ${server}: Not found`);
            }
        }
        console.log('');
        
        // Test 2: Original OAuth providers still function
        console.log('2. Testing original OAuth providers...');
        const oauthManager = new OAuthManager();
        await oauthManager.initialize();
        
        const originalProviders = ['notion', 'github', 'slack'];
        console.log('Original OAuth providers:');
        for (const provider of originalProviders) {
            const supported = oauthManager.isProviderSupported(provider);
            const config = oauthManager.getProviderConfig(provider);
            if (supported && config) {
                console.log(`  ✅ ${provider}: Supported with ${config.authUrl ? 'valid' : 'invalid'} auth URL`);
            } else {
                console.log(`  ❌ ${provider}: Not supported`);
            }
        }
        console.log('');
        
        // Test 3: Existing OAuth flow compatibility
        console.log('3. Testing OAuth flow compatibility...');
        const configManager = new MCPConfigManager();
        await configManager.initialize();
        
        // Check if OAuth flow methods still work
        try {
            // Test building authorization URL (without actually starting flow)
            const testProvider = 'notion';
            const authUrl = await oauthManager.buildAuthorizationUrl(testProvider);
            
            console.log(`  ✅ Authorization URL generation works`);
            console.log(`     Sample URL format: ${authUrl.substring(0, 60)}...`);
            
            // Check if URL contains expected parameters
            const url = new URL(authUrl);
            const hasClientId = url.searchParams.has('client_id');
            const hasRedirectUri = url.searchParams.has('redirect_uri');
            const hasResponseType = url.searchParams.has('response_type');
            
            console.log(`     Required parameters: ${hasClientId && hasRedirectUri && hasResponseType ? '✅ Present' : '❌ Missing'}`);
        } catch (error) {
            console.log(`  ❌ OAuth flow error: ${error.message}`);
        }
        console.log('');
        
        // Test 4: Environment variable compatibility
        console.log('4. Testing environment variable compatibility...');
        const envMappings = {
            'notion': ['NOTION_API_KEY', 'notion_client_id', 'notion_client_secret'],
            'github': ['GITHUB_PERSONAL_ACCESS_TOKEN', 'github_client_id', 'github_client_secret'],
            'slack': ['SLACK_USER_TOKEN', 'SLACK_BOT_TOKEN', 'slack_client_id', 'slack_client_secret']
        };
        
        for (const [provider, vars] of Object.entries(envMappings)) {
            console.log(`  ${provider}:`);
            const serverDef = serverRegistry.getServerDefinition(provider);
            if (serverDef && serverDef.tokenEnvVar) {
                console.log(`    Server expects: ${serverDef.tokenEnvVar}`);
            }
            
            // Check if OAuth credentials are available
            const hasClientCreds = await configManager.getCredential(`${provider}_client_id`) && 
                                  await configManager.getCredential(`${provider}_client_secret`);
            console.log(`    OAuth credentials: ${hasClientCreds ? '✅ Available' : '❌ Not found'}`);
        }
        console.log('');
        
        // Test 5: Service availability matches previous behavior
        console.log('5. Testing service availability consistency...');
        const availableServers = serverRegistry.getAvailableServers();
        const expectedServers = ['everything', 'filesystem', 'sqlite', 'notion', 'slack', 'github'];
        
        console.log(`Total available servers: ${availableServers.length}`);
        for (const expected of expectedServers) {
            const found = availableServers.includes(expected);
            console.log(`  ${expected}: ${found ? '✅ Available' : '❌ Missing'}`);
        }
        console.log('');
        
        // Test 6: OAuth authentication status check
        console.log('6. Testing authentication status compatibility...');
        const authStatus = await oauthManager.getAuthenticationStatus();
        
        console.log('Authentication status for original providers:');
        for (const provider of originalProviders) {
            const status = authStatus[provider];
            if (status) {
                console.log(`  ${provider}: ${status.authenticated ? '✅ Authenticated' : '❌ Not authenticated'}`);
            } else {
                console.log(`  ${provider}: ⚠️  No status available`);
            }
        }
        
        console.log('\n✅ All backward compatibility tests completed!');
        
    } catch (error) {
        console.error('❌ Backward compatibility test failed:', error);
        process.exit(1);
    }
}

// Run tests
testBackwardCompatibility().catch(console.error); 