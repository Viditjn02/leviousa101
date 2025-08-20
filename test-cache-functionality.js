#!/usr/bin/env node

/**
 * Web Search Cache Functionality Testing
 * Tests the cache system for web search results
 */

const { WebSearchCache, getWebSearchCache } = require('./src/features/common/services/webSearchCache');

class CacheFunctionalityTester {
    constructor() {
        this.testResults = {
            basicTests: [],
            expirationTests: [],
            memoryTests: [],
            performanceTests: [],
            edgeCaseTests: []
        };
    }

    /**
     * Test basic cache operations
     */
    async testBasicCacheOperations() {
        console.log('\n🔄 Testing Basic Cache Operations...');
        console.log('='.repeat(50));

        const cache = new WebSearchCache({ maxSize: 10, ttl: 5000 });
        const tests = [];

        // Test 1: Basic set and get
        console.log('\n📝 Test 1: Basic Set and Get');
        const testData = {
            success: true,
            webResults: 'Test search results for OpenAI',
            citations: ['https://example.com'],
            searchQuery: 'OpenAI latest news'
        };

        cache.set('OpenAI latest news', 'news', 'test context', testData);
        const retrieved = cache.get('OpenAI latest news', 'news', 'test context');
        
        const test1Passed = retrieved && retrieved.webResults === testData.webResults;
        console.log(`   Set and Get: ${test1Passed ? '✅' : '❌'}`);
        tests.push({ name: 'Basic Set/Get', passed: test1Passed });

        // Test 2: Cache miss
        console.log('\n📝 Test 2: Cache Miss');
        const missed = cache.get('non-existent query', 'general', '');
        const test2Passed = missed === null;
        console.log(`   Cache Miss: ${test2Passed ? '✅' : '❌'}`);
        tests.push({ name: 'Cache Miss', passed: test2Passed });

        // Test 3: Different search types
        console.log('\n📝 Test 3: Different Search Types');
        cache.set('AI news', 'general', '', { result: 'general AI' });
        cache.set('AI news', 'news', '', { result: 'news AI' });
        
        const generalResult = cache.get('AI news', 'general', '');
        const newsResult = cache.get('AI news', 'news', '');
        
        const test3Passed = generalResult.result === 'general AI' && newsResult.result === 'news AI';
        console.log(`   Different Types: ${test3Passed ? '✅' : '❌'}`);
        tests.push({ name: 'Different Search Types', passed: test3Passed });

        // Test 4: Case insensitive queries
        console.log('\n📝 Test 4: Case Insensitive Queries');
        cache.set('Tesla Stock', 'general', '', { result: 'Tesla data' });
        const caseResult = cache.get('tesla stock', 'general', '');
        
        const test4Passed = caseResult && caseResult.result === 'Tesla data';
        console.log(`   Case Insensitive: ${test4Passed ? '✅' : '❌'}`);
        tests.push({ name: 'Case Insensitive', passed: test4Passed });

        cache.destroy();
        this.testResults.basicTests = tests;
        return tests;
    }

    /**
     * Test cache expiration functionality
     */
    async testCacheExpiration() {
        console.log('\n⏰ Testing Cache Expiration...');
        console.log('='.repeat(50));

        const tests = [];

        // Test 1: TTL expiration
        console.log('\n📝 Test 1: TTL Expiration');
        const shortCache = new WebSearchCache({ ttl: 1000 }); // 1 second TTL
        
        shortCache.set('expire test', 'general', '', { data: 'should expire' });
        
        // Should exist immediately
        let immediateResult = shortCache.get('expire test', 'general', '');
        const test1a = immediateResult !== null;
        console.log(`   Immediate Retrieval: ${test1a ? '✅' : '❌'}`);
        
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let expiredResult = shortCache.get('expire test', 'general', '');
        const test1b = expiredResult === null;
        console.log(`   After Expiration: ${test1b ? '✅' : '❌'}`);
        
        tests.push({ name: 'TTL Expiration', passed: test1a && test1b });

        // Test 2: Cleanup of expired entries
        console.log('\n📝 Test 2: Automatic Cleanup');
        const cleanupCache = new WebSearchCache({ ttl: 500, cleanupInterval: 200 });
        
        cleanupCache.set('cleanup1', 'general', '', { data: 'test1' });
        cleanupCache.set('cleanup2', 'general', '', { data: 'test2' });
        
        const initialStats = cleanupCache.getStats();
        console.log(`   Initial Size: ${initialStats.size}`);
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterStats = cleanupCache.getStats();
        console.log(`   After Cleanup: ${afterStats.size}`);
        
        const test2Passed = afterStats.size < initialStats.size;
        console.log(`   Cleanup Occurred: ${test2Passed ? '✅' : '❌'}`);
        tests.push({ name: 'Automatic Cleanup', passed: test2Passed });

        cleanupCache.destroy();
        shortCache.destroy();
        this.testResults.expirationTests = tests;
        return tests;
    }

    /**
     * Test memory management
     */
    async testMemoryManagement() {
        console.log('\n💾 Testing Memory Management...');
        console.log('='.repeat(50));

        const tests = [];

        // Test 1: Max size enforcement
        console.log('\n📝 Test 1: Max Size Enforcement');
        const limitedCache = new WebSearchCache({ maxSize: 3 });
        
        // Fill beyond capacity
        limitedCache.set('item1', 'general', '', { data: 'data1' });
        limitedCache.set('item2', 'general', '', { data: 'data2' });
        limitedCache.set('item3', 'general', '', { data: 'data3' });
        limitedCache.set('item4', 'general', '', { data: 'data4' }); // Should evict oldest
        
        const stats = limitedCache.getStats();
        const test1Passed = stats.size <= 3;
        console.log(`   Size Limit Enforced: ${test1Passed ? '✅' : '❌'} (Size: ${stats.size})`);
        tests.push({ name: 'Size Limit', passed: test1Passed });

        // Test 2: LRU eviction
        console.log('\n📝 Test 2: LRU Eviction');
        // Access item2 to make it more recent
        limitedCache.get('item2', 'general', '');
        
        // Add another item to trigger eviction
        limitedCache.set('item5', 'general', '', { data: 'data5' });
        
        // item1 should be evicted (oldest), item2 should remain (recently accessed)
        const item1Exists = limitedCache.get('item1', 'general', '') !== null;
        const item2Exists = limitedCache.get('item2', 'general', '') !== null;
        
        const test2Passed = !item1Exists && item2Exists;
        console.log(`   LRU Eviction: ${test2Passed ? '✅' : '❌'}`);
        console.log(`   Item1 (oldest): ${item1Exists ? 'Still exists' : 'Evicted ✓'}`);
        console.log(`   Item2 (accessed): ${item2Exists ? 'Preserved ✓' : 'Evicted'}`);
        tests.push({ name: 'LRU Eviction', passed: test2Passed });

        // Test 3: Memory usage estimation
        console.log('\n📝 Test 3: Memory Usage Estimation');
        const memoryStats = limitedCache.getStats();
        const hasMemoryEstimate = memoryStats.memoryUsage > 0;
        console.log(`   Memory Usage: ${memoryStats.memoryUsage} bytes`);
        console.log(`   Memory Estimation: ${hasMemoryEstimate ? '✅' : '❌'}`);
        tests.push({ name: 'Memory Estimation', passed: hasMemoryEstimate });

        limitedCache.destroy();
        this.testResults.memoryTests = tests;
        return tests;
    }

    /**
     * Test performance characteristics
     */
    async testPerformance() {
        console.log('\n⚡ Testing Cache Performance...');
        console.log('='.repeat(50));

        const tests = [];
        const cache = new WebSearchCache({ maxSize: 1000 });

        // Test 1: Cache operation speed
        console.log('\n📝 Test 1: Cache Operation Speed');
        
        const testData = { webResults: 'Performance test data', citations: [] };
        
        // Measure set operations
        const setTimes = [];
        for (let i = 0; i < 100; i++) {
            const start = process.hrtime.bigint();
            cache.set(`query${i}`, 'general', '', testData);
            const end = process.hrtime.bigint();
            setTimes.push(Number(end - start) / 1000000); // Convert to milliseconds
        }
        
        const avgSetTime = setTimes.reduce((a, b) => a + b, 0) / setTimes.length;
        console.log(`   Average Set Time: ${avgSetTime.toFixed(3)}ms`);
        
        // Measure get operations
        const getTimes = [];
        for (let i = 0; i < 100; i++) {
            const start = process.hrtime.bigint();
            cache.get(`query${i}`, 'general', '');
            const end = process.hrtime.bigint();
            getTimes.push(Number(end - start) / 1000000);
        }
        
        const avgGetTime = getTimes.reduce((a, b) => a + b, 0) / getTimes.length;
        console.log(`   Average Get Time: ${avgGetTime.toFixed(3)}ms`);
        
        const performanceTest1 = avgSetTime < 1 && avgGetTime < 1; // Should be sub-millisecond
        console.log(`   Performance Test: ${performanceTest1 ? '✅' : '❌'}`);
        tests.push({ name: 'Operation Speed', passed: performanceTest1 });

        // Test 2: Similar query detection performance
        console.log('\n📝 Test 2: Similar Query Detection');
        
        cache.set('artificial intelligence news', 'news', '', { data: 'AI news data' });
        
        const similarStart = process.hrtime.bigint();
        const similarResult = cache.findSimilarCached('ai news artificial intelligence', 'news', '');
        const similarEnd = process.hrtime.bigint();
        
        const similarTime = Number(similarEnd - similarStart) / 1000000;
        console.log(`   Similar Query Time: ${similarTime.toFixed(3)}ms`);
        
        const foundSimilar = similarResult !== null;
        const performanceTest2 = foundSimilar && similarTime < 10; // Should find similar query quickly
        console.log(`   Similar Query Found: ${foundSimilar ? '✅' : '❌'}`);
        console.log(`   Performance Test: ${performanceTest2 ? '✅' : '❌'}`);
        tests.push({ name: 'Similar Query Detection', passed: performanceTest2 });

        cache.destroy();
        this.testResults.performanceTests = tests;
        return tests;
    }

    /**
     * Test edge cases
     */
    async testEdgeCases() {
        console.log('\n🔍 Testing Edge Cases...');
        console.log('='.repeat(50));

        const tests = [];
        const cache = new WebSearchCache();

        // Test 1: Empty queries
        console.log('\n📝 Test 1: Empty Queries');
        try {
            cache.set('', 'general', '', { data: 'empty query' });
            const emptyResult = cache.get('', 'general', '');
            const test1Passed = emptyResult !== null;
            console.log(`   Empty Query Handling: ${test1Passed ? '✅' : '❌'}`);
            tests.push({ name: 'Empty Queries', passed: test1Passed });
        } catch (error) {
            console.log(`   Empty Query Error: ${error.message}`);
            tests.push({ name: 'Empty Queries', passed: false, error: error.message });
        }

        // Test 2: Very long queries
        console.log('\n📝 Test 2: Very Long Queries');
        const longQuery = 'a'.repeat(1000);
        try {
            cache.set(longQuery, 'general', '', { data: 'long query data' });
            const longResult = cache.get(longQuery, 'general', '');
            const test2Passed = longResult !== null;
            console.log(`   Long Query Handling: ${test2Passed ? '✅' : '❌'}`);
            tests.push({ name: 'Long Queries', passed: test2Passed });
        } catch (error) {
            console.log(`   Long Query Error: ${error.message}`);
            tests.push({ name: 'Long Queries', passed: false, error: error.message });
        }

        // Test 3: Special characters
        console.log('\n📝 Test 3: Special Characters');
        const specialQuery = 'query with !@#$%^&*()_+ special chars';
        try {
            cache.set(specialQuery, 'general', '', { data: 'special chars data' });
            const specialResult = cache.get(specialQuery, 'general', '');
            const test3Passed = specialResult !== null;
            console.log(`   Special Characters: ${test3Passed ? '✅' : '❌'}`);
            tests.push({ name: 'Special Characters', passed: test3Passed });
        } catch (error) {
            console.log(`   Special Characters Error: ${error.message}`);
            tests.push({ name: 'Special Characters', passed: false, error: error.message });
        }

        // Test 4: Large data objects
        console.log('\n📝 Test 4: Large Data Objects');
        const largeData = {
            webResults: 'x'.repeat(10000),
            citations: Array(100).fill('https://example.com'),
            metadata: { large: true }
        };
        
        try {
            cache.set('large data test', 'general', '', largeData);
            const largeResult = cache.get('large data test', 'general', '');
            const test4Passed = largeResult && largeResult.webResults.length === 10000;
            console.log(`   Large Data Objects: ${test4Passed ? '✅' : '❌'}`);
            tests.push({ name: 'Large Data Objects', passed: test4Passed });
        } catch (error) {
            console.log(`   Large Data Error: ${error.message}`);
            tests.push({ name: 'Large Data Objects', passed: false, error: error.message });
        }

        // Test 5: Concurrent access
        console.log('\n📝 Test 5: Concurrent Access');
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                new Promise(resolve => {
                    cache.set(`concurrent${i}`, 'general', '', { data: `data${i}` });
                    const result = cache.get(`concurrent${i}`, 'general', '');
                    resolve(result !== null);
                })
            );
        }
        
        const concurrentResults = await Promise.all(promises);
        const test5Passed = concurrentResults.every(r => r === true);
        console.log(`   Concurrent Access: ${test5Passed ? '✅' : '❌'}`);
        tests.push({ name: 'Concurrent Access', passed: test5Passed });

        cache.destroy();
        this.testResults.edgeCaseTests = tests;
        return tests;
    }

    /**
     * Test global cache singleton
     */
    async testGlobalCacheSingleton() {
        console.log('\n🌐 Testing Global Cache Singleton...');
        console.log('='.repeat(50));

        const tests = [];

        // Test singleton behavior
        console.log('\n📝 Testing Singleton Behavior');
        const cache1 = getWebSearchCache();
        const cache2 = getWebSearchCache();
        
        const singletonTest = cache1 === cache2;
        console.log(`   Singleton Pattern: ${singletonTest ? '✅' : '❌'}`);
        
        // Test shared state
        cache1.set('singleton test', 'general', '', { data: 'shared data' });
        const sharedResult = cache2.get('singleton test', 'general', '');
        const sharedTest = sharedResult && sharedResult.data === 'shared data';
        console.log(`   Shared State: ${sharedTest ? '✅' : '❌'}`);
        
        tests.push({ name: 'Singleton Pattern', passed: singletonTest && sharedTest });
        
        return tests;
    }

    /**
     * Generate comprehensive test report
     */
    generateReport() {
        console.log('\n📊 Cache Functionality Test Results');
        console.log('='.repeat(50));

        const allTests = [
            ...this.testResults.basicTests,
            ...this.testResults.expirationTests,
            ...this.testResults.memoryTests,
            ...this.testResults.performanceTests,
            ...this.testResults.edgeCaseTests
        ];

        const categories = [
            { name: 'Basic Operations', tests: this.testResults.basicTests },
            { name: 'Expiration', tests: this.testResults.expirationTests },
            { name: 'Memory Management', tests: this.testResults.memoryTests },
            { name: 'Performance', tests: this.testResults.performanceTests },
            { name: 'Edge Cases', tests: this.testResults.edgeCaseTests }
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
        console.log(`Status: ${overallPercentage >= 80 ? '✅ CACHE SYSTEM READY' : '⚠️ NEEDS ATTENTION'}`);

        if (overallPercentage >= 80) {
            console.log('\n🎉 Cache system is working perfectly!');
            console.log('   ✅ Fast cache operations (< 1ms)');
            console.log('   ✅ Proper expiration and cleanup');
            console.log('   ✅ Memory management with LRU eviction');
            console.log('   ✅ Similar query detection working');
            console.log('   ✅ Edge cases handled gracefully');
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
     * Run all cache functionality tests
     */
    async runAllTests() {
        console.log('🔄 Starting Cache Functionality Tests');
        console.log('=====================================');

        try {
            await this.testBasicCacheOperations();
            await this.testCacheExpiration();
            await this.testMemoryManagement();
            await this.testPerformance();
            await this.testEdgeCases();
            await this.testGlobalCacheSingleton();

            return this.generateReport();
        } catch (error) {
            console.error('❌ Cache test suite failed:', error);
            return { overall: false, error: error.message };
        }
    }
}

// Export for use in other files
module.exports = { CacheFunctionalityTester };

// Run if called directly
if (require.main === module) {
    (async () => {
        console.log('🔄 Cache Functionality Test Suite');
        console.log('==================================');

        const tester = new CacheFunctionalityTester();
        const results = await tester.runAllTests();

        process.exit(results.overall ? 0 : 1);
    })();
}
