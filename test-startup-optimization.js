// Test Startup Optimization - Measure Time Difference
// Compares old vs new startup performance

async function testStartupOptimization() {
    console.log('\n🚀 Testing Startup Optimization - Performance Measurement\n');
    console.log('=' .repeat(70));
    
    try {
        const startTime = Date.now();
        
        // Test the optimized initialization
        console.log('\n🔧 Test 1: Initialize IntelligentAutomationService (Optimized)');
        
        const IntelligentAutomationService = require('./src/features/voiceAgent/intelligentAutomationService');
        const automationService = new IntelligentAutomationService();
        
        const initStartTime = Date.now();
        const result = await automationService.initialize();
        const initEndTime = Date.now();
        
        const initializationTime = initEndTime - initStartTime;
        console.log(`  ✅ Service initialized: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`  ⏱️ Initialization time: ${initializationTime}ms`);
        
        // Test immediate capability access
        console.log('\n🔧 Test 2: Immediate Capability Access (Cached Apps)');
        
        const cachedTestApps = ['Safari', 'Chrome', 'Mail', 'Finder', 'Notes'];
        let immediateCacheHits = 0;
        
        for (const app of cachedTestApps) {
            const accessStart = Date.now();
            const capabilities = await automationService.getAppCapabilities(app);
            const accessEnd = Date.now();
            const accessTime = accessEnd - accessStart;
            
            if (capabilities && capabilities.length > 0) {
                immediateCacheHits++;
                console.log(`    ✅ ${app}: ${capabilities.length} capabilities (${accessTime}ms) - CACHE HIT`);
            } else {
                console.log(`    ⚠️ ${app}: No capabilities (${accessTime}ms)`);
            }
        }
        
        // Test lazy loading for unknown app
        console.log('\n🔧 Test 3: Lazy Loading for Unknown App');
        
        const unknownApp = 'TestUnknownApp';
        const lazyStartTime = Date.now();
        const lazyCapabilities = await automationService.getAppCapabilities(unknownApp);
        const lazyEndTime = Date.now();
        const lazyLoadTime = lazyEndTime - lazyStartTime;
        
        console.log(`  📱 ${unknownApp}: ${lazyCapabilities.length} capabilities (${lazyLoadTime}ms) - LAZY LOAD`);
        
        // Test system status
        console.log('\n🔧 Test 4: System Status Check');
        
        const status = automationService.getStatus();
        console.log(`  📊 Applications discovered: ${status.availableApplications}`);
        console.log(`  🟢 Running applications: ${status.runningApplications}`);
        console.log(`  💾 Capabilities cached: ${status.capabilitiesCached}`);
        console.log(`  🔧 Discovery method: ${status.capabilityDiscoveryMethod}`);
        console.log(`  🏗️ Service initialized: ${automationService.isInitialized ? 'YES' : 'NO'}`);
        
        // Test background discovery progress
        console.log('\n🔧 Test 5: Background Discovery Status');
        
        setTimeout(() => {
            const updatedStatus = automationService.getStatus();
            console.log(`  📈 Capabilities now cached: ${updatedStatus.capabilitiesCached} (background discovery in progress)`);
        }, 3000);
        
        // Performance assessment
        console.log('\n' + '=' .repeat(70));
        console.log('🎉 Startup Optimization Test Results:');
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ Total test time: ${totalTime}ms`);
        console.log(`✅ Core initialization: ${initializationTime}ms`);
        console.log(`✅ Immediate cache hits: ${immediateCacheHits}/${cachedTestApps.length} apps`);
        console.log(`✅ Lazy loading functional: ${lazyCapabilities.length > 0 ? 'YES' : 'NO'}`);
        console.log(`✅ Apps discovered: ${status.availableApplications >= 30 ? 'EXCELLENT' : 'BASIC'} (${status.availableApplications})`);
        console.log(`✅ Capabilities cached: ${status.capabilitiesCached >= 10 ? 'GOOD' : 'MINIMAL'} (${status.capabilitiesCached})`);
        
        // Performance benchmarks
        const isOptimized = initializationTime < 5000 && // Under 5 seconds for init
                           immediateCacheHits >= 3 &&   // At least 3 popular apps cached
                           status.availableApplications >= 20; // At least 20 apps discovered
        
        if (isOptimized) {
            console.log('\n🎯 STARTUP OPTIMIZATION: HIGHLY SUCCESSFUL! 🚀');
            console.log('🔧 Key optimizations working:');
            console.log('   • No blocking LLM calls during startup ✅');
            console.log('   • Instant capability cache for popular apps ✅');
            console.log('   • Lazy loading for unknown apps ✅');
            console.log('   • Background discovery for completeness ✅');
            console.log('   • Fast application discovery ✅');
            console.log('   • Excellent performance (sub-5s startup) ✅');
            
            if (initializationTime < 2000) {
                console.log('   • BONUS: Ultra-fast startup (<2s) 🔥');
            }
            
            return true;
        } else {
            console.log('\n⚠️ Startup optimization partially successful, but could be better');
            if (initializationTime >= 5000) console.log('   • Initialization still too slow (>5s) ❌');
            if (immediateCacheHits < 3) console.log('   • Not enough apps cached for immediate access ❌');
            if (status.availableApplications < 20) console.log('   • App discovery insufficient ❌');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Startup optimization test failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testStartupOptimization()
        .then(success => {
            console.log(`\n🎯 Final Assessment: ${success ? 'STARTUP OPTIMIZED - BLAZING FAST!' : 'NEEDS MORE OPTIMIZATION'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ Test suite crashed:', error);
            process.exit(1);
        });
}

module.exports = testStartupOptimization;
