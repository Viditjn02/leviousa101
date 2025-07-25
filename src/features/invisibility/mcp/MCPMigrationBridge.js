/**
 * MCP Migration Bridge
 * Provides backward compatibility for existing code while migrating to new architecture
 * Maps old API calls to new component architecture
 */

const winston = require('winston');
const { EventEmitter } = require('events');
const MCPClient = require('./MCPClient');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[MCPMigrationBridge] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

/**
 * Migration bridge that mimics the old MCPClient API
 * while using the new refactored components
 */
class MCPMigrationBridge extends EventEmitter {
    constructor() {
        super();
        logger.info('Initializing MCP Migration Bridge');
        
        // Create new MCPClient instance
        this.newClient = new MCPClient({
            enableMetrics: true,
            enableCircuitBreaker: true,
            enableConnectionPool: true // Enable connection pooling
        });

        // Compatibility properties from old implementation
        this.mcpServers = new Map();
        this.externalServers = new Map();
        this.externalTools = [];
        this.pendingRequests = new Map();
        this.connectionStatus = new Map();
        this.configManager = null;
        this.isInitialized = false;
        
        // Answer strategies (for backward compatibility)
        this.answerStrategies = {};
        
        // Set up event forwarding
        this.setupEventForwarding();
        
        logger.info('Migration bridge initialized');
    }

    /**
     * Initialize (maps to new client initialize)
     */
    async initialize() {
        logger.info('Initializing through migration bridge');
        
        try {
            await this.newClient.initialize();
            this.isInitialized = true;
            
            // Load answer strategies from new client
            const answerService = this.newClient.answerService;
            if (answerService) {
                this.answerStrategies = answerService.getStrategies().reduce((acc, strategy) => {
                    acc[strategy] = answerService.getStrategyConfig(strategy);
                    return acc;
                }, {});
            }
            
            logger.info('Migration bridge initialization complete');
        } catch (error) {
            logger.error('Failed to initialize through migration bridge', { error: error.message });
            throw error;
        }
    }

    /**
     * Setup event forwarding from new client
     */
    setupEventForwarding() {
        // Forward server events
        this.newClient.on('serverStarted', ({ serverName }) => {
            this.mcpServers.set(serverName, { status: 'running' });
            this.connectionStatus.set(serverName, 'connected');
            
            // Forward event to bridge listeners
            this.emit('serverStarted', { serverName });
        });
        
        this.newClient.on('serverStopped', ({ serverName }) => {
            this.mcpServers.delete(serverName);
            this.connectionStatus.set(serverName, 'disconnected');
            
            // Forward event to bridge listeners
            this.emit('serverStopped', { serverName });
        });
        
        // Forward tool events
        this.newClient.on('toolsUpdated', ({ serverName, tools }) => {
            // Update external tools list for compatibility
            this.updateExternalToolsList();
            
            // Forward event to bridge listeners
            this.emit('toolsUpdated', { serverName, tools });
        });
        
        // Forward servers updated events (this is what invisibilityBridge is listening for)
        this.newClient.on('serversUpdated', (status) => {
            this.emit('serversUpdated', status);
        });
        
        // Forward any other events generically
        ['error', 'connected', 'disconnected', 'ready', 'status-updated'].forEach(eventName => {
            this.newClient.on(eventName, (...args) => {
                this.emit(eventName, ...args);
            });
        });
    }

    /**
     * Start MCP server (old API)
     */
    async startMCPServer(serverName, serverPath, args = []) {
        logger.info('Starting MCP server through migration bridge', { serverName });
        
        try {
            // Map old API to new
            await this.newClient.serverRegistry.addServer({
                name: serverName,
                command: serverPath,
                args: args,
                type: 'custom'
            });
            
            await this.newClient.startServer(serverName);
            
            return { success: true };
        } catch (error) {
            logger.error('Failed to start server through migration bridge', { 
                serverName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Stop MCP server (old API)
     */
    async stopMCPServer(serverName) {
        logger.info('Stopping MCP server through migration bridge', { serverName });
        
        try {
            await this.newClient.stopServer(serverName);
            return { success: true };
        } catch (error) {
            logger.error('Failed to stop server through migration bridge', { 
                serverName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Call tool (old API)
     */
    async callTool(serverName, toolName, args) {
        logger.info('Calling tool through migration bridge', { serverName, toolName });
        
        try {
            // In new architecture, tools are invoked directly without server name
            const fullToolName = `${serverName}_${toolName}`;
            const result = await this.newClient.invokeTool(fullToolName, args);
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result)
                }]
            };
        } catch (error) {
            logger.error('Failed to call tool through migration bridge', { 
                toolName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Call external tool (old API)
     */
    async callExternalTool(toolName, arguments_) {
        logger.info('Calling external tool through migration bridge', { toolName });
        
        try {
            return await this.newClient.invokeTool(toolName, arguments_);
        } catch (error) {
            logger.error('Failed to call external tool through migration bridge', { 
                toolName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get external tools (old API)
     */
    async getExternalTools() {
        try {
            const tools = await this.newClient.getAvailableTools();
            return tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                serverName: tool.serverName || 'external'
            }));
        } catch (error) {
            logger.error('Failed to get external tools', { error: error.message });
            return [];
        }
    }

    /**
     * Update external tools list (old API)
     */
    async updateExternalToolsList() {
        try {
            const tools = await this.getExternalTools();
            this.externalTools = tools;
            logger.info('Updated external tools list', { count: tools.length });
        } catch (error) {
            logger.error('Failed to update external tools list', { error: error.message });
        }
    }

    /**
     * Get remote service authentication status (old API)
     */
    async getRemoteServiceAuthenticationStatus() {
        try {
            const status = this.newClient.oauthManager.getStatus();
            
            // Map to old format
            const authStatus = {};
            for (const [service, serviceStatus] of Object.entries(status)) {
                authStatus[service] = {
                    isAuthenticated: serviceStatus.hasValidToken,
                    requiresAuth: true,
                    lastChecked: new Date().toISOString()
                };
            }
            
            return authStatus;
        } catch (error) {
            logger.error('Failed to get auth status', { error: error.message });
            return {};
        }
    }

    /**
     * Start OAuth server (old API)
     */
    async startOAuthServer(serviceName, config) {
        logger.info('Starting OAuth flow through migration bridge', { serviceName });
        
        try {
            const authUrl = await this.newClient.startOAuthFlow(serviceName);
            return { authUrl, port: 3000 }; // Default port for compatibility
        } catch (error) {
            logger.error('Failed to start OAuth flow', { 
                serviceName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Handle OAuth callback (old API)
     */
    async handleOAuthCallback(serviceName, code) {
        logger.info('Handling OAuth callback through migration bridge', { serviceName });
        
        try {
            await this.newClient.oauthManager.handleCallback(serviceName, code);
            return { success: true };
        } catch (error) {
            logger.error('Failed to handle OAuth callback', { 
                serviceName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Start configured server (old API)
     */
    async startConfiguredServer(serviceName, config) {
        logger.info('Starting configured server through migration bridge', { serviceName });
        
        try {
            // Add server configuration if not exists
            if (!await this.newClient.serverRegistry.hasServer(serviceName)) {
                await this.newClient.serverRegistry.addServer({
                    name: serviceName,
                    command: config.command,
                    args: config.args || [],
                    env: config.env || {},
                    type: config.type || serviceName,
                    requiresAuth: config.requiresAuth || false
                });
            }
            
            await this.newClient.startServer(serviceName);
            return { success: true };
        } catch (error) {
            logger.error('Failed to start configured server', { 
                serviceName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get intelligent answer (old API)
     */
    async getIntelligentAnswer(question, options = {}) {
        logger.info('Getting intelligent answer through migration bridge');
        
        try {
            const context = {
                screenshot: options.screenshot,
                conversationHistory: options.conversationHistory
            };
            
            const result = await this.newClient.answerQuestion(question, context);
            
            return {
                answer: result.answer,
                strategy: result.strategy,
                confidence: 0.9, // Default for compatibility
                sources: []
            };
        } catch (error) {
            logger.error('Failed to get intelligent answer', { error: error.message });
            throw error;
        }
    }

    /**
     * Send request (old API for direct JSON-RPC)
     */
    async sendRequest(serverName, method, params) {
        logger.info('Sending request through migration bridge', { serverName, method });
        
        // Map common methods to new API
        switch (method) {
            case 'tools/list':
                const tools = await this.newClient.toolRegistry.getServerTools(serverName);
                return { tools };
                
            case 'tools/call':
                return await this.callTool(serverName, params.name, params.arguments);
                
            default:
                logger.warn('Unmapped method in migration bridge', { method });
                throw new Error(`Method ${method} not supported in migration bridge`);
        }
    }

    /**
     * Get status (compatibility method)
     */
    getStatus() {
        return this.newClient.getStatus();
    }

    /**
     * Get server status (old API)
     */
    getServerStatus() {
        try {
            const status = this.newClient.getStatus();
            
            // Convert to old API format
            const serverStatus = {};
            for (const [serverName, serverState] of this.newClient.serverRegistry.servers) {
                serverStatus[serverName] = {
                    status: serverState.status,
                    running: serverState.status === 'running',
                    tools: serverState.tools || []
                };
            }
            
            return {
                servers: serverStatus,
                isConnected: status.isConnected || false,
                availableServers: Array.from(this.newClient.serverRegistry.servers.keys()),
                tools: this.externalTools
            };
        } catch (error) {
            logger.error('Failed to get server status', { error: error.message });
            return { servers: {}, availableServers: [], tools: [] };
        }
    }

    /**
     * Get authentication status (old API)
     */
    getAuthenticationStatus() {
        try {
            return this.newClient.oauthManager.getStatus();
        } catch (error) {
            logger.error('Failed to get auth status', { error: error.message });
            return {};
        }
    }

    /**
     * Get supported services (old API)
     */
    getSupportedServices() {
        try {
            // Return predefined services that the system supports
            return {
                github: {
                    name: 'GitHub',
                    authType: 'oauth',
                    scopes: ['repo', 'user'],
                    description: 'Access GitHub repositories and user data'
                },
                notion: {
                    name: 'Notion',
                    authType: 'oauth',
                    scopes: ['read_content', 'read_user_with_email'],
                    description: 'Access Notion pages and databases'
                },
                slack: {
                    name: 'Slack',
                    authType: 'oauth',
                    scopes: ['channels:read', 'chat:write'],
                    description: 'Access Slack workspace data'
                },
                google: {
                    name: 'Google',
                    authType: 'oauth',
                    scopes: ['profile', 'email'],
                    description: 'Access Google services'
                }
            };
        } catch (error) {
            logger.error('Failed to get supported services', { error: error.message });
            return {};
        }
    }

    /**
     * Setup external service (old API)
     */
    async setupExternalService(serviceName, authType = 'oauth') {
        logger.info('Setting up external service through migration bridge', { serviceName, authType });
        
        try {
            // Check if service is supported
            const supportedServices = this.getSupportedServices();
            if (!supportedServices[serviceName]) {
                throw new Error(`Service ${serviceName} is not supported`);
            }
            
            // Check if already authenticated
            const hasToken = await this.newClient.oauthManager.getValidToken(serviceName);
            if (hasToken) {
                logger.info('Service already authenticated', { serviceName });
                return {
                    success: true,
                    isAuthenticated: true,
                    message: `${serviceName} is already authenticated`
                };
            }
            
            // Start OAuth flow and get the URL
            logger.info('Starting OAuth flow for service', { serviceName });
            const authUrl = await this.newClient.startOAuthFlow(serviceName);
            
            // Check if we got an already-authenticated response
            if (typeof authUrl === 'object' && authUrl.success) {
                return authUrl;
            }
            
            // Return the OAuth URL for the UI to open in browser
            logger.info('OAuth URL generated, returning to UI', { serviceName, authUrl });
            return {
                success: true,
                requiresAuth: true,
                authUrl: authUrl,
                provider: serviceName,
                service: serviceName,
                message: `OAuth flow started for ${serviceName}. Please complete authentication in your browser.`
            };
            
        } catch (error) {
            logger.error('Failed to setup external service', { 
                serviceName, 
                error: error.message 
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cleanup (old API)
     */
    async cleanup() {
        logger.info('Cleanup through migration bridge');
        await this.newClient.shutdown();
    }

    /**
     * Check if service has OAuth token
     */
    async hasOAuthToken(serviceName) {
        return await this.newClient.oauthManager.hasValidToken(serviceName);
    }

    /**
     * Get OAuth token
     */
    async getOAuthToken(serviceName) {
        const token = await this.newClient.oauthManager.getToken(serviceName);
        return token ? token.access_token : null;
    }
}

// Export as singleton for drop-in replacement
let instance = null;

module.exports = {
    MCPMigrationBridge,
    
    // Singleton getter that matches old import style
    getInstance() {
        if (!instance) {
            instance = new MCPMigrationBridge();
        }
        return instance;
    }
}; 