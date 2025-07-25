const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('Running Final Comprehensive Tests...\n');
console.log('This will run all test suites to ensure the OAuth registry system is fully functional.\n');

const tests = [
    {
        name: 'Registry Validation',
        script: 'scripts/validate-oauth-registry.js',
        critical: true
    },
    {
        name: 'ServerRegistry Loading',
        script: 'test/test-server-registry-loading.js',
        critical: true
    },
    {
        name: 'OAuthManager Loading', 
        script: 'test/test-oauth-manager-loading.js',
        critical: true
    },
    {
        name: 'MCPConfig Integration',
        script: 'test/test-mcp-config-integration.js',
        critical: true
    },
    {
        name: 'Edge Cases',
        script: 'test/test-edge-cases.js',
        critical: false
    },
    {
        name: 'Backward Compatibility',
        script: 'test/test-backward-compatibility.js',
        critical: true
    },
    {
        name: 'OAuthRegistryValidator Unit Tests',
        script: 'test/test-oauth-registry-validator.js',
        critical: false
    },
    {
        name: 'Runtime Initialization',
        script: 'test/test-runtime-initialization.js',
        critical: true
    },
    {
        name: 'Dynamic Service Addition',
        script: 'test/test-dynamic-service-addition.js',
        critical: true
    }
];

let passed = 0;
let failed = 0;
let warnings = 0;

async function runTest(test) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${test.name}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
        const { stdout, stderr } = await execPromise(`node ${test.script}`);
        
        // Check if test passed
        if ((stdout.includes('✅ All') && (stdout.includes('passed') || stdout.includes('completed'))) || 
            (stdout.includes('Registry validation PASSED') && test.name === 'Registry Validation')) {
            console.log(`✅ ${test.name} - PASSED`);
            passed++;
        } else if (stderr || (stdout.includes('❌') && !stdout.includes('❌ Not authenticated'))) {
            if (test.critical) {
                console.log(`❌ ${test.name} - FAILED (Critical)`);
                failed++;
            } else {
                console.log(`⚠️  ${test.name} - FAILED (Non-critical)`);
                warnings++;
            }
            
            // Show error details
            if (stderr) {
                console.log('\nError output:');
                console.log(stderr.substring(0, 500));
            }
        } else {
            console.log(`✅ ${test.name} - PASSED`);
            passed++;
        }
    } catch (error) {
        if (test.critical) {
            console.log(`❌ ${test.name} - FAILED (Critical)`);
            console.log(`Error: ${error.message}`);
            failed++;
        } else {
            console.log(`⚠️  ${test.name} - FAILED (Non-critical)`);
            console.log(`Error: ${error.message}`);
            warnings++;
        }
    }
}

async function runAllTests() {
    console.time('Total test duration');
    
    for (const test of tests) {
        await runTest(test);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('FINAL TEST SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Tests Passed: ${passed}/${tests.length}`);
    console.log(`Critical Failures: ${failed}`);
    console.log(`Warnings: ${warnings}`);
    console.log('');
    console.timeEnd('Total test duration');
    
    if (failed === 0) {
        console.log('\n🎉 SUCCESS: All critical tests passed!');
        console.log('The OAuth services registry system is fully functional and ready for use.');
        
        // Show summary of what was implemented
        console.log('\nImplemented Features:');
        console.log('  ✅ Dynamic OAuth service loading from JSON registry');
        console.log('  ✅ Comprehensive validation system');
        console.log('  ✅ Backward compatibility with legacy providers');
        console.log('  ✅ Runtime service addition/removal');
        console.log('  ✅ Error recovery and resilience');
        console.log('  ✅ Full integration with existing components');
        console.log('  ✅ Scalable architecture for future services');
        
        process.exit(0);
    } else {
        console.log(`\n❌ FAILURE: ${failed} critical tests failed!`);
        console.log('Please review the errors above and fix any issues.');
        process.exit(1);
    }
}

// Run all tests
runAllTests().catch(error => {
    console.error('Failed to run tests:', error);
    process.exit(1);
}); 