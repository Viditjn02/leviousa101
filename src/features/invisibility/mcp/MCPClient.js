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
            enableConnectionPool: false,
            enableCircuitBreaker: true,
            enableMetrics: true,
            maxConcurrentConnections: 5,
            ...options
        };
        
        // Core components
        this.configManager = options.configManager || null;
        this.serverRegistry = new ServerRegistry();
        this.toolRegistry = new ToolRegistry(this.serverRegistry);
        this.oauthManager = new OAuthManager();
        this.llmService = options.llmService || null; // CRITICAL FIX: Set LLM service from options
        
        // Add comprehensive answer strategies for proper LLM responses
        this.answerStrategies = {
            // MCP debug and testing - verify MCP functionality
            mcp_debug: {
                systemPrompt: `You are providing MCP debugging and testing information. Show the user detailed information about available MCP tools, connections, and test results. If MCP tools are working, demonstrate with actual tool calls. If not working, provide troubleshooting guidance. Be technical but helpful.`,
                useResearch: false,
                maxTokens: 2000,
                temperature: 0.1,
                useMCPTools: true,
                performMCPTest: true
            },
            
            // Service-specific DATA access - actually access any service data via MCP
            github_data_access: {
                systemPrompt: `You are accessing real GitHub data through MCP tools. Use the available MCP tools to actually retrieve repositories, issues, pull requests, or code from the user's GitHub account. Don't describe what you see on screen - use MCP to access their actual GitHub data. If no MCP tools are available, explain that GitHub integration needs to be set up.`,
                useResearch: false,
                maxTokens: 2000,
                temperature: 0.2,
                useMCPTools: true,
                requiresServiceMCP: 'github'
            },
            
            notion_data_access: {
                systemPrompt: `You are accessing real Notion data through MCP tools. Use the available MCP tools to actually retrieve pages, databases, or content from the user's Notion workspace. Don't describe what you see on screen - use MCP to access their actual Notion data. If no MCP tools are available, explain that Notion integration needs to be set up.`,
                useResearch: false,
                maxTokens: 2000,
                temperature: 0.2,
                useMCPTools: true,
                requiresServiceMCP: 'notion'
            },
            
            slack_data_access: {
                systemPrompt: `You are accessing real Slack data through MCP tools. Use the available MCP tools to actually retrieve messages, channels, or workspace information from the user's Slack. Don't describe what you see on screen - use MCP to access their actual Slack data. If no MCP tools are available, explain that Slack integration needs to be set up.`,
                useResearch: false,
                maxTokens: 2000,
                temperature: 0.2,
                useMCPTools: true,
                requiresServiceMCP: 'slack'
            },
            
            google_data_access: {
                systemPrompt: `You are accessing real Google services data through MCP tools. Use the available MCP tools to actually retrieve files from Google Drive, emails from Gmail, or calendar events from Google Calendar. Don't describe what you see on screen - use MCP to access their actual Google data. If no MCP tools are available, explain that Google integration needs to be set up.`,
                useResearch: false,
                maxTokens: 2000,
                temperature: 0.2,
                useMCPTools: true,
                requiresServiceMCP: 'google'
            },
            
            mcp_data_access: {
                systemPrompt: `You are accessing real data from connected services through MCP tools. Use the available MCP tools to actually retrieve data from any connected services (GitHub, Notion, Slack, Google Drive, etc.). Don't describe what you see on screen - use MCP to access their actual service data. If no relevant MCP tools are available, explain what services can be integrated and how to set them up.`,
                useResearch: false,
                maxTokens: 2000,
                temperature: 0.2,
                useMCPTools: true,
                requiresServiceMCP: 'any'
            },
            
            // Email drafting and sending
            email_draft: {
                systemPrompt: `You are drafting professional emails. Use available MCP tools to access email context, contacts, and templates. Write clear, appropriate email content based on the context provided. If you have access to Gmail tools, you can also send the email directly.`,
                useResearch: false,
                maxTokens: 1500,
                temperature: 0.3,
                useMCPTools: true,
                requiresServiceMCP: 'gmail'
            },
            
            // MCP capability questions - explain what the system can do
            mcp_capabilities: {
                systemPrompt: `You are explaining your capabilities as an AI system with MCP (Model Context Protocol) integrations. Be specific about what tools and services you can connect to. Mention that you can access Notion, GitHub, file systems, databases, and other external services through MCP. Explain how this allows you to do real-world tasks beyond just text generation. Be confident but informative about your actual capabilities.`,
                useResearch: false,
                maxTokens: 1500,
                temperature: 0.2,
                useMCPTools: true
            },
            
            // Web search requests - CRITICAL FIX for "latest articles on elon musk"
            web_search_request: {
                systemPrompt: `You are helping the user find current information through web search tools. Use available web search MCP tools to find real-time, up-to-date information. Focus on recent developments, news, articles, and current events. Present the information clearly with sources when available.`,
                useResearch: true,
                maxTokens: 2000,
                temperature: 0.2,
                useMCPTools: true,
                requiresWebSearch: true
            },

            // Screen context questions - CRITICAL FIX for "what do you see on my screen"
            screen_context: {
                systemPrompt: `You are analyzing what's visible on the user's screen. Focus on describing the content, interface elements, applications, and any visible text or graphics. Be specific about what you can see in the screenshot. Provide useful observations about the current state of their screen.`,
                useResearch: false,
                maxTokens: 1500,
                temperature: 0.3,
                useMCPTools: false,
                requiresScreenshot: true
            },

            // General with tool support
            general: {
                systemPrompt: `You are answering a question naturally. Use available MCP tools when relevant to provide accurate, up-to-date information. Be helpful and informative but write as if you're someone knowledgeable sharing information.`,
                useResearch: true,
                maxTokens: 1000,
                temperature: 0.3,
                useMCPTools: true
            }
        };
        
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
            llmService: this.llmService || options.llmService
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
        
        // Configuration Manager events for OAuth server startup
        if (this.configManager) {
            this.configManager.on('oauth-server-ready', this.handleOAuthServerReady.bind(this));
        }
        
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
        // Only use Paragon MCP which provides access to all integrations
        const desired = ['paragon'];
        logger.info('Starting configured servers', { desired });
        
        for (const name of desired) {
            logger.info('Processing server', { serverName: name });
            
            // Auto-register using definitions if not already registered
            if (!this.serverRegistry.hasServer(name)) {
                logger.info('Server not registered, attempting to get definition', { serverName: name });
                
                const def = this.serverRegistry.getServerDefinition(name);
                if (def) {
                    logger.info('Server definition found, registering', { serverName: name, definition: def });
                    await this.serverRegistry.register(name, def);
                    logger.info('Auto-registered MCP server', { serverName: name });
                } else {
                    logger.warn('No server definition for', { serverName: name });
                    logger.warn('Available definitions', { 
                        available: Object.keys(this.serverRegistry.serverDefinitions || {})
                    });
                    continue;
                }
            } else {
                logger.info('Server already registered', { serverName: name });
            }
            
            // Handle authentication based on server type
            if (name === 'paragon') {
                // Paragon uses JWT authentication, not OAuth
                const paragonJwtService = require('./paragonJwtService');
                if (!paragonJwtService.getStatus().initialized) {
                    logger.warn('Paragon JWT service not initialized', { serverName: name });
                    // Continue anyway - the server manager will handle initialization
                }
                logger.info('Paragon provides access to Google, Notion, Slack and 130+ other integrations');
            } else {
                // Ensure OAuth token is present for other servers
                const token = await this.oauthManager.getValidToken(name);
                if (!token) {
                    logger.info('No valid OAuth token for', { serverName: name, action: 'starting OAuth flow' });
                    await this.oauthManager.startOAuthFlow(name);
                } else {
                    logger.info('Valid OAuth token found', { serverName: name });
                }
            }
            
            // Attempt to start the server
            try {
                logger.info('Starting server', { serverName: name });
                await this.startServer(name);
                logger.info('Server started successfully', { serverName: name });
            } catch (error) {
                logger.error('Failed to start MCP server', { serverName: name, error: error.message });
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
            
            // Get authentication credentials if needed
            let env = {};
            if (serverConfig.requiresAuth) {
                if (serverName === 'paragon' || serverConfig.authType === 'jwt') {
                    // Paragon uses JWT authentication
                    const paragonJwtService = require('./paragonJwtService');
                    
                    // Ensure JWT service is initialized
                    if (!paragonJwtService.getStatus().initialized) {
                        paragonJwtService.initialize({
                            projectId: process.env.PARAGON_PROJECT_ID,
                            signingKey: process.env.PARAGON_SIGNING_KEY,
                            signingKeyPath: process.env.PARAGON_SIGNING_KEY_PATH
                        });
                    }
                    
                    // Generate JWT token for current user
                    const authService = require('../../common/services/authService');
                    const currentUserId = authService.getCurrentUserId();
                    
                    if (currentUserId) {
                        const jwtToken = paragonJwtService.generateUserToken(currentUserId);
                        if (jwtToken) {
                            env['PARAGON_USER_TOKEN'] = jwtToken;
                            logger.info('Generated Paragon JWT token for user', { userId: currentUserId });
                        } else {
                            logger.warn('Failed to generate Paragon JWT token');
                        }
                    } else {
                        logger.warn('No current user ID for Paragon JWT generation');
                    }
                } else {
                    // OAuth authentication for other servers
                    const token = await this.oauthManager.getValidToken(serverName);
                    if (!token) {
                        throw new Error(`No valid OAuth token found for ${serverName}. Please authenticate first.`);
                    }
                    env = this.buildAuthEnvironment(serverConfig, token);
                }
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
        switch (serverConfig.type || serverConfig.name) {
            case 'paragon':
                // Paragon JWT token should already be set in env
                // This method is typically not called for Paragon
                break;
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
     * Generate intelligent answer with proper context and tool integration
     */
    async generateAnswer(question, screenshotBase64, strategy, researchContext, mcpContext = '') {
        try {
            // Use the existing LLM service from MCPMigrationBridge if available
            if (this.llmService && typeof this.llmService.generateResponse === 'function') {
                return await this.generateAnswerWithLLMService(question, screenshotBase64, strategy, researchContext, mcpContext);
            }

            const modelStateService = require('../../common/services/modelStateService');
            const { createLLM } = require('../../common/ai/factory'); // Use createLLM instead of streaming
            
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('LLM model not configured');
            }

            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: strategy.temperature,
                maxTokens: strategy.maxTokens,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            // Build the prompt
            let userPrompt = `Question: ${question.text}`;
            
            if (question.context) {
                userPrompt += `\n\nContext: ${question.context}`;
            }

            if (researchContext) {
                // Check if this looks like retrieved service data vs general research
                if (researchContext.includes('Data Retrieved:')) {
                    userPrompt += `\n\nRetrieved Data:\n${researchContext}`;
                } else {
                    userPrompt += `\n\nRelevant Information:\n${researchContext}`;
                }
            }

            if (mcpContext) {
                userPrompt += `\n\nMCP Capabilities and Tools:\n${mcpContext}`;
            }

            // Add tools information for better responses
            if (strategy.useMCPTools) {
                const availableTools = this.toolRegistry.listTools();
                if (availableTools && availableTools.length > 0) {
                    const toolNames = availableTools.map(t => t.name).join(', ');
                    userPrompt += `\n\nAvailable Tools: ${toolNames}`;
                }
            }

            userPrompt += `\n\nPlease provide a clear, accurate, and helpful answer. Make it appropriate for the context (${question.type || 'general'} question).`;

            const messages = [
                {
                    role: 'system',
                    content: strategy.systemPrompt
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt }
                    ]
                }
            ];

            // Include screenshot if available for visual context (but not for specific data access)
            if (screenshotBase64 && !question.type?.includes('data_access')) {
                messages[1].content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                });
            }

            // Use non-streaming chat for enhanced answers
            const response = await llm.chat(messages);
            
            if (response && response.content) {
                return response.content.trim();
            } else {
                throw new Error('No response content received from LLM');
            }
        } catch (error) {
            logger.error('Error generating answer', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate answer using the MCPMigrationBridge LLM service
     */
    async generateAnswerWithLLMService(question, screenshotBase64, strategy, researchContext, mcpContext = '') {
        try {
            // Build comprehensive context for LLM service
            let context = '';
            
            if (question.context) {
                context += `Context: ${question.context}\n\n`;
            }

            if (researchContext) {
                if (researchContext.includes('Data Retrieved:')) {
                    context += `Retrieved Data:\n${researchContext}\n\n`;
                } else {
                    context += `Relevant Information:\n${researchContext}\n\n`;
                }
            }

            if (mcpContext) {
                context += `MCP Capabilities and Tools:\n${mcpContext}\n\n`;
            }

            if (strategy.useMCPTools) {
                const availableTools = this.toolRegistry.listTools();
                if (availableTools && availableTools.length > 0) {
                    const toolNames = availableTools.map(t => t.name).join(', ');
                    context += `Available Tools: ${toolNames}\n\n`;
                }
            }

            context += `Please provide a clear, accurate, and helpful answer appropriate for the context (${question.type || 'general'} question).`;

            // Use the LLM service to generate response
            const response = await this.llmService.generateResponse(
                question.text, 
                { 
                    screenshot: screenshotBase64,
                    context: context 
                }, 
                {
                    temperature: strategy.temperature,
                    maxTokens: strategy.maxTokens,
                    systemPrompt: strategy.systemPrompt
                }
            );

            return response.trim();
        } catch (error) {
            logger.error('Error generating answer with LLM service', { error: error.message });
            throw error;
        }
    }

    /**
     * Enhanced answer generation with access to external tools
     */
    async getEnhancedAnswer(question, screenshotBase64) {
        if (!this.isInitialized) {
            throw new Error('MCPClient not initialized');
        }

        try {
            logger.info('Generating enhanced answer', { 
                questionType: question.type || 'general',
                hasScreenshot: !!screenshotBase64 
            });

            // Use the answer service if available
            if (this.answerService && typeof this.answerService.getEnhancedAnswer === 'function') {
                try {
                    return await this.answerService.getEnhancedAnswer(question, screenshotBase64);
                } catch (answerServiceError) {
                    logger.warn('Answer service failed, using direct generation', { error: answerServiceError.message });
                    // Fall through to direct generation
                }
            }

            // Get the appropriate strategy for this question type
            const strategy = this.answerStrategies[question.type] || this.answerStrategies.general;

            // Handle service-specific data access questions
            if (strategy.requiresServiceMCP) {
                const serviceData = await this.accessServiceData(question);
                if (serviceData) {
                    logger.info('Retrieved service data', { dataLength: serviceData.length });
                    const answer = await this.generateAnswer(question, null, strategy, serviceData, '');
                    return this.postProcessAnswer(answer, question.type);
                } else {
                    // Provide guidance for setting up service integration
                    const setupMessage = `I don't currently have access to your ${strategy.requiresServiceMCP} workspace. To set it up:

1. Go to Settings > MCP Integration
2. Find ${strategy.requiresServiceMCP} and click Connect
3. Complete the authentication flow

Would you like me to describe what I can see on your screen instead?`;
                    return setupMessage;
                }
            }

            // Handle web search requests
            if (strategy.requiresWebSearch) {
                const webSearchData = await this.performWebSearch(question);
                if (webSearchData) {
                    logger.info('Web search completed', { dataLength: webSearchData.length });
                    const answer = await this.generateAnswer(question, null, strategy, webSearchData, '');
                    return this.postProcessAnswer(answer, question.type);
                } else {
                    logger.warn('Web search failed, falling back to standard answer');
                    // Fall through to standard answer generation
                }
            }

            // Handle screen context requests - CRITICAL FIX for "what do you see on my screen"
            if (strategy.requiresScreenshot) {
                try {
                    // Capture screenshot
                    const screenshotResult = await this.captureScreenshot();
                    if (screenshotResult && screenshotResult.success && screenshotResult.base64) {
                        logger.info('Screenshot captured for screen analysis', { 
                            width: screenshotResult.width, 
                            height: screenshotResult.height 
                        });
                        const answer = await this.generateAnswer(question, screenshotResult.base64, strategy, '', '');
                        return this.postProcessAnswer(answer, question.type);
                    } else {
                        logger.warn('Screenshot capture failed', { error: screenshotResult?.error });
                        return 'I apologize, but I cannot capture a screenshot of your screen right now. This could be due to system permissions or technical issues. Please ensure the application has screen recording permissions.';
                    }
                } catch (screenshotError) {
                    logger.error('Screenshot capture error', { error: screenshotError.message });
                    return 'I encountered an error while trying to capture your screen. Please check if the application has the necessary permissions to access your screen.';
                }
            }

            // Handle MCP debug and testing requests
            if (strategy.performMCPTest) {
                const debugInfo = await this.performMCPDebugTest();
                const answer = await this.generateAnswer(question, null, strategy, '', debugInfo);
                return this.postProcessAnswer(answer, question.type);
            }

            // Generate standard answer
            let researchContext = '';
            if (strategy.useResearch) {
                researchContext = await this.getResearchContext(question);
            }

            const answer = await this.generateAnswer(question, screenshotBase64, strategy, researchContext);
            return this.postProcessAnswer(answer, question.type);

        } catch (error) {
            logger.error('Error generating enhanced answer', { error: error.message });
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
            
            // Check if result contains UI resources
            if (result && this._containsUIResource(result)) {
                logger.info('Tool returned UI resource', { toolName });
                
                // Emit event for UI handling
                this.emit('ui-resource-received', {
                    toolName,
                    result: this._processUIResource(result)
                });
            }
            
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
     * Access service-specific data using MCP tools
     */
    async accessServiceData(question) {
        try {
            const availableTools = this.toolRegistry.listTools();
            if (!availableTools || availableTools.length === 0) {
                logger.warn('No MCP tools available for service data access');
                return null;
            }

            // Try to find relevant tools for the service
            const serviceName = question.type?.split('_')[0]; // e.g., 'notion' from 'notion_data_access'
            const serviceTools = availableTools.filter(tool => 
                tool.name.toLowerCase().includes(serviceName) ||
                tool.description?.toLowerCase().includes(serviceName)
            );

            if (serviceTools.length === 0) {
                logger.warn('No tools found for service', { serviceName });
                return null;
            }

            // Execute the first relevant tool to get some data
            const tool = serviceTools[0];
            logger.info('Accessing service data with tool', { toolName: tool.name });
            
            try {
                const result = await this.invokeTool(tool.name, {});
                if (result && typeof result === 'object') {
                    return `Data Retrieved: ${JSON.stringify(result, null, 2)}`;
                } else if (result && typeof result === 'string') {
                    return `Data Retrieved: ${result}`;
                }
            } catch (toolError) {
                logger.error('Tool execution failed', { toolName: tool.name, error: toolError.message });
            }

            return null;
        } catch (error) {
            logger.error('Error accessing service data', { error: error.message });
            return null;
        }
    }

    /**
     * Perform MCP debug test to verify tool functionality
     */
    async performMCPDebugTest() {
        try {
            const availableTools = this.toolRegistry.listTools();
            const debugInfo = [];

            debugInfo.push('=== MCP Debug Test Results ===');
            debugInfo.push(`Available Tools: ${availableTools.length}`);
            
            if (availableTools.length > 0) {
                debugInfo.push('\nTool List:');
                availableTools.forEach((tool, index) => {
                    debugInfo.push(`${index + 1}. ${tool.name} - ${tool.description || 'No description'}`);
                });

                // Try to execute a simple tool if available
                const testTool = availableTools.find(t => t.name.includes('list') || t.name.includes('get'));
                if (testTool) {
                    debugInfo.push(`\nTesting tool: ${testTool.name}`);
                    try {
                        const testResult = await this.invokeTool(testTool.name, {});
                        debugInfo.push(`✅ Tool test successful: ${JSON.stringify(testResult).substring(0, 200)}`);
                    } catch (testError) {
                        debugInfo.push(`❌ Tool test failed: ${testError.message}`);
                    }
                }
            } else {
                debugInfo.push('❌ No MCP tools available');
            }

            return debugInfo.join('\n');
        } catch (error) {
            return `MCP Debug Test Error: ${error.message}`;
        }
    }

    /**
     * Post-process answer based on question type
     */
    postProcessAnswer(answer, questionType) {
        if (!answer) return answer;

        // Add context-specific formatting
        if (questionType && questionType.includes('data_access')) {
            return `${answer}\n\n*Data retrieved via MCP integration*`;
        }

        return answer;
    }

    /**
     * Perform web search for current information requests
     */
    async performWebSearch(question) {
        try {
            logger.info('Performing web search', { questionText: question.text?.substring(0, 100) });
            
            // Try to find web search tools in the tool registry
            const availableTools = this.toolRegistry.listTools();
            const webSearchTool = availableTools.find(tool => 
                tool.name.toLowerCase().includes('web_search') || 
                tool.name.toLowerCase().includes('search') ||
                tool.name.toLowerCase().includes('perplexity')
            );

            if (webSearchTool) {
                logger.info('Found web search tool', { toolName: webSearchTool.name });
                
                const searchArgs = {
                    query: question.text,
                    search_type: 'recent',
                    context: question.context || 'User is looking for current information'
                };

                const result = await this.invokeTool(webSearchTool.name, searchArgs);
                
                if (result && result.content && result.content[0]) {
                    return `Web Search Results: ${result.content[0].text}`;
                } else if (typeof result === 'string') {
                    return `Web Search Results: ${result}`;
                } else if (typeof result === 'object') {
                    return `Web Search Results: ${JSON.stringify(result)}`;
                }
            } else {
                logger.warn('No web search tools found, trying dynamic tool selection');
                
                // Try using dynamic tool selection for web search
                if (global.askService?.dynamicToolService) {
                    const result = await global.askService.dynamicToolService.selectAndExecuteTools(
                        question.text, 
                        { needsWebSearch: true }
                    );
                    
                    if (result && result.response) {
                        return `Search Results: ${result.response}`;
                    }
                }
            }

            logger.warn('Web search failed - no search tools available');
            return null;
            
        } catch (error) {
            logger.error('Error performing web search', { error: error.message });
            return null;
        }
    }

    /**
     * Get research context for questions that require it
     */
    async getResearchContext(question) {
        try {
            // This would normally integrate with research tools
            // For now, return empty context since research tools aren't set up
            logger.info('Research context requested', { questionText: question.text?.substring(0, 100) });
            return '';
        } catch (error) {
            logger.error('Error getting research context', { error: error.message });
            return '';
        }
    }

    /**
     * Capture screenshot for screen context analysis
     */
    async captureScreenshot() {
        try {
            // Try to use global askService screenshot functionality
            if (global.askService && typeof global.askService.captureScreenshot === 'function') {
                return await global.askService.captureScreenshot({ quality: 'medium' });
            }
            
            // Alternative: try invisibility service
            if (global.invisibilityService && typeof global.invisibilityService.captureScreen === 'function') {
                const base64 = await global.invisibilityService.captureScreen();
                if (base64) {
                    return { success: true, base64, width: null, height: null };
                }
            }
            
            // If no screenshot services available
            logger.warn('No screenshot service available');
            return { success: false, error: 'Screenshot service not available' };
            
        } catch (error) {
            logger.error('Screenshot capture failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Enhanced tool calling with both research and external tools
     */
    async callTool(toolName, arguments_) {
        try {
            logger.info('Enhanced tool calling', { toolName, arguments_ });
            return await this.invokeTool(toolName, arguments_);
        } catch (error) {
            logger.error('Enhanced tool call failed', { toolName, error: error.message });
            throw error;
        }
    }

    /**
     * Check if result contains UI resources
     * @private
     */
    _containsUIResource(result) {
        if (!result) return false;
        
        // Check for direct UI resource response
        if (result.type === 'ui_resource' || result.type === 'resource') {
            return true;
        }
        
        // Check for UI resources in content array
        if (result.content && Array.isArray(result.content)) {
            return result.content.some(item => 
                item.type === 'resource' || 
                item.type === 'ui_resource' ||
                (item.resource && (item.resource.mimeType === 'text/html' || 
                                 item.resource.uri?.startsWith('ui://')))
            );
        }
        
        return false;
    }

    /**
     * Process UI resources in the result
     * @private
     */
    _processUIResource(result) {
        // Handle direct UI resource
        if (result.type === 'ui_resource' || result.type === 'resource') {
            return {
                type: 'ui_resource',
                resource: result.resource || result
            };
        }
        
        // Handle UI resources in content array
        if (result.content && Array.isArray(result.content)) {
            // Transform content to include UI resources
            const processedContent = result.content.map(item => {
                if (item.type === 'resource' || item.type === 'ui_resource') {
                    return {
                        ...item,
                        type: 'ui_resource'
                    };
                }
                return item;
            });
            
            return {
                ...result,
                content: processedContent
            };
        }
        
        return result;
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
    
    handleToolInvoked({ fullName, args, result }) {
        logger.info('Tool invoked event', { 
            toolName: fullName, 
            args,
            result,
            success: !!result 
        });
        this.emit('toolInvoked', { 
            toolName: fullName, 
            args,
            result,
            success: !!result 
        });
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
     * Handle OAuth server ready event - automatically start MCP server
     */
    async handleOAuthServerReady(event) {
        const { provider, serverName, tokenData } = event;
        
        logger.info('OAuth server ready, starting MCP server', { 
            provider, 
            serverName 
        });
        
        try {
            // Check if server is already running
            const activeServers = await this.serverRegistry.getActiveServers();
            const isRunning = activeServers.some(server => server.name === serverName);
            
            if (!isRunning) {
                // Extract tokens for environment variables
                const env = {};
                if (tokenData.access_token) {
                    env['GOOGLE_ACCESS_TOKEN'] = tokenData.access_token;
                }
                if (tokenData.refresh_token) {
                    env['GOOGLE_REFRESH_TOKEN'] = tokenData.refresh_token;
                }
                
                // Start the server with OAuth tokens
                await this.startServer(serverName);
                
                logger.info('OAuth MCP server started successfully', { 
                    serverName,
                    hasAccessToken: !!tokenData.access_token
                });
            } else {
                logger.info('OAuth MCP server already running', { serverName });
            }
            
        } catch (error) {
            logger.error('Failed to start OAuth MCP server', { 
                serverName, 
                error: error.message 
            });
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
     * Get MCP tools debug information for askService
     */
    getMCPToolsDebugInfo() {
        const status = this.getStatus();
        const activeServers = this.serverRegistry.getActiveServers();
        const toolsStatus = this.toolRegistry.getStatus();
        
        return {
            totalTools: toolsStatus?.totalTools || 0,
            connectedServices: activeServers?.length || 0,
            activeServers: activeServers?.map(server => server.name) || [],
            initialized: this.isInitialized,
            serverDetails: status.servers,
            toolsDetails: status.tools
        };
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

    /**
     * Get Paragon service authentication status
     * @returns {Object} Status of individual Paragon services
     */
    async getParagonServiceStatus() {
        try {
            logger.info('Getting Paragon service status');
            
            // Check if Paragon server is available
            const paragonServer = this.serverRegistry.servers.get('paragon');
            if (!paragonServer || !paragonServer.adapter) {
                logger.warn('Paragon server not available');
                return {};
            }
            
            // Try to get service status from Paragon server
            // This could be implemented as a specific tool call or resource read
            try {
                const statusResult = await paragonServer.adapter.callTool('get_authenticated_services', {});
                return statusResult.services || {};
            } catch (error) {
                logger.warn('Could not get service status from Paragon server:', error.message);
                // Return default status for known services
                return {
                    'gmail': { authenticated: false, toolsCount: 0 },
                    'google-drive': { authenticated: false, toolsCount: 0 },
                    'google-calendar': { authenticated: false, toolsCount: 0 },
                    'notion': { authenticated: false, toolsCount: 0 },
                    'slack': { authenticated: false, toolsCount: 0 },
                    'salesforce': { authenticated: false, toolsCount: 0 },
                    'hubspot': { authenticated: false, toolsCount: 0 },
                    'airtable': { authenticated: false, toolsCount: 0 }
                };
            }
            
        } catch (error) {
            logger.error('Failed to get Paragon service status:', error.message);
            throw error;
        }
    }

    /**
     * Disconnect a Paragon service
     * @param {string} serviceKey - The service to disconnect
     * @returns {Object} Result of disconnection
     */
    async disconnectParagonService(serviceKey) {
        try {
            logger.info('Disconnecting Paragon service', { serviceKey });
            
            // Check if Paragon server is available
            const paragonServer = this.serverRegistry.servers.get('paragon');
            if (!paragonServer || !paragonServer.adapter) {
                throw new Error('Paragon server not available');
            }
            
            // Call the disconnect tool on Paragon server
            const result = await paragonServer.adapter.callTool('disconnect_service', {
                service: serviceKey
            });
            
            logger.info('Paragon service disconnected successfully', { serviceKey });
            return result;
            
        } catch (error) {
            logger.error('Failed to disconnect Paragon service:', { serviceKey, error: error.message });
            throw error;
        }
    }

    // Note: Paragon authentication is handled via the web interface at /integrations
    // The real flow: invisibilityBridge.js -> opens browser -> ParagonIntegration.tsx -> paragon.connect()
}

module.exports = MCPClient; 