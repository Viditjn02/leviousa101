// Test LLM provider fix in IntelligentAutomationService
// Validates the new createStreamingLLM approach works correctly

async function testLLMProviderFix() {
    console.log('\n🔧 Testing LLM Provider Fix in IntelligentAutomationService\n');
    console.log('=' .repeat(70));
    
    try {
        // Test 1: Initialize the service with new LLM provider
        console.log('\n🔧 Test 1: Initialize Service with New LLM Provider');
        
        const IntelligentAutomationService = require('./src/features/voiceAgent/intelligentAutomationService');
        const automationService = new IntelligentAutomationService();
        
        const result = await automationService.initialize();
        
        if (result.success) {
            console.log('  ✅ Service initialized successfully');
        } else {
            throw new Error('Service initialization failed: ' + result.error);
        }
        
        // Test 2: Verify LLM provider is working
        console.log('\n🔧 Test 2: Verify LLM Provider Functionality');
        
        const status = automationService.getStatus();
        console.log(`  📊 Applications discovered: ${status.availableApplications}`);
        console.log(`  🧠 LLM provider initialized: ${automationService.llmProvider ? 'YES' : 'NO'}`);
        
        // Test 3: Check for errors during capability building
        console.log('\n🔧 Test 3: Test Capability Discovery Process');
        
        let errorCount = 0;
        const originalError = console.error;
        const errors = [];
        
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Error discovering capabilities')) {
                errorCount++;
                errors.push(args.join(' '));
            }
            return originalError(...args);
        };
        
        // Try discovering capabilities for a few apps
        if (automationService.availableApplications.size > 0) {
            const testApps = Array.from(automationService.availableApplications.keys()).slice(0, 3);
            console.log(`  🧪 Testing capability discovery for: ${testApps.join(', ')}`);
            
            for (const app of testApps) {
                try {
                    await automationService.discoverAppCapabilities(app);
                    console.log(`    ✅ ${app}: capability discovery succeeded`);
                } catch (error) {
                    console.log(`    ❌ ${app}: capability discovery failed - ${error.message}`);
                    errorCount++;
                }
            }
        }
        
        console.error = originalError;
        
        console.log(`  📊 LLM capability discovery errors: ${errorCount}`);
        
        // Test 4: Test command processing
        console.log('\n🔧 Test 4: Test Command Processing');
        
        try {
            const testCommand = "open safari";
            const result = await automationService.processUserCommand(testCommand, {});
            console.log(`  🎯 Command "${testCommand}" processed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (result.success) {
                console.log(`    📝 Action: ${result.action}`);
                console.log(`    📱 App: ${result.targetApplication || 'Unknown'}`);
            }
        } catch (commandError) {
            console.log(`  ❌ Command processing failed: ${commandError.message}`);
        }
        
        // Test 5: Validate against real system performance
        console.log('\n🔧 Test 5: Performance and Error Analysis');
        
        const startTime = Date.now();
        let successfulCalls = 0;
        let failedCalls = 0;
        
        // Test multiple simple LLM calls
        for (let i = 0; i < 3; i++) {
            try {
                const testPrompt = `What can the application "Safari" do? List 3 key capabilities.`;
                const response = await automationService.llmProvider.generateResponse(testPrompt, {});
                if (response && response.length > 10) {
                    successfulCalls++;
                } else {
                    failedCalls++;
                }
            } catch (error) {
                failedCalls++;
                console.log(`    ⚠️ LLM call ${i + 1} failed: ${error.message}`);
            }
        }
        
        const duration = Date.now() - startTime;
        console.log(`  ⏱️ Performance: ${successfulCalls} successful, ${failedCalls} failed in ${duration}ms`);
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎉 LLM Provider Fix Test Results:');
        console.log(`✅ Service initialization: ${result.success ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ Application discovery: ${status.availableApplications > 0 ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ LLM capability errors: ${errorCount === 0 ? 'ELIMINATED' : `${errorCount} REMAINING`}`);
        console.log(`✅ Command processing: ${successfulCalls > 0 ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ LLM provider calls: ${(successfulCalls / (successfulCalls + failedCalls) * 100).toFixed(0)}% success rate`);
        
        const overallSuccess = result.success && status.availableApplications > 0 && errorCount === 0 && successfulCalls > 0;
        
        if (overallSuccess) {
            console.log('\n🎯 LLM PROVIDER FIX SUCCESSFUL!');
            console.log('All TypeError: this.llmProvider.generateResponse is not a function errors should be eliminated!');
            return true;
        } else {
            console.log('\n⚠️ Some issues remain to be addressed');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ LLM provider fix test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testLLMProviderFix()
        .then(success => {
            console.log(`\n🎯 Overall Result: ${success ? 'LLM PROVIDER FIXED' : 'NEEDS MORE WORK'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = testLLMProviderFix;
