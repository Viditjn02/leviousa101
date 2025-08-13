/**
 * Debug: Compare standalone successful query vs system failing query
 */

require('dotenv').config();

async function testQueryComparison() {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    console.log('🔍 DEBUGGING QUERY DISCREPANCY');
    console.log('='.repeat(60));
    
    if (!PERPLEXITY_API_KEY) {
        console.error('❌ PERPLEXITY_API_KEY not found');
        return;
    }
    
    const testQueries = [
        {
            name: "STANDALONE SUCCESS QUERY",
            query: "Shubhan Dua professional background",
            description: "Query that worked in standalone test"
        },
        {
            name: "SYSTEM FAILING QUERY", 
            query: "\"shubhan dua\" professional background linkedin profile current role company",
            description: "Exact query from system logs that returns 'no results'"
        },
        {
            name: "SIMPLIFIED SYSTEM QUERY",
            query: "Shubhan Dua linkedin professional",
            description: "Simplified version of system query"
        },
        {
            name: "BASIC NAME ONLY",
            query: "Shubhan Dua",
            description: "Just the name with no additional context"
        }
    ];
    
    for (const test of testQueries) {
        console.log(`\n🧪 ${test.name}`);
        console.log('-'.repeat(50));
        console.log(`Query: ${test.query}`);
        console.log(`Description: ${test.description}`);
        
        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar-pro',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional information researcher. Provide concise, factual information about the person including their current role, company, and professional background.'
                        },
                        {
                            role: 'user',
                            content: test.query
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.2,
                    return_citations: true
                })
            });
            
            if (!response.ok) {
                console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
                continue;
            }
            
            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '';
            const citations = result.citations || [];
            
            console.log('📊 RESULT ANALYSIS:');
            console.log(`✅ Content length: ${content.length} chars`);
            console.log(`📚 Citations: ${citations.length} found`);
            
            // Check if it contains real info or "no results"
            const hasRealInfo = !content.toLowerCase().includes('no publicly available') &&
                              !content.toLowerCase().includes('no relevant search results') &&
                              !content.toLowerCase().includes('cannot provide verified') &&
                              content.length > 100;
                              
            console.log(`🎯 Has real info: ${hasRealInfo ? '✅ YES' : '❌ NO'}`);
            
            if (hasRealInfo) {
                console.log(`📝 Preview: ${content.substring(0, 150)}...`);
                if (citations.length > 0) {
                    console.log(`🔗 First citation: ${citations[0]}`);
                }
            } else {
                console.log(`❌ Failure content: ${content.substring(0, 200)}...`);
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('- Compare which queries return real info vs "no results"');
    console.log('- This will show us what query format actually works');
    console.log('- Then we can fix the system to use the working format');
}

testQueryComparison().catch(console.error);
