/**
 * MCP Client
 * Main entry point for MCP functionality
 * Integrates all MCP components with clean architecture
 */

const { EventEmitter } = require('events');
const winston = require('winston');

// Import all MCP components
const MCPAdapter = require('./MCPAdapter');
const ServerRegistry = require('./ServerRegistry');
const ToolRegistry = require('./ToolRegistry');
const OAuthManager = require('../auth/OAuthManager');
const ConnectionPool = require('./ConnectionPool');
const { CircuitBreakerManager } = require('./CircuitBreaker');
const { MessageQueue, MessagePriority } = require('./MessageQueue');
const MCPMetricsModule = require('./MCPMetrics');
const AnswerService = require('../services/AnswerService');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[MCPClient] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class MCPClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            maxConcurrentConnections: options.maxConcurrentConnections || 10,
            enableMetrics: options.enableMetrics !== false,
            enableCircuitBreaker: options.enableCircuitBreaker !== false,
            enableConnectionPool: options.enableConnectionPool !== false,
            autoReconnect: options.autoReconnect !== false,
            reconnectInterval: options.reconnectInterval || 5000,
            ...options
        };

        // Initialize components
        this.serverRegistry = new ServerRegistry();
        this.toolRegistry = new ToolRegistry(this.serverRegistry);
        this.oauthManager = new OAuthManager();
        
        // Optional components based on configuration
        this.connectionPool = this.options.enableConnectionPool 
            ? new ConnectionPool({
                maxConnections: this.options.maxConcurrentConnections,
                serverRegistry: this.serverRegistry
              })
            : null;
            
        this.circuitBreakerManager = this.options.enableCircuitBreaker 
            ? new CircuitBreakerManager()
            : null;
            
        this.messageQueue = new MessageQueue({
            processingConcurrency: 5
        });
        
        this.metrics = this.options.enableMetrics 
            ? MCPMetricsModule.getInstance()
            : null;
            
        // Answer service for intelligent responses
        this.answerService = new AnswerService({
            mcpToolInvoker: this,
            llmService: options.llmService
        });

        // OAuth callback server for handling OAuth flows
        this.oauthServer = null;
        this.oauthPort = null;

        // Track initialization state
        this.isInitialized = false;
        
        // Set up event handlers
        this.setupEventHandlers();
        
        logger.info('MCPClient initialized', {
            components: {
                connectionPool: !!this.connectionPool,
                circuitBreaker: !!this.circuitBreakerManager,
                metrics: !!this.metrics
            }
        });
    }

    /**
     * Initialize the MCP client
     */
    async initialize() {
        if (this.isInitialized) {
            logger.warn('MCPClient already initialized');
            return;
        }

        try {
            logger.info('Initializing MCPClient...');
            
            // Initialize OAuth manager
            await this.oauthManager.initialize();
            
            // Initialize server registry
            await this.serverRegistry.initialize();
            
            // Start configured servers
            await this.startConfiguredServers();
            
            // Initialize message queue processing
            this.messageQueue.on('process', this.processMessage.bind(this));
            this.messageQueue.startProcessing();
            
            this.isInitialized = true;
            logger.info('MCPClient initialization complete');
            this.emit('initialized');
            
            // Start metrics reporting if enabled
            if (this.metrics) {
                this.metrics.updateSystemMetrics();
            }
            
        } catch (error) {
            logger.error('Failed to initialize MCPClient', { error: error.message });
            this.emit('initializationFailed', error);
            throw error;
        }
    }

    /**
     * Set up event handlers for components
     */
    setupEventHandlers() {
        // Server Registry events
        this.serverRegistry.on('serverStarted', this.handleServerStarted.bind(this));
        this.serverRegistry.on('serverStopped', this.handleServerStopped.bind(this));
        this.serverRegistry.on('serverError', this.handleServerError.bind(this));
        
        // Tool Registry events
        this.toolRegistry.on('toolsUpdated', this.handleToolsUpdated.bind(this));
        this.toolRegistry.on('toolInvoked', this.handleToolInvoked.bind(this));
        
        // OAuth Manager events
        this.oauthManager.on('tokenAcquired', this.handleTokenAcquired.bind(this));
        this.oauthManager.on('tokenRefreshed', this.handleTokenRefreshed.bind(this));
        this.oauthManager.on('authSuccess', this.handleAuthSuccess.bind(this));
        
        // Connection Pool events
        if (this.connectionPool) {
            this.connectionPool.on('connectionCreated', this.handleConnectionCreated.bind(this));
            this.connectionPool.on('connectionClosed', this.handleConnectionClosed.bind(this));
        }
        
        // Circuit Breaker events
        if (this.circuitBreakerManager) {
            // Circuit breaker event handling would go here
        }
    }

    /**
     * Start configured servers
     */
    async startConfiguredServers() {
        const servers = await this.serverRegistry.getConfiguredServers();
        
        for (const serverConfig of servers) {
            try {
                // Check if server requires authentication
                if (serverConfig.requiresAuth) {
                    const hasValidToken = await this.oauthManager.hasValidToken(serverConfig.name);
                    if (!hasValidToken) {
                        logger.info('Server requires authentication', { server: serverConfig.name });
                        continue;
                    }
                }
                
                await this.startServer(serverConfig.name);
            } catch (error) {
                logger.error('Failed to start server', { 
                    server: serverConfig.name, 
                    error: error.message 
                });
            }
        }
    }

    /**
     * Start a specific server
     */
    async startServer(serverName) {
        if (this.circuitBreakerManager) {
            return await this.circuitBreakerManager.execute(
                `server-${serverName}`,
                async () => await this._startServerInternal(serverName)
            );
        } else {
            return await this._startServerInternal(serverName);
        }
    }

    /**
     * Internal server start logic with circuit breaker
     */
    async _startServerInternal(serverName) {
        logger.info('Starting server', { serverName });
        
        if (this.metrics) {
            this.metrics.recordServerEvent('started', serverName);
        }
        
        try {
            // Get server configuration
            const serverConfig = await this.serverRegistry.getServerConfig(serverName);
            
            if (!serverConfig) {
                throw new Error(`No server configuration found for ${serverName}`);
            }
            
            // Get OAuth token if needed
            let env = {};
            if (serverConfig.requiresAuth) {
                const token = await this.oauthManager.getValidToken(serverName);
                if (!token) {
                    throw new Error(`No valid OAuth token found for ${serverName}. Please authenticate first.`);
                }
                env = this.buildAuthEnvironment(serverConfig, token);
            }
            
            // Start the server
            await this.serverRegistry.start(serverName, { env });
            
            logger.info('Server started successfully', { serverName });
            return true;
            
        } catch (error) {
            logger.error('Failed to start server', { 
                serverName, 
                error: error.message 
            });
            
            if (this.metrics) {
                this.metrics.recordServerEvent('error', serverName);
            }
            
            throw error;
        }
    }

    /**
     * Build authentication environment for server
     */
    buildAuthEnvironment(serverConfig, token) {
        const env = {};
        
        // Map OAuth token to server-specific environment variables
        switch (serverConfig.type) {
            case 'notion':
                env['NOTION_API_TOKEN'] = token.access_token;
                break;
            case 'github':
                env['GITHUB_TOKEN'] = token.access_token;
                break;
            case 'slack':
                env['SLACK_TOKEN'] = token.access_token;
                break;
            case 'google':
                env['GOOGLE_ACCESS_TOKEN'] = token.access_token;
                if (token.refresh_token) {
                    env['GOOGLE_REFRESH_TOKEN'] = token.refresh_token;
                }
                break;
            default:
                env['OAUTH_TOKEN'] = token.access_token;
        }
        
        return env;
    }

    /**
     * Stop a server
     */
    async stopServer(serverName) {
        logger.info('Stopping server', { serverName });
        
        try {
            await this.serverRegistry.stop(serverName);
            
            if (this.metrics) {
                this.metrics.recordServerEvent('stopped', serverName);
            }
            
            logger.info('Server stopped successfully', { serverName });
            return true;
            
        } catch (error) {
            logger.error('Failed to stop server', { 
                serverName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Invoke a tool
     */
    async invokeTool(toolName, args = {}) {
        const timer = this.metrics ? this.metrics.startTimer('mcp_tool_duration_ms') : null;
        
        try {
            logger.info('Invoking tool', { toolName, args });
            
            // Use circuit breaker if available
            let result;
            if (this.circuitBreakerManager) {
                result = await this.circuitBreakerManager.execute(
                    `tool-${toolName}`,
                    async () => await this.toolRegistry.invokeTool(toolName, args)
                );
            } else {
                result = await this.toolRegistry.invokeTool(toolName, args);
            }
            
            const duration = timer ? timer.end() : 0;
            
            if (this.metrics) {
                this.metrics.recordToolInvocation(toolName, duration, true);
            }
            
            logger.info('Tool invocation successful', { toolName, duration });
            return result;
            
        } catch (error) {
            const duration = timer ? timer.end() : 0;
            
            if (this.metrics) {
                this.metrics.recordToolInvocation(toolName, duration, false);
            }
            
            logger.error('Tool invocation failed', { 
                toolName, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get available tools
     */
    async getAvailableTools() {
        return await this.toolRegistry.getAllTools();
    }

    /**
     * Get active servers
     */
    async getActiveServers() {
        return await this.serverRegistry.getActiveServers();
    }

    /**
     * Check if service is available
     */
    hasService(serviceName) {
        const activeServers = this.serverRegistry.getActiveServers();
        return activeServers.some(server => 
            server.name === serviceName || 
            server.type === serviceName
        );
    }

    /**
     * Answer a question using intelligent strategies
     */
    async answerQuestion(question, context = {}) {
        logger.info('Processing question', { 
            question: question.substring(0, 100) 
        });
        
        try {
            const answer = await this.answerService.getAnswer(question, context);
            
            this.emit('questionAnswered', {
                question,
                answer: answer.answer,
                strategy: answer.strategy,
                duration: answer.duration
            });
            
            return answer;
            
        } catch (error) {
            logger.error('Failed to answer question', { 
                error: error.message 
            });
            
            this.emit('questionFailed', {
                question,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Get enhanced answer using MCP tools and context
     */
    async getEnhancedAnswer(question, screenshotBase64 = null) {
        try {
            if (this.answerService) {
                return await this.answerService.getEnhancedAnswer(question, screenshotBase64);
            } else {
                // Fallback if answer service not available
                return {
                    success: false,
                    error: 'Answer service not available',
                    fallback: true
                };
            }
        } catch (error) {
            logger.error('Enhanced answer generation failed', { error: error.message });
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }

    /**
     * Start OAuth flow for a service
     * @param {string} serviceName - Name of the service (e.g., 'notion', 'github')
     * @returns {string} OAuth URL for user authentication
     */
    async startOAuthFlow(serviceName) {
        logger.info('Starting OAuth flow', { serviceName });
        
        try {
            // Check if we have OAuth client credentials
            if (!this.oauthManager.hasClientCredentials(serviceName)) {
                throw new Error(`No OAuth client credentials configured for ${serviceName}. Please check your environment variables.`);
            }
            
            // Check if we already have a valid token
            const existingToken = await this.oauthManager.getValidToken(serviceName);
            if (existingToken) {
                logger.info('OAuth flow completed with existing token', { serviceName });
                this.emit('oauthSuccess', { serviceName, isExisting: true });
                return { success: true, message: 'Already authenticated', accessToken: existingToken };
            }
            
            // Generate OAuth URL but don't open browser or wait for callback
            // The UI will handle opening the browser
            const callbackUrl = await this.oauthManager.prepareOAuthFlow(serviceName);
            const authUrl = this.oauthManager.generateOAuthUrl(serviceName, callbackUrl);
            
            logger.info('OAuth URL generated successfully', { serviceName, authUrl });
            
            // Return the URL for the UI to handle
            return authUrl;
            
        } catch (error) {
            logger.error('Failed to start OAuth flow', { serviceName, error: error.message });
            throw error;
        }
    }

    /**
     * Handle OAuth callback
     * @param {string} code - Authorization code from OAuth provider
     * @param {string} state - State parameter for CSRF protection
     */
    async handleOAuthCallback(code, state) {
        logger.info('Handling OAuth callback', { code: code?.substring(0, 10) + '...', state });
        
        try {
            // Process the callback through config manager
            const result = await this.configManager.handleOAuthCallback(code, state);
            
            logger.info('OAuth callback processed successfully');
            this.emit('oauthCallback', { result });
            
            return {
                success: true,
                message: 'OAuth authentication completed successfully',
                data: result
            };
            
        } catch (error) {
            logger.error('Failed to handle OAuth callback', { error: error.message });
            throw error;
        }
    }

    /**
     * Process a message from the queue
     */
    async processMessage(message) {
        logger.debug('Processing message', { 
            id: message.id, 
            type: message.type 
        });
        
        try {
            const { method, params } = message.payload;
            
            switch (method) {
                case 'tools/invoke':
                    return await this.invokeTool(params.name, params.arguments);
                    
                case 'server/start':
                    return await this.startServer(params.serverName);
                    
                case 'server/stop':
                    return await this.stopServer(params.serverName);
                    
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            
        } catch (error) {
            logger.error('Message processing failed', { 
                id: message.id, 
                error: error.message 
            });
            throw error;
        }
    }

    // Event Handlers
    
    handleServerStarted({ serverName }) {
        logger.info('Server started event', { serverName });
        this.emit('serverStarted', { serverName });
    }
    
    handleServerStopped({ serverName }) {
        logger.info('Server stopped event', { serverName });
        this.emit('serverStopped', { serverName });
    }
    
    handleServerError({ serverName, error }) {
        logger.error('Server error event', { serverName, error: error.message });
        this.emit('serverError', { serverName, error });
    }
    
    handleToolsUpdated({ serverName, tools }) {
        logger.info('Tools updated event', { serverName, toolCount: tools.length });
        this.emit('toolsUpdated', { serverName, tools });
    }
    
    handleToolInvoked({ toolName, duration, success }) {
        logger.info('Tool invoked event', { toolName, duration, success });
        this.emit('toolInvoked', { toolName, duration, success });
    }
    
    handleTokenAcquired({ serviceName }) {
        logger.info('Token acquired event', { serviceName });
        this.emit('tokenAcquired', { serviceName });
        
        // Try to start the server now that we have a token
        this.startServer(serviceName).catch(error => {
            logger.error('Failed to start server after token acquisition', {
                serviceName,
                error: error.message
            });
        });
    }
    
    handleTokenRefreshed({ serviceName }) {
        logger.info('Token refreshed event', { serviceName });
        this.emit('tokenRefreshed', { serviceName });
    }
    
    handleAuthSuccess(authResult) {
        logger.info('Auth success event', { provider: authResult.provider });
        this.emit('authSuccess', authResult);
        
        // After successful OAuth, automatically start the server if it's available
        if (authResult.provider) {
            this.startServerAfterAuth(authResult.provider).catch(error => {
                logger.error('Failed to start server after successful auth', { 
                    provider: authResult.provider, 
                    error: error.message 
                });
            });
        }
    }
    
    /**
     * Start server after successful authentication
     */
    async startServerAfterAuth(serviceName) {
        try {
            logger.info('Attempting to start server after successful OAuth', { serviceName });
            
            // Check if this service has a server configuration
            const hasServerConfig = await this.serverRegistry.hasServerConfiguration(serviceName);
            
            if (hasServerConfig) {
                logger.info('Server configuration found; registering and starting server', { serviceName });
                // Register server if not already registered
                if (!this.serverRegistry.hasServer(serviceName)) {
                    const config = this.serverRegistry.getServerConfig(serviceName);
                    await this.serverRegistry.register(serviceName, config);
                }
                // Start the newly registered server
                await this.startServer(serviceName);
                logger.info('Server registered and started successfully after OAuth', { serviceName });
            } else {
                logger.info('No server configuration found, registering as OAuth-only service', { serviceName });
                // For OAuth-only services (like "google"), register them as authenticated
                this.serverRegistry.registerOAuthService(serviceName);
            }
        } catch (error) {
            logger.error('Failed to start server after auth', { serviceName, error: error.message });
            // Don't throw - this shouldn't break the OAuth flow
        }
    }
    
    handleConnectionCreated({ serverName, connectionId }) {
        logger.info('Connection created event', { serverName, connectionId });
        
        if (this.metrics) {
            this.metrics.recordConnection('created', serverName);
        }
    }
    
    handleConnectionClosed({ serverName, connectionId }) {
        logger.info('Connection closed event', { serverName, connectionId });
        
        if (this.metrics) {
            this.metrics.recordConnection('closed', serverName);
        }
    }

    /**
     * Get client status
     */
    getStatus() {
        const status = {
            initialized: this.isInitialized,
            servers: this.serverRegistry.getStatus(),
            tools: this.toolRegistry.getStatus(),
            oauth: this.oauthManager.getStatus()
        };
        
        if (this.connectionPool) {
            status.connectionPool = this.connectionPool.getStatistics();
        }
        
        if (this.circuitBreakerManager) {
            status.circuitBreakers = this.circuitBreakerManager.getAllStatuses();
        }
        
        if (this.messageQueue) {
            status.messageQueue = this.messageQueue.getStatistics();
        }
        
        if (this.metrics) {
            status.metrics = this.metrics.getMetricsSummary();
        }
        
        return status;
    }

    /**
     * Shutdown the client
     */
    async shutdown() {
        logger.info('Shutting down MCPClient...');
        
        try {
            // Stop message processing
            this.messageQueue.stopProcessing();
            
            // Stop all servers
            const servers = this.serverRegistry.getConfiguredServers();
            for (const server of servers) {
                if (server.status === 'running') {
                    try {
                        await this.serverRegistry.stop(server.name);
                    } catch (error) {
                        logger.error('Failed to stop server during shutdown', { 
                            serverName: server.name, 
                            error: error.message 
                        });
                    }
                }
            }
            
            // Close connection pool
            if (this.connectionPool) {
                await this.connectionPool.closeAll();
            }
            
            // Destroy message queue
            this.messageQueue.destroy();
            
            // Destroy metrics
            if (this.metrics) {
                this.metrics.destroy();
            }
            
            this.isInitialized = false;
            logger.info('MCPClient shutdown complete');
            this.emit('shutdown');
            
        } catch (error) {
            logger.error('Error during shutdown', { error: error.message });
            throw error;
        }
    }

    /**
     * Start OAuth callback server for handling OAuth flows
     * @returns {Promise<number>} The port number of the started server
     */
    async startOAuthCallbackServer() {
        if (this.oauthServer) {
            logger.info('OAuth server already running', { port: this.oauthPort });
            return this.oauthPort;
        }

        const http = require('http');
        const { URL } = require('url');
        
        // Try specific ports that can be pre-registered with OAuth providers
        const preferredPorts = [3000, 3001, 3002, 3003, 3004];
        
        return new Promise((resolve, reject) => {
            let portIndex = 0;
            
            const tryNextPort = () => {
                if (portIndex >= preferredPorts.length) {
                    // If all preferred ports are taken, use random port as fallback
                    const port = 0;
                    startServer(port);
                    return;
                }
                
                const port = preferredPorts[portIndex++];
                startServer(port);
            };
            
            const startServer = (port) => {
                // Create server
                this.oauthServer = http.createServer((req, res) => {
                    const url = new URL(req.url, `http://localhost:${this.oauthPort}`);
                    
                    logger.info('OAuth callback received', { url: url.toString() });
                    
                    // Handle favicon requests to prevent them from being processed as OAuth callbacks
                    if (url.pathname === '/favicon.ico') {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Not Found');
                        return;
                    }
                    
                    // Only process /callback path for OAuth
                    if (url.pathname !== '/callback') {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Invalid OAuth callback path');
                        return;
                    }
                    
                    // Extract OAuth parameters
                    const code = url.searchParams.get('code');
                    const state = url.searchParams.get('state');
                    const error = url.searchParams.get('error');
                    
                    // Send success page to user
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    });
                    
                    if (error) {
                        res.end(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Authorization Error</title>
                                <style>
                                    body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
                                    .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 5px; }
                                </style>
                            </head>
                            <body>
                                <h1>❌ Authorization Error</h1>
                                <div class="error">
                                    <strong>Error:</strong> ${error}<br>
                                    <strong>Description:</strong> ${url.searchParams.get('error_description') || 'Unknown error'}
                                </div>
                                <p>You can close this tab and try again from the Leviousa app.</p>
                            </body>
                            </html>
                        `);
                    } else if (code && state) {
                        res.end(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Authorization Successful</title>
                                <style>
                                    body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
                                    .success { color: #2e7d32; background: #e8f5e9; padding: 15px; border-radius: 5px; }
                                </style>
                            </head>
                            <body>
                                <h1>✅ Authorization Successful!</h1>
                                <div class="success">
                                    You have been successfully authorized. You can now close this tab and return to the Leviousa app.
                                </div>
                                <script>
                                    // Auto-close tab after 3 seconds
                                    setTimeout(() => {
                                        try { window.close(); } catch(e) {}
                                    }, 3000);
                                </script>
                            </body>
                            </html>
                        `);
                        
                        // Process OAuth callback using the OAuth manager
                        setImmediate(() => {
                            this.oauthManager.handleOAuthCallback(code, state).catch(error => {
                                logger.error('OAuth callback processing failed', { error: error.message });
                            });
                        });
                    } else {
                        res.end(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Invalid Callback</title>
                                <style>
                                    body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
                                    .warning { color: #f57c00; background: #fff3e0; padding: 15px; border-radius: 5px; }
                                </style>
                            </head>
                            <body>
                                <h1>⚠️ Invalid Callback</h1>
                                <div class="warning">
                                    Missing required OAuth parameters. Please try the authorization process again.
                                </div>
                            </body>
                            </html>
                        `);
                    }
                });

                // Start server on specific port
                this.oauthServer.listen(port, 'localhost', (err) => {
                    if (err) {
                        logger.info('Port unavailable, trying next', { port });
                        this.oauthServer = null;
                        tryNextPort();
                        return;
                    }
                    
                    this.oauthPort = this.oauthServer.address().port;
                    logger.info('OAuth server started', { port: this.oauthPort });
                    
                    // Auto-stop server after 10 minutes
                    setTimeout(() => {
                        this.stopOAuthCallbackServer();
                    }, 10 * 60 * 1000);
                    
                    resolve(this.oauthPort);
                });

                this.oauthServer.on('error', (err) => {
                    logger.error('OAuth server error', { error: err.message });
                    this.oauthServer = null;
                    tryNextPort();
                });
            };
            
            tryNextPort();
        });
    }

    /**
     * Stop the OAuth callback server
     */
    async stopOAuthCallbackServer() {
        if (!this.oauthServer) {
            return;
        }

        return new Promise((resolve) => {
            logger.info('Stopping OAuth server...');
            this.oauthServer.close(() => {
                logger.info('OAuth server stopped');
                this.oauthServer = null;
                this.oauthPort = null;
                resolve();
            });
        });
    }
}

module.exports = MCPClient; 