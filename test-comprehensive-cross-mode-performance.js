/**
 * Comprehensive Cross-Mode Performance Test
 * Tests ultra-fast performance (<100ms) across ALL system modes:
 * - Ask mode
 * - Voice Agent ("Hey Leviousa") 
 * - Listen mode
 * - AnswerService (used by all modes)
 * - Web search optimization
 * - LLM streaming optimization
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class CrossModePerformanceTest {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
        this.performanceTargets = {
            instantResponse: 10,    // <10ms for instant responses
            ultraFast: 100,        // <100ms for ultra-fast responses  
            fast: 500,             // <500ms for fast responses
            acceptable: 1000,      // <1000ms for acceptable responses
        };
    }

    async runComprehensiveTests() {
        console.log('🚀 COMPREHENSIVE CROSS-MODE PERFORMANCE TEST');
        console.log('Testing ultra-fast performance across ALL system modes\n');
        
        try {
            // Test 1: Ask Mode Performance
            await this.testAskModePerformance();
            
            // Test 2: Voice Agent Performance  
            await this.testVoiceAgentPerformance();
            
            // Test 3: Listen Mode Performance
            await this.testListenModePerformance();
            
            // Test 4: AnswerService Performance (Cross-Mode)
            await this.testAnswerServicePerformance();
            
            // Test 5: Web Search Performance (Cross-Mode)
            await this.testWebSearchPerformance();
            
            // Test 6: Ultra-Fast Streaming Performance
            await this.testUltraFastStreamingPerformance();
            
            // Test 7: Real LinkedIn Query Performance (The Original Issue)
            await this.testRealLinkedInQueryPerformance();
            
            // Test 8: Load Testing - Multiple Concurrent Requests
            await this.testConcurrentRequestsPerformance();
            
            // Generate comprehensive report
            await this.generatePerformanceReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        }
    }
    
    /**
     * Test Ask Mode with optimizations
     */
    async testAskModePerformance() {
        console.log('🧪 Test 1: Ask Mode Performance');
        const startTime = Date.now();
        
        try {
            // Import AskService
            const AskService = require('./src/features/ask/askService');
            const askService = new AskService();
            
            // Test cases for Ask mode
            const testCases = [
                { query: 'hello', expectedTime: this.performanceTargets.instantResponse },
                { query: 'what time is it', expectedTime: this.performanceTargets.instantResponse },
                { query: 'help me with email', expectedTime: this.performanceTargets.ultraFast },
                { query: 'search for latest AI news', expectedTime: this.performanceTargets.ultraFast },
                { query: 'pullup elon musk from linkedin', expectedTime: this.performanceTargets.ultraFast }
            ];
            
            let passedTests = 0;
            const results = [];
            
            for (const testCase of testCases) {
                const testStart = Date.now();
                
                try {
                    // Test Ultra-Fast Streaming Service integration
                    const { getUltraFastStreamingService } = require('./src/features/common/services/ultraFastStreamingService');
                    const ultraFastStreamer = getUltraFastStreamingService();
                    
                    const response = await ultraFastStreamer.streamResponse(testCase.query, {
                        mode: 'ask',
                        provider: 'anthropic',
                        model: 'claude-3-5-haiku-20241022'
                    });
                    
                    const responseTime = Date.now() - testStart;
                    const passed = responseTime <= testCase.expectedTime;
                    
                    if (passed) passedTests++;
                    
                    results.push({
                        query: testCase.query,
                        responseTime,
                        target: testCase.expectedTime,
                        passed,
                        performance: this.getPerformanceRating(responseTime)
                    });
                    
                    console.log(`  📝 "${testCase.query}": ${responseTime}ms (target: <${testCase.expectedTime}ms) ${passed ? '✅' : '❌'}`);
                    
                } catch (error) {
                    console.log(`  ❌ "${testCase.query}": Failed - ${error.message}`);
                    results.push({
                        query: testCase.query,
                        error: error.message,
                        passed: false
                    });
                }
            }
            
            const duration = Date.now() - startTime;
            this.testResults.push({
                test: 'Ask Mode Performance',
                passed: passedTests >= testCases.length * 0.8,
                details: {
                    passedTests: `${passedTests}/${testCases.length}`,
                    results
                },
                duration
            });
            
            console.log(`  📊 Ask Mode: ${passedTests}/${testCases.length} tests passed\n`);
            
        } catch (error) {
            console.error('  ❌ Ask Mode test failed:', error.message);
            this.testResults.push({
                test: 'Ask Mode Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Test Voice Agent Performance 
     */
    async testVoiceAgentPerformance() {
        console.log('🧪 Test 2: Voice Agent ("Hey Leviousa") Performance');
        const startTime = Date.now();
        
        try {
            // Import VoiceAgentService
            const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
            const voiceService = new VoiceAgentService({});
            
            const testCases = [
                { command: 'hello leviousa', expectedTime: this.performanceTargets.instantResponse },
                { command: 'send an email', expectedTime: this.performanceTargets.ultraFast },
                { command: 'search for something', expectedTime: this.performanceTargets.ultraFast },
                { command: 'what can you do', expectedTime: this.performanceTargets.instantResponse }
            ];
            
            let passedTests = 0;
            const results = [];
            
            for (const testCase of testCases) {
                const testStart = Date.now();
                
                try {
                    // Test ultra-fast voice command analysis
                    const analysis = await voiceService.analyzeUserCommand(testCase.command);
                    const responseTime = Date.now() - testStart;
                    const passed = responseTime <= testCase.expectedTime;
                    
                    if (passed) passedTests++;
                    
                    results.push({
                        command: testCase.command,
                        responseTime,
                        target: testCase.expectedTime,
                        passed,
                        intent: analysis.intent,
                        performance: this.getPerformanceRating(responseTime)
                    });
                    
                    console.log(`  🎤 "${testCase.command}": ${responseTime}ms (target: <${testCase.expectedTime}ms) ${passed ? '✅' : '❌'}`);
                    
                } catch (error) {
                    console.log(`  ❌ "${testCase.command}": Failed - ${error.message}`);
                    results.push({
                        command: testCase.command,
                        error: error.message,
                        passed: false
                    });
                }
            }
            
            const duration = Date.now() - startTime;
            this.testResults.push({
                test: 'Voice Agent Performance',
                passed: passedTests >= testCases.length * 0.8,
                details: {
                    passedTests: `${passedTests}/${testCases.length}`,
                    results
                },
                duration
            });
            
            console.log(`  📊 Voice Agent: ${passedTests}/${testCases.length} tests passed\n`);
            
        } catch (error) {
            console.error('  ❌ Voice Agent test failed:', error.message);
            this.testResults.push({
                test: 'Voice Agent Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Test Listen Mode Performance
     */
    async testListenModePerformance() {
        console.log('🧪 Test 3: Listen Mode Performance');
        const startTime = Date.now();
        
        try {
            // Import SummaryService (Listen Mode)
            const SummaryService = require('./src/features/listen/summary/summaryService');
            const summaryService = new SummaryService();
            
            const testCases = [
                { 
                    conversation: ['Hello, how are you?', 'I need help with email'], 
                    expectedTime: this.performanceTargets.ultraFast 
                },
                { 
                    conversation: ['What is the weather today?', 'Any news updates?'], 
                    expectedTime: this.performanceTargets.ultraFast 
                }
            ];
            
            let passedTests = 0;
            const results = [];
            
            for (const testCase of testCases) {
                const testStart = Date.now();
                
                try {
                    // Test listen mode with web search enhancement
                    const suggestions = await summaryService.makeOutlineAndRequests(testCase.conversation);
                    const responseTime = Date.now() - testStart;
                    const passed = responseTime <= testCase.expectedTime;
                    
                    if (passed) passedTests++;
                    
                    results.push({
                        conversationLength: testCase.conversation.length,
                        responseTime,
                        target: testCase.expectedTime,
                        passed,
                        suggestionsCount: suggestions ? suggestions.length : 0,
                        performance: this.getPerformanceRating(responseTime)
                    });
                    
                    console.log(`  👂 Conversation (${testCase.conversation.length} turns): ${responseTime}ms (target: <${testCase.expectedTime}ms) ${passed ? '✅' : '❌'}`);
                    
                } catch (error) {
                    console.log(`  ❌ Listen test failed: ${error.message}`);
                    results.push({
                        conversationLength: testCase.conversation.length,
                        error: error.message,
                        passed: false
                    });
                }
            }
            
            const duration = Date.now() - startTime;
            this.testResults.push({
                test: 'Listen Mode Performance',
                passed: passedTests >= testCases.length * 0.8,
                details: {
                    passedTests: `${passedTests}/${testCases.length}`,
                    results
                },
                duration
            });
            
            console.log(`  📊 Listen Mode: ${passedTests}/${testCases.length} tests passed\n`);
            
        } catch (error) {
            console.error('  ❌ Listen Mode test failed:', error.message);
            this.testResults.push({
                test: 'Listen Mode Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Test AnswerService Performance (used across all modes)
     */
    async testAnswerServicePerformance() {
        console.log('🧪 Test 4: AnswerService Performance (Cross-Mode)');
        const startTime = Date.now();
        
        try {
            const AnswerService = require('./src/features/invisibility/services/AnswerService');
            const answerService = new AnswerService();
            
            const testCases = [
                { question: 'hello', mode: 'ask', expectedTime: this.performanceTargets.instantResponse },
                { question: 'help with email', mode: 'voice', expectedTime: this.performanceTargets.ultraFast },
                { question: 'what is AI', mode: 'ask', expectedTime: this.performanceTargets.ultraFast },
                { question: 'current news', mode: 'listen', expectedTime: this.performanceTargets.ultraFast }
            ];
            
            let passedTests = 0;
            const results = [];
            
            for (const testCase of testCases) {
                const testStart = Date.now();
                
                try {
                    const response = await answerService.getAnswer(testCase.question, {
                        mode: testCase.mode,
                        mockMode: true // Use optimized mock mode for testing
                    });
                    
                    const responseTime = Date.now() - testStart;
                    const passed = responseTime <= testCase.expectedTime;
                    
                    if (passed) passedTests++;
                    
                    results.push({
                        question: testCase.question,
                        mode: testCase.mode,
                        responseTime,
                        target: testCase.expectedTime,
                        passed,
                        hasAnswer: !!response.answer,
                        performance: this.getPerformanceRating(responseTime)
                    });
                    
                    console.log(`  🧠 "${testCase.question}" (${testCase.mode}): ${responseTime}ms (target: <${testCase.expectedTime}ms) ${passed ? '✅' : '❌'}`);
                    
                } catch (error) {
                    console.log(`  ❌ "${testCase.question}": Failed - ${error.message}`);
                    results.push({
                        question: testCase.question,
                        error: error.message,
                        passed: false
                    });
                }
            }
            
            const duration = Date.now() - startTime;
            this.testResults.push({
                test: 'AnswerService Performance',
                passed: passedTests >= testCases.length * 0.8,
                details: {
                    passedTests: `${passedTests}/${testCases.length}`,
                    results
                },
                duration
            });
            
            console.log(`  📊 AnswerService: ${passedTests}/${testCases.length} tests passed\n`);
            
        } catch (error) {
            console.error('  ❌ AnswerService test failed:', error.message);
            this.testResults.push({
                test: 'AnswerService Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Test Web Search Performance (used across all modes)
     */
    async testWebSearchPerformance() {
        console.log('🧪 Test 5: Web Search Performance (Cross-Mode)');
        const startTime = Date.now();
        
        try {
            const { getWebSearchCache } = require('./src/features/common/services/webSearchCache');
            const cache = getWebSearchCache();
            
            const testQueries = [
                'elon musk news',
                'AI developments',
                'current weather',
                'stock market today'
            ];
            
            let passedTests = 0;
            const results = [];
            
            // Test cache performance
            for (const query of testQueries) {
                const testStart = Date.now();
                
                // First call - should miss cache but populate it
                const result1 = cache.get(query, 'general', '');
                const firstCallTime = Date.now() - testStart;
                
                // Simulate caching a result
                cache.set(query, 'general', '', { 
                    success: true, 
                    results: `Cached result for ${query}`,
                    timestamp: new Date().toISOString()
                });
                
                // Second call - should hit cache
                const cacheStart = Date.now();
                const result2 = cache.get(query, 'general', '');
                const cacheTime = Date.now() - cacheStart;
                
                const cacheHit = !!result2;
                const passed = cacheHit && cacheTime <= 10; // Cache should be <10ms
                
                if (passed) passedTests++;
                
                results.push({
                    query,
                    firstCallTime,
                    cacheTime,
                    cacheHit,
                    passed,
                    performance: this.getPerformanceRating(cacheTime)
                });
                
                console.log(`  🌐 "${query}": Cache ${cacheTime}ms ${cacheHit ? '💾' : '❌'} ${passed ? '✅' : '❌'}`);
            }
            
            const duration = Date.now() - startTime;
            this.testResults.push({
                test: 'Web Search Cache Performance',
                passed: passedTests >= testQueries.length * 0.8,
                details: {
                    passedTests: `${passedTests}/${testQueries.length}`,
                    results
                },
                duration
            });
            
            console.log(`  📊 Web Search Cache: ${passedTests}/${testQueries.length} tests passed\n`);
            
        } catch (error) {
            console.error('  ❌ Web Search test failed:', error.message);
            this.testResults.push({
                test: 'Web Search Cache Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Test Ultra-Fast Streaming Performance
     */
    async testUltraFastStreamingPerformance() {
        console.log('🧪 Test 6: Ultra-Fast Streaming Performance');
        const startTime = Date.now();
        
        try {
            const { getUltraFastStreamingService } = require('./src/features/common/services/ultraFastStreamingService');
            const streamingService = getUltraFastStreamingService();
            
            const testCases = [
                { prompt: 'hello', expectedTime: this.performanceTargets.instantResponse },
                { prompt: 'thanks', expectedTime: this.performanceTargets.instantResponse },
                { prompt: 'what time is it', expectedTime: this.performanceTargets.instantResponse },
                { prompt: 'help me with something', expectedTime: this.performanceTargets.ultraFast }
            ];
            
            let passedTests = 0;
            const results = [];
            
            for (const testCase of testCases) {
                const testStart = Date.now();
                
                try {
                    const response = await streamingService.streamResponse(testCase.prompt, {
                        provider: 'anthropic',
                        model: 'claude-3-5-haiku-20241022'
                    });
                    
                    const responseTime = Date.now() - testStart;
                    const passed = responseTime <= testCase.expectedTime;
                    
                    if (passed) passedTests++;
                    
                    results.push({
                        prompt: testCase.prompt,
                        responseTime,
                        target: testCase.expectedTime,
                        passed,
                        hasResponse: !!response,
                        performance: this.getPerformanceRating(responseTime)
                    });
                    
                    console.log(`  ⚡ "${testCase.prompt}": ${responseTime}ms (target: <${testCase.expectedTime}ms) ${passed ? '✅' : '❌'}`);
                    
                } catch (error) {
                    console.log(`  ❌ "${testCase.prompt}": Failed - ${error.message}`);
                    results.push({
                        prompt: testCase.prompt,
                        error: error.message,
                        passed: false
                    });
                }
            }
            
            const duration = Date.now() - startTime;
            this.testResults.push({
                test: 'Ultra-Fast Streaming Performance',
                passed: passedTests >= testCases.length * 0.8,
                details: {
                    passedTests: `${passedTests}/${testCases.length}`,
                    results
                },
                duration
            });
            
            console.log(`  📊 Ultra-Fast Streaming: ${passedTests}/${testCases.length} tests passed\n`);
            
        } catch (error) {
            console.error('  ❌ Ultra-Fast Streaming test failed:', error.message);
            this.testResults.push({
                test: 'Ultra-Fast Streaming Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Test the original LinkedIn query that was taking 7+ seconds
     */
    async testRealLinkedInQueryPerformance() {
        console.log('🧪 Test 7: Real LinkedIn Query Performance (Original Issue)');
        const startTime = Date.now();
        
        try {
            const { getUltraFastStreamingService } = require('./src/features/common/services/ultraFastStreamingService');
            const streamingService = getUltraFastStreamingService();
            
            const linkedInQuery = 'pullup elon musk from linkedin';
            const targetTime = 200; // Target: <200ms for "realtime feel"
            
            console.log(`  🎯 Testing: "${linkedInQuery}" (was taking 7+ seconds)`);
            
            const testStart = Date.now();
            const response = await streamingService.streamResponse(linkedInQuery, {
                provider: 'anthropic',
                model: 'claude-3-5-haiku-20241022',
                mode: 'ask'
            });
            const responseTime = Date.now() - testStart;
            
            const passed = responseTime <= targetTime;
            const improvement = responseTime < 1000 ? `${Math.round(7000 / responseTime)}x faster` : 'Still slow';
            
            this.testResults.push({
                test: 'Real LinkedIn Query Performance',
                passed,
                details: {
                    query: linkedInQuery,
                    responseTime,
                    target: targetTime,
                    previousTime: '7000ms+',
                    improvement,
                    realtimeFeel: responseTime <= 200
                },
                duration: Date.now() - startTime
            });
            
            console.log(`  ⚡ LinkedIn query: ${responseTime}ms (target: <${targetTime}ms) ${passed ? '✅' : '❌'}`);
            console.log(`  🚀 Improvement: ${improvement} (was 7000ms+)`);
            console.log(`  🎯 Realtime feel: ${responseTime <= 200 ? '✅ YES' : '❌ NO'}\n`);
            
        } catch (error) {
            console.error('  ❌ LinkedIn query test failed:', error.message);
            this.testResults.push({
                test: 'Real LinkedIn Query Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Test concurrent requests performance
     */
    async testConcurrentRequestsPerformance() {
        console.log('🧪 Test 8: Concurrent Requests Performance');
        const startTime = Date.now();
        
        try {
            const { getUltraFastStreamingService } = require('./src/features/common/services/ultraFastStreamingService');
            const streamingService = getUltraFastStreamingService();
            
            // Test 10 concurrent requests
            const concurrentRequests = [
                'hello',
                'what time is it',
                'help me',
                'search news',
                'email help',
                'thanks',
                'good morning',
                'linkedin search',
                'current date',
                'how are you'
            ];
            
            console.log(`  🚀 Testing ${concurrentRequests.length} concurrent requests...`);
            
            const testStart = Date.now();
            const promises = concurrentRequests.map(query => 
                streamingService.streamResponse(query, {
                    provider: 'anthropic',
                    model: 'claude-3-5-haiku-20241022'
                }).catch(error => ({ error: error.message }))
            );
            
            const results = await Promise.all(promises);
            const totalTime = Date.now() - testStart;
            
            const successCount = results.filter(result => !result.error).length;
            const avgTimePerRequest = totalTime / concurrentRequests.length;
            const passed = successCount >= concurrentRequests.length * 0.8 && avgTimePerRequest < 500;
            
            this.testResults.push({
                test: 'Concurrent Requests Performance',
                passed,
                details: {
                    totalRequests: concurrentRequests.length,
                    successfulRequests: successCount,
                    totalTime,
                    avgTimePerRequest: Math.round(avgTimePerRequest),
                    passRate: `${Math.round(successCount / concurrentRequests.length * 100)}%`
                },
                duration: Date.now() - startTime
            });
            
            console.log(`  📊 Concurrent test: ${successCount}/${concurrentRequests.length} successful`);
            console.log(`  ⏱️  Total time: ${totalTime}ms, Avg per request: ${Math.round(avgTimePerRequest)}ms ${passed ? '✅' : '❌'}\n`);
            
        } catch (error) {
            console.error('  ❌ Concurrent requests test failed:', error.message);
            this.testResults.push({
                test: 'Concurrent Requests Performance',
                passed: false,
                error: error.message,
                duration: Date.now() - startTime
            });
        }
    }
    
    /**
     * Generate comprehensive performance report
     */
    async generatePerformanceReport() {
        console.log('=' .repeat(80));
        console.log('📊 COMPREHENSIVE CROSS-MODE PERFORMANCE REPORT');
        console.log('=' .repeat(80));
        
        const totalDuration = Date.now() - this.startTime;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const totalTests = this.testResults.length;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log(`\n🏁 Overall Results: ${passedTests}/${totalTests} tests passed (${successRate}%)`);
        console.log(`⏱️  Total test duration: ${totalDuration}ms`);
        
        console.log('\n📋 Cross-Mode Test Results:');
        
        for (const result of this.testResults) {
            const status = result.passed ? '✅ PASSED' : '❌ FAILED';
            console.log(`\n  ${status} - ${result.test}`);
            console.log(`    Duration: ${result.duration}ms`);
            
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            } else if (result.details) {
                if (typeof result.details === 'object') {
                    Object.entries(result.details).forEach(([key, value]) => {
                        console.log(`    ${key}: ${JSON.stringify(value)}`);
                    });
                } else {
                    console.log(`    Details: ${result.details}`);
                }
            }
        }
        
        console.log('\n🎯 Performance Analysis:');
        
        // Performance targets analysis
        const performanceBreakdown = this.analyzePerformanceBreakdown();
        console.log(`  ⚡ Ultra-Fast Responses (<100ms): ${performanceBreakdown.ultraFast}`);
        console.log(`  🚀 Instant Responses (<10ms): ${performanceBreakdown.instant}`);
        console.log(`  ✅ Fast Responses (<500ms): ${performanceBreakdown.fast}`);
        console.log(`  ⚠️  Slow Responses (>500ms): ${performanceBreakdown.slow}`);
        
        console.log('\n🔥 Performance Achievements:');
        
        // Check specific achievements
        const linkedInTest = this.testResults.find(t => t.test === 'Real LinkedIn Query Performance');
        if (linkedInTest && linkedInTest.passed) {
            console.log(`  🎉 LinkedIn Query: ${linkedInTest.details.improvement} improvement!`);
            console.log(`  🎯 Realtime Feel: ${linkedInTest.details.realtimeFeel ? 'ACHIEVED' : 'Not yet'}`);
        }
        
        // Overall system performance
        console.log('\n🏆 System-Wide Performance Status:');
        
        if (successRate >= 90) {
            console.log('🎊 EXCELLENT: Ultra-fast performance achieved across all modes!');
            console.log('✅ Target achieved: Sub-100ms response times validated in comprehensive testing');
        } else if (successRate >= 75) {
            console.log('🎯 GOOD: Most optimizations working, some areas need refinement');
            console.log(`   ${passedTests}/${totalTests} optimizations working across modes`);
        } else {
            console.log('⚠️  NEEDS WORK: Significant optimizations still needed');
            console.log(`   Only ${passedTests}/${totalTests} optimizations working reliably`);
        }
        
        console.log('\n' + '='.repeat(80));
        
        // Write detailed report
        const reportData = {
            timestamp: new Date().toISOString(),
            totalDuration,
            successRate,
            passedTests,
            totalTests,
            testResults: this.testResults,
            performanceBreakdown,
            performanceTargets: this.performanceTargets
        };
        
        fs.writeFileSync('cross-mode-performance-report.json', JSON.stringify(reportData, null, 2));
        console.log('📝 Detailed report saved to: cross-mode-performance-report.json\n');
        
        return successRate >= 75; // 75% success rate for acceptance
    }
    
    /**
     * Analyze performance breakdown
     */
    analyzePerformanceBreakdown() {
        const breakdown = {
            instant: 0,
            ultraFast: 0,
            fast: 0,
            slow: 0
        };
        
        this.testResults.forEach(test => {
            if (test.details && test.details.results) {
                test.details.results.forEach(result => {
                    if (result.responseTime) {
                        if (result.responseTime <= this.performanceTargets.instantResponse) {
                            breakdown.instant++;
                        } else if (result.responseTime <= this.performanceTargets.ultraFast) {
                            breakdown.ultraFast++;
                        } else if (result.responseTime <= this.performanceTargets.fast) {
                            breakdown.fast++;
                        } else {
                            breakdown.slow++;
                        }
                    }
                });
            }
        });
        
        return breakdown;
    }
    
    /**
     * Get performance rating for a response time
     */
    getPerformanceRating(responseTime) {
        if (responseTime <= this.performanceTargets.instantResponse) return '⚡ INSTANT';
        if (responseTime <= this.performanceTargets.ultraFast) return '🚀 ULTRA-FAST';
        if (responseTime <= this.performanceTargets.fast) return '✅ FAST';
        if (responseTime <= this.performanceTargets.acceptable) return '⚠️ ACCEPTABLE';
        return '🐢 SLOW';
    }
}

// Run comprehensive tests
async function runCrossModeTests() {
    const tester = new CrossModePerformanceTest();
    
    try {
        const success = await tester.runComprehensiveTests();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Cross-mode test suite failed:', error);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    runCrossModeTests();
}

module.exports = { CrossModePerformanceTest, runCrossModeTests };
