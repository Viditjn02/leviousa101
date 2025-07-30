#!/usr/bin/env node

/**
 * Debug MCP startup process to find why get_authenticated_services tool is not found
 */

const path = require('path');

async function debugMCPStartup() {
    console.log('🔍 Debugging MCP Startup Process...\n');
    
    try {
        // Import the MCPMigrationBridge exactly like the application does
        const { MCPMigrationBridge } = require('./src/features/invisibility/mcp/MCPMigrationBridge');
        
        console.log('1️⃣ Creating MCPMigrationBridge...');
        const mcpBridge = new MCPMigrationBridge({
            enableConnectionPool: true,
            enableCircuitBreaker: true,
            enableMetrics: true,
            maxConcurrentConnections: 10
        });
        
        console.log('2️⃣ Initializing MCPMigrationBridge...');
        await mcpBridge.initialize();
        
        console.log('3️⃣ Checking server registry...');
        const serverRegistry = mcpBridge.serverRegistry;
        console.log('Available server definitions:', Object.keys(serverRegistry.serverDefinitions || {}));
        
        console.log('4️⃣ Checking registered servers...');
        const servers = serverRegistry.servers;
        console.log('Registered servers:', Array.from(servers.keys()));
        
        console.log('5️⃣ Checking tool registry...');
        const toolRegistry = mcpBridge.toolRegistry;
        const tools = toolRegistry.tools;
        console.log('Available tools:', Array.from(tools.keys()));
        
        console.log('6️⃣ Testing tool call...');
        try {
            const result = await mcpBridge.callTool('get_authenticated_services', {});
            console.log('✅ Tool call SUCCESS:', result);
        } catch (error) {
            console.log('❌ Tool call FAILED:', error.message);
            
            // Additional debugging
            console.log('\n🔬 Detailed Debugging:');
            
            // Check if Paragon server is running
            const paragonServer = servers.get('paragon');
            if (paragonServer) {
                console.log('Paragon server state:', {
                    status: paragonServer.status,
                    hasAdapter: !!paragonServer.adapter,
                    tools: paragonServer.tools?.map(t => t.name) || []
                });
            } else {
                console.log('❌ Paragon server not found in registry');
            }
            
            // Check tool registry in detail
            console.log('Tool registry detailed:');
            for (const [toolName, toolInfo] of tools) {
                console.log(`  - ${toolName}: server=${toolInfo.serverName}`);
            }
        }
        
        // Wait a bit for any async operations
        setTimeout(() => {
            console.log('\n📊 Final State Check:');
            console.log('Servers:', Array.from(servers.keys()));
            console.log('Tools:', Array.from(tools.keys()));
            process.exit(0);
        }, 3000);
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        process.exit(1);
    }
}

debugMCPStartup().catch(console.error);