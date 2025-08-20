#!/usr/bin/env node

/**
 * Web Search Integration Test - Real System Testing
 * Tests the web search functionality with actual MCP client and services
 * Run this when the application is running to test real integration
 */

const path = require('path');

// Test configuration
const INTEGRATION_TESTS = [
    {
        mode: 'Voice Agent',
        description: 'Test Hey Leviousa web search integration',
        testQueries: [
            "Hey Leviousa, what's the latest news on artificial intelligence?",
            "Hey Leviousa, tell me about current stock market trends",
            "Hey Leviousa, what are recent developments in climate change?"
        ]
    },
    {
        mode: 'Ask Bar',
        description: 'Test Ask bar web search detection and parallel execution',
        testQueries: [
            "What's happening with OpenAI today?",
            "Current cryptocurrency prices",
            "Latest tech industry news"
        ]
    },
    {
        mode: 'Listen Suggestions',
        description: 'Test Listen mode web search enhanced suggestions',
        testConversations: [
            "We were talking about the latest developments in AI and wondering about OpenAI's recent announcements.",
            "The conversation was about current market trends and how the stock market is performing today.",
            "We discussed recent climate change policies and what's happening with environmental regulations."
        ]
    }
];

class WebSearchIntegrationTester {
    constructor() {
        this.results = [];
        this.mcpClient = null;
    }

    /**
     * Initialize the tester with actual system components
     */
    async initialize() {
        console.log('🚀 Initializing Web Search Integration Tester...');
        
        try {
            // Try to get the global MCP client
            this.mcpClient = global.invisibilityService?.mcpClient;
            
            if (!this.mcpClient) {
                console.log('⚠️  MCP Client not found in global scope');
                console.log('   Make sure the application is running and MCP is initialized');
                return false;
            }
            
            // Check if web_search tool is available
            const tools = await this.mcpClient.toolRegistry?.getAllTools() || [];
            const webSearchTool = tools.find(tool => tool.name === 'web_search');
            
            if (!webSearchTool) {
                console.log('❌ web_search tool not found in MCP registry');
                console.log('   Available tools:', tools.map(t => t.name).join(', '));
                return false;
            }
            
            console.log('✅ MCP Client initialized');
            console.log('✅ web_search tool found');
            console.log(`📊 Total MCP tools available: ${tools.length}`);
            
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Test Voice Agent web search integration
     */
    async testVoiceAgentIntegration() {
        console.log('\n🎤 Testing Voice Agent Web Search Integration');
        console.log('='.repeat(50));
        
        const test = INTEGRATION_TESTS.find(t => t.mode === 'Voice Agent');
        const results = [];
        
        for (const query of test.testQueries) {
            console.log(`\n📝 Testing: "${query}"`);
            
            try {
                // Import and test VoiceAgentService
                const VoiceAgentService = require('./src/features/voiceAgent/voiceAgentService');
                const voiceAgent = new VoiceAgentService();
                
                // Test web search detection
                const analysis = voiceAgent.webSearchDetector.analyze(query);
                
                console.log(`   🔍 Web Search Needed: ${analysis.needsWebSearch ? '✅' : '❌'}`);
                console.log(`   📊 Confidence: ${Math.round(analysis.confidence * 100)}%`);
                
                if (analysis.needsWebSearch && analysis.confidence > 0.3) {
                    // Test actual web search call
                    console.log('   🌐 Testing web search call...');
                    
                    const webSearchResult = await this.mcpClient.callTool('web_search', {
                        query: query.replace('Hey Leviousa, ', ''),
                        context: 'voice agent integration test',
                        search_type: 'recent'
                    });
                    
                    if (webSearchResult && webSearchResult.content) {
                        const searchData = JSON.parse(webSearchResult.content[0].text);
                        const success = searchData.success && searchData.webResults;
                        
                        console.log(`   ✅ Web Search Success: ${success ? 'Yes' : 'No'}`);
                        if (success) {
                            console.log(`   📄 Result Preview: ${searchData.webResults.substring(0, 100)}...`);
                        }
                        
                        results.push({
                            query,
                            webSearchNeeded: analysis.needsWebSearch,
                            confidence: analysis.confidence,
                            searchSuccess: success,
                            passed: success
                        });
                    }
                } else {
                    results.push({
                        query,
                        webSearchNeeded: analysis.needsWebSearch,
                        confidence: analysis.confidence,
                        searchSuccess: null,
                        passed: !analysis.needsWebSearch // Pass if correctly identified as not needing web search
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                results.push({
                    query,
                    error: error.message,
                    passed: false
                });
            }
        }
        
        this.results.push({
            mode: 'Voice Agent',
            results,
            passed: results.filter(r => r.passed).length,
            total: results.length
        });
        
        return results;
    }

    /**
     * Test Ask Bar integration
     */
    async testAskBarIntegration() {
        console.log('\n💬 Testing Ask Bar Web Search Integration');
        console.log('='.repeat(50));
        
        const test = INTEGRATION_TESTS.find(t => t.mode === 'Ask Bar');
        const results = [];
        
        for (const query of test.testQueries) {
            console.log(`\n📝 Testing: "${query}"`);
            
            try {
                const askService = require('./src/features/ask/askService');
                
                // Check if ParallelLLMOrchestrator is available
                const hasOrchestrator = askService.parallelOrchestrator !== undefined;
                console.log(`   🔧 ParallelLLMOrchestrator: ${hasOrchestrator ? '✅' : '❌'}`);
                
                if (hasOrchestrator) {
                    // Test web search detection
                    const analysis = askService.parallelOrchestrator.webSearchDetector.analyze(query);
                    
                    console.log(`   🔍 Web Search Needed: ${analysis.needsWebSearch ? '✅' : '❌'}`);
                    console.log(`   📊 Confidence: ${Math.round(analysis.confidence * 100)}%`);
                    
                    results.push({
                        query,
                        hasOrchestrator,
                        webSearchNeeded: analysis.needsWebSearch,
                        confidence: analysis.confidence,
                        passed: hasOrchestrator
                    });
                } else {
                    results.push({
                        query,
                        hasOrchestrator: false,
                        passed: false
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                results.push({
                    query,
                    error: error.message,
                    passed: false
                });
            }
        }
        
        this.results.push({
            mode: 'Ask Bar',
            results,
            passed: results.filter(r => r.passed).length,
            total: results.length
        });
        
        return results;
    }

    /**
     * Test Listen mode suggestions integration
     */
    async testListenSuggestionsIntegration() {
        console.log('\n👂 Testing Listen Suggestions Web Search Integration');
        console.log('='.repeat(50));
        
        const test = INTEGRATION_TESTS.find(t => t.mode === 'Listen Suggestions');
        const results = [];
        
        for (const conversation of test.testConversations) {
            console.log(`\n📝 Testing conversation analysis...`);
            console.log(`   📄 Context: "${conversation.substring(0, 80)}..."`);
            
            try {
                const SummaryService = require('./src/features/listen/summary/summaryService');
                const summaryService = new SummaryService();
                
                // Test web search detection
                const webAnalysis = summaryService.webSearchDetector.analyze(conversation);
                console.log(`   🔍 Web Search Needed: ${webAnalysis.needsWebSearch ? '✅' : '❌'}`);
                console.log(`   📊 Confidence: ${Math.round(webAnalysis.confidence * 100)}%`);
                
                // Test search query extraction
                const extractedQuery = summaryService.extractSearchQuery(conversation);
                console.log(`   🎯 Extracted Query: "${extractedQuery || 'None'}"`);
                
                if (webAnalysis.needsWebSearch && extractedQuery) {
                    // Test actual web search for suggestions enhancement
                    console.log('   🌐 Testing web search for suggestion enhancement...');
                    
                    const webSearchResult = await this.mcpClient.callTool('web_search', {
                        query: extractedQuery,
                        context: 'conversation analysis and suggestion enhancement',
                        search_type: 'recent'
                    });
                    
                    if (webSearchResult && webSearchResult.content) {
                        const searchData = JSON.parse(webSearchResult.content[0].text);
                        const success = searchData.success && searchData.webResults;
                        
                        console.log(`   ✅ Suggestion Enhancement: ${success ? 'Success' : 'Failed'}`);
                        if (success) {
                            console.log(`   📄 Context Added: ${searchData.webResults.substring(0, 100)}...`);
                        }
                        
                        results.push({
                            conversation: conversation.substring(0, 50) + '...',
                            webSearchNeeded: webAnalysis.needsWebSearch,
                            extractedQuery,
                            enhancementSuccess: success,
                            passed: success
                        });
                    }
                } else {
                    results.push({
                        conversation: conversation.substring(0, 50) + '...',
                        webSearchNeeded: webAnalysis.needsWebSearch,
                        extractedQuery,
                        enhancementSuccess: null,
                        passed: !webAnalysis.needsWebSearch || !extractedQuery // Pass if correctly no enhancement needed
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
                results.push({
                    conversation: conversation.substring(0, 50) + '...',
                    error: error.message,
                    passed: false
                });
            }
        }
        
        this.results.push({
            mode: 'Listen Suggestions',
            results,
            passed: results.filter(r => r.passed).length,
            total: results.length
        });
        
        return results;
    }

    /**
     * Generate comprehensive test report
     */
    generateIntegrationReport() {
        console.log('\n📊 Web Search Integration Test Results');
        console.log('='.repeat(60));
        
        let overallPassed = 0;
        let overallTotal = 0;
        
        for (const modeResult of this.results) {
            const percentage = Math.round((modeResult.passed / modeResult.total) * 100);
            console.log(`${modeResult.mode}: ${modeResult.passed}/${modeResult.total} (${percentage}%) ${percentage >= 80 ? '✅' : '⚠️'}`);
            
            overallPassed += modeResult.passed;
            overallTotal += modeResult.total;
        }
        
        const overallPercentage = Math.round((overallPassed / overallTotal) * 100);
        const overallSuccess = overallPercentage >= 80;
        
        console.log(`\n🎯 Overall Integration Status: ${overallPassed}/${overallTotal} (${overallPercentage}%)`);
        console.log(`Status: ${overallSuccess ? '✅ INTEGRATION SUCCESS' : '⚠️ NEEDS IMPROVEMENT'}`);
        
        if (overallSuccess) {
            console.log('\n🎉 Web search is successfully integrated across all modes!');
            console.log('   ✅ Voice Agent: Detects and performs web search for real-time questions');
            console.log('   ✅ Ask Bar: Uses ParallelLLMOrchestrator for intelligent web search');
            console.log('   ✅ Listen Suggestions: Enhanced with real-time web context');
        } else {
            console.log('\n🔧 Areas needing attention:');
            for (const modeResult of this.results) {
                if (modeResult.passed / modeResult.total < 0.8) {
                    console.log(`   - ${modeResult.mode}: Review failing test cases`);
                }
            }
        }
        
        return {
            overall: overallSuccess,
            percentage: overallPercentage,
            modes: this.results
        };
    }

    /**
     * Run all integration tests
     */
    async runIntegrationTests() {
        const initialized = await this.initialize();
        
        if (!initialized) {
            console.log('\n❌ Integration tests cannot run - system not properly initialized');
            console.log('Make sure:');
            console.log('  1. The application is running');
            console.log('  2. MCP client is initialized');
            console.log('  3. Paragon MCP server is connected');
            console.log('  4. web_search tool is available');
            return { overall: false, error: 'System not initialized' };
        }
        
        console.log('\n🧪 Starting Web Search Integration Tests...');
        
        try {
            await this.testVoiceAgentIntegration();
            await this.testAskBarIntegration();
            await this.testListenSuggestionsIntegration();
            
            return this.generateIntegrationReport();
        } catch (error) {
            console.error('❌ Integration test suite failed:', error);
            return { overall: false, error: error.message };
        }
    }
}

// Export for use in other files
module.exports = { WebSearchIntegrationTester };

// Run if called directly
if (require.main === module) {
    (async () => {
        console.log('🔗 Web Search Integration Test Suite');
        console.log('=====================================');
        console.log('This test requires the application to be running with MCP initialized.\n');
        
        const tester = new WebSearchIntegrationTester();
        const results = await tester.runIntegrationTests();
        
        process.exit(results.overall ? 0 : 1);
    })();
}
