/**
 * Standalone Perplexity API test to verify correct usage and get real results
 */

require('dotenv').config();

async function testPerplexityAPI() {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    console.log('🧪 Testing Perplexity API...');
    console.log('API Key:', PERPLEXITY_API_KEY ? `Found (${PERPLEXITY_API_KEY.substring(0, 8)}...)` : 'NOT FOUND');
    
    if (!PERPLEXITY_API_KEY) {
        console.error('❌ PERPLEXITY_API_KEY not found in environment');
        return;
    }
    
    // Test different model names and queries
    const testCases = [
        {
            description: 'Simple query with sonar-pro',
            model: 'sonar-pro',
            query: 'What is the capital of France?'
        },
        {
            description: 'Person search with sonar-pro',
            model: 'sonar-pro', 
            query: 'Elon Musk current role company'
        },
        {
            description: 'Test llama-3.1-sonar-small-128k-chat',
            model: 'llama-3.1-sonar-small-128k-chat',
            query: 'Elon Musk Tesla CEO background'
        },
        {
            description: 'Test llama-3.1-sonar-large-128k-chat',
            model: 'llama-3.1-sonar-large-128k-chat',
            query: 'Elon Musk Tesla CEO background'
        },
        {
            description: 'Shubhan Dua with sonar-pro',
            model: 'sonar-pro',
            query: 'Shubhan Dua professional background'
        },
        {
            description: 'Test sonar-small-chat',
            model: 'sonar-small-chat',
            query: 'Elon Musk'
        },
        {
            description: 'Test sonar-medium-chat',
            model: 'sonar-medium-chat',
            query: 'Elon Musk'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🔍 ${testCase.description}`);
        console.log('=' .repeat(50));
        console.log(`Model: ${testCase.model}`);
        console.log(`Query: ${testCase.query}`);
        
        try {
            console.log('📤 Sending request...');
            
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: testCase.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that provides factual information.'
                        },
                        {
                            role: 'user',
                            content: testCase.query
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.2,
                    return_citations: true
                })
            });
            
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`❌ Error response:`, errorText);
                continue;
            }
            
            const result = await response.json();
            console.log('✅ Success!');
            console.log('📝 Content:', result.choices?.[0]?.message?.content?.substring(0, 200) + '...');
            console.log('📚 Citations:', result.citations?.length || 0, 'found');
            
            if (result.citations && result.citations.length > 0) {
                console.log('🔗 First citation:', result.citations[0]);
            }
            
        } catch (error) {
            console.log(`❌ Request error: ${error.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function main() {
    try {
        await testPerplexityAPI();
        console.log('\n✅ All tests completed!');
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

main();
