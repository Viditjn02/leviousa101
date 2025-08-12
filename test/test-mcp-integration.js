/**
 * MCP Integration Tests
 * Tests the complete MCP implementation with real server connections
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// MCP Components
const MCPAdapter = require('../src/features/invisibility/mcp/MCPAdapter');
const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');
const ToolRegistry = require('../src/features/invisibility/mcp/ToolRegistry');
const OAuthManager = require('../src/features/invisibility/auth/OAuthManager');
const ConnectionPool = require('../src/features/invisibility/mcp/ConnectionPool');
const { CircuitBreaker } = require('../src/features/invisibility/mcp/CircuitBreaker');
const MCPMetrics = require('../src/features/invisibility/mcp/MCPMetrics');
const { MessageQueue } = require('../src/features/invisibility/mcp/MessageQueue');

// Test utilities
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTestFile(filepath, content) {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content);
}

async function cleanup(files) {
    for (const file of files) {
        try {
            await fs.unlink(file);
        } catch (error) {
            // Ignore errors
        }
    }
}

// Test 1: Direct MCPAdapter Connection Test
async function testMCPAdapterConnection() {
    console.log('\n=== Test 1: MCPAdapter Connection ===');
    
    try {
        // Create a simple echo server for testing
        const serverCode = `
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
    name: 'test-echo-server',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

// Register request handlers
server.setRequestHandler({
    method: 'tools/list',
    handler: async () => ({
        tools: [{
            name: 'echo',
            description: 'Echoes the input',
            inputSchema: {
                type: 'object',
                properties: {
                    message: { type: 'string' }
                },
                required: ['message']
            }
        }]
    })
});

server.setRequestHandler({
    method: 'tools/call',
    handler: async (request) => {
        if (request.params.name === 'echo') {
            return {
                content: [{
                    type: 'text',
                    text: 'Echo: ' + request.params.arguments.message
                }]
            };
        }
        throw new Error('Tool not found');
    }
});

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Echo server started successfully');
`;

        // Write the server code to a temporary file
        const serverFile = path.join(__dirname, 'temp-echo-server.js');
        await createTestFile(serverFile, serverCode);

        // Spawn the server process
        const serverProcess = spawn('node', [serverFile], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Handle server errors
        serverProcess.stderr.on('data', (data) => {
            console.log('Server stderr:', data.toString());
        });

        // Create MCPAdapter and connect
        const adapter = new MCPAdapter({
            name: 'test-client',
            version: '1.0.0'
        });

        // Connect to the server
        await adapter.connectWithRetry(serverProcess, 3);
        console.log('✓ Successfully connected to echo server');

        // Check discovered tools
        const tools = adapter.getTools();
        console.log(`✓ Discovered ${tools.length} tools:`, tools);

        // Call the echo tool
        const result = await adapter.callTool('echo', { message: 'Hello MCP!' });
        console.log('✓ Tool call result:', result);

        // Disconnect
        await adapter.disconnect();
        console.log('✓ Successfully disconnected');

        // Cleanup
        await cleanup([serverFile]);

        return true;
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Test 2: Server Registry Integration Test
async function testServerRegistry() {
    console.log('\n=== Test 2: Server Registry Integration ===');
    
    try {
        // Create components
        const oauthManager = new OAuthManager();
        const metrics = new MCPMetrics();
        const registry = new ServerRegistry(oauthManager, metrics);
        const toolRegistry = new ToolRegistry(registry);

        // Create a test server configuration
        const testConfig = {
            command: 'node',
            args: [path.join(__dirname, 'temp-math-server.js')],
            capabilities: ['add', 'multiply']
        };

        // Create a math server
        const mathServerCode = `
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
    name: 'math-server',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

server.setRequestHandler({
    method: 'tools/list',
    handler: async () => ({
        tools: [
            {
                name: 'add',
                description: 'Add two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number' },
                        b: { type: 'number' }
                    },
                    required: ['a', 'b']
                }
            },
            {
                name: 'multiply',
                description: 'Multiply two numbers',
                inputSchema: {
                    type: 'object',
                    properties: {
                        a: { type: 'number' },
                        b: { type: 'number' }
                    },
                    required: ['a', 'b']
                }
            }
        ]
    })
});

server.setRequestHandler({
    method: 'tools/call',
    handler: async (request) => {
        const { name, arguments: args } = request.params;
        let result;
        
        switch (name) {
            case 'add':
                result = args.a + args.b;
                break;
            case 'multiply':
                result = args.a * args.b;
                break;
            default:
                throw new Error('Tool not found');
        }
        
        return {
            content: [{
                type: 'text',
                text: String(result)
            }]
        };
    }
});

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Math server started successfully');
`;

        const serverFile = path.join(__dirname, 'temp-math-server.js');
        await createTestFile(serverFile, mathServerCode);

        // Register and start the server
        await registry.register('math-server', testConfig);
        console.log('✓ Server registered');

        await registry.start('math-server');
        console.log('✓ Server started');

        // Wait for server to initialize
        await delay(2000);

        // Check server status
        const status = registry.getStatus('math-server');
        console.log('✓ Server status:', status);

        // Get server adapter
        const serverState = registry.servers.get('math-server');
        const adapter = serverState.adapter;

        // Test tool invocation through the adapter
        const addResult = await adapter.callTool('add', { a: 5, b: 3 });
        console.log('✓ Add result:', addResult);

        const multiplyResult = await adapter.callTool('multiply', { a: 4, b: 7 });
        console.log('✓ Multiply result:', multiplyResult);

        // Stop the server
        await registry.stop('math-server');
        console.log('✓ Server stopped');

        // Cleanup
        await cleanup([serverFile]);

        return true;
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Test 3: Connection Pool Test
async function testConnectionPool() {
    console.log('\n=== Test 3: Connection Pool Test ===');
    
    try {
        const pool = new ConnectionPool({ maxConnections: 2 });

        // Create a simple server
        const serverCode = `
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
    name: 'pool-test-server',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

server.setRequestHandler({
    method: 'tools/list',
    handler: async () => ({ tools: [] })
});

const transport = new StdioServerTransport();
server.connect(transport);

console.error('Pool test server started successfully');
`;

        const serverFile = path.join(__dirname, 'temp-pool-server.js');
        await createTestFile(serverFile, serverCode);

        // Create multiple connections
        const connections = [];
        for (let i = 0; i < 3; i++) {
            const serverProcess = spawn('node', [serverFile], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const adapter = new MCPAdapter({
                name: `test-client-${i}`,
                version: '1.0.0'
            });

            await adapter.connectToServer(serverProcess);
            
            const connectionId = `pool-test-${i}`;
            await pool.add(connectionId, adapter);
            connections.push({ id: connectionId, adapter });
            
            console.log(`✓ Added connection ${i + 1}`);
        }

        // Test getting connections
        for (const conn of connections) {
            const retrieved = await pool.get(conn.id);
            console.log(`✓ Retrieved connection ${conn.id}: ${retrieved !== null}`);
        }

        // Check pool statistics
        const stats = pool.getStatistics();
        console.log('✓ Pool statistics:', stats);

        // Clean up
        await pool.close();
        console.log('✓ Pool closed');

        await cleanup([serverFile]);

        return true;
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Test 4: Circuit Breaker Test
async function testCircuitBreaker() {
    console.log('\n=== Test 4: Circuit Breaker Test ===');
    
    try {
        const breaker = new CircuitBreaker({
            failureThreshold: 2,
            resetTimeout: 1000
        });

        let callCount = 0;
        const testFunction = async () => {
            callCount++;
            if (callCount <= 2) {
                throw new Error('Simulated failure');
            }
            return 'Success';
        };

        // Test failures
        for (let i = 0; i < 2; i++) {
            try {
                await breaker.execute('test', testFunction);
            } catch (error) {
                console.log(`✓ Call ${i + 1} failed as expected`);
            }
        }

        // Circuit should be open now
        try {
            await breaker.execute('test', testFunction);
        } catch (error) {
            console.log('✓ Circuit breaker is open, call rejected');
        }

        // Wait for reset timeout
        await delay(1500);

        // Circuit should be half-open now, next call should succeed
        const result = await breaker.execute('test', testFunction);
        console.log('✓ Circuit breaker reset, call succeeded:', result);

        return true;
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        return false;
    }
}

// Test 5: Message Queue Test
async function testMessageQueue() {
    console.log('\n=== Test 5: Message Queue Test ===');
    
    try {
        const queue = new MessageQueue();
        const processedMessages = [];

        // Start processing
        queue.startProcessing(async (message) => {
            processedMessages.push(message);
            console.log(`✓ Processed message: ${message.id}`);
            
            // Simulate processing delay
            await delay(100);
        });

        // Add messages with different priorities
        await queue.add({ id: 'msg-1', data: 'Low priority' }, 1);
        await queue.add({ id: 'msg-2', data: 'High priority' }, 3);
        await queue.add({ id: 'msg-3', data: 'Medium priority' }, 2);

        console.log('✓ Added 3 messages to queue');

        // Wait for processing
        await delay(1000);

        // Check processing order (should be by priority)
        console.log('✓ Processing order:', processedMessages.map(m => m.id));

        // Stop processing
        queue.stopProcessing();
        console.log('✓ Queue processing stopped');

        return true;
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log('Starting MCP Integration Tests...\n');
    
    const tests = [
        { name: 'MCPAdapter Connection', fn: testMCPAdapterConnection },
        { name: 'Server Registry', fn: testServerRegistry },
        { name: 'Connection Pool', fn: testConnectionPool },
        { name: 'Circuit Breaker', fn: testCircuitBreaker },
        { name: 'Message Queue', fn: testMessageQueue }
    ];
    
    const results = [];
    
    for (const test of tests) {
        console.log(`\nRunning: ${test.name}`);
        const passed = await test.fn();
        results.push({ name: test.name, passed });
        
        if (!passed) {
            console.log(`\n⚠️  Test "${test.name}" failed, continuing with other tests...`);
        }
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    let totalPassed = 0;
    for (const result of results) {
        console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
        if (result.passed) totalPassed++;
    }
    
    console.log(`\nTotal: ${totalPassed}/${tests.length} tests passed`);
    
    if (totalPassed === tests.length) {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = {
    testMCPAdapterConnection,
    testServerRegistry,
    testConnectionPool,
    testCircuitBreaker,
    testMessageQueue,
    runAllTests
}; 