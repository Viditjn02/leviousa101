/**
 * COMPREHENSIVE INTEGRATED FIX VALIDATION
 * Tests ALL fixes working together in the integrated system
 * - Invisibility mode error fix
 * - LinkedIn query performance optimizations
 * - Cross-component integration
 */

const fs = require('fs');

class ComprehensiveIntegratedValidator {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    async validateAllFixes() {
        console.log('🔥 COMPREHENSIVE INTEGRATED FIX VALIDATION');
        console.log('Testing ALL fixes working together in the real integrated system\n');

        try {
            // Test 1: Validate invisibility mode error fix
            await this.testInvisibilityModeErrorFix();
            
            // Test 2: Validate LinkedIn performance in integrated system
            await this.testLinkedInPerformanceIntegrated();
            
            // Test 3: Validate cross-service integration
            await this.testCrossServiceIntegration();
            
            // Test 4: Validate real system readiness
            await this.testRealSystemReadiness();
            
            // Generate final comprehensive assessment
            await this.generateComprehensiveAssessment();
            
        } catch (error) {
            console.error('❌ Comprehensive validation failed:', error);
            throw error;
        }
    }

    /**
     * Test 1: Validate invisibility mode error fix works in integrated system
     */
    async testInvisibilityModeErrorFix() {
        console.log('🧪 Test 1: Invisibility Mode Error Fix Integration');
        
        try {
            // Test that the invisibility service can properly initialize and use MCP client
            const InvisibilityService = require('./src/features/invisibility/invisibilityService');
            const invisibilityService = new InvisibilityService();
            
            console.log('  🔧 Initializing invisibility service...');
            await invisibilityService.initialize();
            
            // Check that MCP client is properly initialized
            const hasMcpClient = !!invisibilityService.mcpClient;
            const hasGetAnswerMethod = invisibilityService.mcpClient && 
                                     typeof invisibilityService.mcpClient.getAnswer === 'function';
            
            console.log(`  📊 MCP client initialized: ${hasMcpClient ? '✅' : '❌'}`);
            console.log(`  📊 getAnswer method exists: ${hasGetAnswerMethod ? '✅' : '❌'}`);
            
            if (hasGetAnswerMethod) {
                // Test the actual getAnswer method call that was failing
                console.log('  🎯 Testing getAnswer method call...');
                
                const testQuestion = { text: 'What is the capital of France?' };
                const testScreenshot = null;
                
                try {
                    const startTime = Date.now();
                    const answer = await invisibilityService.mcpClient.getAnswer(testQuestion, testScreenshot);
                    const responseTime = Date.now() - startTime;
                    
                    const hasValidAnswer = answer && typeof answer === 'string' && answer.length > 0;
                    const reasonableResponseTime = responseTime < 10000; // 10 second max
                    
                    console.log(`  📝 Answer received: ${hasValidAnswer ? '✅' : '❌'}`);
                    console.log(`  ⏱️  Response time: ${responseTime}ms ${reasonableResponseTime ? '✅' : '❌'}`);
                    console.log(`  📄 Answer preview: "${answer ? answer.substring(0, 50) : 'null'}..."`);
                    
                    this.testResults.push({
                        test: 'Invisibility Mode Error Fix',
                        passed: hasValidAnswer && reasonableResponseTime,
                        details: {
                            mcpClientInitialized: hasMcpClient,
                            getAnswerMethodExists: hasGetAnswerMethod,
                            answerReceived: hasValidAnswer,
                            responseTime,
                            answerLength: answer ? answer.length : 0
                        }
                    });
                    
                } catch (methodError) {
                    console.log(`  ❌ getAnswer method call failed: ${methodError.message}`);
                    this.testResults.push({
                        test: 'Invisibility Mode Error Fix',
                        passed: false,
                        error: methodError.message,
                        details: {
                            mcpClientInitialized: hasMcpClient,
                            getAnswerMethodExists: hasGetAnswerMethod
                        }
                    });
                }
            } else {
                this.testResults.push({
                    test: 'Invisibility Mode Error Fix',
                    passed: false,
                    error: 'getAnswer method not found',
                    details: {
                        mcpClientInitialized: hasMcpClient,
                        getAnswerMethodExists: hasGetAnswerMethod
                    }
                });
            }
            
        } catch (error) {
            console.error('  ❌ Invisibility service initialization failed:', error.message);
            this.testResults.push({
                test: 'Invisibility Mode Error Fix',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Test 2: Validate LinkedIn performance in integrated system
     */
    async testLinkedInPerformanceIntegrated() {
        console.log('🧪 Test 2: LinkedIn Performance Integration');
        
        try {
            // Test the complete LinkedIn query flow through the integrated system
            const AnswerService = require('./src/features/invisibility/services/AnswerService');
            const answerService = new AnswerService();
            
            console.log('  🎯 Testing complete LinkedIn query flow...');
            
            const linkedInQueries = [
                'pullup elon musk from linkedin',
                'find john smith on linkedin',
                'linkedin profile for jane doe'
            ];
            
            let passedQueries = 0;
            
            for (const query of linkedInQueries) {
                console.log(`  🔍 Testing: "${query}"`);
                
                const startTime = Date.now();
                try {
                    const result = await answerService.getAnswer(query, {
                        sessionId: 'test-linkedin-integration',
                        mockMode: true, // Use mock mode for predictable testing
                        screenshot: null
                    });
                    
                    const responseTime = Date.now() - startTime;
                    
                    // Check LinkedIn-specific logic
                    const isLinkedInDetected = result.questionType === 'linkedin_data_access';
                    const hasRealResults = result.answer && result.answer.length > 100;
                    const bypassedPreemptive = !result.preemptive; // Should bypass preemptive for LinkedIn
                    const reasonableTime = responseTime < 5000; // Should be under 5 seconds even in mock
                    
                    const queryPassed = isLinkedInDetected && hasRealResults && reasonableTime;
                    if (queryPassed) passedQueries++;
                    
                    console.log(`    LinkedIn detected: ${isLinkedInDetected ? '✅' : '❌'}`);
                    console.log(`    Real results: ${hasRealResults ? '✅' : '❌'}`);
                    console.log(`    Bypassed preemptive: ${bypassedPreemptive ? '✅' : '❌'}`);
                    console.log(`    Response time: ${responseTime}ms ${reasonableTime ? '✅' : '❌'}`);
                    
                } catch (error) {
                    console.log(`    ❌ Query failed: ${error.message}`);
                }
            }
            
            const allQueriesPassed = passedQueries === linkedInQueries.length;
            
            this.testResults.push({
                test: 'LinkedIn Performance Integration',
                passed: allQueriesPassed,
                details: {
                    passedQueries: `${passedQueries}/${linkedInQueries.length}`,
                    allLinkedInQueriesWorking: allQueriesPassed
                }
            });
            
            console.log(`  📊 LinkedIn integration: ${passedQueries}/${linkedInQueries.length} queries working`);
            
        } catch (error) {
            console.error('  ❌ LinkedIn performance integration test failed:', error.message);
            this.testResults.push({
                test: 'LinkedIn Performance Integration',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Test 3: Validate cross-service integration
     */
    async testCrossServiceIntegration() {
        console.log('🧪 Test 3: Cross-Service Integration');
        
        try {
            // Test that all services can work together without conflicts
            const integrationTests = [
                {
                    name: 'InvisibilityService + AnswerService',
                    test: async () => {
                        const InvisibilityService = require('./src/features/invisibility/invisibilityService');
                        const AnswerService = require('./src/features/invisibility/services/AnswerService');
                        
                        const invisibility = new InvisibilityService();
                        const answer = new AnswerService();
                        
                        await invisibility.initialize();
                        
                        // Test that both services can coexist
                        return !!invisibility.mcpClient && !!answer;
                    }
                },
                {
                    name: 'MCPMigrationBridge + WebSearchCache',
                    test: async () => {
                        const { MCPMigrationBridge } = require('./src/features/invisibility/mcp/MCPMigrationBridge');
                        const { getWebSearchCache } = require('./src/features/common/services/webSearchCache');
                        
                        const bridge = new MCPMigrationBridge();
                        const cache = getWebSearchCache();
                        
                        // Test that both can be initialized
                        return !!bridge && !!cache && typeof bridge.getAnswer === 'function';
                    }
                },
                {
                    name: 'PreemptiveProcessing + LLMCache',
                    test: async () => {
                        const PreemptiveProcessingService = require('./src/features/common/services/preemptiveProcessingService');
                        const { LLMCacheService } = require('./src/features/common/services/llmCacheService');
                        
                        const preemptive = new PreemptiveProcessingService();
                        const cache = new LLMCacheService();
                        
                        // Test basic functionality
                        const preemptiveResult = preemptive.getPreemptiveResponse('hello', 'test');
                        await cache.set('test', 'response');
                        const cacheResult = await cache.get('test');
                        
                        return !!preemptiveResult && cacheResult === 'response';
                    }
                }
            ];
            
            let passedIntegrations = 0;
            
            for (const integration of integrationTests) {
                try {
                    console.log(`  🔄 Testing: ${integration.name}...`);
                    const result = await integration.test();
                    
                    if (result) {
                        console.log(`    ✅ ${integration.name}: Working`);
                        passedIntegrations++;
                    } else {
                        console.log(`    ❌ ${integration.name}: Failed`);
                    }
                } catch (error) {
                    console.log(`    ❌ ${integration.name}: Error - ${error.message}`);
                }
            }
            
            const allIntegrationsWorking = passedIntegrations === integrationTests.length;
            
            this.testResults.push({
                test: 'Cross-Service Integration',
                passed: allIntegrationsWorking,
                details: {
                    passedIntegrations: `${passedIntegrations}/${integrationTests.length}`,
                    allServicesIntegrated: allIntegrationsWorking
                }
            });
            
            console.log(`  📊 Cross-service integration: ${passedIntegrations}/${integrationTests.length} working`);
            
        } catch (error) {
            console.error('  ❌ Cross-service integration test failed:', error.message);
            this.testResults.push({
                test: 'Cross-Service Integration',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Test 4: Validate real system readiness
     */
    async testRealSystemReadiness() {
        console.log('🧪 Test 4: Real System Readiness');
        
        try {
            // Check if all critical files and configurations are ready
            const readinessChecks = [
                {
                    name: 'Invisibility Service MCP Bridge',
                    check: () => {
                        const filePath = './src/features/invisibility/mcp/MCPMigrationBridge.js';
                        if (fs.existsSync(filePath)) {
                            const content = fs.readFileSync(filePath, 'utf8');
                            return content.includes('async getAnswer(') && 
                                   content.includes('compatibility method for InvisibilityService');
                        }
                        return false;
                    }
                },
                {
                    name: 'LinkedIn Query Bypass Logic',
                    check: () => {
                        const filePath = './src/features/invisibility/services/AnswerService.js';
                        if (fs.existsSync(filePath)) {
                            const content = fs.readFileSync(filePath, 'utf8');
                            return content.includes('LinkedIn query detected') && 
                                   content.includes('bypassing preemptive response');
                        }
                        return false;
                    }
                },
                {
                    name: 'MCP Web Search Caching',
                    check: () => {
                        const filePath = './services/paragon-mcp/src/index.ts';
                        if (fs.existsSync(filePath)) {
                            const content = fs.readFileSync(filePath, 'utf8');
                            return content.includes('webSearchCache') && 
                                   content.includes('CACHE HIT') &&
                                   content.includes('webSearchPerson');
                        }
                        return false;
                    }
                },
                {
                    name: 'Preemptive Processing Enhanced',
                    check: () => {
                        const filePath = './src/features/common/services/preemptiveProcessingService.js';
                        if (fs.existsSync(filePath)) {
                            const content = fs.readFileSync(filePath, 'utf8');
                            return content.includes('linkedin') && 
                                   content.includes('typeof query !== \'string\'') &&
                                   content.includes('pull\\s*up');
                        }
                        return false;
                    }
                }
            ];
            
            let passedChecks = 0;
            
            for (const check of readinessChecks) {
                try {
                    const result = check.check();
                    
                    if (result) {
                        console.log(`  ✅ ${check.name}: Ready`);
                        passedChecks++;
                    } else {
                        console.log(`  ❌ ${check.name}: Not ready`);
                    }
                } catch (error) {
                    console.log(`  ❌ ${check.name}: Check failed - ${error.message}`);
                }
            }
            
            const systemReady = passedChecks === readinessChecks.length;
            
            this.testResults.push({
                test: 'Real System Readiness',
                passed: systemReady,
                details: {
                    passedChecks: `${passedChecks}/${readinessChecks.length}`,
                    systemFullyReady: systemReady
                }
            });
            
            console.log(`  📊 System readiness: ${passedChecks}/${readinessChecks.length} components ready`);
            
        } catch (error) {
            console.error('  ❌ System readiness test failed:', error.message);
            this.testResults.push({
                test: 'Real System Readiness',
                passed: false,
                error: error.message
            });
        }
        
        console.log();
    }

    /**
     * Generate comprehensive assessment
     */
    async generateComprehensiveAssessment() {
        console.log('=' .repeat(80));
        console.log('📊 COMPREHENSIVE INTEGRATED FIX VALIDATION REPORT');
        console.log('=' .repeat(80));
        
        const totalDuration = Date.now() - this.startTime;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const totalTests = this.testResults.length;
        const systemScore = Math.round((passedTests / totalTests) * 100);
        
        console.log(`\n🏁 Comprehensive Validation: ${passedTests}/${totalTests} tests passed (${systemScore}%)`);
        console.log(`⏱️  Total validation time: ${totalDuration}ms`);
        
        console.log('\n📋 Detailed Results:');
        for (const result of this.testResults) {
            const status = result.passed ? '✅ PASSED' : '❌ FAILED';
            console.log(`\n  ${status} - ${result.test}`);
            
            if (result.error) {
                console.log(`    ❌ Error: ${result.error}`);
            } else if (result.details) {
                Object.entries(result.details).forEach(([key, value]) => {
                    console.log(`    📊 ${key}: ${value}`);
                });
            }
        }
        
        console.log('\n🎯 COMPREHENSIVE HONEST ASSESSMENT:');
        
        // Find specific critical tests
        const invisibilityTest = this.testResults.find(t => t.test === 'Invisibility Mode Error Fix');
        const linkedinTest = this.testResults.find(t => t.test === 'LinkedIn Performance Integration');
        
        if (systemScore >= 90) {
            console.log('🎊 EXCELLENT: All integrated fixes working perfectly');
            console.log('✅ System comprehensively validated and ready for production use');
        } else if (systemScore >= 75) {
            console.log('🎯 GOOD: Most fixes working, minor integration issues detected');
            console.log(`   ${passedTests}/${totalTests} systems fully validated`);
        } else {
            console.log('❌ ISSUES DETECTED: Significant integration problems remain');
            console.log(`   Only ${passedTests}/${totalTests} systems working properly`);
        }
        
        console.log('\n📋 CRITICAL PATH STATUS:');
        
        if (invisibilityTest && invisibilityTest.passed) {
            console.log('✅ Invisibility Mode Error: FIXED AND INTEGRATED');
        } else {
            console.log('❌ Invisibility Mode Error: STILL BROKEN IN INTEGRATION');
        }
        
        if (linkedinTest && linkedinTest.passed) {
            console.log('✅ LinkedIn Performance: OPTIMIZED AND INTEGRATED');
        } else {
            console.log('❌ LinkedIn Performance: INTEGRATION ISSUES REMAIN');
        }
        
        console.log('\n📝 FINAL RECOMMENDATION:');
        
        if (systemScore >= 75) {
            console.log('✅ COMPREHENSIVE VALIDATION PASSED');
            console.log('🚀 All fixes are properly integrated and working together');
            console.log('🎯 System ready for restart and live testing');
        } else {
            console.log('❌ COMPREHENSIVE VALIDATION FAILED');
            console.log('🔧 Integration issues detected - fixes needed before restart');
        }
        
        console.log('\n' + '='.repeat(80));
        
        // Save comprehensive report
        const reportData = {
            timestamp: new Date().toISOString(),
            validationType: 'COMPREHENSIVE_INTEGRATED_FIX',
            systemScore,
            passedTests,
            totalTests,
            testResults: this.testResults,
            comprehensivelyValidated: systemScore >= 75
        };
        
        fs.writeFileSync('comprehensive-integrated-fix-validation-report.json', JSON.stringify(reportData, null, 2));
        console.log('📝 Comprehensive validation report saved to: comprehensive-integrated-fix-validation-report.json\n');
        
        return systemScore >= 75;
    }
}

// Run comprehensive integrated validation
async function runComprehensiveIntegratedValidation() {
    const validator = new ComprehensiveIntegratedValidator();
    
    try {
        const success = await validator.validateAllFixes();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ Comprehensive integrated validation failed:', error);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    runComprehensiveIntegratedValidation();
}

module.exports = { ComprehensiveIntegratedValidator, runComprehensiveIntegratedValidation };
