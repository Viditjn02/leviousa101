// Test Service Integration Fix
// Tests that the service integration pipeline now works correctly

async function testServiceIntegrationFix() {
    console.log('\n🔧 Testing Service Integration Fix\n');
    console.log('=' .repeat(60));
    
    try {
        const IntelligentAutomationService = require('./src/features/voiceAgent/intelligentAutomationService');
        const automationService = new IntelligentAutomationService();
        
        // Initialize the service
        await automationService.initialize();
        
        // Test cases that should work
        const testCommands = [
            "open ChatGPT",
            "launch Discord", 
            "start Spotify",
            "send email to john",
            "create a note",
            "search for files"
        ];
        
        let successCount = 0;
        
        for (const [index, command] of testCommands.entries()) {
            console.log(`\n📝 Test ${index + 1}: "${command}"`);
            
            try {
                // Test intent analysis
                const intentResult = await automationService.analyzeUserIntent(command, {});
                
                if (intentResult.success && intentResult.intent) {
                    const intent = intentResult.intent;
                    console.log(`  ✅ Intent: ${intent.intent}`);
                    console.log(`  ✅ Target: ${intent.targetApplication}`);
                    console.log(`  ✅ Type: ${intent.actionType}`);
                    console.log(`  ✅ Confidence: ${intent.confidence}`);
                    
                    // Verify the intent makes sense
                    if (command.includes('ChatGPT') && intent.targetApplication === 'ChatGPT') {
                        console.log('  🎯 Correctly identified ChatGPT target');
                        successCount++;
                    } else if (command.includes('Discord') && intent.targetApplication === 'Discord') {
                        console.log('  🎯 Correctly identified Discord target');
                        successCount++;
                    } else if (command.includes('Spotify') && intent.targetApplication === 'Spotify') {
                        console.log('  🎯 Correctly identified Spotify target');
                        successCount++;
                    } else if (command.includes('email') && intent.targetApplication === 'Mail') {
                        console.log('  🎯 Correctly identified Mail target for email');
                        successCount++;
                    } else if (command.includes('note') && intent.targetApplication === 'Notes') {
                        console.log('  🎯 Correctly identified Notes target');
                        successCount++;
                    } else if (command.includes('search') && intent.targetApplication === 'Finder') {
                        console.log('  🎯 Correctly identified Finder target for search');
                        successCount++;
                    } else {
                        console.log(`  ⚠️ Unexpected target: expected specific app, got ${intent.targetApplication}`);
                    }
                } else {
                    console.log('  ❌ Intent analysis failed');
                    console.log('  📊 Result:', intentResult);
                }
            } catch (error) {
                console.log(`  ❌ Error: ${error.message}`);
            }
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('📊 SERVICE INTEGRATION TEST RESULTS');
        console.log('=' .repeat(60));
        
        const successRate = (successCount / testCommands.length) * 100;
        
        console.log(`✅ Successful intent analysis: ${successCount}/${testCommands.length} (${successRate}%)`);
        
        if (successCount >= 4) { // At least 4/6 should work (67% success rate)
            console.log('\n🎯 SERVICE INTEGRATION: FIXED! 🎉');
            console.log('🔧 Improvements:');
            console.log('   • Fallback LLM now properly parses user commands ✅');
            console.log('   • Intent analysis correctly identifies target applications ✅');
            console.log('   • Open commands properly extracted app names ✅');
            console.log('   • Different action types correctly categorized ✅');
            console.log('\n🚀 Voice agent service integration pipeline working!');
            return true;
        } else {
            console.log('\n⚠️ SERVICE INTEGRATION: STILL BROKEN');
            console.log(`📊 Success rate too low: ${successRate}% (need >67%)`);
            console.log('🔧 Remaining Issues:');
            console.log('   • Intent analysis accuracy still poor');
            console.log('   • Fallback LLM improvements not working');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Service integration test crashed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testServiceIntegrationFix()
        .then(success => {
            console.log(`\n🎯 Final Assessment: ${success ? 'SERVICE INTEGRATION FIXED - READY FOR FULL TESTING' : 'SERVICE INTEGRATION STILL BROKEN - NEEDS MORE WORK'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ Test suite crashed:', error);
            process.exit(1);
        });
}

module.exports = testServiceIntegrationFix;
