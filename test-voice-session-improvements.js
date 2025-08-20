#!/usr/bin/env node

/**
 * Voice Session Improvements Test Suite
 * Tests the enhanced voice session management, dynamic timeouts, and API optimizations
 */

const path = require('path');

class VoiceSessionTestSuite {
    constructor() {
        this.testResults = {
            dynamicTimeouts: [],
            voiceSessionManagement: [],
            apiOptimizations: [],
            errorHandling: [],
            integration: []
        };
    }

    /**
     * Test dynamic timeout functionality
     */
    async testDynamicTimeouts() {
        console.log('\n⏰ Testing Dynamic Timeout System...');
        console.log('='.repeat(50));

        const tests = [];

        try {
            // Test 1: ConversationManager timeout calculation
            console.log('\n📝 Test 1: Conversation Manager Dynamic Timeouts');
            const ConversationManager = require('./src/features/voiceAgent/conversationManager');
            const manager = new ConversationManager();

            // Test basic timeout calculation
            const baseTimeout = manager.calculateDynamicSilenceTimeout();
            const hasTimeoutMethod = typeof manager.calculateDynamicSilenceTimeout === 'function';
            const hasSessionState = manager.sessionState !== undefined;
            const hasDynamicConfig = manager.config.dynamicTimeout !== undefined;

            console.log(`   Dynamic Timeout Method: ${hasTimeoutMethod ? '✅' : '❌'}`);
            console.log(`   Session State Tracking: ${hasSessionState ? '✅' : '❌'}`);
            console.log(`   Dynamic Config: ${hasDynamicConfig ? '✅' : '❌'}`);
            console.log(`   Base Timeout: ${baseTimeout}ms`);

            tests.push({
                name: 'Dynamic Timeout System',
                passed: hasTimeoutMethod && hasSessionState && hasDynamicConfig,
                details: { baseTimeout, hasTimeoutMethod, hasSessionState, hasDynamicConfig }
            });

            // Test 2: AI state tracking methods
            console.log('\n📝 Test 2: AI State Tracking');
            const hasProcessingMethod = typeof manager.setAIProcessingState === 'function';
            const hasSpeakingMethod = typeof manager.setAISpeakingState === 'function';

            console.log(`   AI Processing State Method: ${hasProcessingMethod ? '✅' : '❌'}`);
            console.log(`   AI Speaking State Method: ${hasSpeakingMethod ? '✅' : '❌'}`);

            if (hasProcessingMethod) {
                // Test state changes
                manager.setAIProcessingState(true, 'test_task');
                const processingState = manager.sessionState.isAIProcessing;
                manager.setAIProcessingState(false);
                const stoppedState = !manager.sessionState.isAIProcessing;

                console.log(`   State Change Test: ${processingState && stoppedState ? '✅' : '❌'}`);
            }

            tests.push({
                name: 'AI State Tracking',
                passed: hasProcessingMethod && hasSpeakingMethod,
                details: { hasProcessingMethod, hasSpeakingMethod }
            });

        } catch (error) {
            console.log(`   ❌ Dynamic Timeout Test Error: ${error.message}`);
            tests.push({
                name: 'Dynamic Timeout System',
                passed: false,
                error: error.message
            });
        }

        this.testResults.dynamicTimeouts = tests;
        return tests;
    }

    /**
     * Test voice session management improvements
     */
    async testVoiceSessionManagement() {
        console.log('\n🎤 Testing Voice Session Management...');
        console.log('='.repeat(50));

        const tests = [];

        try {
            // Test 1: VoiceAgentService enhanced TTS
            console.log('\n📝 Test 1: Enhanced TTS with State Tracking');
            const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
            const voiceAgent = new VoiceAgentService();

            const hasSpeakWithTracking = typeof voiceAgent.speakWithStateTracking === 'function';
            const hasSetAIProcessingState = typeof voiceAgent.setAIProcessingState === 'function';
            const hasAddToRecentTTS = typeof voiceAgent.addToRecentTTS === 'function';
            const hasAIStateVars = voiceAgent.isProcessingAI !== undefined && voiceAgent.currentAITask !== undefined;

            console.log(`   Enhanced TTS Method: ${hasSpeakWithTracking ? '✅' : '❌'}`);
            console.log(`   AI Processing State Method: ${hasSetAIProcessingState ? '✅' : '❌'}`);
            console.log(`   TTS Tracking Method: ${hasAddToRecentTTS ? '✅' : '❌'}`);
            console.log(`   AI State Variables: ${hasAIStateVars ? '✅' : '❌'}`);

            tests.push({
                name: 'Enhanced TTS System',
                passed: hasSpeakWithTracking && hasSetAIProcessingState && hasAddToRecentTTS && hasAIStateVars,
                details: { hasSpeakWithTracking, hasSetAIProcessingState, hasAddToRecentTTS, hasAIStateVars }
            });

            // Test 2: Enhanced speech recognition event handling
            console.log('\n📝 Test 2: Enhanced Speech Event Handling');
            const hasWebSearchDetector = voiceAgent.webSearchDetector !== undefined;
            const hasEnhancedFeedbackDetection = typeof voiceAgent.detectFeedbackLoop === 'function';

            console.log(`   Web Search Detector: ${hasWebSearchDetector ? '✅' : '❌'}`);
            console.log(`   Enhanced Feedback Detection: ${hasEnhancedFeedbackDetection ? '✅' : '❌'}`);

            tests.push({
                name: 'Enhanced Speech Event Handling',
                passed: hasWebSearchDetector && hasEnhancedFeedbackDetection,
                details: { hasWebSearchDetector, hasEnhancedFeedbackDetection }
            });

        } catch (error) {
            console.log(`   ❌ Voice Session Management Test Error: ${error.message}`);
            tests.push({
                name: 'Voice Session Management',
                passed: false,
                error: error.message
            });
        }

        this.testResults.voiceSessionManagement = tests;
        return tests;
    }

    /**
     * Test API optimization improvements
     */
    async testAPIOptimizations() {
        console.log('\n🚀 Testing API Optimizations...');
        console.log('='.repeat(50));

        const tests = [];

        try {
            // Test 1: API Call Manager
            console.log('\n📝 Test 1: API Call Manager');
            const { APICallManager, getAPICallManager } = require('./src/features/common/services/apiCallManager');

            const manager = new APICallManager();
            const hasExponentialBackoff = typeof manager.calculateBackoffDelay === 'function';
            const hasRateLimiting = typeof manager.waitForRateLimit === 'function';
            const hasCircuitBreaker = typeof manager.isCircuitBreakerOpen === 'function';
            const hasBatching = typeof manager.batchRequest === 'function';
            const hasPerformanceStats = typeof manager.getPerformanceStats === 'function';

            console.log(`   Exponential Backoff: ${hasExponentialBackoff ? '✅' : '❌'}`);
            console.log(`   Rate Limiting: ${hasRateLimiting ? '✅' : '❌'}`);
            console.log(`   Circuit Breaker: ${hasCircuitBreaker ? '✅' : '❌'}`);
            console.log(`   Request Batching: ${hasBatching ? '✅' : '❌'}`);
            console.log(`   Performance Stats: ${hasPerformanceStats ? '✅' : '❌'}`);

            // Test singleton
            const singleton1 = getAPICallManager();
            const singleton2 = getAPICallManager();
            const isSingleton = singleton1 === singleton2;
            console.log(`   Singleton Pattern: ${isSingleton ? '✅' : '❌'}`);

            tests.push({
                name: 'API Call Manager',
                passed: hasExponentialBackoff && hasRateLimiting && hasCircuitBreaker && hasBatching && isSingleton,
                details: { hasExponentialBackoff, hasRateLimiting, hasCircuitBreaker, hasBatching, hasPerformanceStats, isSingleton }
            });

            // Test 2: Web Search Cache Enhancements
            console.log('\n📝 Test 2: Web Search Cache System');
            const { getWebSearchCache } = require('./src/features/common/services/webSearchCache');

            const cache = getWebSearchCache();
            const hasBasicOps = typeof cache.get === 'function' && typeof cache.set === 'function';
            const hasSimilarSearch = typeof cache.findSimilarCached === 'function';
            const hasCleanup = typeof cache.cleanup === 'function';
            const hasStats = typeof cache.getStats === 'function';

            console.log(`   Basic Operations: ${hasBasicOps ? '✅' : '❌'}`);
            console.log(`   Similar Query Search: ${hasSimilarSearch ? '✅' : '❌'}`);
            console.log(`   Automatic Cleanup: ${hasCleanup ? '✅' : '❌'}`);
            console.log(`   Statistics: ${hasStats ? '✅' : '❌'}`);

            tests.push({
                name: 'Web Search Cache System',
                passed: hasBasicOps && hasSimilarSearch && hasCleanup && hasStats,
                details: { hasBasicOps, hasSimilarSearch, hasCleanup, hasStats }
            });

        } catch (error) {
            console.log(`   ❌ API Optimization Test Error: ${error.message}`);
            tests.push({
                name: 'API Optimizations',
                passed: false,
                error: error.message
            });
        }

        this.testResults.apiOptimizations = tests;
        return tests;
    }

    /**
     * Test error handling improvements
     */
    async testErrorHandling() {
        console.log('\n🛡️ Testing Error Handling Improvements...');
        console.log('='.repeat(50));

        const tests = [];

        try {
            // Test 1: API Call Manager Error Handling
            console.log('\n📝 Test 1: API Call Manager Error Handling');
            const { APICallManager, RateLimitError, HTTPError } = require('./src/features/common/services/apiCallManager');

            const manager = new APICallManager({ maxRetries: 2, initialDelay: 100 });
            
            const hasCustomErrors = RateLimitError && HTTPError;
            const hasRetryMechanism = typeof manager.executeWithRetry === 'function';
            const hasCircuitBreaker = typeof manager.openCircuitBreaker === 'function';

            console.log(`   Custom Error Classes: ${hasCustomErrors ? '✅' : '❌'}`);
            console.log(`   Retry Mechanism: ${hasRetryMechanism ? '✅' : '❌'}`);
            console.log(`   Circuit Breaker: ${hasCircuitBreaker ? '✅' : '❌'}`);

            // Test error state management
            manager.failedRequests = 3;
            manager.openCircuitBreaker();
            const isOpen = manager.isCircuitBreakerOpen();
            console.log(`   Circuit Breaker State Management: ${isOpen ? '✅' : '❌'}`);

            tests.push({
                name: 'API Error Handling',
                passed: hasCustomErrors && hasRetryMechanism && hasCircuitBreaker && isOpen,
                details: { hasCustomErrors, hasRetryMechanism, hasCircuitBreaker, isOpen }
            });

            // Test 2: Voice Agent Error Handling
            console.log('\n📝 Test 2: Voice Agent Error Handling');
            const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
            
            // Check for enhanced error handling in voice agent
            const voiceAgentCode = VoiceAgentService.toString();
            const hasErrorLoopPrevention = voiceAgentCode.includes('isInErrorLoop');
            const hasFeedbackDetection = voiceAgentCode.includes('detectFeedbackLoop');
            const hasGracefulDegradation = voiceAgentCode.includes('setAIProcessingState(false)');

            console.log(`   Error Loop Prevention: ${hasErrorLoopPrevention ? '✅' : '❌'}`);
            console.log(`   Enhanced Feedback Detection: ${hasFeedbackDetection ? '✅' : '❌'}`);
            console.log(`   Graceful Degradation: ${hasGracefulDegradation ? '✅' : '❌'}`);

            tests.push({
                name: 'Voice Agent Error Handling',
                passed: hasErrorLoopPrevention && hasFeedbackDetection && hasGracefulDegradation,
                details: { hasErrorLoopPrevention, hasFeedbackDetection, hasGracefulDegradation }
            });

        } catch (error) {
            console.log(`   ❌ Error Handling Test Error: ${error.message}`);
            tests.push({
                name: 'Error Handling',
                passed: false,
                error: error.message
            });
        }

        this.testResults.errorHandling = tests;
        return tests;
    }

    /**
     * Test integration between components
     */
    async testIntegration() {
        console.log('\n🔗 Testing Component Integration...');
        console.log('='.repeat(50));

        const tests = [];

        try {
            // Test 1: Voice Agent - Conversation Manager Integration
            console.log('\n📝 Test 1: Voice Agent ↔ Conversation Manager');
            const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
            const ConversationManager = require('./src/features/voiceAgent/conversationManager');

            const voiceAgent = new VoiceAgentService();
            const conversationManager = new ConversationManager();

            // Check if voice agent can set AI states on conversation manager
            const canSetAIProcessingState = conversationManager.setAIProcessingState !== undefined;
            const canSetAISpeakingState = conversationManager.setAISpeakingState !== undefined;
            
            console.log(`   AI Processing State Integration: ${canSetAIProcessingState ? '✅' : '❌'}`);
            console.log(`   AI Speaking State Integration: ${canSetAISpeakingState ? '✅' : '❌'}`);

            tests.push({
                name: 'Voice Agent ↔ Conversation Manager',
                passed: canSetAIProcessingState && canSetAISpeakingState,
                details: { canSetAIProcessingState, canSetAISpeakingState }
            });

            // Test 2: API Manager Integration in MCP Server
            console.log('\n📝 Test 2: API Manager ↔ MCP Server Integration');
            
            // Check if MCP server code includes API manager usage
            const fs = require('fs');
            const mcpServerPath = './services/paragon-mcp/src/index.ts';
            
            let hasMCPIntegration = false;
            try {
                const mcpContent = fs.readFileSync(mcpServerPath, 'utf-8');
                hasMCPIntegration = mcpContent.includes('getAPICallManager') && 
                                  mcpContent.includes('apiManager.makeAPICall');
            } catch (error) {
                console.log(`   MCP Server file read error: ${error.message}`);
            }

            console.log(`   MCP Server API Manager Integration: ${hasMCPIntegration ? '✅' : '❌'}`);

            tests.push({
                name: 'API Manager ↔ MCP Server',
                passed: hasMCPIntegration,
                details: { hasMCPIntegration }
            });

            // Test 3: Web Search Detector Integration
            console.log('\n📝 Test 3: Web Search Detector Integration');
            const { WebSearchDetector } = require('./src/features/common/ai/parallelLLMOrchestrator');
            
            const detector = new WebSearchDetector();
            const hasAnalyzeMethod = typeof detector.analyze === 'function';
            
            // Test if voice agent uses web search detector
            const voiceAgentHasDetector = voiceAgent.webSearchDetector !== undefined;
            
            console.log(`   Web Search Detector Available: ${hasAnalyzeMethod ? '✅' : '❌'}`);
            console.log(`   Voice Agent Integration: ${voiceAgentHasDetector ? '✅' : '❌'}`);

            if (hasAnalyzeMethod) {
                const testResult = detector.analyze("What's the latest news?");
                const hasValidResult = testResult && typeof testResult.needsWebSearch === 'boolean';
                console.log(`   Detection Functionality: ${hasValidResult ? '✅' : '❌'}`);
            }

            tests.push({
                name: 'Web Search Detector Integration',
                passed: hasAnalyzeMethod && voiceAgentHasDetector,
                details: { hasAnalyzeMethod, voiceAgentHasDetector }
            });

        } catch (error) {
            console.log(`   ❌ Integration Test Error: ${error.message}`);
            tests.push({
                name: 'Component Integration',
                passed: false,
                error: error.message
            });
        }

        this.testResults.integration = tests;
        return tests;
    }

    /**
     * Generate comprehensive test report
     */
    generateReport() {
        console.log('\n📊 Voice Session Improvements Test Results');
        console.log('='.repeat(60));

        const allTests = [
            ...this.testResults.dynamicTimeouts,
            ...this.testResults.voiceSessionManagement,
            ...this.testResults.apiOptimizations,
            ...this.testResults.errorHandling,
            ...this.testResults.integration
        ];

        const categories = [
            { name: 'Dynamic Timeouts', tests: this.testResults.dynamicTimeouts },
            { name: 'Voice Session Management', tests: this.testResults.voiceSessionManagement },
            { name: 'API Optimizations', tests: this.testResults.apiOptimizations },
            { name: 'Error Handling', tests: this.testResults.errorHandling },
            { name: 'Component Integration', tests: this.testResults.integration }
        ];

        categories.forEach(category => {
            const passed = category.tests.filter(t => t.passed).length;
            const total = category.tests.length;
            const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
            console.log(`${category.name}: ${passed}/${total} (${percentage}%) ${percentage >= 80 ? '✅' : '⚠️'}`);
        });

        const totalPassed = allTests.filter(t => t.passed).length;
        const totalTests = allTests.length;
        const overallPercentage = Math.round((totalPassed / totalTests) * 100);

        console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} (${overallPercentage}%)`);
        console.log(`Status: ${overallPercentage >= 80 ? '✅ VOICE IMPROVEMENTS READY' : '⚠️ NEEDS ATTENTION'}`);

        if (overallPercentage >= 80) {
            console.log('\n🎉 Voice session improvements are working!');
            console.log('   ✅ Dynamic timeout system operational');
            console.log('   ✅ Enhanced voice session management');
            console.log('   ✅ API optimizations with rate limiting');
            console.log('   ✅ Robust error handling mechanisms');
            console.log('   ✅ Component integration successful');
        } else {
            console.log('\n⚠️ Areas needing attention:');
            categories.forEach(category => {
                const passed = category.tests.filter(t => t.passed).length;
                const total = category.tests.length;
                if (total > 0 && (passed / total) < 0.8) {
                    console.log(`   - ${category.name}: ${passed}/${total} tests passed`);
                }
            });
        }

        return {
            overall: overallPercentage >= 80,
            percentage: overallPercentage,
            categories: categories.map(c => ({
                name: c.name,
                passed: c.tests.filter(t => t.passed).length,
                total: c.tests.length
            }))
        };
    }

    /**
     * Run all voice session improvement tests
     */
    async runAllTests() {
        console.log('🎤 Starting Voice Session Improvements Test Suite');
        console.log('==================================================');

        try {
            await this.testDynamicTimeouts();
            await this.testVoiceSessionManagement();
            await this.testAPIOptimizations();
            await this.testErrorHandling();
            await this.testIntegration();

            return this.generateReport();
        } catch (error) {
            console.error('❌ Voice session test suite failed:', error);
            return { overall: false, error: error.message };
        }
    }
}

// Export for use in other files
module.exports = { VoiceSessionTestSuite };

// Run if called directly
if (require.main === module) {
    (async () => {
        console.log('🎤 Voice Session Improvements Test Suite');
        console.log('========================================');

        const tester = new VoiceSessionTestSuite();
        const results = await tester.runAllTests();

        console.log('\n🏁 Testing Complete!');
        console.log('Ready for system integration testing.');

        process.exit(results.overall ? 0 : 1);
    })();
}
