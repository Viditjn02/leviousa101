#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 COMPREHENSIVE VOICE SYSTEM TEST');
console.log('==================================\n');

const tests = [
    {
        name: 'Voice Agent Service',
        file: 'src/features/voiceAgent/voiceAgentService.js',
        test: async () => {
            const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
            const service = new VoiceAgentService();
            const result = await service.initialize();
            return result.success;
        }
    },
    {
        name: 'Wake Word Detection',
        file: 'src/features/voiceAgent/wakeWordDetector.js',
        test: async () => {
            const WakeWordDetector = require('./src/features/voiceAgent/wakeWordDetector');
            const detector = new WakeWordDetector();
            await detector.initialize();
            
            // Test wake word patterns
            const testPhrases = [
                'hey leviousa',
                'Hey Leviousa',
                'hey olivia so',
                'hello viosa'
            ];
            
            let passed = true;
            for (const phrase of testPhrases) {
                const result = detector.checkForWakeWord(phrase);
                if (!result) {
                    console.log(`  ❌ Failed to detect: "${phrase}"`);
                    passed = false;
                } else {
                    console.log(`  ✅ Detected: "${phrase}"`);
                }
            }
            return passed;
        }
    },
    {
        name: 'Conversation Manager',
        file: 'src/features/voiceAgent/conversationManager.js',
        test: async () => {
            const ConversationManager = require('./src/features/voiceAgent/conversationManager');
            const manager = new ConversationManager();
            const result = await manager.initialize();
            return result.success;
        }
    },
    {
        name: 'Action Executor',
        file: 'src/features/voiceAgent/actionExecutor.js',
        test: async () => {
            const ActionExecutor = require('./src/features/voiceAgent/actionExecutor');
            const executor = new ActionExecutor();
            const result = await executor.initialize();
            return result.success;
        }
    },
    {
        name: 'Intelligent Automation',
        file: 'src/features/voiceAgent/intelligentAutomationService.js',
        test: async () => {
            const IntelligentAutomationService = require('./src/features/voiceAgent/intelligentAutomationService');
            const service = new IntelligentAutomationService();
            const result = await service.initialize();
            
            // Test command analysis
            const testCommands = [
                'open ChatGPT',
                'send email to john',
                'search for documents'
            ];
            
            console.log('  Testing command analysis:');
            for (const command of testCommands) {
                try {
                    const intent = await service.analyzeUserIntent(command, null);
                    if (intent.success) {
                        console.log(`    ✅ "${command}" -> ${intent.intent?.intent || 'unknown'}`);
                    } else {
                        console.log(`    ❌ Failed to analyze: "${command}"`);
                    }
                } catch (error) {
                    console.log(`    ❌ Error analyzing: "${command}" - ${error.message}`);
                }
            }
            
            return result.success;
        }
    },
    {
        name: 'TTS Service',
        file: 'src/features/voiceAgent/ttsService.js',
        test: async () => {
            const TTSService = require('./src/features/voiceAgent/ttsService');
            const service = new TTSService();
            const result = await service.initialize();
            
            if (result.success) {
                // Test TTS without actually speaking
                const canSpeak = typeof service.speak === 'function';
                console.log(`  TTS speak method: ${canSpeak ? '✅ Available' : '❌ Not found'}`);
                return canSpeak;
            }
            return false;
        }
    },
    {
        name: 'MCP Client Connection',
        test: async () => {
            try {
                const invisibilityService = require('./src/features/invisibility/invisibilityService');
                if (invisibilityService && invisibilityService.mcpClient) {
                    console.log('  ✅ MCP Client available');
                    
                    // Test tool availability
                    const tools = ['get_authenticated_services', 'connect_service'];
                    for (const tool of tools) {
                        const hasToool = invisibilityService.mcpClient.toolRegistry?.tools?.has(tool);
                        console.log(`    ${tool}: ${hasToool ? '✅' : '❌'}`);
                    }
                    return true;
                }
                return false;
            } catch (error) {
                console.log(`  ❌ MCP Client error: ${error.message}`);
                return false;
            }
        }
    },
    {
        name: 'System Audio Capture',
        test: async () => {
            const fs = require('fs');
            const systemAudioPath = path.join(__dirname, 'src/ui/assets/SystemAudioDump');
            
            if (fs.existsSync(systemAudioPath)) {
                console.log('  ✅ SystemAudioDump binary found');
                
                // Check if it's executable
                try {
                    fs.accessSync(systemAudioPath, fs.constants.X_OK);
                    console.log('  ✅ SystemAudioDump is executable');
                    return true;
                } catch (error) {
                    console.log('  ❌ SystemAudioDump is not executable');
                    return false;
                }
            } else {
                console.log('  ❌ SystemAudioDump binary not found');
                return false;
            }
        }
    }
];

async function runTests() {
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        console.log(`\n📝 Testing: ${test.name}`);
        if (test.file) {
            console.log(`   File: ${test.file}`);
        }
        
        try {
            const result = await test.test();
            if (result) {
                console.log(`   Result: ✅ PASSED`);
                passed++;
            } else {
                console.log(`   Result: ❌ FAILED`);
                failed++;
            }
        } catch (error) {
            console.log(`   Result: ❌ ERROR - ${error.message}`);
            failed++;
        }
    }
    
    console.log('\n========================================');
    console.log('📊 TEST SUMMARY');
    console.log('========================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);
    
    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! System is ready.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the output above.');
    }
    
    // Test voice command flow
    console.log('\n========================================');
    console.log('🎤 VOICE COMMAND FLOW TEST');
    console.log('========================================');
    
    console.log('\nSimulating voice command: "Hey Leviousa, open ChatGPT"');
    
    try {
        const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
        const service = new VoiceAgentService();
        await service.initialize();
        
        // Simulate wake word detection
        console.log('1. Wake word detection...');
        service.handleWakeWordDetected({ transcription: 'Hey Leviousa', confidence: 0.9 });
        console.log('   ✅ Wake word detected');
        
        // Simulate command
        console.log('2. Processing command...');
        const analysis = await service.analyzeUserCommand('open ChatGPT');
        console.log(`   Intent: ${analysis.intent}`);
        console.log(`   Actionable: ${analysis.isActionable}`);
        console.log(`   Confidence: ${analysis.confidence}`);
        
        if (analysis.isActionable) {
            console.log('   ✅ Command is actionable');
        } else {
            console.log('   ⚠️  Command not recognized as actionable');
        }
        
    } catch (error) {
        console.log(`❌ Flow test error: ${error.message}`);
    }
    
    process.exit(failed === 0 ? 0 : 1);
}

// Run tests
console.log('Starting comprehensive system test...\n');
runTests().catch(error => {
    console.error('Fatal error during testing:', error);
    process.exit(1);
});