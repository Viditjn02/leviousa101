/**
 * Simple MCP Connection Test
 * Tests basic connection between MCPAdapter and a simple MCP server
 */

const path = require('path');
const fs = require('fs').promises;
const MCPAdapter = require('../src/features/invisibility/mcp/MCPAdapter');

async function testSimpleConnection() {
    console.log('=== Simple MCP Connection Test ===\n');
    
    // Create a minimal MCP server using the correct SDK API
    const serverCode = `
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
    name: 'test-server',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

// Import request schemas
const { 
    ListToolsRequestSchema,
    CallToolRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
        name: 'ping',
        description: 'Simple ping tool',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    }]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'ping') {
        return {
            content: [{
                type: 'text',
                text: 'pong'
            }]
        };
    }
    throw new Error('Unknown tool');
});

async function run() {
    try {
        console.error('[Server] Starting test server...');
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('[Server] Test server running');
    } catch (error) {
        console.error('[Server] Error:', error.message);
        process.exit(1);
    }
}

run();
`;

    try {
        // Write server to a temporary file
        const serverFile = path.join(__dirname, 'temp-test-server.js');
        await fs.writeFile(serverFile, serverCode);

        // Create adapter and connect using command and args
        console.log('Connecting MCPAdapter...');
        const adapter = new MCPAdapter({
            name: 'test-client',
            version: '1.0.0'
        });

        // Use inherit for stderr to see server errors during development
        await adapter.connectToServer('node', [serverFile], { stderr: 'inherit' });
        console.log('✓ Connected successfully');

        // Wait a bit for discovery to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Test tool discovery
        const tools = adapter.getTools();
        console.log(`\n✓ Discovered ${tools.length} tools:`, tools.map(t => t.name));

        // Test tool invocation
        console.log('\nCalling ping tool...');
        const result = await adapter.callTool('ping', {});
        console.log('✓ Tool result:', result);

        // Disconnect
        await adapter.disconnect();
        console.log('\n✓ Disconnected successfully');

        // Cleanup
        await fs.unlink(serverFile);
        
        console.log('\n✅ Test passed!');
        return true;

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        
        // Cleanup on error
        try {
            await fs.unlink(path.join(__dirname, 'temp-test-server.js'));
        } catch (e) {
            // Ignore cleanup errors
        }
        
        return false;
    }
}

// Run the test
if (require.main === module) {
    testSimpleConnection().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testSimpleConnection }; 