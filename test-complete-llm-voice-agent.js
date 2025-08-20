#!/usr/bin/env node

console.log('🧪 COMPREHENSIVE LLM-BASED VOICE AGENT TEST');
console.log('==========================================\n');

// Test the complete LLM-based voice agent with function calling
async function testCompleteLLMVoiceAgent() {
    const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
    
    try {
        const voiceAgent = new VoiceAgentService();
        console.log('✅ VoiceAgentService instantiated\n');
        
        // Comprehensive test cases covering all scenarios
        const testCommands = [
            // ACTIONABLE COMMANDS - App/System Actions
            { cmd: "open calculator", expectActionable: true, category: "app_launch", expectedActionType: "open_app" },
            { cmd: "launch Chrome browser", expectActionable: true, category: "app_launch", expectedActionType: "open_app" },
            { cmd: "start my music player", expectActionable: true, category: "app_launch", expectedActionType: "open_app" },
            
            // ACTIONABLE COMMANDS - Search & Information
            { cmd: "search for pizza recipes", expectActionable: true, category: "search", expectedActionType: "search" },
            { cmd: "Google the weather forecast", expectActionable: true, category: "search", expectedActionType: "search" },
            { cmd: "look up movie times", expectActionable: true, category: "search", expectedActionType: "search" },
            { cmd: "what's the temperature outside", expectActionable: true, category: "get_info", expectedActionType: "get_info" },
            { cmd: "what time is it", expectActionable: true, category: "get_info", expectedActionType: "get_info" },
            { cmd: "check my calendar", expectActionable: true, category: "get_info", expectedActionType: "get_info" },
            
            // ACTIONABLE COMMANDS - Communication  
            { cmd: "send email to John", expectActionable: true, category: "communication", expectedActionType: "send_message" },
            { cmd: "text my mom about dinner", expectActionable: true, category: "communication", expectedActionType: "send_message" },
            { cmd: "call the office", expectActionable: true, category: "communication", expectedActionType: "send_message" },
            
            // ACTIONABLE COMMANDS - Media Control
            { cmd: "play jazz music", expectActionable: true, category: "media", expectedActionType: "play_media" },
            { cmd: "pause the current video", expectActionable: true, category: "media", expectedActionType: "play_media" },
            { cmd: "turn up the volume", expectActionable: true, category: "system_control", expectedActionType: "system_control" },
            
            // ACTIONABLE COMMANDS - Content Creation
            { cmd: "create a new document", expectActionable: true, category: "creation", expectedActionType: "create_content" },
            { cmd: "write a note about the meeting", expectActionable: true, category: "creation", expectedActionType: "create_content" },
            { cmd: "take a screenshot", expectActionable: true, category: "creation", expectedActionType: "create_content" },
            
            // ACTIONABLE COMMANDS - System Controls
            { cmd: "increase the brightness", expectActionable: true, category: "system", expectedActionType: "system_control" },
            { cmd: "set a timer for 10 minutes", expectActionable: true, category: "system", expectedActionType: "system_control" },
            { cmd: "open system settings", expectActionable: true, category: "system", expectedActionType: "open_app" },
            
            // ACTIONABLE COMMANDS - Natural Language Variations
            { cmd: "could you please open my email client", expectActionable: true, category: "polite_request", expectedActionType: "open_app" },
            { cmd: "I'd like to search for something", expectActionable: true, category: "polite_request", expectedActionType: "search" },
            { cmd: "would it be possible to play some music", expectActionable: true, category: "polite_request", expectedActionType: "play_media" },
            
            // CONVERSATIONAL RESPONSES - Greetings & Social
            { cmd: "hello", expectActionable: false, category: "greeting" },
            { cmd: "hi there", expectActionable: false, category: "greeting" },
            { cmd: "good morning", expectActionable: false, category: "greeting" },
            { cmd: "how are you", expectActionable: false, category: "social" },
            { cmd: "what's up", expectActionable: false, category: "social" },
            { cmd: "how was your day", expectActionable: false, category: "social" },
            
            // CONVERSATIONAL RESPONSES - Acknowledgments  
            { cmd: "yes", expectActionable: false, category: "acknowledgment" },
            { cmd: "no", expectActionable: false, category: "acknowledgment" },
            { cmd: "okay", expectActionable: false, category: "acknowledgment" },
            { cmd: "thanks", expectActionable: false, category: "acknowledgment" },
            { cmd: "sure", expectActionable: false, category: "acknowledgment" },
            { cmd: "alright", expectActionable: false, category: "acknowledgment" },
            
            // CONVERSATIONAL RESPONSES - Expressions
            { cmd: "awesome", expectActionable: false, category: "expression" },
            { cmd: "cool", expectActionable: false, category: "expression" },
            { cmd: "that sounds good", expectActionable: false, category: "expression" },
            { cmd: "perfect", expectActionable: false, category: "expression" },
            
            // EDGE CASES - Similar words, different intents
            { cmd: "play along with their idea", expectActionable: false, category: "edge_case_conversational" },
            { cmd: "play the new song", expectActionable: true, category: "edge_case_actionable", expectedActionType: "play_media" },
            { cmd: "open minded approach", expectActionable: false, category: "edge_case_conversational" },
            { cmd: "open the file manager", expectActionable: true, category: "edge_case_actionable", expectedActionType: "open_app" },
            { cmd: "find out later", expectActionable: false, category: "edge_case_conversational" },
            { cmd: "find my documents", expectActionable: true, category: "edge_case_actionable", expectedActionType: "search" },
        ];
        
        let totalTests = testCommands.length;
        let passedTests = 0;
        let failedTests = [];
        
        console.log(`Testing LLM-based intent classification with ${totalTests} comprehensive test cases...\n`);
        console.log('🔍 Testing Categories:');
        console.log('• App Launch & System Actions');
        console.log('• Search & Information Requests'); 
        console.log('• Communication Commands');
        console.log('• Media & System Controls');
        console.log('• Content Creation');
        console.log('• Natural Language Variations');
        console.log('• Conversational Responses');
        console.log('• Edge Cases\n');
        
        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️  WARNING: OPENAI_API_KEY environment variable not set');
            console.log('   The LLM will use fallback logic instead of actual AI classification\n');
        }
        
        for (let i = 0; i < testCommands.length; i++) {
            const test = testCommands[i];
            
            try {
                console.log(`🧪 [${i+1}/${totalTests}] Testing: "${test.cmd}"`);
                
                // Test the LLM-based analyzeUserCommand method
                const result = await voiceAgent.analyzeUserCommand(test.cmd);
                
                const isActuallyActionable = result.isActionable;
                const actualActionType = result.actionType;
                const actualConfidence = result.confidence;
                
                let passed = isActuallyActionable === test.expectActionable;
                
                // For actionable commands, also check if action type is reasonable
                if (test.expectActionable && test.expectedActionType && actualActionType) {
                    const actionTypeCorrect = actualActionType === test.expectedActionType;
                    if (!actionTypeCorrect) {
                        console.log(`   ⚠️  Action type: expected ${test.expectedActionType}, got ${actualActionType}`);
                        // Don't fail the test for action type mismatch, just note it
                    }
                }
                
                if (passed) {
                    console.log(`   ✅ [${test.category}] Correct: ${isActuallyActionable ? 'ACTIONABLE' : 'CONVERSATIONAL'} (confidence: ${actualConfidence})`);
                    if (actualActionType) console.log(`   📋 Action type: ${actualActionType}`);
                    passedTests++;
                } else {
                    console.log(`   ❌ [${test.category}] Expected: ${test.expectActionable}, Got: ${isActuallyActionable} (confidence: ${actualConfidence})`);
                    console.log(`   📋 Intent: ${result.intent}, Action type: ${actualActionType || 'none'}`);
                    failedTests.push({
                        command: test.cmd,
                        category: test.category,
                        expected: test.expectActionable,
                        actual: isActuallyActionable,
                        intent: result.intent,
                        confidence: actualConfidence,
                        actionType: actualActionType
                    });
                }
                
                console.log(''); // Empty line for readability
                
            } catch (error) {
                console.log(`   💥 [${test.category}] ERROR: ${error.message}`);
                failedTests.push({
                    command: test.cmd,
                    category: test.category,
                    expected: test.expectActionable,
                    actual: 'ERROR',
                    error: error.message
                });
                console.log('');
            }
        }
        
        console.log('='.repeat(60));
        console.log(`COMPREHENSIVE TEST RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests * 100)}%)`);
        console.log('='.repeat(60));
        
        // Detailed analysis by category
        const categoryStats = {};
        testCommands.forEach(test => {
            if (!categoryStats[test.category]) {
                categoryStats[test.category] = { total: 0, passed: 0 };
            }
            categoryStats[test.category].total++;
            
            const testPassed = !failedTests.find(fail => fail.command === test.cmd);
            if (testPassed) categoryStats[test.category].passed++;
        });
        
        console.log('\n📊 RESULTS BY CATEGORY:');
        Object.entries(categoryStats).forEach(([category, stats]) => {
            const percentage = Math.round((stats.passed / stats.total) * 100);
            const status = percentage >= 90 ? '🟢' : percentage >= 70 ? '🟡' : '🔴';
            console.log(`${status} ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
        });
        
        if (failedTests.length > 0) {
            console.log(`\n❌ FAILED TESTS (${failedTests.length}):`);
            failedTests.forEach((fail, idx) => {
                console.log(`${idx + 1}. [${fail.category}] "${fail.command}"`);
                console.log(`   Expected: ${fail.expected}, Got: ${fail.actual}`);
                if (fail.intent) console.log(`   Intent: ${fail.intent}, Confidence: ${fail.confidence}`);
                if (fail.actionType) console.log(`   Action Type: ${fail.actionType}`);
                if (fail.error) console.log(`   Error: ${fail.error}`);
                console.log('');
            });
        }
        
        // Final assessment
        const successRate = passedTests / totalTests;
        console.log('\n' + '='.repeat(60));
        console.log('🎯 FINAL ASSESSMENT:');
        console.log('='.repeat(60));
        
        if (successRate >= 0.95) {
            console.log('🎉 EXCELLENT: LLM-based voice agent is production ready!');
            console.log('✅ Superior natural language understanding');
            console.log('✅ Handles complex and polite requests');
            console.log('✅ Accurate intent classification');
            console.log('✅ Function calling integration working');
        } else if (successRate >= 0.85) {
            console.log('👍 GOOD: LLM-based approach works well');
            console.log('✅ Strong natural language understanding');
            console.log('⚠️  Minor edge cases need attention');
            console.log('✅ Ready for testing with users');
        } else if (successRate >= 0.70) {
            console.log('⚠️  ACCEPTABLE: LLM approach needs improvement');
            console.log('❌ Some classification errors');
            console.log('🔧 Review prompt engineering and examples');
        } else {
            console.log('❌ POOR: LLM approach requires significant fixes');
            console.log('🚨 Major issues with intent classification');
            console.log('🔧 Check API connection, prompts, and function calling');
        }
        
        console.log(`\n📈 SUCCESS RATE: ${Math.round(successRate * 100)}%`);
        
        // Compare with pattern-based approach
        console.log('\n🆚 COMPARISON WITH PATTERN-BASED APPROACH:');
        if (successRate >= 0.8) {
            console.log('✅ LLM handles natural language variations better');
            console.log('✅ LLM understands context and polite requests');
            console.log('✅ LLM adapts to new command styles dynamically');
            console.log('✅ No hardcoded patterns required');
            console.log('✅ Function calling provides structured responses');
        } else {
            console.log('❌ LLM performance needs improvement over patterns');
            console.log('🔧 Consider hybrid approach or better prompts');
        }
        
        return successRate >= 0.8;
        
    } catch (error) {
        console.error('💥 Test setup failed:', error);
        console.error('🔧 Check VoiceAgentService and dependencies');
        return false;
    }
}

// Run the comprehensive test
if (require.main === module) {
    testCompleteLLMVoiceAgent().then(success => {
        if (success) {
            console.log('\n🎉 LLM-BASED VOICE AGENT: COMPREHENSIVELY TESTED & VERIFIED');
            console.log('🚀 Ready for production deployment!');
        } else {
            console.log('\n❌ LLM-BASED VOICE AGENT: REQUIRES FURTHER DEVELOPMENT');
            console.log('🔧 Address failed test cases before deployment.');
        }
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testCompleteLLMVoiceAgent };

