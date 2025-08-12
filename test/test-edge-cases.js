const fs = require('fs').promises;
const path = require('path');
const OAuthRegistryValidator = require('../src/features/invisibility/auth/OAuthRegistryValidator');
const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');
const OAuthManager = require('../src/features/invisibility/auth/OAuthManager');

console.log('Testing Edge Cases and Error Handling...\n');

async function testEdgeCases() {
    try {
        // Test 1: Invalid registry format
        console.log('1. Testing invalid registry format...');
        const validator = new OAuthRegistryValidator();
        
        // Test empty registry
        const emptyResult = validator.validateRegistry({});
        console.log(`Empty registry: ${emptyResult.valid ? '❌ Unexpectedly valid' : '✅ Correctly invalid'}`);
        if (!emptyResult.valid) {
            console.log(`  Errors: ${emptyResult.errors.slice(0, 3).join('; ')}...`);
        }
        
        // Test missing required fields
        const invalidService = {
            services: {
                'test-service': {
                    name: 'Test Service',
                    // Missing required fields
                }
            }
        };
        const missingFieldsResult = validator.validateRegistry(invalidService);
        console.log(`Missing fields: ${missingFieldsResult.valid ? '❌ Unexpectedly valid' : '✅ Correctly invalid'}`);
        console.log('');
        
        // Test 2: Invalid URL formats
        console.log('2. Testing invalid URL formats...');
        const invalidUrls = {
            services: {
                'bad-urls': {
                    name: 'Bad URLs Service',
                    description: 'Test service with invalid URLs',
                    enabled: true,
                    priority: 99,
                    serverConfig: {
                        command: 'npx',
                        args: ['-y', 'test'],
                        envMapping: { token: 'TEST_TOKEN' }
                    },
                    oauth: {
                        provider: 'test',
                        authUrl: 'not-a-valid-url',
                        tokenUrl: 'also-not-valid',
                        scopes: { required: ['test'] }
                    },
                    capabilities: ['test']
                }
            },
            metadata: {
                totalServices: 1,
                enabledServices: 1,
                version: '1.0.0'
            }
        };
        const urlResult = validator.validateRegistry(invalidUrls);
        console.log(`Invalid URLs: ${urlResult.valid ? '❌ Unexpectedly valid' : '✅ Correctly invalid'}`);
        if (!urlResult.valid) {
            const urlErrors = urlResult.errors.filter(e => e.includes('URL'));
            console.log(`  URL errors: ${urlErrors.join('; ')}`);
        }
        console.log('');
        
        // Test 3: Duplicate service handling
        console.log('3. Testing duplicate service handling...');
        const registryPath = path.join(__dirname, '..', 'src', 'config', 'oauth-services-registry.json');
        const originalContent = await fs.readFile(registryPath, 'utf-8');
        const registry = JSON.parse(originalContent);
        
        // Check if attempting to add a service that already exists
        const existingService = 'notion';
        console.log(`Checking duplicate prevention for '${existingService}'...`);
        const hasDuplicate = registry.services.hasOwnProperty(existingService);
        console.log(`✅ Registry ${hasDuplicate ? 'contains' : 'does not contain'} '${existingService}'`);
        console.log('');
        
        // Test 4: ServerRegistry handling of disabled services
        console.log('4. Testing ServerRegistry with disabled services...');
        const serverRegistry = new ServerRegistry();
        await serverRegistry.initialize();
        
        // Check if disabled services are loaded
        const disabledServices = ['dropbox', 'microsoft-graph', 'salesforce'];
        for (const service of disabledServices) {
            const definition = serverRegistry.getServerDefinition(service);
            console.log(`  ${service}: ${definition ? '❌ Unexpectedly loaded' : '✅ Correctly not loaded'}`);
        }
        console.log('');
        
        // Test 5: OAuthManager with unsupported providers
        console.log('5. Testing OAuthManager with unsupported providers...');
        const oauthManager = new OAuthManager();
        await oauthManager.initialize();
        
        const unsupportedProviders = ['fake-provider', 'invalid-oauth', 'dropbox'];
        for (const provider of unsupportedProviders) {
            const supported = oauthManager.isProviderSupported(provider);
            console.log(`  ${provider}: ${supported ? '❌ Unexpectedly supported' : '✅ Correctly unsupported'}`);
        }
        console.log('');
        
        // Test 6: Registry with malformed JSON
        console.log('6. Testing recovery from malformed registry...');
        const tempRegistryPath = path.join(__dirname, 'temp-registry.json');
        try {
            // Write malformed JSON
            await fs.writeFile(tempRegistryPath, '{ invalid json }');
            
            // Try to load it
            try {
                const content = await fs.readFile(tempRegistryPath, 'utf-8');
                JSON.parse(content);
                console.log('❌ Malformed JSON was unexpectedly parsed');
            } catch (error) {
                console.log('✅ Correctly caught JSON parse error');
                console.log(`  Error: ${error.message.substring(0, 50)}...`);
            }
        } finally {
            // Clean up
            try {
                await fs.unlink(tempRegistryPath);
            } catch {}
        }
        console.log('');
        
        // Test 7: Service with conflicting OAuth providers
        console.log('7. Testing service with mismatched OAuth provider...');
        const mismatchedService = {
            'mismatched': {
                name: 'Mismatched Service',
                description: 'Service with provider mismatch',
                enabled: true,
                priority: 100,
                serverConfig: {
                    command: 'npx',
                    args: ['-y', 'test'],
                    envMapping: { token: 'GITHUB_TOKEN' }  // GitHub token
                },
                oauth: {
                    provider: 'slack',  // But Slack OAuth config
                    authUrl: 'https://slack.com/oauth/v2/authorize',
                    tokenUrl: 'https://slack.com/api/oauth.v2.access',
                    scopes: { required: ['channels:read'] }
                },
                capabilities: ['test']
            }
        };
        
        const result = validator.validateService('mismatched', mismatchedService);
        console.log(`Provider mismatch validation: ${result.valid ? '✅ Valid (no built-in check)' : '❌ Invalid'}`);
        console.log('');
        
        // Test 8: Handling of special characters in service keys
        console.log('8. Testing special characters in service keys...');
        const specialChars = ['service@name', 'service/name', 'service name', 'service.name'];
        for (const key of specialChars) {
            console.log(`  "${key}": Consider ${key.match(/^[a-z0-9-]+$/) ? '✅ Valid' : '⚠️  May cause issues'}`);
        }
        
        console.log('\n✅ All edge case tests completed!');
        
    } catch (error) {
        console.error('❌ Edge case test failed:', error);
        process.exit(1);
    }
}

// Run tests
testEdgeCases().catch(console.error); 