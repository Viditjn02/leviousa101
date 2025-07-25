/**
 * Test suite for refactored MCP implementation
 * Tests all components and migration bridge
 */

const winston = require('winston');

// Configure logger for tests
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[TEST] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Test configuration
const TEST_CONFIG = {
    runIntegrationTests: false, // Set to true to run tests that require real MCP servers
    testTimeout: 30000,
    mockLLMResponses: true
};

class TestRunner {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    async runAllTests() {
        logger.info('Starting MCP refactoring test suite');
        
        const tests = [
            // Unit tests
            this.testMCPAdapter,
            this.testOAuthManager,
            this.testServerRegistry,
            this.testToolRegistry,
            this.testConnectionPool,
            this.testCircuitBreaker,
            this.testMessageQueue,
            this.testMetrics,
            this.testAnswerService,
            
            // Integration tests
            this.testMCPClient,
            this.testMigrationBridge,
            
            // End-to-end tests
            this.testEndToEndFlow
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                await this.runTest(test.bind(this));
                passed++;
            } catch (error) {
                failed++;
                logger.error(`Test failed: ${test.name}`, { error: error.message });
            }
        }

        logger.info('Test suite completed', { passed, failed, total: tests.length });
        return { passed, failed, total: tests.length };
    }

    async runTest(testFunc) {
        const testName = testFunc.name;
        logger.info(`Running test: ${testName}`);
        
        this.currentTest = {
            name: testName,
            startTime: Date.now(),
            assertions: []
        };

        try {
            await testFunc();
            
            const duration = Date.now() - this.currentTest.startTime;
            logger.info(`✓ Test passed: ${testName}`, { duration });
            
            this.testResults.push({
                ...this.currentTest,
                passed: true,
                duration
            });
        } catch (error) {
            const duration = Date.now() - this.currentTest.startTime;
            logger.error(`✗ Test failed: ${testName}`, { 
                duration,
                error: error.message,
                stack: error.stack
            });
            
            this.testResults.push({
                ...this.currentTest,
                passed: false,
                duration,
                error: error.message
            });
            
            throw error;
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
        this.currentTest.assertions.push({ passed: true, message });
    }

    assertEquals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
        }
        this.currentTest.assertions.push({ passed: true, message });
    }

    // Test MCPAdapter
    async testMCPAdapter() {
        logger.debug('Testing MCPAdapter');
        
        const MCPAdapter = require('../src/features/invisibility/mcp/MCPAdapter');
        const adapter = new MCPAdapter({
            name: 'test-adapter',
            version: '1.0.0'
        });

        // Test initialization
        await adapter.initialize();
        this.assert(adapter.getStatus() === 'initialized', 'Adapter should be initialized');

        // Test tool registration
        adapter.registerTool('test_tool', {
            description: 'Test tool',
            inputSchema: {
                type: 'object',
                properties: {
                    input: { type: 'string' }
                }
            }
        }, async (params) => {
            return { result: `Processed: ${params.input}` };
        });

        const tools = adapter.getTools();
        this.assertEquals(tools.length, 1, 'Should have one tool registered');
        this.assertEquals(tools[0].name, 'test_tool', 'Tool name should match');

        // Clean up
        await adapter.disconnect();
    }

    // Test OAuthManager
    async testOAuthManager() {
        logger.debug('Testing OAuthManager');
        
        const OAuthManager = require('../src/features/invisibility/auth/OAuthManager');
        const oauthManager = new OAuthManager();

        await oauthManager.initialize();

        // Test OAuth configuration
        const services = oauthManager.getSupportedServices();
        this.assert(services.includes('notion'), 'Should support Notion');
        this.assert(services.includes('github'), 'Should support GitHub');

        // Test OAuth URL generation
        const authUrl = await oauthManager.getAuthorizationUrl('notion');
        this.assert(authUrl.includes('https://'), 'Auth URL should be HTTPS');
        this.assert(authUrl.includes('client_id'), 'Auth URL should include client_id');

        // Test token validation (mock)
        const hasToken = await oauthManager.hasValidToken('test-service');
        this.assertEquals(hasToken, false, 'Should not have token for test service');
    }

    // Test ServerRegistry
    async testServerRegistry() {
        logger.debug('Testing ServerRegistry');
        
        const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');
        const registry = new ServerRegistry();

        // Test adding server
        await registry.addServer({
            name: 'test-server',
            command: 'node',
            args: ['test.js'],
            type: 'test'
        });

        const servers = registry.getConfiguredServers();
        this.assertEquals(servers.length, 1, 'Should have one server');
        this.assertEquals(servers[0].name, 'test-server', 'Server name should match');

        // Test server status
        const status = registry.getServerStatus('test-server');
        this.assertEquals(status, 'stopped', 'Server should be stopped initially');

        // Test removing server
        await registry.removeServer('test-server');
        const serversAfter = registry.getConfiguredServers();
        this.assertEquals(serversAfter.length, 0, 'Should have no servers after removal');
    }

    // Test ToolRegistry
    async testToolRegistry() {
        logger.debug('Testing ToolRegistry');
        
        const ToolRegistry = require('../src/features/invisibility/mcp/ToolRegistry');
        const ServerRegistry = require('../src/features/invisibility/mcp/ServerRegistry');
        
        const serverRegistry = new ServerRegistry();
        const toolRegistry = new ToolRegistry(serverRegistry);

        // Test tool registration
        toolRegistry.registerTool('test-server', {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: { type: 'object' }
        });

        const tools = toolRegistry.getAllTools();
        this.assertEquals(tools.length, 1, 'Should have one tool');
        this.assertEquals(tools[0].name, 'test_tool', 'Tool name should match');

        // Test tool search
        const foundTools = toolRegistry.searchTools('test');
        this.assertEquals(foundTools.length, 1, 'Should find one tool');

        // Test tool removal
        toolRegistry.removeServerTools('test-server');
        const toolsAfter = toolRegistry.getAllTools();
        this.assertEquals(toolsAfter.length, 0, 'Should have no tools after removal');
    }

    // Test ConnectionPool
    async testConnectionPool() {
        logger.debug('Testing ConnectionPool');
        
        const ConnectionPool = require('../src/features/invisibility/mcp/ConnectionPool');
        const pool = new ConnectionPool({
            maxConnections: 5,
            maxIdleTime: 1000
        });

        // Test pool statistics
        const stats = pool.getStatistics();
        this.assertEquals(stats.totalConnections, 0, 'Should have no connections initially');
        this.assertEquals(stats.maxConnections, 5, 'Max connections should be 5');

        // Note: Real connection testing would require actual servers
        if (TEST_CONFIG.runIntegrationTests) {
            // Would test actual connections here
        }

        // Clean up
        await pool.closeAll();
    }

    // Test CircuitBreaker
    async testCircuitBreaker() {
        logger.debug('Testing CircuitBreaker');
        
        const { CircuitBreaker } = require('../src/features/invisibility/mcp/CircuitBreaker');
        const breaker = new CircuitBreaker('test-breaker', {
            failureThreshold: 3,
            timeout: 1000
        });

        // Test successful operation
        let successCount = 0;
        await breaker.execute(async () => {
            successCount++;
            return 'success';
        });
        this.assertEquals(successCount, 1, 'Operation should execute successfully');

        // Test circuit state
        const status = breaker.getStatus();
        this.assertEquals(status.state, 'closed', 'Circuit should be closed');

        // Test failure handling
        let failures = 0;
        for (let i = 0; i < 3; i++) {
            try {
                await breaker.execute(async () => {
                    throw new Error('Test failure');
                });
            } catch (e) {
                failures++;
            }
        }
        this.assertEquals(failures, 3, 'Should have 3 failures');
        
        const statusAfter = breaker.getStatus();
        this.assertEquals(statusAfter.state, 'open', 'Circuit should be open after failures');
    }

    // Test MessageQueue
    async testMessageQueue() {
        logger.debug('Testing MessageQueue');
        
        const { MessageQueue, MessagePriority } = require('../src/features/invisibility/mcp/MessageQueue');
        const queue = new MessageQueue({
            maxQueueSize: 100
        });

        let processedMessages = [];
        
        // Set up message processor
        queue.on('process', async (message) => {
            processedMessages.push(message.payload);
        });

        // Start processing
        queue.startProcessing();

        // Enqueue messages
        await queue.enqueue({
            payload: { content: 'message1' },
            priority: MessagePriority.NORMAL
        });

        await queue.enqueue({
            payload: { content: 'message2' },
            priority: MessagePriority.HIGH
        });

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));

        this.assert(processedMessages.length > 0, 'Should have processed messages');
        
        // Check statistics
        const stats = queue.getStatistics();
        this.assert(stats.stats.enqueued >= 2, 'Should have enqueued at least 2 messages');

        // Clean up
        queue.destroy();
    }

    // Test MCPMetrics
    async testMetrics() {
        logger.debug('Testing MCPMetrics');
        
        const MCPMetricsModule = require('../src/features/invisibility/mcp/MCPMetrics');
        const metrics = MCPMetricsModule.getInstance();

        // Test counter metric
        metrics.incrementCounter('test_counter');
        metrics.incrementCounter('test_counter');
        
        // Test gauge metric
        metrics.setGauge('test_gauge', 42);

        // Test histogram metric
        const timer = metrics.startTimer('test_timer');
        await new Promise(resolve => setTimeout(resolve, 10));
        timer.end();

        // Get metrics summary
        const summary = metrics.getMetricsSummary();
        this.assert(summary.uptime > 0, 'Should have uptime');

        // Test Prometheus export
        const prometheusData = metrics.exportPrometheus();
        this.assert(prometheusData.includes('test_counter'), 'Should include test counter in export');
    }

    // Test AnswerService
    async testAnswerService() {
        logger.debug('Testing AnswerService');
        
        const AnswerService = require('../src/features/invisibility/services/AnswerService');
        
        // Mock LLM service
        const mockLLMService = {
            generateResponse: async (prompt, context, options) => {
                return 'This is a mock response for testing.';
            }
        };

        const answerService = new AnswerService({
            llmService: mockLLMService
        });

        // Test question classification
        const strategies = [
            { question: 'mcp test', expected: 'mcp_debug' },
            { question: 'show my github repos', expected: 'github_data_access' },
            { question: 'get my notion pages', expected: 'notion_data_access' },
            { question: 'what can you do with mcp?', expected: 'mcp_capabilities' },
            { question: 'write a function to sort an array', expected: 'coding' },
            { question: 'explain how TCP works', expected: 'technical' },
            { question: 'calculate 2+2', expected: 'math' },
            { question: 'hello', expected: 'general' }
        ];

        for (const { question, expected } of strategies) {
            const result = await answerService.classifyQuestion(question, {});
            logger.debug(`Question: "${question}" -> Strategy: ${result}`);
            this.assertEquals(result, expected, `Question should classify as ${expected}`);
        }

        // Test answer generation
        const answer = await answerService.getAnswer('What is 2+2?', {});
        this.assert(answer.answer.length > 0, 'Should generate an answer');
        this.assertEquals(answer.questionType, 'math', 'Should classify as math question');
    }

    // Test MCPClient integration
    async testMCPClient() {
        logger.debug('Testing MCPClient');
        
        const MCPClient = require('../src/features/invisibility/mcp/MCPClient');
        
        // Mock LLM service
        const mockLLMService = {
            generateResponse: async (prompt, context, options) => {
                return 'Mock response';
            }
        };

        const client = new MCPClient({
            enableMetrics: true,
            enableCircuitBreaker: true,
            enableConnectionPool: false,
            llmService: mockLLMService
        });

        // Test initialization
        if (TEST_CONFIG.runIntegrationTests) {
            await client.initialize();
            this.assert(client.isInitialized, 'Client should be initialized');
        }

        // Test status
        const status = client.getStatus();
        this.assert(status.servers !== undefined, 'Status should include servers');
        this.assert(status.tools !== undefined, 'Status should include tools');
        this.assert(status.oauth !== undefined, 'Status should include oauth');

        // Test answer question
        const answer = await client.answerQuestion('What can MCP do?', {});
        this.assert(answer.answer.length > 0, 'Should generate answer');

        // Clean up
        if (client.isInitialized) {
            await client.shutdown();
        }
    }

    // Test Migration Bridge
    async testMigrationBridge() {
        logger.debug('Testing MCPMigrationBridge');
        
        const { MCPMigrationBridge } = require('../src/features/invisibility/mcp/MCPMigrationBridge');
        const bridge = new MCPMigrationBridge();

        // Test compatibility properties
        this.assert(bridge.mcpServers instanceof Map, 'Should have mcpServers map');
        this.assert(bridge.externalTools instanceof Array, 'Should have externalTools array');
        this.assert(bridge.answerStrategies !== undefined, 'Should have answerStrategies');

        // Test old API methods exist
        this.assert(typeof bridge.startMCPServer === 'function', 'Should have startMCPServer method');
        this.assert(typeof bridge.callTool === 'function', 'Should have callTool method');
        this.assert(typeof bridge.getIntelligentAnswer === 'function', 'Should have getIntelligentAnswer method');
        this.assert(typeof bridge.startOAuthServer === 'function', 'Should have startOAuthServer method');

        logger.info('Migration bridge compatibility verified');
    }

    // Test end-to-end flow
    async testEndToEndFlow() {
        if (!TEST_CONFIG.runIntegrationTests) {
            logger.info('Skipping end-to-end test (integration tests disabled)');
            return;
        }

        logger.debug('Testing end-to-end flow');
        
        const { MCPMigrationBridge } = require('../src/features/invisibility/mcp/MCPMigrationBridge');
        const bridge = new MCPMigrationBridge();

        try {
            // Initialize
            await bridge.initialize();
            this.assert(bridge.isInitialized, 'Bridge should be initialized');

            // Test getting external tools
            const tools = await bridge.getExternalTools();
            logger.debug('Available tools:', tools);

            // Test auth status
            const authStatus = await bridge.getRemoteServiceAuthenticationStatus();
            logger.debug('Auth status:', authStatus);

            // Test intelligent answer
            const answer = await bridge.getIntelligentAnswer('What MCP tools are available?', {});
            logger.debug('Answer:', answer);
            this.assert(answer.answer.length > 0, 'Should get intelligent answer');

            // Clean up
            await bridge.cleanup();
            
        } catch (error) {
            logger.error('End-to-end test failed', { error: error.message });
            throw error;
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const runner = new TestRunner();
    
    runner.runAllTests()
        .then(results => {
            logger.info('All tests completed', results);
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            logger.error('Test runner failed', { error: error.message });
            process.exit(1);
        });
}

module.exports = TestRunner; 