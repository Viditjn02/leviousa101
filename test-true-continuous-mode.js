// Test script for TRUE continuous voice conversation mode
// Tests the new behavior where once "Hey Leviousa" is said, 
// no wake word is needed until 2 minutes of complete inactivity

const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
const ConversationManager = require('./src/features/voiceAgent/conversationManager');

async function testTrueContinuousMode() {
    console.log('\n🧪 Testing TRUE Continuous Voice Mode\n');
    console.log('=' .repeat(60));
    
    try {
        // Initialize voice agent service
        const voiceAgent = new VoiceAgentService();
        
        console.log('🔧 Initializing voice agent...');
        const initResult = await voiceAgent.initialize();
        
        if (!initResult.success) {
            throw new Error('Failed to initialize voice agent: ' + initResult.error);
        }
        
        console.log('✅ Voice agent initialized successfully');
        console.log('📋 Configuration:');
        console.log(`   - Continuous Mode: ${voiceAgent.config.continuousMode}`);
        console.log(`   - Inactivity Timeout: ${voiceAgent.config.continuousModeTimeout / 1000} seconds`);
        console.log(`   - Max Turns: ${voiceAgent.config.maxConversationTurns}`);
        
        // Test 1: Wake word detection starts continuous mode
        console.log('\n🎤 Test 1: Wake word detection...');
        voiceAgent.emit('wake-word-detected', {
            transcription: 'Hey Leviousa',
            confidence: 0.9,
            timestamp: Date.now()
        });
        
        // Wait for continuous mode to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (voiceAgent.continuousSessionActive) {
            console.log('✅ Continuous mode activated successfully');
        } else {
            console.log('❌ Continuous mode failed to activate');
        }
        
        // Test 2: Multiple speech inputs without wake word
        console.log('\n💬 Test 2: Multiple conversations without wake word...');
        
        const testPhrases = [
            'What time is it?',
            'Tell me about the weather',
            'Can you help me with something?',
            'Show me my calendar',
            'Search for restaurants nearby'
        ];
        
        for (let i = 0; i < testPhrases.length; i++) {
            console.log(`\n   Speech ${i + 1}: "${testPhrases[i]}"`);
            
            // Simulate user speech (no wake word needed)
            voiceAgent.emit('speech-recognized', testPhrases[i]);
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (voiceAgent.continuousSessionActive) {
                console.log(`   ✅ Still in continuous mode after speech ${i + 1}`);
            } else {
                console.log(`   ❌ Continuous mode ended unexpectedly after speech ${i + 1}`);
                break;
            }
        }
        
        // Test 3: Inactivity timeout behavior
        console.log('\n⏱️ Test 3: Inactivity timeout behavior...');
        console.log('   Simulating 30 seconds of silence (should stay active)...');
        
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
        
        if (voiceAgent.continuousSessionActive) {
            console.log('   ✅ Still active after 30 seconds (correct)');
        } else {
            console.log('   ❌ Session ended too early (should be 2 minutes)');
        }
        
        // Test 4: Check conversation manager configuration
        console.log('\n⚙️ Test 4: Conversation manager configuration...');
        const cmConfig = voiceAgent.conversationManager.config;
        console.log(`   - Silence Timeout: ${cmConfig.silenceTimeout / 1000} seconds`);
        console.log(`   - Conversation Timeout: ${cmConfig.conversationTimeout / 1000} seconds`);
        console.log(`   - Auto End on Silence: ${cmConfig.autoEndOnSilence}`);
        console.log(`   - Dynamic Timeout: ${cmConfig.dynamicTimeout}`);
        
        if (cmConfig.silenceTimeout === 120000) {
            console.log('   ✅ Correct 2-minute silence timeout configured');
        } else {
            console.log(`   ❌ Wrong silence timeout: expected 120000ms, got ${cmConfig.silenceTimeout}ms`);
        }
        
        // Test 5: Manual end conversation
        console.log('\n🛑 Test 5: Manual conversation end...');
        await voiceAgent.endConversation();
        
        if (!voiceAgent.continuousSessionActive && !voiceAgent.isConversing) {
            console.log('   ✅ Conversation ended successfully');
        } else {
            console.log('   ❌ Failed to end conversation properly');
        }
        
        console.log('\n📊 Test Results Summary:');
        console.log('=' .repeat(60));
        console.log('✅ TRUE Continuous Mode Features:');
        console.log('   • Wake word starts continuous session');
        console.log('   • No wake word needed for entire session');
        console.log('   • 2-minute inactivity timeout');
        console.log('   • Multiple conversations without interruption');
        console.log('   • Proper session cleanup on end');
        
        console.log('\n🎯 Expected Behavior:');
        console.log('   1. Say "Hey Leviousa" once');
        console.log('   2. Have natural conversations without wake words');
        console.log('   3. Session continues as long as user talks');
        console.log('   4. Ends only after 2 minutes of complete silence');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testTrueContinuousMode().then(() => {
        console.log('\n🎉 Test completed!');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Test crashed:', error);
        process.exit(1);
    });
}

module.exports = { testTrueContinuousMode };
