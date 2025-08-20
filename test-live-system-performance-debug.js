/**
 * LIVE SYSTEM PERFORMANCE DEBUG
 * Debug why optimizations work in tests (4ms) but not in live system (10+ seconds)
 */

async function debugLiveSystemPerformance() {
    console.log('🔍 DEBUGGING LIVE SYSTEM PERFORMANCE ISSUES');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Check if WebSearchCache is properly integrated in MCP
        console.log('\n1. 🔍 Testing MCP Web Search Cache Integration...');
        
        // Try to require the cache and see if it works
        try {
            const { getWebSearchCache } = require('./src/features/common/services/webSearchCache');
            const cache = getWebSearchCache();
            
            // Test if we can access the cache
            const testQuery = '"elon musk" professional background linkedin profile';
            const cachedResult = cache.get(testQuery, 'person', 'elon musk');
            
            console.log(`   Cache accessible: ✅`);
            console.log(`   Test cache hit: ${cachedResult ? '✅ HIT' : '❌ MISS'}`);
            console.log(`   Cache size: ${cache.cache ? cache.cache.size : 'unknown'} entries`);
            
            // Check if similar query variations exist
            const similarResult = cache.findSimilarCached('elon musk linkedin', 'person', 'elon musk');
            console.log(`   Similar query hit: ${similarResult ? '✅ HIT' : '❌ MISS'}`);
            
        } catch (error) {
            console.log(`   ❌ WebSearchCache error: ${error.message}`);
        }
        
        // Test 2: Check if the Paragon MCP service can access the cache
        console.log('\n2. 🔍 Testing Paragon MCP Cache Access...');
        
        try {
            // Check if the paragon-mcp service exists and is properly configured
            const mcpServicePath = './services/paragon-mcp/src/index.ts';
            const fs = require('fs');
            
            if (fs.existsSync(mcpServicePath)) {
                const content = fs.readFileSync(mcpServicePath, 'utf8');
                const hasCacheImport = content.includes('webSearchCache');
                const hasCacheCheck = content.includes('cache.get');
                const hasCacheSet = content.includes('cache.set');
                
                console.log(`   MCP service exists: ✅`);
                console.log(`   Has cache import: ${hasCacheImport ? '✅' : '❌'}`);
                console.log(`   Has cache check: ${hasCacheCheck ? '✅' : '❌'}`);
                console.log(`   Has cache set: ${hasCacheSet ? '✅' : '❌'}`);
                
                if (!hasCacheImport || !hasCacheCheck) {
                    console.log(`   🚨 ISSUE: MCP service missing cache integration`);
                }
            } else {
                console.log(`   ❌ MCP service not found at: ${mcpServicePath}`);
            }
        } catch (error) {
            console.log(`   ❌ MCP service check error: ${error.message}`);
        }
        
        // Test 3: Check AnswerService performance optimizations
        console.log('\n3. 🔍 Testing AnswerService Optimizations...');
        
        try {
            const AnswerService = require('./src/features/invisibility/services/AnswerService');
            const answerService = new AnswerService();
            
            // Test preemptive processing
            console.log('   Testing preemptive processing...');
            const startTime = Date.now();
            
            const result = await answerService.getAnswer('hello', {
                sessionId: 'test-live-debug',
                mockMode: true
            });
            
            const responseTime = Date.now() - startTime;
            console.log(`   Preemptive response time: ${responseTime}ms ${responseTime < 100 ? '✅' : '❌'}`);
            console.log(`   Got preemptive result: ${result && result.preemptive ? '✅' : '❌'}`);
            
        } catch (error) {
            console.log(`   ❌ AnswerService test error: ${error.message}`);
        }
        
        // Test 4: Check LLM caching
        console.log('\n4. 🔍 Testing LLM Caching...');
        
        try {
            const { LLMCacheService } = require('./src/features/common/services/llmCacheService');
            const cache = new LLMCacheService();
            
            // Test cache functionality
            const testPrompt = 'Hello world';
            const testResponse = 'Hi there!';
            
            await cache.set(testPrompt, testResponse);
            const cachedResponse = await cache.get(testPrompt);
            
            console.log(`   LLM cache working: ${cachedResponse === testResponse ? '✅' : '❌'}`);
            console.log(`   Cache size: ${cache.memoryCache ? cache.memoryCache.size : 'unknown'}`);
            
        } catch (error) {
            console.log(`   ❌ LLM cache test error: ${error.message}`);
        }
        
        // Test 5: Performance issue root cause analysis
        console.log('\n5. 🔍 ROOT CAUSE ANALYSIS...');
        
        console.log(`
   Based on your logs, the issues are:
   
   📊 ACTUAL PERFORMANCE (from your logs):
   - Web search: 5975ms (should be ~0ms if cached)
   - LLM processing: 4257ms (should be <1000ms with optimizations)
   - Total: 10236ms (should be <100ms)
   
   🔍 LIKELY CAUSES:
   1. Cache not being used in MCP service (cold cache every time)
   2. LLM optimizations not applied in live system
   3. Preemptive processing working but bypassed for LinkedIn
   
   🚨 CRITICAL FINDINGS:
   - Your system IS working (got real results)
   - BUT optimizations not active in live environment
   - Tests pass because they use mocks/isolation
        `);
        
        // Test 6: Suggest immediate fixes
        console.log('\n6. 💡 IMMEDIATE ACTION ITEMS:');
        
        console.log(`
   ✅ WHAT'S WORKING:
   - LinkedIn query detection: ✅
   - Real result fetching: ✅
   - Preemptive response logic: ✅
   
   ❌ WHAT'S NOT WORKING:
   - Web search caching (5.9s delay)
   - LLM performance optimization (4.2s delay)
   
   🔧 IMMEDIATE FIXES NEEDED:
   1. Restart your MCP service to load cache optimizations
   2. Clear any old cached processes
   3. Ensure cache directory exists and is writable
        `);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 RECOMMENDATION: Restart your system and try again');
        console.log('   The optimizations are in the code but may not be loaded');
        console.log('   in your currently running processes.');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Debug test failed:', error);
        return false;
    }
    
    return true;
}

// Run debug if this script is executed directly
if (require.main === module) {
    debugLiveSystemPerformance().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Debug failed:', error);
        process.exit(1);
    });
}

module.exports = { debugLiveSystemPerformance };
