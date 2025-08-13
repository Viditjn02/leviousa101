/**
 * Test if search_recency_filter is causing the discrepancy
 */

require('dotenv').config();

async function testRecencyFilter() {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    console.log('🔍 TESTING SEARCH_RECENCY_FILTER IMPACT');
    console.log('='.repeat(60));
    
    if (!PERPLEXITY_API_KEY) {
        console.error('❌ PERPLEXITY_API_KEY not found');
        return;
    }
    
    const query = '"shubhan dua" professional background linkedin profile current role company';
    
    const testCases = [
        {
            name: "WITHOUT search_recency_filter",
            params: {
                model: "sonar-pro",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional information researcher. Provide concise, factual information about the person including their current role, company, and professional background. Focus on publicly available LinkedIn and professional information. Include specific details when available such as job title, company name, location, and recent professional activities."
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 600,
                return_citations: true
            }
        },
        {
            name: "WITH search_recency_filter: month (MCP SERVICE)",
            params: {
                model: "sonar-pro",
                messages: [
                    {
                        role: "system", 
                        content: "You are a professional information researcher. Provide concise, factual information about the person including their current role, company, and professional background. Focus on publicly available LinkedIn and professional information. Include specific details when available such as job title, company name, location, and recent professional activities."
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 600,
                search_recency_filter: "month",
                return_citations: true
            }
        },
        {
            name: "WITH search_recency_filter: year",
            params: {
                model: "sonar-pro",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional information researcher. Provide concise, factual information about the person including their current role, company, and professional background. Focus on publicly available LinkedIn and professional information. Include specific details when available such as job title, company name, location, and recent professional activities."
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 600,
                search_recency_filter: "year",
                return_citations: true
            }
        }
    ];
    
    for (const test of testCases) {
        console.log(`\n🧪 ${test.name}`);
        console.log('-'.repeat(50));
        
        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(test.params)
            });
            
            if (!response.ok) {
                console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
                const errorText = await response.text();
                console.log(`Error: ${errorText}`);
                continue;
            }
            
            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '';
            const citations = result.citations || [];
            
            console.log(`📊 Content length: ${content.length} chars`);
            console.log(`📚 Citations: ${citations.length} found`);
            
            // Check if it contains real info or "no results"
            const hasRealInfo = !content.toLowerCase().includes('no publicly available') &&
                              !content.toLowerCase().includes('no relevant search results') &&
                              !content.toLowerCase().includes('cannot provide verified') &&
                              content.length > 100;
                              
            console.log(`🎯 Has real info: ${hasRealInfo ? '✅ YES' : '❌ NO'}`);
            
            if (hasRealInfo) {
                console.log(`📝 Preview: ${content.substring(0, 150)}...`);
            } else {
                console.log(`❌ Failure content: ${content.substring(0, 200)}...`);
            }
            
            if (citations.length > 0) {
                console.log(`🔗 Citations: ${citations.slice(0, 3).join(', ')}`);
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

testRecencyFilter().catch(console.error);
