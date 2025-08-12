const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');
const OAuthManager = require('../src/features/invisibility/auth/OAuthManager');
const MCPConfigManager = require('../src/config/mcpConfig');
const fs = require('fs').promises;
const path = require('path');

console.log('Testing Runtime Initialization and Service Startup...\n');

async function testRuntimeInitialization() {
    let serverRegistry;
    let oauthManager;
    let configManager;
    
    try {
        // Test 1: Full system initialization
        console.log('1. Testing full system initialization...');
        console.time('Initialization time');
        
        // Initialize all components
        configManager = new MCPConfigManager();
        await configManager.initialize();
        
        oauthManager = new OAuthManager();
        await oauthManager.initialize();
        
        serverRegistry = new ServerRegistry();
        await serverRegistry.initialize();
        
        console.timeEnd('Initialization time');
        console.log('✅ All components initialized successfully\n');
        
        // Test 2: Verify registry was loaded
        console.log('2. Verifying OAuth registry was loaded...');
        const registryPath = path.join(__dirname, '..', 'src', 'config', 'oauth-services-registry.json');
        const registryExists = await fs.access(registryPath).then(() => true).catch(() => false);
        console.log(`  Registry file exists: ${registryExists ? '✅ Yes' : '❌ No'}`);
        
        const availableServers = serverRegistry.getAvailableServers();
        const oauthServers = availableServers.filter(s => 
            serverRegistry.getServerDefinition(s)?.requiresAuth
        );
        console.log(`  OAuth servers loaded: ${oauthServers.length}`);
        console.log(`  OAuth servers: ${oauthServers.join(', ')}`);
        console.log('');
        
        // Test 3: Check component integration
        console.log('3. Testing component integration...');
        
        // Check if ServerRegistry knows about OAuth providers
        const notionDef = serverRegistry.getServerDefinition('notion');
        console.log(`  ServerRegistry has Notion: ${notionDef ? '✅ Yes' : '❌ No'}`);
        if (notionDef) {
            console.log(`    - Auth provider: ${notionDef.authProvider}`);
            console.log(`    - Token env var: ${notionDef.tokenEnvVar}`);
        }
        
        // Check if OAuthManager knows about the same provider
        const notionSupported = oauthManager.isProviderSupported('notion');
        console.log(`  OAuthManager supports Notion: ${notionSupported ? '✅ Yes' : '❌ No'}`);
        
        // Check if ConfigManager has OAuth providers
        const notionConfig = configManager.getOAuthProviderConfig('notion');
        console.log(`  ConfigManager has Notion config: ${notionConfig ? '✅ Yes' : '❌ No'}`);
        console.log('');
        
        // Test 4: Memory usage check
        console.log('4. Testing memory efficiency...');
        const used = process.memoryUsage();
        console.log(`  Heap used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
        console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
        console.log(`  External: ${Math.round(used.external / 1024 / 1024)} MB`);
        console.log('');
        
        // Test 5: Error recovery during initialization
        console.log('5. Testing error recovery...');
        
        // Test with a corrupted registry path (simulated)
        const tempRegistry = new ServerRegistry();
        tempRegistry.loadOAuthServicesRegistry = async function() {
            throw new Error('Simulated registry load error');
        };
        
        try {
            await tempRegistry.initialize();
            console.log('  ✅ ServerRegistry initialized despite registry error');
            
            // Should still have legacy servers
            const legacyServers = tempRegistry.getAvailableServers();
            console.log(`  Legacy servers available: ${legacyServers.length > 0 ? '✅ Yes' : '❌ No'}`);
        } catch (error) {
            console.log('  ❌ ServerRegistry failed to initialize with error');
        }
        console.log('');
        
        // Test 6: Concurrent initialization test
        console.log('6. Testing concurrent initialization...');
        const startTime = Date.now();
        
        const initPromises = [
            new ServerRegistry().initialize(),
            new OAuthManager().initialize(),
            new MCPConfigManager().initialize()
        ];
        
        await Promise.all(initPromises);
        const concurrentTime = Date.now() - startTime;
        console.log(`  ✅ Concurrent initialization completed in ${concurrentTime}ms`);
        console.log('');
        
        // Test 7: Service metadata access
        console.log('7. Testing service metadata access...');
        const metadata = serverRegistry.getOAuthServicesMetadata();
        console.log(`  Registry version: ${metadata.version}`);
        console.log(`  Total services: ${metadata.totalServices}`);
        console.log(`  Enabled services: ${metadata.enabledServices}`);
        
        const servicesWithMeta = serverRegistry.getAvailableServersWithMetadata();
        const enabledCount = Object.values(servicesWithMeta).filter(s => 
            s.authProvider && serverRegistry.getServerDefinition(Object.keys(servicesWithMeta).find(k => servicesWithMeta[k] === s))
        ).length;
        console.log(`  Actual enabled OAuth servers: ${enabledCount}`);
        
        console.log('\n✅ All runtime initialization tests passed!');
        
    } catch (error) {
        console.error('❌ Runtime initialization test failed:', error);
        process.exit(1);
    }
}

// Run tests
testRuntimeInitialization().catch(console.error); 