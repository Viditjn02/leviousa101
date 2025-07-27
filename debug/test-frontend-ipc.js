const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Test what the frontend receives via IPC
async function testFrontendIPC() {
    console.log('🔍 Testing Frontend IPC...\n');
    
    try {
        await app.whenReady();
        
        // Initialize the invisibility service (needed for MCP)
        const InvisibilityService = require('../src/features/invisibility/invisibilityService');
        global.invisibilityService = new InvisibilityService();
        await global.invisibilityService.initialize();
        
        // Initialize the bridge
        const { initializeInvisibilityBridge } = require('../src/features/invisibility/invisibilityBridge');
        initializeInvisibilityBridge();
        
        console.log('✅ Services initialized\n');
        
        // Test the actual IPC handler that the frontend calls
        const testRegistry = async () => {
            try {
                const service = global.invisibilityService;
                if (!service || !service.mcpClient || !service.mcpClient.mcpConfigManager) {
                    console.log('❌ Service chain not available');
                    return null;
                }
                
                // This is exactly what the IPC handler does
                const registry = service.mcpClient.mcpConfigManager.getOAuthServicesRegistry();
                
                if (!registry) {
                    console.log('❌ OAuth services registry not loaded');
                    return null;
                }
                
                console.log('📊 Registry returned by IPC:');
                console.log('- Has services:', !!(registry && registry.services));
                console.log('- Total services in registry:', registry.services ? Object.keys(registry.services).length : 0);
                
                if (registry.services) {
                    const allServices = Object.entries(registry.services);
                    const enabledServices = allServices.filter(([_, service]) => service.enabled);
                    const disabledServices = allServices.filter(([_, service]) => !service.enabled);
                    
                    console.log('- Enabled services:', enabledServices.length);
                    console.log('- Disabled services:', disabledServices.length);
                    
                    console.log('\n📋 Enabled Services (what UI should show):');
                    enabledServices
                        .sort(([,a], [,b]) => (a.priority || 999) - (b.priority || 999))
                        .forEach(([key, service], index) => {
                            console.log(`${index + 1}. ${service.name} (${key}) - Priority: ${service.priority}`);
                        });
                    
                    console.log('\n📋 Disabled Services (should be in "More Services"):');
                    disabledServices
                        .sort(([,a], [,b]) => (a.priority || 999) - (b.priority || 999))
                        .forEach(([key, service], index) => {
                            console.log(`${index + 1}. ${service.name} (${key}) - Priority: ${service.priority}`);
                        });
                }
                
                return registry;
                
            } catch (error) {
                console.error('❌ Error in test:', error);
                return null;
            }
        };
        
        await testRegistry();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        console.log('\n✅ Test completed');
        app.quit();
    }
}

// Run the test
testFrontendIPC(); 