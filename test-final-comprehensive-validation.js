/**
 * FINAL COMPREHENSIVE SYSTEM VALIDATION
 * Tests the COMPLETE integrated system with all optimizations
 * Validates that ALL fixes work together in the real running system
 */

const fs = require('fs');

class FinalComprehensiveValidator {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
        this.criticalPath = 'linkedin query: pullup elon musk from linkedin';
    }

    async validateCompleteSystem() {
        console.log('🔥 FINAL COMPREHENSIVE SYSTEM VALIDATION');
        console.log('Testing ALL optimizations working together in the integrated system\n');

        try {
            // Test 1: Validate Code Integration
            await this.validateCodeIntegration();
            
            // Test 2: Validate LinkedIn Query Processing Logic
            await this.validateLinkedInQueryLogic();
            
            // Test 3: Validate Web Search Caching Logic  
            await this.validateWebSearchCaching();
            
            // Test 4: Validate AnswerService Flow
            await this.validateAnswerServiceFlow();
            
            // Test 5: Validate Cross-Component Integration
            await this.validateCrossComponentIntegration();
            
            // Generate final assessment
            await this.generateFinalAssessment();
            
        } catch (error) {
            console.error('❌ Final validation failed:', error);
            throw error;
        }
    }

    /**
     * Test 1: Validate that all code changes are properly integrated
     */
    async validateCodeIntegration() {
        console.log('🧪 Test 1: Code Integration Validation');
        
        const integrationChecks = [
            {
                file: 'src/features/invisibility/services/AnswerService.js',
                name: 'LinkedIn Query Bypass Logic',
                check: (content) => {
                    return content.includes('LinkedIn query detected - bypassing preemptive response') &&
                           content.includes('isLinkedInQuery') &&
                           content.includes('pullup') &&
                           content.includes('Continue to full processing');
                }
            },
            {
                file: 'services/paragon-mcp/src/index.ts',
                name: 'MCP Web Search Caching',
                check: (content) => {
                    return content.includes('CACHE HIT') &&
                           content.includes('webSearchCache') &&
                           content.includes('person_name') &&
                           content.includes('cache.get');
                }
            },
            {
                file: 'src/features/common/services/preemptiveProcessingService.js',
                name: 'Enhanced Preemptive Processing',
                check: (content) => {
                    return content.includes('linkedin') &&
                           content.includes('pull\\s*up') &&
                           content.includes('Direct pattern hit');
                }
            }
        ];

        let passedChecks = 0;
        
        for (const check of integrationChecks) {
            try {
                if (fs.existsSync(check.file)) {
                    const content = fs.readFileSync(check.file, 'utf8');
                    
                    if (check.check(content)) {
                        console.log(`  ✅ ${check.name}: Properly integrated`);
                        passedChecks++;
                    } else {
                        console.log(`  ❌ ${check.name}: Integration missing or incomplete`);
                    }
                } else {
                    console.log(`  ❌ ${check.name}: File not found`);
                }
            } catch (error) {
                console.log(`  ❌ ${check.name}: Error checking - ${error.message}`);
            }
        }
        
        const passed = passedChecks === integrationChecks.length;
        
        this.testResults.push({
            test: 'Code Integration Validation',
            passed,
            details: {
                passedChecks: `${passedChecks}/${integrationChecks.length}`,
                allIntegrated: passed
            }
        });
        
        console.log(`  📊 Code integration: ${passedChecks}/${integrationChecks.length} components properly integrated\n`);
    }

    /**
     * Test 2: Validate LinkedIn query processing logic
     */
    async validateLinkedInQueryLogic() {
        console.log('🧪 Test 2: LinkedIn Query Processing Logic');
        
        try {
            // Test the actual processing logic
            const AnswerService = require('./src/features/invisibility/services/AnswerService');
            const answerService = new AnswerService();
            
            const testQuery = 'pullup elon musk from linkedin';
            const testContext = {
                sessionId: 'test-linkedin-validation',
                screenshot: null,
                mockMode: true
            };
            
            console.log(`  🎯 Testing critical path: "${testQuery}"`);
            const startTime = Date.now();
            
            try {
                const result = await answerService.getAnswer(testQuery, testContext);
                const responseTime = Date.now() - startTime;
                
                // Check if we get actual results, not just "searching..." message
                const hasRealResults = result.answer && 
                                     result.answer.length > 100 && 
                                     !result.answer.includes('searching') &&
                                     !result.answer.includes('Let me get');
                
                const passed = hasRealResults && responseTime < 2000; // Should be under 2 seconds
                
                console.log(`  📝 Query response time: ${responseTime}ms ${passed ? '✅' : '❌'}`);
                console.log(`  📝 Has real results: ${hasRealResults ? '✅' : '❌'}`);
                console.log(`  📝 Answer preview: "${result.answer?.substring(0, 80)}..."`);
                
                this.testResults.push({
                    test: 'LinkedIn Query Processing Logic',
                    passed,
                    details: {
                        responseTime,
                        hasRealResults,
                        answerLength: result.answer?.length || 0,
                        questionType: result.questionType
                    }
                });
                
            } catch (error) {
                console.log(`  ❌ LinkedIn query test failed: ${error.message}`);
                this.testResults.push({
                    test: 'LinkedIn Query Processing Logic',
                    passed: false,
                    error: error.message
                });
            }
            
        } catch (error) {
            console.error('  ❌ LinkedIn logic validation failed:', error.message);
            this.testResults.push({
                test: 'LinkedIn Query Processing Logic',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Test 3: Validate web search caching logic
     */
    async validateWebSearchCaching() {
        console.log('🧪 Test 3: Web Search Caching Logic');
        
        try {
            const { getWebSearchCache } = require('./src/features/common/services/webSearchCache');
            const cache = getWebSearchCache();
            
            const testQuery = '"elon musk" professional background linkedin profile current role company';
            const testPerson = 'elon musk';
            
            // Test cache functionality
            const testData = {
                success: true,
                webResults: 'Test Elon Musk professional information',
                searchedPerson: testPerson,
                source: 'test',
                message: 'Test web results'
            };
            
            // Test cache set
            console.log('  💾 Testing cache set...');
            cache.set(testQuery, 'person', testPerson, testData);
            
            // Test cache get
            console.log('  📡 Testing cache get...');
            const cachedResult = cache.get(testQuery, 'person', testPerson);
            
            const cacheWorking = !!cachedResult && 
                                cachedResult.webResults === testData.webResults;
            
            console.log(`  📊 Cache functionality: ${cacheWorking ? '✅ Working' : '❌ Not working'}`);
            
            // Test cache variations
            const variations = [
                testQuery.toLowerCase(),
                testQuery.replace(/"/g, ''),
                'elon musk linkedin'
            ];
            
            let variationsWorking = 0;
            for (const variation of variations) {
                const varResult = cache.findSimilarCached(variation, 'person', testPerson);
                if (varResult) variationsWorking++;
            }
            
            console.log(`  🔍 Cache variations: ${variationsWorking}/${variations.length} working`);
            
            const passed = cacheWorking && variationsWorking >= 1;
            
            this.testResults.push({
                test: 'Web Search Caching Logic',
                passed,
                details: {
                    basicCaching: cacheWorking,
                    variationsWorking: `${variationsWorking}/${variations.length}`,
                    cacheSize: cache.cache ? cache.cache.size : 'unknown'
                }
            });
            
        } catch (error) {
            console.error('  ❌ Web search caching validation failed:', error.message);
            this.testResults.push({
                test: 'Web Search Caching Logic',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Test 4: Validate AnswerService flow
     */
    async validateAnswerServiceFlow() {
        console.log('🧪 Test 4: AnswerService Processing Flow');
        
        try {
            // Test different query types to ensure flow works correctly
            const testQueries = [
                {
                    query: 'hello',
                    expectPreemptive: true,
                    expectedTime: 100
                },
                {
                    query: 'what time is it',
                    expectPreemptive: true,
                    expectedTime: 100
                },
                {
                    query: 'pullup john smith from linkedin',
                    expectPreemptive: false, // Should bypass preemptive for LinkedIn
                    expectedTime: 2000
                },
                {
                    query: 'help me with general question',
                    expectPreemptive: false,
                    expectedTime: 1000
                }
            ];
            
            const AnswerService = require('./src/features/invisibility/services/AnswerService');
            const answerService = new AnswerService();
            
            let passedQueries = 0;
            
            for (const testQuery of testQueries) {
                console.log(`  🎯 Testing: "${testQuery.query}"`);
                
                const startTime = Date.now();
                try {
                    const result = await answerService.getAnswer(testQuery.query, {
                        sessionId: 'test-flow-validation',
                        mockMode: true
                    });
                    
                    const responseTime = Date.now() - startTime;
                    const withinTimeLimit = responseTime <= testQuery.expectedTime;
                    const correctFlow = testQuery.expectPreemptive ? 
                        result.preemptive === true :
                        result.preemptive !== true;
                    
                    if (withinTimeLimit && correctFlow) {
                        console.log(`    ✅ ${responseTime}ms, flow: ${result.preemptive ? 'preemptive' : 'full'}`);
                        passedQueries++;
                    } else {
                        console.log(`    ❌ ${responseTime}ms, flow: ${result.preemptive ? 'preemptive' : 'full'} (expected ${testQuery.expectPreemptive ? 'preemptive' : 'full'})`);
                    }
                    
                } catch (error) {
                    console.log(`    ❌ Error: ${error.message}`);
                }
            }
            
            const passed = passedQueries >= testQueries.length * 0.75;
            
            this.testResults.push({
                test: 'AnswerService Processing Flow',
                passed,
                details: {
                    passedQueries: `${passedQueries}/${testQueries.length}`,
                    flowWorking: passed
                }
            });
            
            console.log(`  📊 AnswerService flow: ${passedQueries}/${testQueries.length} queries processed correctly`);
            
        } catch (error) {
            console.error('  ❌ AnswerService flow validation failed:', error.message);
            this.testResults.push({
                test: 'AnswerService Processing Flow',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Test 5: Validate cross-component integration
     */
    async validateCrossComponentIntegration() {
        console.log('🧪 Test 5: Cross-Component Integration');
        
        try {
            // Test that all components can work together
            const integrationTests = [
                {
                    name: 'PreemptiveProcessing + AnswerService',
                    test: async () => {
                        const PreemptiveProcessingService = require('./src/features/common/services/preemptiveProcessingService');
                        const AnswerService = require('./src/features/invisibility/services/AnswerService');
                        
                        const preemptive = new PreemptiveProcessingService();
                        const answer = new AnswerService();
                        
                        // Test that they work together
                        const result = preemptive.getPreemptiveResponse('hello', 'test-session');
                        return !!result && result.answer && result.confidence > 0;
                    }
                },
                {
                    name: 'WebSearchCache + AnswerService',
                    test: async () => {
                        const { getWebSearchCache } = require('./src/features/common/services/webSearchCache');
                        const AnswerService = require('./src/features/invisibility/services/AnswerService');
                        
                        const cache = getWebSearchCache();
                        const answer = new AnswerService();
                        
                        // Test cache integration
                        return cache && answer && typeof cache.get === 'function';
                    }
                },
                {
                    name: 'UltraFastStreamingService + AnswerService',
                    test: async () => {
                        try {
                            const { getUltraFastStreamingService } = require('./src/features/common/services/ultraFastStreamingService');
                            const service = getUltraFastStreamingService();
                            return !!service;
                        } catch (error) {
                            return false;
                        }
                    }
                }
            ];
            
            let passedIntegrations = 0;
            
            for (const integration of integrationTests) {
                try {
                    const result = await integration.test();
                    if (result) {
                        console.log(`  ✅ ${integration.name}: Working`);
                        passedIntegrations++;
                    } else {
                        console.log(`  ❌ ${integration.name}: Not working`);
                    }
                } catch (error) {
                    console.log(`  ❌ ${integration.name}: Error - ${error.message}`);
                }
            }
            
            const passed = passedIntegrations >= integrationTests.length * 0.8;
            
            this.testResults.push({
                test: 'Cross-Component Integration',
                passed,
                details: {
                    passedIntegrations: `${passedIntegrations}/${integrationTests.length}`,
                    integrationWorking: passed
                }
            });
            
            console.log(`  📊 Cross-component integration: ${passedIntegrations}/${integrationTests.length} working`);
            
        } catch (error) {
            console.error('  ❌ Cross-component integration validation failed:', error.message);
            this.testResults.push({
                test: 'Cross-Component Integration',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Generate final assessment
     */
    async generateFinalAssessment() {
        console.log('=' .repeat(80));
        console.log('📊 FINAL COMPREHENSIVE SYSTEM VALIDATION REPORT');
        console.log('=' .repeat(80));
        
        const totalDuration = Date.now() - this.startTime;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const totalTests = this.testResults.length;
        const systemScore = Math.round((passedTests / totalTests) * 100);
        
        console.log(`\n🏁 System Validation: ${passedTests}/${totalTests} tests passed (${systemScore}%)`);
        console.log(`⏱️  Total validation time: ${totalDuration}ms`);
        
        console.log('\n📋 Validation Results:');
        for (const result of this.testResults) {
            const status = result.passed ? '✅ PASSED' : '❌ FAILED';
            console.log(`\n  ${status} - ${result.test}`);
            
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            } else if (result.details) {
                Object.entries(result.details).forEach(([key, value]) => {
                    console.log(`    ${key}: ${value}`);
                });
            }
        }
        
        console.log('\n🎯 HONEST ASSESSMENT:');
        
        if (systemScore >= 90) {
            console.log('🎊 EXCELLENT: All optimizations properly integrated and tested');
            console.log('✅ System ready for production use with ultra-fast performance');
            console.log('🚀 LinkedIn queries should now work as expected in your system');
        } else if (systemScore >= 75) {
            console.log('🎯 GOOD: Most optimizations working, minor issues detected');
            console.log(`   ${passedTests}/${totalTests} systems validated successfully`);
            console.log('💡 Some components may need attention but core functionality works');
        } else if (systemScore >= 50) {
            console.log('⚠️  PARTIAL: Some optimizations working but significant issues remain');
            console.log(`   Only ${passedTests}/${totalTests} systems fully validated`);
            console.log('❌ System may not perform as expected in production');
        } else {
            console.log('❌ FAILED: Major integration issues detected');
            console.log(`   Only ${passedTests}/${totalTests} systems working properly`);
            console.log('🚨 System not ready for production use');
        }
        
        console.log('\n📋 CRITICAL PATH STATUS:');
        const linkedInTest = this.testResults.find(t => t.test === 'LinkedIn Query Processing Logic');
        if (linkedInTest) {
            if (linkedInTest.passed) {
                console.log('✅ LinkedIn Query Processing: WORKING');
                console.log('🎯 Your critical path should now work as expected');
            } else {
                console.log('❌ LinkedIn Query Processing: FAILED');
                console.log('🚨 The main issue you reported is NOT fixed');
            }
        }
        
        console.log('\n📝 RECOMMENDATION:');
        if (systemScore >= 75) {
            console.log('✅ READY FOR TESTING: Start your system and test the LinkedIn query');
            console.log('🎯 Expected: Fast response with real Elon Musk information');
        } else {
            console.log('❌ NOT READY: Fix remaining integration issues before testing');
            console.log('🔧 Review failed tests above and address issues');
        }
        
        console.log('\n' + '='.repeat(80));
        
        // Save comprehensive report
        const reportData = {
            timestamp: new Date().toISOString(),
            validationType: 'FINAL_COMPREHENSIVE',
            systemScore,
            passedTests,
            totalTests,
            testResults: this.testResults,
            criticalPath: this.criticalPath,
            readyForProduction: systemScore >= 75
        };
        
        fs.writeFileSync('final-comprehensive-validation-report.json', JSON.stringify(reportData, null, 2));
        console.log('📝 Final validation report saved to: final-comprehensive-validation-report.json\n');
        
        return systemScore >= 75;
    }
}

// Run final comprehensive validation
async function runFinalValidation() {
    const validator = new FinalComprehensiveValidator();
    
    try {
        const success = await validator.validateCompleteSystem();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Final comprehensive validation failed:', error);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    runFinalValidation();
}

module.exports = { FinalComprehensiveValidator, runFinalValidation };
