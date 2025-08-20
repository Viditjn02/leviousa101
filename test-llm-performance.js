/**
 * LLM Performance Test Suite
 * Tests and benchmarks the ultra-fast LLM optimizations
 */

const { createLLM, createStreamingLLM, createUltraFastLLM } = require('./src/features/common/ai/factory');
const { getUltraFastLLMService } = require('./src/features/common/ai/ultraFastLLMService');
const { getLLMCacheService } = require('./src/features/common/services/llmCacheService');
const { getParallelLLMOrchestrator } = require('./src/features/common/ai/parallelLLMOrchestrator');
const settingsService = require('./src/features/settings/settingsService');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

// Test queries
const TEST_QUERIES = [
    'What is the capital of France?',
    'Explain quantum computing in simple terms',
    'What are the latest news about AI?',
    'How do I implement a binary search tree?',
    'What is happening with the stock market today?',
    'Write a quick Python function to reverse a string',
    'What tools do you have access to?',
    'Can you access my Google Drive?',
];

async function measureLatency(name, fn) {
    const startTime = Date.now();
    let firstTokenTime = null;
    let fullResponseTime = null;
    let content = '';
    
    try {
        const result = await fn();
        
        if (result.stream) {
            // Handle streaming response
            const reader = result.stream.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (!firstTokenTime && value) {
                    firstTokenTime = Date.now() - startTime;
                }
                
                if (done) {
                    fullResponseTime = Date.now() - startTime;
                    break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                content += chunk;
            }
        } else if (result.body) {
            // Handle response with body property
            const reader = result.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (!firstTokenTime && value) {
                    firstTokenTime = Date.now() - startTime;
                }
                
                if (done) {
                    fullResponseTime = Date.now() - startTime;
                    break;
                }
                
                const chunk = decoder.decode(value, { stream: true });
                
                // Parse SSE format
                const lines = chunk.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            content += data.choices?.[0]?.delta?.content || '';
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
        } else {
            // Non-streaming response
            firstTokenTime = Date.now() - startTime;
            fullResponseTime = firstTokenTime;
            content = result.content || result.response?.text?.() || JSON.stringify(result);
        }
        
        return {
            success: true,
            firstTokenLatency: firstTokenTime,
            fullResponseLatency: fullResponseTime,
            contentLength: content.length,
            cached: result.cached || false,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            latency: Date.now() - startTime,
        };
    }
}

async function testStandardLLM(settings) {
    console.log(`\n${colors.yellow}Testing Standard LLM...${colors.reset}`);
    
    const results = [];
    
    for (const query of TEST_QUERIES.slice(0, 3)) {
        const result = await measureLatency(`Standard: ${query}`, async () => {
            const llm = createStreamingLLM('openai', {
                apiKey: settings.get('OPENAI_API_KEY'),
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 500,
            });
            
            return await llm.streamChat([{ role: 'user', content: query }]);
        });
        
        results.push(result);
        
        console.log(`  Query: "${query.substring(0, 50)}..."`);
        if (result.success) {
            console.log(`    ✅ First token: ${colors.green}${result.firstTokenLatency}ms${colors.reset}`);
            console.log(`    ✅ Full response: ${result.fullResponseLatency}ms (${result.contentLength} chars)`);
        } else {
            console.log(`    ❌ Error: ${colors.red}${result.error}${colors.reset}`);
        }
    }
    
    return results;
}

async function testUltraFastLLM(settings) {
    console.log(`\n${colors.cyan}Testing Ultra-Fast LLM...${colors.reset}`);
    
    const results = [];
    
    for (const query of TEST_QUERIES) {
        const result = await measureLatency(`Ultra-Fast: ${query}`, async () => {
            const llm = createUltraFastLLM('openai', {
                apiKey: settings.get('OPENAI_API_KEY'),
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 500,
            });
            
            return await llm.streamChat([{ role: 'user', content: query }]);
        });
        
        results.push(result);
        
        console.log(`  Query: "${query.substring(0, 50)}..."`);
        if (result.success) {
            const cacheIndicator = result.cached ? ' (CACHED)' : '';
            const latencyColor = result.firstTokenLatency < 100 ? colors.green : colors.yellow;
            console.log(`    ✅ First token: ${latencyColor}${result.firstTokenLatency}ms${colors.reset}${cacheIndicator}`);
            console.log(`    ✅ Full response: ${result.fullResponseLatency}ms (${result.contentLength} chars)`);
        } else {
            console.log(`    ❌ Error: ${colors.red}${result.error}${colors.reset}`);
        }
    }
    
    return results;
}

async function testCachePerformance(settings) {
    console.log(`\n${colors.blue}Testing Cache Performance...${colors.reset}`);
    
    const cacheService = getLLMCacheService();
    
    // Clear cache for clean test
    await cacheService.clear();
    
    const testQuery = 'What is the meaning of life?';
    const results = [];
    
    // First call - should miss cache
    console.log('  First call (cache miss expected):');
    const firstResult = await measureLatency('Cache Miss', async () => {
        const ultraFast = getUltraFastLLMService();
        return await ultraFast.generateResponse({
            prompt: testQuery,
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: settings.get('OPENAI_API_KEY'),
            stream: true,
        });
    });
    results.push(firstResult);
    console.log(`    Latency: ${firstResult.firstTokenLatency}ms`);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Second call - should hit cache
    console.log('  Second call (cache hit expected):');
    const secondResult = await measureLatency('Cache Hit', async () => {
        const ultraFast = getUltraFastLLMService();
        return await ultraFast.generateResponse({
            prompt: testQuery,
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: settings.get('OPENAI_API_KEY'),
            stream: true,
        });
    });
    results.push(secondResult);
    console.log(`    Latency: ${colors.green}${secondResult.firstTokenLatency}ms${colors.reset} ${secondResult.cached ? '(CACHED ✓)' : ''}`);
    
    // Test semantic similarity
    console.log('  Testing semantic similarity cache:');
    const similarQuery = 'What is the purpose of life?';
    const similarResult = await measureLatency('Semantic Match', async () => {
        const ultraFast = getUltraFastLLMService();
        return await ultraFast.generateResponse({
            prompt: similarQuery,
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: settings.get('OPENAI_API_KEY'),
            stream: true,
        });
    });
    results.push(similarResult);
    console.log(`    Latency: ${similarResult.firstTokenLatency}ms ${similarResult.cached ? '(SEMANTIC MATCH ✓)' : ''}`);
    
    // Show cache stats
    const stats = cacheService.getStats();
    console.log(`\n  ${colors.bright}Cache Statistics:${colors.reset}`);
    console.log(`    Total requests: ${stats.totalRequests}`);
    console.log(`    Memory hits: ${stats.memoryHits}`);
    console.log(`    Disk hits: ${stats.diskHits}`);
    console.log(`    Semantic matches: ${stats.semanticMatches}`);
    console.log(`    Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    
    return results;
}

async function testParallelOrchestrator(settings) {
    console.log(`\n${colors.yellow}Testing Parallel Orchestrator with Ultra-Fast Streaming...${colors.reset}`);
    
    const orchestrator = getParallelLLMOrchestrator();
    const results = [];
    
    const testQueries = [
        { query: 'What is 2+2?', type: 'simple' },
        { query: 'What are the latest AI developments?', type: 'web-search' },
        { query: 'Explain recursion in programming', type: 'knowledge' },
    ];
    
    for (const { query, type } of testQueries) {
        console.log(`  Testing ${type} query: "${query.substring(0, 40)}..."`);
        
        const result = await measureLatency(`Orchestrator: ${query}`, async () => {
            return await orchestrator.executeUltraFastStreaming(query, {
                standardProvider: 'openai',
                standardModel: 'gpt-4o-mini',
                webProvider: 'perplexity',
                webModel: 'sonar',
                temperature: 0.7,
                maxTokens: 500,
            });
        });
        
        results.push(result);
        
        if (result.success) {
            const latencyColor = result.firstTokenLatency < 100 ? colors.green : 
                                result.firstTokenLatency < 200 ? colors.yellow : colors.red;
            console.log(`    ✅ First token: ${latencyColor}${result.firstTokenLatency}ms${colors.reset}`);
            console.log(`    ✅ Full response: ${result.fullResponseLatency}ms`);
            if (result.cached) {
                console.log(`    📦 Response was cached`);
            }
        } else {
            console.log(`    ❌ Error: ${colors.red}${result.error}${colors.reset}`);
        }
    }
    
    return results;
}

async function generateSummary(allResults) {
    console.log(`\n${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}                  PERFORMANCE SUMMARY                   ${colors.reset}`);
    console.log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);
    
    // Calculate averages for each test type
    const testTypes = Object.keys(allResults);
    
    for (const testType of testTypes) {
        const results = allResults[testType].filter(r => r.success);
        if (results.length === 0) continue;
        
        const avgFirstToken = results.reduce((sum, r) => sum + r.firstTokenLatency, 0) / results.length;
        const avgFullResponse = results.reduce((sum, r) => sum + r.fullResponseLatency, 0) / results.length;
        const cachedCount = results.filter(r => r.cached).length;
        
        console.log(`${colors.cyan}${testType}:${colors.reset}`);
        console.log(`  Average first token: ${avgFirstToken < 100 ? colors.green : colors.yellow}${avgFirstToken.toFixed(0)}ms${colors.reset}`);
        console.log(`  Average full response: ${avgFullResponse.toFixed(0)}ms`);
        if (cachedCount > 0) {
            console.log(`  Cached responses: ${cachedCount}/${results.length}`);
        }
        console.log('');
    }
    
    // Performance metrics
    const ultraFastService = getUltraFastLLMService();
    const metrics = ultraFastService.getMetrics();
    
    if (metrics.firstTokenLatency.length > 0) {
        console.log(`${colors.bright}Ultra-Fast Service Metrics:${colors.reset}`);
        console.log(`  Average first token latency: ${colors.green}${metrics.avgFirstTokenLatency.toFixed(0)}ms${colors.reset}`);
        console.log(`  Average response time: ${metrics.avgResponseTime.toFixed(0)}ms`);
        console.log(`  Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
        console.log(`  Total requests: ${metrics.totalRequests}`);
    }
    
    // Success indicators
    const allUltraFastResults = [...(allResults['Ultra-Fast LLM'] || []), ...(allResults['Parallel Orchestrator'] || [])];
    const sub100msCount = allUltraFastResults.filter(r => r.success && r.firstTokenLatency < 100).length;
    const totalCount = allUltraFastResults.filter(r => r.success).length;
    
    console.log(`\n${colors.bright}🎯 Goal Achievement:${colors.reset}`);
    if (totalCount > 0) {
        const percentage = (sub100msCount / totalCount * 100).toFixed(1);
        const achievementColor = percentage >= 50 ? colors.green : colors.yellow;
        console.log(`  Sub-100ms responses: ${achievementColor}${sub100msCount}/${totalCount} (${percentage}%)${colors.reset}`);
        
        if (percentage >= 50) {
            console.log(`\n${colors.green}✨ SUCCESS! Achieved sub-100ms LLM responses in ${percentage}% of requests! ✨${colors.reset}`);
        } else {
            console.log(`\n${colors.yellow}⚡ Partial success - ${percentage}% of responses under 100ms${colors.reset}`);
        }
    }
}

async function main() {
    console.log(`${colors.bright}${colors.cyan}LLM Performance Test Suite${colors.reset}`);
    console.log(`${colors.cyan}Testing ultra-fast optimizations for sub-100ms responses${colors.reset}\n`);
    
    try {
        // Load settings
        const settings = settingsService;
        
        if (!settings.get('OPENAI_API_KEY')) {
            console.error(`${colors.red}Error: OpenAI API key not found in settings${colors.reset}`);
            process.exit(1);
        }
        
        const allResults = {};
        
        // Run tests
        console.log(`${colors.bright}Starting performance tests...${colors.reset}`);
        
        // Test standard LLM (baseline)
        allResults['Standard LLM'] = await testStandardLLM(settings);
        
        // Test ultra-fast LLM
        allResults['Ultra-Fast LLM'] = await testUltraFastLLM(settings);
        
        // Test cache performance
        allResults['Cache Performance'] = await testCachePerformance(settings);
        
        // Test parallel orchestrator with ultra-fast
        allResults['Parallel Orchestrator'] = await testParallelOrchestrator(settings);
        
        // Generate summary
        await generateSummary(allResults);
        
        // Cleanup
        const ultraFastService = getUltraFastLLMService();
        await ultraFastService.cleanup();
        
        console.log(`\n${colors.green}✅ All tests completed successfully!${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
        process.exit(1);
    }
}

// Run tests
main().catch(console.error);