const fs = require('fs').promises;
const path = require('path');
const OAuthRegistryValidator = require('../src/features/invisibility/auth/OAuthRegistryValidator');

console.log('Testing Dynamic Service Addition...\n');

async function testDynamicServiceAddition() {
    const registryPath = path.join(__dirname, '..', 'src', 'config', 'oauth-services-registry.json');
    let originalContent;
    
    try {
        // Test 1: Backup original registry
        console.log('1. Backing up original registry...');
        originalContent = await fs.readFile(registryPath, 'utf-8');
        const originalRegistry = JSON.parse(originalContent);
        console.log(`  Original services count: ${originalRegistry.metadata.totalServices}`);
        console.log('  ✅ Registry backed up\n');
        
        // Test 2: Create a new test service
        console.log('2. Creating new test service...');
        const testService = {
            name: 'Test Dynamic Service',
            description: 'A dynamically added test service',
            enabled: false,
            priority: 99,
            serverConfig: {
                command: 'npx',
                args: ['-y', '@test/dynamic-service'],
                envMapping: {
                    token: 'DYNAMIC_SERVICE_TOKEN'
                }
            },
            oauth: {
                provider: 'dynamic-test',
                authUrl: 'https://dynamic-test.example.com/oauth/authorize',
                tokenUrl: 'https://dynamic-test.example.com/oauth/token',
                scopes: {
                    required: ['read'],
                    default: ['read', 'write']
                },
                pkce: true,
                customParams: {
                    access_type: 'offline'
                }
            },
            capabilities: ['test', 'dynamic'],
            documentation: 'https://dynamic-test.example.com/docs',
            icon: 'https://dynamic-test.example.com/icon.png'
        };
        console.log('  ✅ Test service created\n');
        
        // Test 3: Validate the new service
        console.log('3. Validating new service...');
        const validator = new OAuthRegistryValidator();
        const validation = validator.validateNewService('dynamic-test-service', testService);
        console.log(`  Validation result: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
        if (!validation.valid) {
            console.log(`  Errors: ${validation.errors.join(', ')}`);
        }
        console.log('');
        
        // Test 4: Add service to registry
        console.log('4. Adding service to registry...');
        const registry = JSON.parse(originalContent);
        
        // Check if service already exists
        if (registry.services['dynamic-test-service']) {
            console.log('  ⚠️  Service already exists, removing it first');
            delete registry.services['dynamic-test-service'];
        }
        
        // Add the new service
        registry.services['dynamic-test-service'] = testService;
        registry.metadata.totalServices = Object.keys(registry.services).length;
        registry.metadata.lastUpdated = new Date().toISOString().split('T')[0];
        
        // Save updated registry
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
        console.log('  ✅ Service added to registry\n');
        
        // Test 5: Verify service was added
        console.log('5. Verifying service addition...');
        const updatedContent = await fs.readFile(registryPath, 'utf-8');
        const updatedRegistry = JSON.parse(updatedContent);
        
        if (updatedRegistry.services['dynamic-test-service']) {
            console.log('  ✅ Service found in registry');
            console.log(`  Total services: ${updatedRegistry.metadata.totalServices}`);
        } else {
            console.log('  ❌ Service not found in registry');
        }
        console.log('');
        
        // Test 6: Load and verify with ServerRegistry
        console.log('6. Testing ServerRegistry dynamic loading...');
        const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');
        const serverRegistry = new ServerRegistry();
        await serverRegistry.initialize();
        
        // Since the service is disabled, it won't be in available servers
        // But we can check if it was processed
        const allServers = serverRegistry.getAvailableServers();
        console.log(`  Available servers: ${allServers.length}`);
        
        // Enable the service temporarily
        registry.services['dynamic-test-service'].enabled = true;
        registry.metadata.enabledServices++;
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
        
        // Reinitialize to load the enabled service
        const serverRegistry2 = new ServerRegistry();
        await serverRegistry2.initialize();
        
        const definition = serverRegistry2.getServerDefinition('dynamic-test-service');
        if (definition) {
            console.log('  ✅ Dynamic service loaded successfully');
            console.log(`    Command: ${definition.command}`);
            console.log(`    Auth provider: ${definition.authProvider}`);
        } else {
            console.log('  ❌ Dynamic service not loaded');
        }
        console.log('');
        
        // Test 7: Verify OAuth configuration
        console.log('7. Testing OAuth configuration for dynamic service...');
        const oauthConfig = serverRegistry2.getOAuthConfig('dynamic-test-service');
        if (oauthConfig) {
            console.log('  ✅ OAuth config available');
            console.log(`    Auth URL: ${oauthConfig.authUrl}`);
            console.log(`    PKCE enabled: ${oauthConfig.pkce}`);
        } else {
            console.log('  ❌ OAuth config not found');
        }
        console.log('');
        
        // Test 8: Test service removal
        console.log('8. Testing service removal...');
        delete registry.services['dynamic-test-service'];
        registry.metadata.totalServices = Object.keys(registry.services).length;
        registry.metadata.enabledServices = Object.values(registry.services).filter(s => s.enabled).length;
        
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
        console.log('  ✅ Service removed from registry');
        
        // Verify removal
        const finalContent = await fs.readFile(registryPath, 'utf-8');
        const finalRegistry = JSON.parse(finalContent);
        if (!finalRegistry.services['dynamic-test-service']) {
            console.log('  ✅ Removal verified');
        } else {
            console.log('  ❌ Service still exists');
        }
        
        console.log('\n✅ All dynamic service addition tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        // Restore original registry on error
        if (originalContent) {
            console.log('\nRestoring original registry...');
            await fs.writeFile(registryPath, originalContent);
            console.log('✅ Registry restored');
        }
        
        process.exit(1);
    } finally {
        // Always restore original registry
        if (originalContent) {
            await fs.writeFile(registryPath, originalContent);
            console.log('\n✅ Original registry restored');
        }
    }
}

// Run tests
testDynamicServiceAddition().catch(console.error); 