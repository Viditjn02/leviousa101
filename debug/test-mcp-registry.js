const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MCPConfigManager = require('../src/config/mcpConfig.js');

async function testRegistryLoading() {
    console.log('🔍 Testing MCP Registry Loading...\n');
    
    try {
        // Initialize the config manager
        const configManager = new MCPConfigManager();
        await configManager.initialize();
        
        console.log('✅ MCPConfigManager initialized successfully\n');
        
        // Get the OAuth services registry
        const registry = configManager.getOAuthServicesRegistry();
        
        if (!registry) {
            console.log('❌ No registry found');
            return;
        }
        
        console.log('📊 Registry Metadata:');
        console.log('- Version:', registry.version);
        console.log('- Total Services:', registry.metadata?.totalServices);
        console.log('- Enabled Services:', registry.metadata?.enabledServices);
        console.log('- Last Updated:', registry.metadata?.lastUpdated);
        console.log();
        
        // Parse services
        const allServices = Object.entries(registry.services || {});
        const enabledServices = allServices.filter(([_, service]) => service.enabled);
        const disabledServices = allServices.filter(([_, service]) => !service.enabled);
        
        console.log('📋 Service Breakdown:');
        console.log(`- Total services in registry: ${allServices.length}`);
        console.log(`- Enabled services: ${enabledServices.length}`);
        console.log(`- Disabled services: ${disabledServices.length}`);
        console.log();
        
        console.log('✅ ENABLED Services (should appear in UI):');
        enabledServices
            .sort(([,a], [,b]) => (a.priority || 999) - (b.priority || 999))
            .forEach(([key, service], index) => {
                console.log(`${index + 1}. ${service.name} (${key}) - Priority: ${service.priority}`);
            });
        
        console.log('\n⏸️ DISABLED Services (should appear in "More Services"):');
        disabledServices
            .sort(([,a], [,b]) => (a.priority || 999) - (b.priority || 999))
            .forEach(([key, service], index) => {
                console.log(`${index + 1}. ${service.name} (${key}) - Priority: ${service.priority}`);
            });
        
        console.log('\n🔍 Testing available OAuth services...');
        const availableServices = configManager.getAvailableOAuthServices();
        console.log(`Available OAuth services: ${availableServices.length}`);
        availableServices.forEach((service, index) => {
            console.log(`${index + 1}. ${service.name} (${service.key}) - Provider: ${service.provider}`);
        });
        
    } catch (error) {
        console.error('❌ Error testing registry loading:', error);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testRegistryLoading().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
}); 