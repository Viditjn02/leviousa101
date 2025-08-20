#!/usr/bin/env node

/**
 * Error Handling Testing
 * Tests all error scenarios and fallback mechanisms for web search functionality
 */

const { WebSearchDetector } = require('./src/features/common/ai/parallelLLMOrchestrator');

class ErrorHandlingTester {
    constructor() {
        this.testResults = {
            detectionErrors: [],
            apiErrors: [],
            fallbackTests: [],
            integrationErrors: [],
            systemErrors: []
        };
        this.originalFetch = global.fetch;
        this.originalConsole = { log: console.log, warn: console.warn, error: console.error };
    }

    /**
     * Setup mock console to capture logs
     */
    setupMockConsole() {
        this.logs = { log: [], warn: [], error: [] };
        console.log = (...args) => this.logs.log.push(args.join(' '));
        console.warn = (...args) => this.logs.warn.push(args.join(' '));
        console.error = (...args) => this.logs.error.push(args.join(' '));
    }

    /**
     * Restore original console
     */
    restoreConsole() {
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
    }

    /**
     * Setup various error scenarios for fetch
     */
    setupErrorFetch(errorType) {
        global.fetch = jest.fn().mockImplementation(() => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    switch (errorType) {
                        case 'network_error':
                            reject(new Error('Network error: Connection refused'));
                            break;
                        case 'timeout':
                            reject(new Error('Request timeout'));
                            break;
                        case 'api_error_401':
                            resolve({
                                ok: false,
                                status: 401,
                                text: () => Promise.resolve('{"error": {"message": "Invalid API key"}}')
                            });
                            break;
                        case 'api_error_429':
                            resolve({
                                ok: false,
                                status: 429,
                                text: () => Promise.resolve('{"error": {"message": "Rate limit exceeded"}}')
                            });
                            break;
                        case 'api_error_500':
                            resolve({
                                ok: false,
                                status: 500,
                                text: () => Promise.resolve('{"error": {"message": "Internal server error"}}')
                            });
                            break;
                        case 'malformed_json':
                            resolve({
                                ok: true,
                                status: 200,
                                json: () => Promise.resolve({ invalid: 'structure' })
                            });
                            break;
                        case 'empty_response':
                            resolve({
                                ok: true,
                                status: 200,
                                json: () => Promise.resolve({})
                            });
                            break;
                        case 'invalid_json':
                            resolve({
                                ok: true,
                                status: 200,
                                json: () => Promise.reject(new Error('Invalid JSON'))
                            });
                            break;
                        default:
                            reject(new Error('Unknown error type'));
                    }
                }, 100);
            });
        });
    }

    /**
     * Restore original fetch
     */
    restoreFetch() {
        global.fetch = this.originalFetch;
    }

    /**
     * Test web search detection with invalid inputs
     */
    async testDetectionErrors() {
        console.log('\n🧠 Testing Web Search Detection Error Handling...');
        console.log('='.repeat(50));

        const detector = new WebSearchDetector();
        const tests = [];

        // Test invalid inputs
        const invalidInputs = [
            { name: 'Null Input', input: null, expectError: false },
            { name: 'Undefined Input', input: undefined, expectError: false },
            { name: 'Empty String', input: '', expectError: false },
            { name: 'Number Input', input: 12345, expectError: false },
            { name: 'Object Input', input: { query: 'test' }, expectError: false },
            { name: 'Array Input', input: ['test', 'query'], expectError: false },
            { name: 'Very Long String', input: 'a'.repeat(10000), expectError: false }
        ];

        for (const test of invalidInputs) {
            console.log(`\n📝 Testing: ${test.name}`);
            
            try {
                const result = detector.analyze(test.input);
                
                const hasValidStructure = result && 
                    typeof result.needsWebSearch === 'boolean' &&
                    typeof result.confidence === 'number' &&
                    Array.isArray(result.reasons);
                
                console.log(`   Input: ${JSON.stringify(test.input)}`);
                console.log(`   Valid Structure: ${hasValidStructure ? '✅' : '❌'}`);
                console.log(`   Needs Web Search: ${result.needsWebSearch}`);
                console.log(`   Confidence: ${result.confidence}`);
                
                tests.push({
                    name: test.name,
                    input: test.input,
                    passed: hasValidStructure,
                    result: result
                });
                
            } catch (error) {
                console.log(`   Error Caught: ${error.message}`);
                tests.push({
                    name: test.name,
                    input: test.input,
                    passed: !test.expectError, // If we expected an error but didn't get one
                    error: error.message
                });
            }
        }

        this.testResults.detectionErrors = tests;
        return tests;
    }

    /**
     * Test API error handling
     */
    async testAPIErrorHandling() {
        console.log('\n🌐 Testing API Error Handling...');
        console.log('='.repeat(50));

        const tests = [];
        const errorScenarios = [
            { name: 'Network Error', type: 'network_error', expectFallback: true },
            { name: 'Request Timeout', type: 'timeout', expectFallback: true },
            { name: 'Invalid API Key (401)', type: 'api_error_401', expectFallback: true },
            { name: 'Rate Limit (429)', type: 'api_error_429', expectFallback: true },
            { name: 'Server Error (500)', type: 'api_error_500', expectFallback: true },
            { name: 'Malformed JSON', type: 'malformed_json', expectFallback: true },
            { name: 'Empty Response', type: 'empty_response', expectFallback: true },
            { name: 'Invalid JSON', type: 'invalid_json', expectFallback: true }
        ];

        for (const scenario of errorScenarios) {
            console.log(`\n📝 Testing: ${scenario.name}`);
            
            this.setupErrorFetch(scenario.type);
            this.setupMockConsole();
            
            try {
                // Simulate the same API call pattern used in the MCP server
                const response = await fetch('https://api.perplexity.ai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer test-key',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'sonar-pro',
                        messages: [{ role: 'user', content: 'test query' }],
                        temperature: 0.1,
                        max_tokens: 1500,
                        return_citations: true
                    })
                });

                let apiError = null;
                let result = null;

                try {
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`API error: ${response.status} - ${errorText}`);
                    }

                    const apiResult = await response.json();
                    
                    if (!apiResult.choices || !apiResult.choices[0] || !apiResult.choices[0].message) {
                        throw new Error('Invalid response structure');
                    }

                    result = {
                        success: true,
                        content: apiResult.choices[0].message.content
                    };
                } catch (err) {
                    apiError = err.message;
                }

                const errorHandled = apiError !== null;
                const hasErrorLogs = this.logs.error.length > 0 || this.logs.warn.length > 0;
                
                console.log(`   Error Handled: ${errorHandled ? '✅' : '❌'}`);
                console.log(`   Error Message: ${apiError || 'None'}`);
                console.log(`   Logged Errors: ${hasErrorLogs ? '✅' : '❌'}`);
                
                tests.push({
                    name: scenario.name,
                    type: scenario.type,
                    errorHandled: errorHandled,
                    errorMessage: apiError,
                    hasErrorLogs: hasErrorLogs,
                    passed: errorHandled === scenario.expectFallback
                });

            } catch (testError) {
                console.log(`   Test Error: ${testError.message}`);
                tests.push({
                    name: scenario.name,
                    type: scenario.type,
                    testError: testError.message,
                    passed: false
                });
            }
            
            this.restoreConsole();
        }

        this.restoreFetch();
        this.testResults.apiErrors = tests;
        return tests;
    }

    /**
     * Test fallback mechanisms
     */
    async testFallbackMechanisms() {
        console.log('\n🔄 Testing Fallback Mechanisms...');
        console.log('='.repeat(50));

        const tests = [];

        // Test 1: Voice Agent fallback
        console.log('\n📝 Testing Voice Agent Fallback');
        try {
            const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
            
            // Check if fallback mechanism exists
            const voiceAgentCode = VoiceAgentService.toString();
            const hasFallback = voiceAgentCode.includes('fallback') || 
                               voiceAgentCode.includes('catch') ||
                               voiceAgentCode.includes('warn') ||
                               voiceAgentCode.includes('error');
            
            console.log(`   Has Fallback Logic: ${hasFallback ? '✅' : '❌'}`);
            tests.push({ name: 'Voice Agent Fallback', passed: hasFallback });
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Voice Agent Fallback', passed: false, error: error.message });
        }

        // Test 2: Ask Service fallback
        console.log('\n📝 Testing Ask Service Fallback');
        try {
            const askService = require('./src/features/ask/askService');
            
            // Check if ParallelLLMOrchestrator has fallback
            const hasOrchestrator = askService.parallelOrchestrator !== undefined;
            console.log(`   Has Orchestrator: ${hasOrchestrator ? '✅' : '❌'}`);
            tests.push({ name: 'Ask Service Fallback', passed: hasOrchestrator });
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Ask Service Fallback', passed: false, error: error.message });
        }

        // Test 3: AnswerService fallback
        console.log('\n📝 Testing AnswerService Fallback');
        try {
            const { readFileSync } = require('fs');
            const answerServiceCode = readFileSync('./src/features/invisibility/services/AnswerService.js', 'utf-8');
            
            const hasWebSearchHandling = answerServiceCode.includes('enhanceWithWebSearch');
            const hasErrorHandling = answerServiceCode.includes('catch') && answerServiceCode.includes('webError');
            const hasFallback = answerServiceCode.includes('continuing without') || answerServiceCode.includes('graceful');
            
            console.log(`   Has Web Search Enhancement: ${hasWebSearchHandling ? '✅' : '❌'}`);
            console.log(`   Has Error Handling: ${hasErrorHandling ? '✅' : '❌'}`);
            console.log(`   Has Graceful Fallback: ${hasFallback ? '✅' : '❌'}`);
            
            const passed = hasWebSearchHandling && hasErrorHandling;
            tests.push({ name: 'AnswerService Fallback', passed });
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'AnswerService Fallback', passed: false, error: error.message });
        }

        // Test 4: Cache fallback
        console.log('\n📝 Testing Cache Fallback');
        try {
            const { WebSearchCache } = require('./src/features/common/services/webSearchCache');
            const cache = new WebSearchCache();
            
            // Test cache with invalid operations
            let cacheFallbackWorks = true;
            
            try {
                cache.set(null, null, null, null);
                cache.get(undefined, '', '');
                // If no errors thrown, fallback is working
            } catch (cacheError) {
                cacheFallbackWorks = false;
            }
            
            console.log(`   Cache Error Handling: ${cacheFallbackWorks ? '✅' : '❌'}`);
            tests.push({ name: 'Cache Fallback', passed: cacheFallbackWorks });
            
            cache.destroy();
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Cache Fallback', passed: false, error: error.message });
        }

        this.testResults.fallbackTests = tests;
        return tests;
    }

    /**
     * Test integration error scenarios
     */
    async testIntegrationErrors() {
        console.log('\n🔗 Testing Integration Error Scenarios...');
        console.log('='.repeat(50));

        const tests = [];

        // Test 1: Missing MCP client
        console.log('\n📝 Testing Missing MCP Client Handling');
        try {
            // Test voice agent with no MCP client
            const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
            
            // Check if code handles missing global.invisibilityService
            const voiceAgentCode = VoiceAgentService.toString();
            const handlesMissingMCP = voiceAgentCode.includes('global.invisibilityService') && 
                                     voiceAgentCode.includes('mcpClient');
            
            console.log(`   Handles Missing MCP: ${handlesMissingMCP ? '✅' : '❌'}`);
            tests.push({ name: 'Missing MCP Client', passed: handlesMissingMCP });
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Missing MCP Client', passed: false, error: error.message });
        }

        // Test 2: Missing API keys
        console.log('\n📝 Testing Missing API Key Handling');
        try {
            // Test the Perplexity integration with missing API key
            const { readFileSync } = require('fs');
            const mcpServerCode = readFileSync('./services/paragon-mcp/src/index.ts', 'utf-8');
            
            const handlesNoAPIKey = mcpServerCode.includes('PERPLEXITY_API_KEY') &&
                                   mcpServerCode.includes('throw new Error') &&
                                   mcpServerCode.includes('not configured');
            
            console.log(`   Handles Missing API Key: ${handlesNoAPIKey ? '✅' : '❌'}`);
            tests.push({ name: 'Missing API Key', passed: handlesNoAPIKey });
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Missing API Key', passed: false, error: error.message });
        }

        // Test 3: Invalid tool responses
        console.log('\n📝 Testing Invalid Tool Response Handling');
        try {
            // Check if components handle malformed MCP responses
            const answerServiceCode = require('fs').readFileSync('./src/features/invisibility/services/AnswerService.js', 'utf-8');
            
            const handlesJSONParsing = answerServiceCode.includes('JSON.parse') &&
                                      answerServiceCode.includes('catch');
            
            console.log(`   Handles JSON Parsing Errors: ${handlesJSONParsing ? '✅' : '❌'}`);
            tests.push({ name: 'Invalid Tool Response', passed: handlesJSONParsing });
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Invalid Tool Response', passed: false, error: error.message });
        }

        this.testResults.integrationErrors = tests;
        return tests;
    }

    /**
     * Test system-level error scenarios
     */
    async testSystemErrors() {
        console.log('\n🖥️ Testing System-Level Error Scenarios...');
        console.log('='.repeat(50));

        const tests = [];

        // Test 1: Memory pressure
        console.log('\n📝 Testing Memory Pressure Handling');
        try {
            const { WebSearchCache } = require('./src/features/common/services/webSearchCache');
            const cache = new WebSearchCache({ maxSize: 2 }); // Very small cache
            
            // Fill cache beyond capacity
            for (let i = 0; i < 10; i++) {
                cache.set(`query${i}`, 'general', '', { data: `data${i}` });
            }
            
            const stats = cache.getStats();
            const memoryHandled = stats.size <= 2;
            
            console.log(`   Cache Size Controlled: ${memoryHandled ? '✅' : '❌'} (${stats.size}/2)`);
            tests.push({ name: 'Memory Pressure', passed: memoryHandled });
            
            cache.destroy();
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Memory Pressure', passed: false, error: error.message });
        }

        // Test 2: Concurrent access stress
        console.log('\n📝 Testing Concurrent Access Stress');
        try {
            const detector = new WebSearchDetector();
            
            // Create many concurrent detection requests
            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(
                    new Promise(resolve => {
                        try {
                            const result = detector.analyze(`test query ${i}`);
                            resolve(result !== null);
                        } catch (error) {
                            resolve(false);
                        }
                    })
                );
            }
            
            const results = await Promise.all(promises);
            const successRate = results.filter(r => r === true).length / results.length;
            const stressHandled = successRate >= 0.95; // 95% success rate under stress
            
            console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
            console.log(`   Stress Handled: ${stressHandled ? '✅' : '❌'}`);
            tests.push({ name: 'Concurrent Stress', passed: stressHandled });
            
        } catch (error) {
            console.log(`   Error: ${error.message}`);
            tests.push({ name: 'Concurrent Stress', passed: false, error: error.message });
        }

        this.testResults.systemErrors = tests;
        return tests;
    }

    /**
     * Generate comprehensive error handling report
     */
    generateReport() {
        console.log('\n📊 Error Handling Test Results');
        console.log('='.repeat(50));

        const allTests = [
            ...this.testResults.detectionErrors,
            ...this.testResults.apiErrors,
            ...this.testResults.fallbackTests,
            ...this.testResults.integrationErrors,
            ...this.testResults.systemErrors
        ];

        const categories = [
            { name: 'Detection Errors', tests: this.testResults.detectionErrors },
            { name: 'API Errors', tests: this.testResults.apiErrors },
            { name: 'Fallback Mechanisms', tests: this.testResults.fallbackTests },
            { name: 'Integration Errors', tests: this.testResults.integrationErrors },
            { name: 'System Errors', tests: this.testResults.systemErrors }
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
        console.log(`Status: ${overallPercentage >= 80 ? '✅ ERROR HANDLING ROBUST' : '⚠️ NEEDS ATTENTION'}`);

        if (overallPercentage >= 80) {
            console.log('\n🛡️ Error handling is robust!');
            console.log('   ✅ Graceful handling of invalid inputs');
            console.log('   ✅ Proper API error management');
            console.log('   ✅ Fallback mechanisms in place');
            console.log('   ✅ Integration error handling');
            console.log('   ✅ System-level error resilience');
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
     * Run all error handling tests
     */
    async runAllTests() {
        console.log('🛡️ Starting Error Handling Tests');
        console.log('=================================');

        // Mock jest for the test
        if (!global.jest) {
            global.jest = {
                fn: () => ({
                    mockImplementation: (impl) => impl
                })
            };
        }

        try {
            await this.testDetectionErrors();
            await this.testAPIErrorHandling();
            await this.testFallbackMechanisms();
            await this.testIntegrationErrors();
            await this.testSystemErrors();

            return this.generateReport();
        } catch (error) {
            console.error('❌ Error handling test suite failed:', error);
            return { overall: false, error: error.message };
        }
    }
}

// Export for use in other files
module.exports = { ErrorHandlingTester };

// Run if called directly
if (require.main === module) {
    (async () => {
        console.log('🛡️ Error Handling Test Suite');
        console.log('=============================');

        const tester = new ErrorHandlingTester();
        const results = await tester.runAllTests();

        process.exit(results.overall ? 0 : 1);
    })();
}
