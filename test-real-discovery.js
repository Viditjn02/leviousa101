// Test real dynamic application discovery vs hardcoded garbage
// Validates that we're actually discovering real apps on the system

async function testRealApplicationDiscovery() {
    console.log('\n🔍 Testing REAL Application Discovery vs Hardcoded Garbage\n');
    console.log('=' .repeat(70));
    
    try {
        // Test 1: Initialize the service with real discovery
        console.log('\n🔧 Test 1: Real Dynamic Discovery');
        
        // Mock global.askService for testing
        if (!global.askService) {
            global.askService = {
                generateResponse: async (prompt, model) => {
                    return JSON.stringify(['browse web', 'manage files', 'create content']);
                }
            };
        }
        
        const IntelligentAutomationService = require('./src/features/voiceAgent/intelligentAutomationService');
        const automationService = new IntelligentAutomationService();
        
        const result = await automationService.initialize();
        
        if (result.success) {
            console.log('  ✅ Service initialized with real discovery');
        } else {
            throw new Error('Service initialization failed: ' + result.error);
        }
        
        // Test 2: Verify real applications were discovered
        console.log('\n🔧 Test 2: Verify Real Applications Found');
        
        const status = automationService.getStatus();
        const discoveredApps = Array.from(automationService.availableApplications.keys());
        
        console.log(`  📊 Applications discovered: ${status.availableApplications}`);
        console.log(`  🟢 Running applications: ${status.runningApplications}`);
        
        // Check if we found the apps we know exist on this system
        const knownRealApps = ['Google Chrome', 'Discord', 'Slack', 'Cursor', 'Claude', 'ChatGPT'];
        const foundRealApps = knownRealApps.filter(app => discoveredApps.includes(app));
        
        console.log(`  🎯 Known real apps found: ${foundRealApps.length}/${knownRealApps.length}`);
        console.log(`  📋 Found: ${foundRealApps.join(', ')}`);
        
        // Check if we avoided the old hardcoded garbage
        const oldHardcodedGarbage = ['Adobe Photoshop', 'Adobe Illustrator', 'Sketch', 'Figma', 'VS Code', 'Xcode'];
        const foundGarbage = oldHardcodedGarbage.filter(app => discoveredApps.includes(app));
        
        console.log(`  🗑️ Old hardcoded garbage avoided: ${oldHardcodedGarbage.length - foundGarbage.length}/${oldHardcodedGarbage.length}`);
        if (foundGarbage.length > 0) {
            console.log(`  ⚠️ Still found garbage: ${foundGarbage.join(', ')}`);
        }
        
        // Test 3: Show actual discovered applications
        console.log('\n🔧 Test 3: Show Real Discovered Applications');
        console.log('  📱 First 10 discovered applications:');
        
        discoveredApps.slice(0, 10).forEach((app, index) => {
            const appInfo = automationService.availableApplications.get(app);
            console.log(`    ${index + 1}. ${app} ${appInfo.isRunning ? '🟢' : '⚪'} (${appInfo.source})`);
        });
        
        if (discoveredApps.length > 10) {
            console.log(`    ... and ${discoveredApps.length - 10} more applications`);
        }
        
        // Test 4: Validate discovery method
        console.log('\n🔧 Test 4: Validate Discovery Method');
        
        const sampleApp = automationService.availableApplications.get(discoveredApps[0]);
        if (sampleApp?.source === 'dynamic_discovery') {
            console.log('  ✅ Using REAL dynamic discovery (not hardcoded)');
        } else if (sampleApp?.source === 'emergency_fallback') {
            console.log('  ⚠️ Using emergency fallback (discovery failed)');
        } else {
            console.log('  ❌ Still using hardcoded methods');
        }
        
        // Test 5: Compare with system command output
        console.log('\n🔧 Test 5: Cross-Reference with System Commands');
        
        const { execSync } = require('child_process');
        const systemApps = execSync(`ls -1 /Applications | grep -E '\\.app$' | sed 's/\\.app$//'`, { encoding: 'utf8' })
            .trim().split('\n').filter(app => app.length > 0);
        
        console.log(`  🖥️ System command found: ${systemApps.length} applications`);
        console.log(`  🔍 Service discovered: ${discoveredApps.length} applications`);
        
        const matchedApps = systemApps.filter(app => discoveredApps.includes(app));
        const matchRate = Math.round((matchedApps.length / systemApps.length) * 100);
        
        console.log(`  🎯 Match rate: ${matchedApps.length}/${systemApps.length} (${matchRate}%)`);
        
        if (matchRate >= 90) {
            console.log('  ✅ Excellent match with system reality');
        } else if (matchRate >= 70) {
            console.log('  ⚠️ Good match, some discrepancies');
        } else {
            console.log('  ❌ Poor match, still hardcoded?');
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎉 Real Discovery Test Results:');
        console.log(`✅ Dynamic discovery: ${status.availableApplications > 20 ? 'WORKING' : 'FAILED'}`);
        console.log(`✅ Real apps found: ${foundRealApps.length > 3 ? 'YES' : 'NO'}`);
        console.log(`✅ Hardcoded garbage avoided: ${foundGarbage.length === 0 ? 'YES' : 'NO'}`);
        console.log(`✅ System match rate: ${matchRate}%`);
        
        if (matchRate >= 90 && foundRealApps.length >= 3 && foundGarbage.length === 0) {
            console.log('\n🎯 REAL DYNAMIC DISCOVERY SUCCESSFUL!');
            console.log('No more hardcoded garbage - discovering actual installed apps!');
            return true;
        } else {
            console.log('\n⚠️ Discovery working but could be improved');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Real discovery test failed:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testRealApplicationDiscovery()
        .then(success => {
            console.log(`\n🎯 Overall Result: ${success ? 'REAL DISCOVERY WORKS' : 'NEEDS IMPROVEMENT'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = testRealApplicationDiscovery;
