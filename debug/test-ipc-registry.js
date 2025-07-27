const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Load environment
require('dotenv').config();

// Test the IPC registry functionality
async function testIPCRegistry() {
    console.log('🔍 Testing IPC Registry Bridge...\n');
    
    try {
        // Initialize the app without creating windows
        await app.whenReady();
        
        // Initialize the invisibility service (needed for MCP)
        const InvisibilityService = require('../src/features/invisibility/invisibilityService');
        global.invisibilityService = new InvisibilityService();
        await global.invisibilityService.initialize();
        
        // Initialize the bridge
        const { initializeInvisibilityBridge } = require('../src/features/invisibility/invisibilityBridge');
        initializeInvisibilityBridge();
        
        console.log('✅ Invisibility service and bridge initialized\n');
        
        // Test the getRegistryServices IPC call directly
        const testEvent = { returnValue: null };
        
        // Simulate the IPC call
        const registryPromise = new Promise((resolve) => {
            // Hook into the IPC handler
            const originalHandle = ipcMain.handle;
            ipcMain.handle = function(channel, handler) {
                if (channel === 'mcp:getRegistryServices') {
                    console.log('🔧 Found getRegistryServices handler');
                    // Call the handler directly
                    handler(testEvent).then(result => {
                        console.log('📡 IPC Handler Result:');
                        console.log('- Type:', typeof result);
                        console.log('- Is null/undefined:', result == null);
                        
                        if (result && result.services) {
                            console.log('- Has services:', true);
                            console.log('- Service count:', Object.keys(result.services).length);
                            console.log('- Service keys:', Object.keys(result.services));
                            
                            const enabled = Object.entries(result.services).filter(([_, service]) => service.enabled);
                            const disabled = Object.entries(result.services).filter(([_, service]) => !service.enabled);
                            
                            console.log('- Enabled services:', enabled.length);
                            console.log('- Disabled services:', disabled.length);
                            
                            console.log('\n📋 Enabled Services:');
                            enabled.sort(([,a], [,b]) => (a.priority || 999) - (b.priority || 999))
                                   .forEach(([key, service], index) => {
                                console.log(`${index + 1}. ${service.name} (${key})`);
                            });
                            
                            console.log('\n📋 Disabled Services:');
                            disabled.sort(([,a], [,b]) => (a.priority || 999) - (b.priority || 999))
                                    .forEach(([key, service], index) => {
                                console.log(`${index + 1}. ${service.name} (${key})`);
                            });
                        } else {
                            console.log('- No services found');
                        }
                        
                        resolve(result);
                    }).catch(error => {
                        console.error('❌ IPC Handler Error:', error);
                        resolve(null);
                    });
                    
                    return;
                }
                // Call original handle for other channels
                return originalHandle.call(this, channel, handler);
            };
            
            // Re-initialize the bridge to register the handler
            require('../src/features/invisibility/invisibilityBridge').initializeInvisibilityBridge();
        });
        
        await registryPromise;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    } finally {
        console.log('\n✅ Test completed');
        app.quit();
    }
}

// Run the test
testIPCRegistry(); 