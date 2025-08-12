const OAuthRegistryValidator = require('../src/features/invisibility/auth/OAuthRegistryValidator');

console.log('Testing OAuthRegistryValidator...\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        testsPassed++;
    } else {
        console.log(`  ❌ ${testName}`);
        testsFailed++;
    }
}

async function testOAuthRegistryValidator() {
    const validator = new OAuthRegistryValidator();
    
    try {
        // Test 1: Valid registry validation
        console.log('1. Testing valid registry validation...');
        const validRegistry = {
            version: '1.0.0',
            services: {
                'test-service': {
                    name: 'Test Service',
                    description: 'A test service',
                    enabled: true,
                    priority: 1,
                    serverConfig: {
                        command: 'npx',
                        args: ['-y', 'test-server'],
                        envMapping: { token: 'TEST_TOKEN' }
                    },
                    oauth: {
                        provider: 'test',
                        authUrl: 'https://test.com/oauth/authorize',
                        tokenUrl: 'https://test.com/oauth/token',
                        scopes: {
                            required: ['read'],
                            default: ['read', 'write']
                        }
                    },
                    capabilities: ['test', 'demo']
                }
            },
            metadata: {
                totalServices: 1,
                enabledServices: 1,
                version: '1.0.0'
            }
        };
        
        const validResult = validator.validateRegistry(validRegistry);
        assert(validResult.valid === true, 'Valid registry passes validation');
        assert(validResult.errors.length === 0, 'No errors for valid registry');
        console.log('');
        
        // Test 2: Missing required fields
        console.log('2. Testing missing required fields...');
        const missingFields = {
            version: '1.0.0',
            services: {
                'incomplete': {
                    name: 'Incomplete Service'
                    // Missing other required fields
                }
            }
        };
        
        const missingResult = validator.validateRegistry(missingFields);
        assert(missingResult.valid === false, 'Incomplete service fails validation');
        assert(missingResult.errors.some(e => e.includes('description')), 'Missing description detected');
        assert(missingResult.errors.some(e => e.includes('enabled')), 'Missing enabled detected');
        assert(missingResult.errors.some(e => e.includes('serverConfig')), 'Missing serverConfig detected');
        console.log('');
        
        // Test 3: Invalid URL validation
        console.log('3. Testing URL validation...');
        const invalidUrlsService = {
            name: 'Bad URLs',
            description: 'Service with invalid URLs',
            enabled: true,
            priority: 1,
            serverConfig: { command: 'npx', args: ['test'], envMapping: {} },
            oauth: {
                provider: 'test',
                authUrl: 'not-a-url',
                tokenUrl: 'http://',
                scopes: { required: [] }
            },
            capabilities: []
        };
        
        const urlErrors = validator.validateService('bad-urls', invalidUrlsService);
        assert(urlErrors.length > 0, 'Invalid URLs fail validation');
        assert(urlErrors.some(e => e.includes('authUrl must be a valid URL')), 'Invalid authUrl detected');
        assert(urlErrors.some(e => e.includes('tokenUrl must be a valid URL')), 'Invalid tokenUrl detected');
        console.log('');
        
        // Test 4: Type validation
        console.log('4. Testing type validation...');
        const wrongTypes = {
            name: 123, // Should be string
            description: 'Valid string',
            enabled: 'yes', // Should be boolean
            priority: '5', // Should be number
            serverConfig: { command: 'npx', args: 'not-array', envMapping: {} }, // args should be array
            oauth: {
                provider: 'test',
                authUrl: 'https://test.com/auth',
                tokenUrl: 'https://test.com/token',
                scopes: { required: 'read' } // Should be array
            },
            capabilities: 'test' // Should be array
        };
        
        const typeErrors = validator.validateService('wrong-types', wrongTypes);
        assert(typeErrors.length > 0, 'Wrong types fail validation');
        assert(typeErrors.some(e => e.includes('name') && e.includes('string')), 'Wrong name type detected');
        assert(typeErrors.some(e => e.includes('enabled') && e.includes('boolean')), 'Wrong enabled type detected');
        assert(typeErrors.some(e => e.includes('priority') && e.includes('number')), 'Wrong priority type detected');
        console.log('');
        
        // Test 5: validateNewService method
        console.log('5. Testing validateNewService method...');
        const newService = {
            name: 'New Service',
            description: 'A brand new service',
            enabled: false,
            priority: 99,
            serverConfig: {
                command: 'docker',
                args: ['run', 'service'],
                envMapping: { key: 'SERVICE_KEY' }
            },
            oauth: {
                provider: 'new-provider',
                authUrl: 'https://new-provider.com/oauth/authorize',
                tokenUrl: 'https://new-provider.com/oauth/token',
                scopes: {
                    required: ['basic'],
                    default: ['basic', 'advanced']
                },
                pkce: true
            },
            capabilities: ['new', 'features']
        };
        
        const newServiceResult = validator.validateNewService('new-service', newService);
        assert(newServiceResult.valid === true, 'Valid new service passes validation');
        console.log('');
        
        // Test 6: suggestFixes method
        console.log('6. Testing suggestFixes method...');
        const errors = [
            '[test] oauth.authUrl must be a valid URL',
            '[test] Missing required field: description',
            '[test] Invalid type for priority: expected number, got string'
        ];
        
        const suggestions = validator.suggestFixes(errors);
        assert(Array.isArray(suggestions), 'suggestFixes returns array');
        assert(suggestions.some(s => s.suggestion && s.suggestion.includes('URL')), 'URL fix suggestion provided');
        assert(suggestions.some(s => s.suggestion && s.suggestion.includes('description')), 'Missing field suggestion provided');
        assert(suggestions.length > 0, 'Suggestions were generated');
        console.log('');
        
        // Test 7: Array type validation fix
        console.log('7. Testing array type validation...');
        const arrayTest = {
            name: 'Array Test',
            description: 'Testing array validation',
            enabled: true,
            priority: 1,
            serverConfig: {
                command: 'npx',
                args: ['arg1', 'arg2'], // Correct array
                envMapping: {}
            },
            oauth: {
                provider: 'test',
                authUrl: 'https://test.com/auth',
                tokenUrl: 'https://test.com/token',
                scopes: {
                    required: ['scope1', 'scope2'], // Correct array
                    default: [] // Empty array is valid
                }
            },
            capabilities: ['cap1', 'cap2'] // Correct array
        };
        
        const arrayErrors = validator.validateService('array-test', arrayTest);
        assert(arrayErrors.length === 0, 'Correct array types pass validation');
        console.log('');
        
        // Test 8: Empty registry
        console.log('8. Testing empty registry...');
        const emptyResult = validator.validateRegistry({});
        assert(emptyResult.valid === false, 'Empty registry fails validation');
        assert(emptyResult.errors.includes('Registry missing version field'), 'Missing version detected');
        assert(emptyResult.errors.includes('Registry missing or invalid services object'), 'Missing services detected');
        
        // Summary
        console.log('\n=== Test Summary ===');
        console.log(`Tests passed: ${testsPassed}`);
        console.log(`Tests failed: ${testsFailed}`);
        console.log(`Total tests: ${testsPassed + testsFailed}`);
        
        if (testsFailed === 0) {
            console.log('\n✅ All OAuthRegistryValidator tests passed!');
        } else {
            console.log(`\n❌ ${testsFailed} tests failed!`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

// Run tests
testOAuthRegistryValidator().catch(console.error); 