const { ParallelLLMOrchestrator, WebSearchDetector } = require('./src/features/common/ai/parallelLLMOrchestrator');
const { createLLM } = require('./src/features/common/ai/factory');

// Load environment variables
require('dotenv').config();

async function testPerplexityProvider() {
    console.log('🧪 Testing Perplexity Provider...');
    
    try {
        const perplexityLLM = createLLM('perplexity', {
            apiKey: process.env.PERPLEXITY_API_KEY,
            model: 'sonar',
            temperature: 0.2,
            maxTokens: 1024
        });

        const result = await perplexityLLM.chat([
            { role: 'user', content: 'What is the current weather in New York?' }
        ]);

        console.log('✅ Perplexity Provider Test Successful:');
        console.log('Response:', result.content.substring(0, 200) + '...');
        if (result.citations && result.citations.length > 0) {
            console.log('Citations:', result.citations.length);
        }
        
    } catch (error) {
        console.error('❌ Perplexity Provider Test Failed:', error.message);
    }
}

async function testWebSearchDetector() {
    console.log('\n🧪 Testing Web Search Detector...');
    
    const detector = new WebSearchDetector();
    
    const testQueries = [
        'What is the current weather in Paris?',
        'Explain quantum mechanics',
        'What are the latest news about AI?',
        'Who won the last Super Bowl?',
        'What is the theory of relativity?',
        'Current stock price of Apple',
        'Define photosynthesis'
    ];

    testQueries.forEach(query => {
        const analysis = detector.analyze(query);
        console.log(`Query: "${query}"`);
        console.log(`Web search needed: ${analysis.needsWebSearch} (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
        console.log(`Reasons: ${analysis.reasons.join(', ')}`);
        console.log('---');
    });
}

async function testParallelOrchestrator() {
    console.log('\n🧪 Testing Parallel LLM Orchestrator...');
    
    const orchestrator = new ParallelLLMOrchestrator();
    
    const testQueries = [
        'What is the current weather in London?', // Should use web LLM
        'Explain the concept of machine learning' // Should use standard LLM
    ];

    for (const query of testQueries) {
        try {
            console.log(`\nTesting query: "${query}"`);
            
            const result = await orchestrator.execute(query, {
                standardProvider: 'anthropic',
                webProvider: 'perplexity',
                forceParallel: true // Force parallel execution for testing
            });

            console.log(`Primary source: ${result.primarySource}`);
            console.log(`Reason: ${result.reason}`);
            console.log(`Response: ${result.content.substring(0, 200)}...`);
            
            if (result.citations && result.citations.length > 0) {
                console.log(`Citations: ${result.citations.length}`);
            }
            
        } catch (error) {
            console.error(`❌ Orchestrator test failed for "${query}":`, error.message);
        }
    }
}

async function runAllTests() {
    console.log('🚀 Starting Perplexity Integration Tests\n');
    
    // Test individual components
    await testPerplexityProvider();
    await testWebSearchDetector();
    await testParallelOrchestrator();
    
    console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testPerplexityProvider,
    testWebSearchDetector,
    testParallelOrchestrator,
    runAllTests
};