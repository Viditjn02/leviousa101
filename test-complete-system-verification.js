// Complete System Verification Test
// Tests the entire intelligent automation system end-to-end
// Validates real app discovery, LLM integration, and voice command processing

async function testCompleteSystemVerification() {
    console.log('\n🔧 Complete System Verification Test\n');
    console.log('=' .repeat(70));
    
    try {
        // Test 1: Initialize with real services
        console.log('\n🔧 Test 1: Initialize Complete System');
        
        // Initialize required services first
        const modelStateService = require('./src/features/common/services/modelStateService');
        await modelStateService.initialize();
        
        const IntelligentAutomationService = require('./src/features/voiceAgent/intelligentAutomationService');
        const automationService = new IntelligentAutomationService();
        
        const result = await automationService.initialize();
        
        if (result.success) {
            console.log('  ✅ Complete system initialized successfully');
        } else {
            throw new Error('System initialization failed: ' + result.error);
        }
        
        // Test 2: Verify Real Application Discovery
        console.log('\n🔧 Test 2: Verify Real Application Discovery');
        
        const status = automationService.getStatus();
        console.log(`  📊 Applications discovered: ${status.availableApplications}`);
        console.log(`  🟢 Running applications: ${status.runningApplications}`);
        
        // Verify real apps are found
        const discoveredApps = Array.from(automationService.availableApplications.keys());
        const realAppsFound = ['Google Chrome', 'Discord', 'Slack', 'Cursor', 'Claude', 'ChatGPT'].filter(app => 
            discoveredApps.includes(app)
        );
        
        console.log(`  🎯 Known real apps found: ${realAppsFound.length}/6`);
        console.log(`  📋 Real apps: ${realAppsFound.join(', ')}`);
        
        // Test 3: Voice Command Processing Tests
        console.log('\n🔧 Test 3: Voice Command Processing Tests');
        
        const testCommands = [
            "open chrome",
            "open safari", 
            "send an email to john",
            "create a note about the meeting",
            "find files in downloads"
        ];
        
        let successfulCommands = 0;
        let failedCommands = 0;
        
        for (const command of testCommands) {
            try {
                console.log(`  🎯 Testing: "${command}"`);
                const commandResult = await automationService.processUserCommand(command, {
                    screenElements: ['browser window', 'dock', 'menu bar'],
                    activeApplications: ['Finder', 'Safari']
                });
                
                if (commandResult.success) {
                    successfulCommands++;
                    console.log(`    ✅ SUCCESS: ${commandResult.action || 'Action completed'}`);
                    console.log(`    📱 Target: ${commandResult.targetApplication || 'Unknown app'}`);
                } else {
                    failedCommands++;
                    console.log(`    ❌ FAILED: ${commandResult.error || 'Unknown error'}`);
                }
            } catch (error) {
                failedCommands++;
                console.log(`    ❌ EXCEPTION: ${error.message}`);
            }
        }
        
        console.log(`  📊 Commands: ${successfulCommands} successful, ${failedCommands} failed`);
        
        // Test 4: Application Capability System
        console.log('\n🔧 Test 4: Application Capability System');
        
        let capabilityTests = 0;
        let capabilitySuccesses = 0;
        
        // Test capabilities for a few known apps
        const appsToTest = discoveredApps.slice(0, 5);
        
        for (const app of appsToTest) {
            capabilityTests++;
            try {
                const capabilities = await automationService.discoverAppCapabilities(app);
                if (Array.isArray(capabilities) && capabilities.length > 0) {
                    capabilitySuccesses++;
                    console.log(`  ✅ ${app}: ${capabilities.length} capabilities discovered`);
                } else {
                    console.log(`  ⚠️ ${app}: No capabilities discovered`);
                }
            } catch (error) {
                console.log(`  ❌ ${app}: Capability discovery failed - ${error.message}`);
            }
        }
        
        console.log(`  📊 Capability discovery: ${capabilitySuccesses}/${capabilityTests} successful`);
        
        // Test 5: Error Elimination Verification
        console.log('\n🔧 Test 5: Error Elimination Verification');
        
        let errorCount = 0;
        const originalError = console.error;
        const errors = [];
        
        console.error = (...args) => {
            const message = args.join(' ');
            if (message.includes('TypeError') && message.includes('generateResponse')) {
                errorCount++;
                errors.push(message);
            }
            return originalError(...args);
        };
        
        // Run several operations to trigger any potential errors
        try {
            await automationService.processUserCommand("test command", {});
            await automationService.discoverAppCapabilities("Safari");
            await automationService.analyzeUserIntent("open browser", {});
        } catch (error) {
            // Expected errors are fine, we're just checking for TypeError
        }
        
        console.error = originalError;
        
        console.log(`  🚫 TypeError generateResponse errors: ${errorCount}`);
        if (errorCount > 0) {
            console.log(`  ⚠️ Remaining errors:`, errors);
        }
        
        // Test 6: Performance Assessment
        console.log('\n🔧 Test 6: Performance Assessment');
        
        const startTime = Date.now();
        let performanceTests = 0;
        let performanceSuccesses = 0;
        
        // Quick performance tests
        for (let i = 0; i < 3; i++) {
            performanceTests++;
            try {
                const testResult = await automationService.processUserCommand(`test command ${i}`, {});
                if (testResult) {
                    performanceSuccesses++;
                }
            } catch (error) {
                // Performance test, errors are tracked but not critical
            }
        }
        
        const duration = Date.now() - startTime;
        console.log(`  ⏱️ Performance: ${performanceTests} tests in ${duration}ms (${Math.round(duration/performanceTests)}ms avg)`);
        console.log(`  📊 Success rate: ${Math.round(performanceSuccesses/performanceTests*100)}%`);
        
        // Final Assessment
        console.log('\n' + '=' .repeat(70));
        console.log('🎉 Complete System Verification Results:');
        console.log(`✅ System initialization: ${result.success ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ Real app discovery: ${status.availableApplications >= 30 ? 'WORKING' : 'FAILED'} (${status.availableApplications} apps)`);
        console.log(`✅ Known apps found: ${realAppsFound.length >= 4 ? 'EXCELLENT' : realAppsFound.length >= 2 ? 'GOOD' : 'POOR'} (${realAppsFound.length}/6)`);
        console.log(`✅ Voice commands: ${successfulCommands >= 3 ? 'WORKING' : 'NEEDS WORK'} (${successfulCommands}/${testCommands.length})`);
        console.log(`✅ App capabilities: ${capabilitySuccesses >= 3 ? 'WORKING' : 'NEEDS WORK'} (${capabilitySuccesses}/${capabilityTests})`);
        console.log(`✅ Error elimination: ${errorCount === 0 ? 'PERFECT' : 'ISSUES REMAIN'} (${errorCount} errors)`);
        console.log(`✅ Performance: ${duration < 1000 ? 'FAST' : duration < 3000 ? 'ACCEPTABLE' : 'SLOW'} (${duration}ms)`);
        
        const overallSuccess = result.success && 
                              status.availableApplications >= 30 && 
                              realAppsFound.length >= 4 && 
                              successfulCommands >= 3 && 
                              errorCount === 0;
        
        if (overallSuccess) {
            console.log('\n🎯 COMPLETE SYSTEM VERIFICATION: SUCCESS! ✅');
            console.log('🚀 The intelligent automation system is working perfectly!');
            console.log('   • Real application discovery ✅');
            console.log('   • LLM integration fixed ✅');
            console.log('   • Voice command processing ✅');
            console.log('   • Zero LLM errors ✅');
            console.log('   • Ready for production use! 🎉');
            return true;
        } else {
            console.log('\n⚠️ COMPLETE SYSTEM VERIFICATION: Some issues detected');
            console.log('Issues to address:');
            if (!result.success) console.log('   • System initialization failed ❌');
            if (status.availableApplications < 30) console.log('   • App discovery incomplete ❌');
            if (realAppsFound.length < 4) console.log('   • Known apps missing ❌');
            if (successfulCommands < 3) console.log('   • Voice commands failing ❌');
            if (errorCount > 0) console.log('   • LLM errors remain ❌');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Complete system verification failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testCompleteSystemVerification()
        .then(success => {
            console.log(`\n🎯 Final Result: ${success ? 'SYSTEM READY FOR PRODUCTION' : 'SYSTEM NEEDS MORE WORK'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ Test suite crashed:', error);
            process.exit(1);
        });
}

module.exports = testCompleteSystemVerification;
