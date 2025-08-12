const { EventEmitter } = require('events');
const modelStateService = require('../common/services/modelStateService');
const MCPServerManager = require('./mcpServerManager');
const MCPConfigManager = require('../../config/mcpConfig');

class MCPClient extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.mcpServers = new Map();
        this.researchTools = [];
        this.serverManager = new MCPServerManager();
        this.externalTools = [];
        this.configManager = new MCPConfigManager();
        this.authenticationInProgress = new Map(); // Track ongoing OAuth flows
        this.oauthServer = null;
        this.oauthPort = null;
        
        // Question type to answer strategy mapping - Human-like responses
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
            
            // MCP capability questions - explain what the system can do
            mcp_capabilities: {
                systemPrompt: `You are explaining your capabilities as an AI system with MCP (Model Context Protocol) integrations. Be specific about what tools and services you can connect to. Mention that you can access Notion, GitHub, file systems, databases, and other external services through MCP. Explain how this allows you to do real-world tasks beyond just text generation. Be confident but informative about your actual capabilities.`,
                useResearch: false,
                maxTokens: 1500,
                temperature: 0.2,
                useMCPTools: true
            },
            
            // Service integration questions
            service_integration: {
                systemPrompt: `You are explaining service integration capabilities through MCP. Be specific about what you can do with various services - GitHub (repositories, issues, code), Notion (pages, databases), Slack (messages, channels), Google Drive (files, documents), Gmail (emails), and others. Mention that through MCP you can access their workspaces and help with data retrieval, analysis, and management. Ask about their specific use case to provide targeted help.`,
                useResearch: false,
                maxTokens: 1200,
                temperature: 0.3,
                useMCPTools: true
            },
            
            // Screen context questions - about visible content
            screen_context: {
                systemPrompt: `You are analyzing what's visible on the user's screen. Focus on the content they're looking at right now. Be specific about what you can see in the screenshot. Don't explain general capabilities - address the specific content or interface they're asking about.`,
                useResearch: false,
                maxTokens: 1000,
                temperature: 0.3,
                requiresScreenshot: true
            },
            
            // System status and configuration
            system_status: {
                systemPrompt: `You are explaining system status, configuration, or connection information. Be practical about what's currently set up, what needs configuration, and how to fix any issues. If asking about OAuth or authentication, guide them through the setup process.`,
                useResearch: false,
                maxTokens: 1000,
                temperature: 0.2,
                useMCPTools: true
            },
            
            // Help and conversation questions
            help_conversation: {
                systemPrompt: `You are providing helpful guidance or continuing a conversation. Be supportive and practical. If they're asking for follow-up, refer to previous context. If they want help, provide clear next steps. Keep responses conversational but useful.`,
                useResearch: false,
                maxTokens: 800,
                temperature: 0.4,
                useConversationHistory: true
            },

            coding: {
                systemPrompt: `You are responding as yourself to a coding question. Write code solutions without mentioning you're an AI. Be direct and practical. Don't use phrases like "Certainly!" or "I'd be happy to help". Just provide the solution with brief explanations as if you're a developer sharing knowledge.`,
                useResearch: true,
                maxTokens: 2000,
                temperature: 0.2
            },
            interview: {
                systemPrompt: `You are answering an interview question as yourself. Respond naturally as if you're in an actual interview. Don't mention being an AI or assistant. Use first person and share experiences as if they're your own. Be confident but natural.`,
                useResearch: false,
                maxTokens: 1500,
                temperature: 0.4
            },
            technical: {
                systemPrompt: `You are explaining a technical concept as someone knowledgeable in the field. Write as if you're explaining to a colleague. Be direct and informative without formal assistant language.`,
                useResearch: true,
                maxTokens: 1800,
                temperature: 0.3
            },
            math: {
                systemPrompt: `You are solving a math problem. Show your work step by step as if you're working through it yourself. Be methodical but don't use assistant phrases.`,
                useResearch: false,
                maxTokens: 1200,
                temperature: 0.1
            },
            general: {
                systemPrompt: `You are answering a question naturally as yourself. Be helpful and informative but write as if you're just someone knowledgeable sharing information, not an AI assistant.`,
                useResearch: true,
                maxTokens: 1000,
                temperature: 0.3
            }
        };

        // Research capabilities
        this.researchCapabilities = {
            webSearch: true,
            codeSearch: true,
            documentationSearch: true,
            stackOverflowSearch: true
        };

        console.log('[MCPClient] Initialized with intelligent answer strategies');
    }

    async initialize() {
        console.log('[MCPClient] Initializing in offline mode with configuration management...');
        
        try {
            // Initialize configuration manager first
            await this.configManager.initialize();
            
            // Set up event listeners for configuration changes
            this.configManager.on('oauth-success', this.handleOAuthSuccess.bind(this));
            this.configManager.on('token-refreshed', this.handleTokenRefreshed.bind(this));
            this.configManager.on('server-added', this.handleServerAdded.bind(this));
            this.configManager.on('server-removed', this.handleServerRemoved.bind(this));
            
            // Initialize external servers with authentication
            await this.initializeExternalServers();
            
            // Start periodic cleanup
            this.startPeriodicCleanup();
            
            // Mark as initialized
            this.isInitialized = true;
            console.log('[MCPClient] ✅ Initialization completed successfully');
            
        } catch (error) {
            console.error('[MCPClient] Failed to initialize configuration manager:', error.message);
            // Continue with basic functionality even if config fails
            this.isInitialized = true; // Still mark as initialized for basic functionality
            console.log('[MCPClient] ⚠️ Initialization completed with limited functionality');
        }
    }

    async initializeResearchTools() {
        // Initialize web search capability
        if (this.researchCapabilities.webSearch) {
            this.researchTools.push({
                name: 'web_search',
                description: 'Search the web for current information',
                execute: this.performWebSearch.bind(this)
            });
        }

        // Add more research tools as needed
        console.log(`[MCPClient] Initialized ${this.researchTools.length} research tools`);
    }

    async initializeExternalServers() {
        try {
            // Check for remote services that might already be authenticated
            const remoteServices = ['notion', 'github', 'slack', 'google-drive'];
            
            for (const serviceName of remoteServices) {
                // Check if we have client credentials
                const hasClientCredentials = this.configManager.hasOAuthClientCredentials(serviceName);
                
                // Use the correct OAuth service identifier for token lookup
                const oauthService = this.getOAuthServiceIdentifier(serviceName);
                
                // Check if we have a valid access token (actually authenticated)
                const hasValidToken = await this.configManager.getValidAccessToken(serviceName, oauthService);
                
                console.log(`[MCPClient] 🔍 Checking ${serviceName} authentication: credentials=${hasClientCredentials}, token=${!!hasValidToken}, oauthService=${oauthService}`);
                
                if (hasValidToken) {
                    // Actually authenticated - can start MCP server
                    this.mcpServers.set(serviceName, {
                        type: 'remote',
                        authenticated: true,
                        connected: false,
                        needsAuth: false,
                        tools: this.getRemoteServiceTools(serviceName)
                    });
                    console.log(`[MCPClient] ${serviceName} has valid OAuth token - marked as authenticated`);
                } else {
                    // No valid OAuth token - don't add to mcpServers map so it doesn't show as authenticated in UI
                    console.log(`[MCPClient] ${serviceName} has no valid OAuth token - not adding to servers map`);
                    if (hasClientCredentials) {
                        console.log(`[MCPClient] ${serviceName} has client credentials but needs OAuth completion`);
                    } else {
                        console.log(`[MCPClient] ${serviceName} has no client credentials configured`);
                    }
                }
            }
            
            // Update authentication status and try to start servers for authenticated services
            await this.updateRemoteServiceAuthenticationStatus();
            
            // Get all configured servers from config manager
            const configuredServers = this.configManager.getAllServers();
            
            // Start each enabled server
            for (const [serverName, config] of Object.entries(configuredServers)) {
                if (config.enabled) {
                    await this.startConfiguredServer(serverName, config);
                }
            }
            
            // If no servers configured, start the basic 'everything' server
            if (Object.keys(configuredServers).length === 0) {
                console.log('[MCPClient] No configured servers found, starting default everything server');
                await this.serverManager.startServer('everything');
            }
            
            // Update available tools
            this.externalTools = this.serverManager.getAllAvailableTools();
            console.log(`[MCPClient] Initialized with ${this.externalTools.length} external tools`);
            
        } catch (error) {
            console.error('[MCPClient] Error initializing external servers:', error.message);
        }
    }

    async startConfiguredServer(serverName, config) {
        try {
            // For services that require OAuth tokens, check authentication status
            const oauthServices = ['notion', 'github', 'slack', 'google-drive'];
            
            if (oauthServices.includes(serverName)) {
                console.log(`[MCPClient] ${serverName} requires OAuth authentication, checking status`);
                
                // Check if we have a valid access token (fully authenticated)
                const oauthService = this.getOAuthServiceIdentifier(serverName);
                const accessToken = await this.configManager.getValidAccessToken(serverName, oauthService);
                
                console.log(`[MCPClient] 🔍 ${serverName} token check: oauthService=${oauthService}, hasToken=${!!accessToken}`);
                
                // Check if we have OAuth client credentials (can start OAuth)
                const hasClientCredentials = this.configManager.hasOAuthClientCredentials(serverName);
                
                if (accessToken) {
                    console.log(`[MCPClient] ${serverName} has valid access token, starting MCP server`);
                    console.log(`[MCPClient] 🔍 Token type: ${typeof accessToken}, length: ${accessToken?.length}, starts with: ${accessToken?.substring(0, 20)}...`);
                    
                    // Get the server configuration from serverManager
                    const serverConfig = this.serverManager.availableServers[serverName];
                    if (!serverConfig) {
                        throw new Error(`Server configuration not found for ${serverName}`);
                    }
                    
                    // Prepare environment variables with OAuth token
                    const env = { ...process.env };
                    
                    // For Notion, use NOTION_API_TOKEN (community MCP server expects this)
                    if (serverName === 'notion') {
                        env['NOTION_API_TOKEN'] = accessToken;
                        console.log(`[MCPClient] 🔑 Set NOTION_API_TOKEN: ${accessToken.substring(0, 20)}...`);
                    } else if (serverName === 'github') {
                        env['GITHUB_PERSONAL_ACCESS_TOKEN'] = accessToken;
                    }
                    // Add other services as needed
                    
                    // Start the actual MCP server process
                    const serverState = await this.serverManager.startServer(serverName, {
                        command: serverConfig.command,
                        args: serverConfig.args,
                        env: env
                    });
                    
                    // Update our tracking to show it's authenticated and connected
                    this.mcpServers.set(serverName, {
                        type: 'local',
                        authenticated: true,
                        connected: serverState.connected,
                        tools: serverState.tools || [],
                        serverState: serverState
                    });
                    
                    console.log(`[MCPClient] ✅ ${serverName} MCP server started with ${serverState.tools?.length || 0} tools`);
                } else if (hasClientCredentials) {
                    // Has client credentials but needs OAuth completion
                    this.mcpServers.set(serverName, {
                        type: 'remote',
                        authenticated: false,
                        connected: false,
                        needsAuth: true, // Flag for UI to show OAuth needed
                        tools: this.getRemoteServiceTools(serverName)
                    });
                    
                    console.log(`[MCPClient] ${serverName} has client credentials, needs OAuth completion`);
                } else {
                    console.log(`[MCPClient] ${serverName} missing client credentials`);
                    this.authenticationInProgress.set(serverName, {
                        config,
                        lastAttempt: Date.now()
                    });
                }
                return;
            }
            
            // For non-OAuth servers, prepare environment variables normally
            const env = { ...process.env };
            
            if (config.env) {
                for (const [key, value] of Object.entries(config.env)) {
                    if (typeof value === 'function') {
                        // Dynamically resolve credentials
                        const resolvedValue = await value();
                        if (resolvedValue) {
                            env[key] = resolvedValue;
                        } else {
                            console.warn(`[MCPClient] Could not resolve credential for ${key} in server ${serverName}`);
                            return; // Skip starting this server if credentials are missing
                        }
                    } else {
                        env[key] = value;
                    }
                }
            }
            
            // Start the server with the prepared environment
            await this.serverManager.startServer(serverName, {
                command: config.command || 'npx',
                args: config.args || [],
                env: env
            });
            
            console.log(`[MCPClient] Successfully started configured server: ${serverName}`);
            
        } catch (error) {
            console.error(`[MCPClient] Failed to start configured server ${serverName}:`, error.message);
            
            // If OAuth is required, mark for authentication
            if (error.message.includes('authentication') || error.message.includes('token')) {
                this.authenticationInProgress.set(serverName, {
                    config,
                    lastAttempt: Date.now()
                });
            }
        }
    }

    async getAnswer(question, screenshotBase64) {
        if (!this.isInitialized) {
            throw new Error('MCPClient not initialized');
        }

        try {
            console.log(`[MCPClient] 🧠 Generating answer for ${question.type || 'general'} question...`);

            // Get the appropriate strategy for this question type
            const strategy = this.answerStrategies[question.type] || this.answerStrategies.general;

            // Perform research if needed
            let researchContext = '';
            if (strategy.useResearch) {
                researchContext = await this.performResearch(question);
            }

            // Generate the answer
            const answer = await this.generateAnswer(question, screenshotBase64, strategy, researchContext, '');

            // Post-process the answer
            const processedAnswer = this.postProcessAnswer(answer, question.type);

            console.log(`[MCPClient] ✅ Generated answer (${processedAnswer.length} characters)`);
            return processedAnswer;
        } catch (error) {
            console.error('[MCPClient] Error generating answer:', error);
            return null;
        }
    }

    async performResearch(question) {
        try {
            console.log('[MCPClient] 🔍 Performing research...');
            
            const researchResults = [];

            // Extract key terms from the question for research
            const searchTerms = this.extractSearchTerms(question);
            
            // Perform web search if available
            if (this.researchCapabilities.webSearch) {
                const webResults = await this.performWebSearch(searchTerms);
                if (webResults) {
                    researchResults.push({
                        source: 'web_search',
                        content: webResults
                    });
                }
            }

            // Combine research results
            const researchContext = researchResults
                .map(result => `### ${result.source}\n${result.content}`)
                .join('\n\n');

            console.log(`[MCPClient] Research completed: ${researchContext.length} characters`);
            return researchContext;
        } catch (error) {
            console.error('[MCPClient] Research failed:', error);
            return '';
        }
    }

    extractSearchTerms(question) {
        // Extract meaningful terms from the question for research
        const text = question.text.toLowerCase();
        
        // Programming-related terms
        const programmingTerms = [
            'algorithm', 'data structure', 'javascript', 'python', 'java', 'react', 'node.js',
            'database', 'sql', 'api', 'rest', 'graphql', 'docker', 'kubernetes', 'aws',
            'binary tree', 'linked list', 'hash table', 'array', 'string', 'sorting',
            'time complexity', 'space complexity', 'recursion', 'dynamic programming'
        ];

        // Technical terms
        const technicalTerms = [
            'architecture', 'microservices', 'scalability', 'performance', 'security',
            'authentication', 'authorization', 'oauth', 'jwt', 'encryption', 'ssl',
            'load balancing', 'caching', 'cdn', 'monitoring', 'logging'
        ];

        // Extract relevant terms
        const allTerms = [...programmingTerms, ...technicalTerms];
        const foundTerms = allTerms.filter(term => text.includes(term));

        // If no specific terms found, extract general keywords
        if (foundTerms.length === 0) {
            const words = text.split(' ').filter(word => 
                word.length > 3 && 
                !['what', 'how', 'why', 'when', 'where', 'which', 'that', 'this', 'with', 'from', 'they', 'them', 'have', 'been', 'will', 'would', 'could', 'should'].includes(word)
            );
            return words.slice(0, 5).join(' ');
        }

        return foundTerms.slice(0, 3).join(' ');
    }

    /**
     * Perform web search for real-time capability information
     * @param {string} query - Search query
     * @returns {Promise<string>} Search results context
     */
    async performWebSearch(query) {
        try {
            console.log(`[MCPClient] 🌐 Performing web search for: ${query}`);
            
            // Check if web search tool is available
            const webSearchTool = this.externalTools.find(t => 
                t.name.includes('search') || t.name.includes('web') || t.name.includes('browse')
            );
            
            if (webSearchTool) {
                const searchResult = await this.callExternalTool(webSearchTool.name, { query });
                if (searchResult && searchResult.content) {
                    console.log(`[MCPClient] Web search completed: ${searchResult.content.length} characters`);
                    return searchResult.content;
                }
            }
            
            // Fallback: Use knowledge about common MCP capabilities
            const fallbackContext = this._getFallbackCapabilityContext(query);
            console.log(`[MCPClient] Using fallback context for: ${query}`);
            return fallbackContext;
            
        } catch (error) {
            console.error('[MCPClient] Web search failed:', error);
            return this._getFallbackCapabilityContext(query);
        }
    }

    /**
     * Get fallback context when web search is not available
     * @param {string} query - Original search query
     * @returns {string} Fallback context information
     */
    _getFallbackCapabilityContext(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('notion')) {
            return `MCP Notion Integration Capabilities:
- Connect to Notion workspaces through OAuth authentication
- Read and search Notion pages and databases
- Create and update pages with structured content
- Access workspace properties and user information
- Manage databases, properties, and relations
- Support for rich text, blocks, and media content
- Real-time synchronization with workspace changes`;
        }
        
        if (lowerQuery.includes('github')) {
            return `MCP GitHub Integration Capabilities:
- Access public and private repositories
- Read code, issues, and pull requests
- Search repositories and code content
- Access commit history and branch information
- Manage repository settings and collaborators
- Integration with GitHub Actions and workflows`;
        }
        
        if (lowerQuery.includes('capabilities') || lowerQuery.includes('what can')) {
            return `MCP (Model Context Protocol) Core Capabilities:
- External tool integration through standardized protocol
- OAuth-based authentication for secure service access
- Real-time data access from connected services
- File system and database connectivity
- API integration with popular productivity tools
- Extensible architecture for custom integrations
- Secure context sharing between AI and external services`;
        }
        
        return `MCP enables AI systems to connect with external tools and services through a standardized protocol, 
providing access to real-time data and functionality beyond basic text generation.`;
    }

    async generateAnswer(question, screenshotBase64, strategy, researchContext, mcpContext = '') {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const { createStreamingLLM } = require('../common/ai/factory');
            const llm = createStreamingLLM(modelInfo.provider, {
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

            if (question.type === 'notion_data_access' && researchContext) {
                userPrompt += `\n\nPlease present this data in a clear, user-friendly way. This is the actual content from their ${question.type.split('_')[0]} workspace.`;
            } else {
                userPrompt += `\n\nPlease provide a clear, accurate, and helpful answer. Make it appropriate for the context (${question.type || 'general'} question).`;
            }

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

            // Include screenshot if available for visual context (but not for Notion data access)
            if (screenshotBase64 && question.type !== 'notion_data_access') {
                messages[1].content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                });
            }

            // Read the full streaming response
            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            break;
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                            }
                        } catch (parseError) {
                            // Skip malformed JSON
                        }
                    }
                }
            }

            return fullResponse.trim();
        } catch (error) {
            console.error('[MCPClient] Error generating answer:', error);
            throw error;
        }
    }

    postProcessAnswer(answer, questionType) {
        if (!answer) return '';

        // Remove common AI assistant phrases that sound robotic
        let processed = answer
            .replace(/^(Certainly!?|Of course!?|I'd be happy to help!?|Sure!?|Absolutely!?|I'd be glad to|I'll help you|Let me help)\s*/i, '')
            .replace(/^(Here's|Here is|Here are)\s+/i, '')
            .replace(/\s*(I hope this helps!?|Let me know if you need.*|Feel free to ask.*|Is there anything else.*|Hope this helps|If you have any questions|Please let me know)\s*$/i, '')
            .replace(/^(As an AI|As a language model|I'm an AI|As your assistant).*?\./i, '')
            .replace(/\b(I'd be glad|I'd be happy|I'm here to help|I can help|I can assist)\b.*?\./gi, '')
            .replace(/^(Based on your question|To answer your question|In response to your question),?\s*/i, '')
            .replace(/\b(according to my knowledge|in my opinion|from my understanding)\b/gi, '')
            .replace(/\b(I apologize|Sorry for|I'm sorry)\b.*?\./gi, '')
            .replace(/\s*(Thank you|Thanks for asking|Great question)\s*/gi, '')
            .trim();

        // Question-type specific post-processing
        switch (questionType) {
            case 'coding':
                // Ensure code blocks are properly formatted
                processed = this.formatCodeAnswer(processed);
                break;
            case 'interview':
                // Ensure professional tone
                processed = this.formatInterviewAnswer(processed);
                break;
            case 'math':
                // Ensure mathematical notation is clear
                processed = this.formatMathAnswer(processed);
                break;
        }

        // General cleanup
        processed = processed
            .replace(/^(Answer:|Response:|Solution:|Here's the solution:|The answer is:)\s*/i, '') // Remove prefixes
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
            .replace(/^\s*\n+/, '') // Remove leading newlines
            .trim();

        return processed;
    }

    formatCodeAnswer(answer) {
        // Preserve and improve code blocks formatting for typing
        let formatted = answer;
        
        // Convert markdown code blocks to plain text with proper formatting
        formatted = formatted.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
            // Clean up the code content
            let cleanCode = code
                .replace(/^\n+/, '') // Remove leading newlines
                .replace(/\n+$/, '') // Remove trailing newlines
                .replace(/^[ ]{2,4}/gm, '    '); // Standardize to 4-space indentation
            
            // Add language label if present and useful
            if (language && ['python', 'javascript', 'java', 'cpp', 'c'].includes(language.toLowerCase())) {
                cleanCode = `# ${language.charAt(0).toUpperCase() + language.slice(1)} code:\n${cleanCode}`;
            }
            
            return cleanCode;
        });
        
        // Handle inline code
        formatted = formatted.replace(/`([^`]+)`/g, '$1');
        
        // Ensure proper Python function/class formatting
        if (formatted.includes('def ') || formatted.includes('class ')) {
            formatted = formatted
                .replace(/^def\s+/gm, 'def ') // Fix function definition spacing
                .replace(/^class\s+/gm, 'class ') // Fix class definition spacing
                .replace(/\s*:\s*$/gm, ':') // Fix colon spacing at line ends
                .replace(/:\s*\n/g, ':\n') // Ensure proper newlines after colons
                .replace(/^[ ]{1,3}(?=\S)/gm, '    ') // Standardize indentation to 4 spaces
                .replace(/^[ ]{5,7}(?=\S)/gm, '        ') // Fix nested indentation (8 spaces)
                .replace(/^[ ]{9,11}(?=\S)/gm, '            '); // Fix deep nested indentation (12 spaces)
        }
        
        // Improve readability with proper spacing
        formatted = formatted
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
            .replace(/^\s*\n+/, '') // Remove leading newlines
            .replace(/\n+$/, '\n') // Ensure single trailing newline
            .trim();

        // Add example usage comment for functions if not present
        if (formatted.includes('def ') && !formatted.includes('Example') && !formatted.includes('Usage')) {
            const lines = formatted.split('\n');
            const funcLines = lines.filter(line => line.trim().startsWith('def '));
            if (funcLines.length === 1) {
                const funcName = funcLines[0].match(/def\s+(\w+)/)?.[1];
                if (funcName) {
                    formatted += `\n\n# Example usage:\n# ${funcName}([64, 34, 25, 12, 22, 11, 90])`;
                }
            }
        }

        return formatted;
    }

    formatInterviewAnswer(answer) {
        // Ensure professional but natural interview format
        let formatted = answer
            // Remove overly formal language
            .replace(/^I would say that /i, '')
            .replace(/^In my professional opinion,? /i, '')
            .replace(/I believe that /i, '')
            // Ensure natural flow
            .replace(/\.\s*\.\s*\./g, '...') // Fix multiple periods
            .replace(/\s{2,}/g, ' ') // Fix multiple spaces
            .trim();

        return formatted;
    }

    formatMathAnswer(answer) {
        // Improve math formatting
        let formatted = answer
            // Remove LaTeX notation
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\[/g, '')
            .replace(/\\\]/g, '')
            // Fix mathematical symbols and spacing
            .replace(/\s*=\s*/g, ' = ')
            .replace(/\s*\+\s*/g, ' + ')
            .replace(/\s*-\s*/g, ' - ')
            .replace(/\s*\*\s*/g, ' × ')
            .replace(/\s*\/\s*/g, ' ÷ ')
            // Fix step formatting
            .replace(/step\s*(\d+):/gi, 'Step $1:')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        return formatted;
    }

    // Configuration methods
    updateAnswerStrategy(questionType, strategy) {
        if (this.answerStrategies[questionType]) {
            Object.assign(this.answerStrategies[questionType], strategy);
            console.log(`[MCPClient] Updated strategy for ${questionType} questions`);
        }
    }

    enableResearchCapability(capability, enabled = true) {
        if (this.researchCapabilities.hasOwnProperty(capability)) {
            this.researchCapabilities[capability] = enabled;
            console.log(`[MCPClient] ${enabled ? 'Enabled' : 'Disabled'} ${capability}`);
        }
    }

    getAvailableStrategies() {
        return Object.keys(this.answerStrategies);
    }

    getResearchCapabilities() {
        return { ...this.researchCapabilities };
    }

    // NEW: Get tools available for remote services
    getRemoteServiceTools(serviceName) {
        const remoteServiceTools = {
            notion: [
                'search_pages',
                'create_page', 
                'update_page',
                'get_page_content',
                'create_database',
                'query_database'
            ],
            github: [
                'search_repositories',
                'get_repository',
                'create_issue',
                'get_file',
                'list_branches'
            ],
            slack: [
                'send_message',
                'get_channels',
                'get_messages',
                'search_messages'
            ],
            'google-drive': [
                'list_files',
                'get_file',
                'upload_file',
                'search_files'
            ]
        };
        
        return remoteServiceTools[serviceName] || [];
    }

    // Test method
    async testAnswerGeneration(testQuestion = {
        text: "What is the time complexity of binary search?",
        type: "technical",
        confidence: 90
    }) {
        console.log('[MCPClient] 🧪 Testing answer generation...');
        try {
            const answer = await this.getAnswer(testQuestion, null);
            console.log('[MCPClient] Test answer:', answer.substring(0, 200) + '...');
            return answer;
        } catch (error) {
            console.error('[MCPClient] Test failed:', error);
            return null;
        }
    }

    // External MCP server management methods
    async startExternalServer(serverName, config = {}) {
        try {
            await this.serverManager.startServer(serverName, config);
            
            // Update external tools list
            this.externalTools = this.serverManager.getAllAvailableTools();
            
            console.log(`[MCPClient] ✅ Started external server: ${serverName}`);
            console.log(`[MCPClient] 🛠️ Updated external tools count: ${this.externalTools.length}`);
            return true;
        } catch (error) {
            console.error(`[MCPClient] Failed to start external server ${serverName}:`, error);
            return false;
        }
    }

    async stopExternalServer(serverName) {
        try {
            await this.serverManager.stopServer(serverName);
            this.externalTools = this.serverManager.getAllAvailableTools();
            console.log(`[MCPClient] ✅ Stopped external server: ${serverName}`);
            return true;
        } catch (error) {
            console.error(`[MCPClient] Failed to stop external server ${serverName}:`, error);
            return false;
        }
    }

    async callExternalTool(toolName, arguments_) {
        try {
            console.log(`[MCPClient] 🔧 Calling external tool: ${toolName} with args:`, arguments_);
            
            // First check if it's a tool from our external tools list (from running MCP servers)
            const externalTool = this.externalTools.find(t => t.name === toolName);
            if (externalTool) {
                const result = await this.serverManager.autoCallTool(toolName, arguments_);
                console.log(`[MCPClient] ✅ External tool ${toolName} completed with result:`, result);
                return result;
            }
            
            // Check if it's a tool from an authenticated MCP server
            let mcpServerTool = null;
            let serverForTool = null;
            
            for (const [serverName, serverInfo] of this.mcpServers.entries()) {
                if (serverInfo.authenticated && serverInfo.serverState && serverInfo.serverState.tools) {
                    const foundTool = serverInfo.serverState.tools.find(t => t.name === toolName);
                    if (foundTool) {
                        mcpServerTool = foundTool;
                        serverForTool = serverName;
                        break;
                    }
                }
            }
            
            if (mcpServerTool && serverForTool) {
                console.log(`[MCPClient] Found MCP server tool ${toolName} on server ${serverForTool}, calling it...`);
                
                // Call the tool through the MCP server
                const result = await this.serverManager.callTool(serverForTool, toolName, arguments_);
                console.log(`[MCPClient] ✅ MCP server tool ${toolName} completed successfully`);
                return result;
            }
            
            // Tool not found anywhere
            console.error(`[MCPClient] Tool ${toolName} not found in available tools`);
            
            // List all available tools for debugging
            const allExternalTools = this.externalTools.map(t => t.name);
            const allMCPTools = [];
            
            for (const [serverName, serverInfo] of this.mcpServers.entries()) {
                if (serverInfo.authenticated && serverInfo.serverState && serverInfo.serverState.tools) {
                    allMCPTools.push(...serverInfo.serverState.tools.map(t => `${serverName}:${t.name}`));
                }
            }
            
            console.log(`[MCPClient] Available external tools:`, allExternalTools);
            console.log(`[MCPClient] Available MCP server tools:`, allMCPTools);
            
            // Also update the externalTools list to include MCP server tools
            this.updateExternalToolsList();
            
            return null;
            
        } catch (error) {
            console.error(`[MCPClient] Tool ${toolName} failed:`, error);
            
            // Provide more detailed error information
            if (error.message?.includes('not found')) {
                console.error(`[MCPClient] Tool ${toolName} might not be properly registered or available`);
            } else if (error.message?.includes('connection')) {
                console.error(`[MCPClient] Connection issue with MCP server for tool ${toolName}`);
            } else if (error.message?.includes('permission')) {
                console.error(`[MCPClient] Permission denied when calling tool ${toolName}`);
            }
            
            throw error;
        }
    }

    /**
     * Update the external tools list to include tools from authenticated MCP servers
     */
    updateExternalToolsList() {
        try {
            // Get tools from serverManager (local MCP servers)
            const localTools = this.serverManager.getAllAvailableTools();
            
            // Get tools from authenticated MCP servers
            const mcpTools = [];
            for (const [serverName, serverInfo] of this.mcpServers.entries()) {
                if (serverInfo.authenticated && serverInfo.serverState && serverInfo.serverState.tools) {
                    serverInfo.serverState.tools.forEach(tool => {
                        mcpTools.push({
                            ...tool,
                            serverName,
                            fullName: `${serverName}.${tool.name}`
                        });
                    });
                }
            }
            
            // Combine all tools
            this.externalTools = [...localTools, ...mcpTools];
            console.log(`[MCPClient] Updated external tools list: ${this.externalTools.length} tools available`);
        } catch (error) {
            console.error('[MCPClient] Error updating external tools list:', error);
        }
    }

    /**
     * Test MCP tool execution to verify the ask bar can actually call tools
     * @returns {Promise<boolean>} True if MCP tools are callable, false otherwise
     */
    async testMCPToolExecution() {
        try {
            console.log('[MCPClient] 🧪 Testing MCP tool execution...');
            
            if (this.externalTools.length === 0) {
                console.log('[MCPClient] No external tools available for testing');
                return false;
            }
            
            // Try to call a simple tool to verify execution works
            const testTool = this.externalTools.find(tool => 
                tool.name.includes('list') || 
                tool.name.includes('status') ||
                tool.name.includes('info')
            );
            
            if (!testTool) {
                console.log('[MCPClient] No suitable test tool found');
                return false;
            }
            
            console.log(`[MCPClient] Testing with tool: ${testTool.name}`);
            const result = await this.callExternalTool(testTool.name, {});
            
            if (result) {
                console.log(`[MCPClient] ✅ MCP tool execution test successful`);
                return true;
            } else {
                console.log(`[MCPClient] ❌ MCP tool execution test failed - no result`);
                return false;
            }
        } catch (error) {
            console.error('[MCPClient] ❌ MCP tool execution test failed:', error);
            return false;
        }
    }

    /**
     * Get detailed information about available MCP tools for debugging
     * @returns {object} Detailed tool information
     */
    getMCPToolsDebugInfo() {
        return {
            totalTools: this.externalTools.length,
            tools: this.externalTools.map(tool => ({
                name: tool.name,
                description: tool.description || 'No description',
                hasParameters: tool.parameters ? Object.keys(tool.parameters).length : 0
            })),
            runningServers: this.serverManager.getRunningServers(),
            connectedServices: Array.from(this.mcpServers.keys())
        };
    }

    getServerStatus() {
        const runningServers = this.serverManager.getRunningServers();
        const availableServers = this.serverManager.getAllAvailableServers();
        
        // Update external tools list first
        this.updateExternalToolsList();
        
        // Combine local servers with authenticated services
        const allServers = {};
        
        // Add local running servers
        runningServers.forEach(name => {
            const serverInfo = this.serverManager.getServerInfo(name);
            allServers[name] = {
                connected: serverInfo.connected || false,
                type: 'local',
                tools: serverInfo.tools || [],
                resources: serverInfo.resources || [],
                prompts: serverInfo.prompts || []
            };
        });
        
        // Add authenticated services from mcpServers map
        for (const [name, serviceInfo] of this.mcpServers.entries()) {
            // Include all services, whether they have a running MCP server or not
            allServers[name] = {
                connected: serviceInfo.connected || false,
                type: serviceInfo.type || 'remote',
                authenticated: serviceInfo.authenticated || false,
                needsAuth: serviceInfo.needsAuth || false,
                tools: serviceInfo.serverState?.tools || serviceInfo.tools || [],
                hasServerRunning: !!serviceInfo.serverState
            };
        }
        
        return {
            servers: allServers,
            running: runningServers.map(name => ({
                name,
                info: this.serverManager.getServerInfo(name)
            })),
            available: availableServers,
            totalTools: this.externalTools.length
        };
    }

    getAllAvailableTools() {
        // Get latest external tools from server manager
        this.externalTools = this.serverManager.getAllAvailableTools();
        
        return {
            research: this.researchTools,
            external: this.externalTools,
            total: this.researchTools.length + this.externalTools.length
        };
    }

    // Enhanced tool calling with both research and external tools
    async callTool(toolName, arguments_) {
        // First check research tools
        const researchTool = this.researchTools.find(t => t.name === toolName);
        if (researchTool) {
            console.log(`[MCPClient] 🔍 Calling research tool: ${toolName}`);
            return await researchTool.execute(arguments_);
        }

        // Then try external tools
        return await this.callExternalTool(toolName, arguments_);
    }

    // Enhanced answer generation with access to external tools
    async getEnhancedAnswer(question, screenshotBase64) {
        if (!this.isInitialized) {
            throw new Error('MCPClient not initialized');
        }

        try {
            console.log(`[MCPClient] 🧠 Generating enhanced answer for ${question.type || 'general'} question...`);

            // Get the appropriate strategy for this question type
            const strategy = this.answerStrategies[question.type] || this.answerStrategies.general;

            // Handle Notion data access questions specifically
            if (strategy.requiresServiceMCP) {
                const serviceData = await this.accessServiceData(question);
                if (serviceData) {
                    console.log(`[MCPClient] ✅ Retrieved service data: ${serviceData.length} characters`);
                    // Generate answer with actual service data as research context (NOT mcpContext!)
                    const answer = await this.generateAnswer(question, null, strategy, serviceData, '');
                    return this.postProcessAnswer(answer, question.type);
                } else {
                    // Check if service is authenticated but MCP server isn't running
                    const mcpService = this.mcpServers.get(strategy.requiresServiceMCP);
                    console.log(`[MCPClient] Debug: Service ${strategy.requiresServiceMCP} status:`, {
                        exists: !!mcpService,
                        authenticated: mcpService?.authenticated,
                        serverState: !!mcpService?.serverState,
                        connected: mcpService?.connected,
                        needsAuth: mcpService?.needsAuth,
                        toolsCount: mcpService?.tools?.length || 0
                    });
                    
                    if (mcpService && mcpService.authenticated && !mcpService.serverState) {
                        const setupMessage = `I can see that ${strategy.requiresServiceMCP} is authenticated, but the MCP server isn't running. Let me try to start it for you...`;
                        
                        // Try to start the MCP server
                        try {
                            const serverConfig = this.serverManager.availableServers[strategy.requiresServiceMCP];
                            if (serverConfig) {
                                await this.startConfiguredServer(strategy.requiresServiceMCP, serverConfig);
                                
                                // Try again now that the server might be running
                                const serviceData = await this.accessServiceData(question);
                                if (serviceData) {
                                    console.log(`[MCPClient] ✅ Retrieved service data after starting server: ${serviceData.length} characters`);
                                    const answer = await this.generateAnswer(question, null, strategy, '', serviceData);
                                    return this.postProcessAnswer(answer, question.type);
                                }
                            }
                        } catch (error) {
                            console.error(`[MCPClient] Failed to start MCP server:`, error);
                        }
                        
                        return `I was unable to start the ${strategy.requiresServiceMCP} MCP server. Please try reconnecting in settings or check the logs for errors.`;
                    } else if (mcpService && mcpService.needsAuth) {
                        // Service needs authentication
                        const setupMessage = `To access your ${strategy.requiresServiceMCP} data, you'll need to complete authentication:

1. Go to Settings > MCP Integration
2. Click on ${strategy.requiresServiceMCP}
3. Complete the OAuth authentication flow

Would you like help with the setup, or would you prefer me to describe what I can see on your screen instead?`;
                        return setupMessage;
                    } else {
                        // Service not configured at all
                        const setupMessage = `I don't currently have access to your ${strategy.requiresServiceMCP} workspace. To set it up:

1. Go to Settings > MCP Integration
2. Find ${strategy.requiresServiceMCP} and click Connect
3. Complete the authentication flow

Would you like me to describe what I can see on your screen instead?`;
                        return setupMessage;
                    }
                }
            }

            // Handle MCP debug and testing requests
            if (strategy.performMCPTest) {
                const debugInfo = await this.performMCPDebugTest();
                const answer = await this.generateAnswer(question, null, strategy, '', debugInfo);
                return this.postProcessAnswer(answer, question.type);
            }

            // Get MCP capabilities context for capability questions
            let mcpContext = '';
            if (strategy.useMCPTools) {
                mcpContext = await this.getMCPCapabilitiesContext();
            }

            // Perform research if needed (includes external tools)
            let researchContext = '';
            if (strategy.useResearch) {
                researchContext = await this.performEnhancedResearch(question);
            }

            // Generate the answer with additional context
            const answer = await this.generateAnswer(question, screenshotBase64, strategy, researchContext, mcpContext);

            // Post-process the answer
            const processedAnswer = this.postProcessAnswer(answer, question.type);

            console.log(`[MCPClient] ✅ Generated enhanced answer (${processedAnswer.length} characters)`);
            return processedAnswer;
        } catch (error) {
            console.error('[MCPClient] Error generating enhanced answer:', error);
            return null;
        }
    }

    /**
     * Access actual service data via MCP tools
     * @param {object} question - Question object
     * @returns {Promise<string|null>} Service data or null if not available
     */
    async accessServiceData(question) {
        try {
            console.log('[MCPClient] 🔍 Accessing service data via MCP tools...');
            
            // Determine which service to access based on question type
            let serviceName = null;
            let strategy = this.answerStrategies[question.type];

            if (strategy && strategy.requiresServiceMCP) {
                serviceName = strategy.requiresServiceMCP;
            }

            // Update external tools list to include MCP server tools
            this.updateExternalToolsList();
            
            // Check for available MCP tools for the specific service or any service
            let serviceTools = [];
            
            if (serviceName && serviceName !== 'any') {
                // Check if the MCP server is running and has tools
                const mcpService = this.mcpServers.get(serviceName);
                console.log(`[MCPClient] Debug: Checking service ${serviceName}:`, {
                    serviceExists: !!mcpService,
                    authenticated: mcpService?.authenticated,
                    hasServerState: !!mcpService?.serverState,
                    serverStateTools: mcpService?.serverState?.tools?.length || 0,
                    fallbackTools: mcpService?.tools?.length || 0
                });
                
                if (mcpService && mcpService.authenticated && mcpService.serverState && mcpService.serverState.tools) {
                    serviceTools = mcpService.serverState.tools;
                    console.log(`[MCPClient] Found ${serviceTools.length} tools for authenticated MCP server: ${serviceName}`);
                } else {
                    console.log(`[MCPClient] MCP server ${serviceName} not running or no tools available. Checking external tools...`);
                    
                    // Look for tools specific to the service in external tools
                    serviceTools = this.externalTools.filter(tool => {
                        // Check if the tool belongs to this service
                        if (tool.serverName === serviceName) return true;
                        
                        // For Notion MCP server tools
                        if (serviceName === 'notion' && (
                            tool.name === 'search_pages' || 
                            tool.name === 'get_page' || 
                            tool.name === 'create_page' ||
                            tool.name === 'update_page' ||
                            tool.name === 'get_database' ||
                            tool.name === 'query_database' ||
                            tool.name === 'create_database_item'
                        )) return true;
                        
                        // For other services
                        if (serviceName === 'github' && (tool.name.includes('repository') || tool.name.includes('issue'))) return true;
                        if (serviceName === 'slack' && (tool.name.includes('channel') || tool.name.includes('message'))) return true;
                        if (serviceName === 'google' && (tool.name.includes('file') || tool.name.includes('drive'))) return true;
                        
                        return false;
                    });
                }
            } else {
                // Generic search - look for any MCP tools that could provide data
                serviceTools = this.externalTools.filter(tool => 
                    tool.name.includes('list') ||
                    tool.name.includes('search') ||
                    tool.name.includes('get') ||
                    tool.name.includes('query') ||
                    tool.name.includes('fetch') ||
                    tool.name.includes('read')
                );
            }

            if (serviceTools.length === 0) {
                console.log(`[MCPClient] No MCP tools available for ${serviceName || 'any service'}`);
                console.log(`[MCPClient] Debug: Tool discovery summary:`, {
                    requestedService: serviceName,
                    externalToolsTotal: this.externalTools.length,
                    mcpServersTotal: this.mcpServers.size,
                    mcpServersAuthenticated: Array.from(this.mcpServers.entries()).filter(([name, info]) => info.authenticated).map(([name, info]) => ({
                        name,
                        hasServerState: !!info.serverState,
                        toolCount: info.tools?.length || 0
                    }))
                });
                return null;
            }

            console.log(`[MCPClient] Found ${serviceTools.length} MCP tools for ${serviceName || 'services'}:`, serviceTools.map(t => t.name));

            // Use LLM to decide which tool to call and with what arguments
            console.log(`[MCPClient] 🤖 Letting LLM choose tool for question: "${question.text}"`);
            console.log(`[MCPClient] 🛠️ Available tools: ${serviceTools.map(t => t.name).join(', ')}`);
            
            // Modern LLM-driven tool selection instead of broken heuristics
            const toolSelection = await this.selectToolWithLLM(question, serviceTools, serviceName);
            
            if (toolSelection.selectedTool) {
                console.log(`[MCPClient] 🎯 Selected tool: ${toolSelection.selectedTool.name} with args:`, toolSelection.toolArgs);
                
                // Call the external tool and get results
                const result = await this.callExternalTool(toolSelection.selectedTool.name, toolSelection.toolArgs);
                
                if (result && result.content) {
                    // Extract actual content from MCP tool response structure
                    let extractedContent = '';
                    if (Array.isArray(result.content) && result.content.length > 0) {
                        // MCP tools return content as array of objects with text field
                        extractedContent = result.content.map(item => item.text || item.content || '').join('\n');
                    } else if (typeof result.content === 'string') {
                        extractedContent = result.content;
                    } else {
                        extractedContent = JSON.stringify(result.content, null, 2);
                    }
                    
                    // Parse and format the JSON data for better readability
                    let formattedData = extractedContent;
                    try {
                        const jsonData = JSON.parse(extractedContent);
                        if (jsonData.results && Array.isArray(jsonData.results)) {
                            formattedData = this.formatNotionResults(jsonData.results, serviceName);
                        } else {
                            formattedData = this.formatGenericData(jsonData, serviceName);
                        }
                    } catch (parseError) {
                        // If it's not JSON, use as-is
                        console.log(`[MCPClient] Content is not JSON, using raw data`);
                    }
                    
                    const finalResult = `${serviceName ? serviceName.charAt(0).toUpperCase() + serviceName.slice(1) : 'Service'} Data Retrieved:\n${formattedData}`;
                    return finalResult;
                } else if (result) {
                    return `${serviceName ? serviceName.charAt(0).toUpperCase() + serviceName.slice(1) : 'Service'} Data Retrieved:\n${JSON.stringify(result, null, 2)}`;
                } else {
                    console.log(`[MCPClient] Tool ${toolSelection.selectedTool.name} returned no data`);
                    
                    // Retry with better query if initial search failed
                    if (toolSelection.selectedTool.name.includes('search') && toolSelection.retryQuery) {
                        console.log(`[MCPClient] 🔄 Retrying with improved query: "${toolSelection.retryQuery}"`);
                        const retryResult = await this.callExternalTool(toolSelection.selectedTool.name, { query: toolSelection.retryQuery });
                        if (retryResult && retryResult.content) {
                            // Apply same content extraction for retry
                            let retryExtractedContent = '';
                            if (Array.isArray(retryResult.content) && retryResult.content.length > 0) {
                                retryExtractedContent = retryResult.content.map(item => item.text || item.content || '').join('\n');
                            } else if (typeof retryResult.content === 'string') {
                                retryExtractedContent = retryResult.content;
                            } else {
                                retryExtractedContent = JSON.stringify(retryResult.content, null, 2);
                            }
                            
                            // Parse and format retry data
                            let retryFormattedData = retryExtractedContent;
                            try {
                                const retryJsonData = JSON.parse(retryExtractedContent);
                                if (retryJsonData.results && Array.isArray(retryJsonData.results)) {
                                    retryFormattedData = this.formatNotionResults(retryJsonData.results, serviceName);
                                } else {
                                    retryFormattedData = this.formatGenericData(retryJsonData, serviceName);
                                }
                            } catch (parseError) {
                                // Use raw data if not JSON
                            }
                            
                            return `${serviceName ? serviceName.charAt(0).toUpperCase() + serviceName.slice(1) : 'Service'} Data Retrieved:\n${retryFormattedData}`;
                        }
                    }
                    
                    return null;
                }
            }

            return null;
        } catch (error) {
            console.error('[MCPClient] Error accessing service data:', error);
            return null;
        }
    }

    /**
     * Get current MCP capabilities and available tools for context
     * @returns {string} Formatted capabilities context
     */
    async getMCPCapabilitiesContext() {
        try {
            console.log('[MCPClient] 📋 Gathering MCP capabilities context...');
            
            const capabilities = {
                connectedServices: [],
                availableTools: [],
                remoteServices: [],
                serverStatus: {}
            };

            // Get server status
            const serverStatus = this.getServerStatus();
            
            // Collect connected services
            for (const [serverName, serverInfo] of this.mcpServers.entries()) {
                if (serverInfo.connected || serverInfo.authenticated) {
                    capabilities.connectedServices.push({
                        name: serverName,
                        type: serverInfo.type,
                        status: serverInfo.authenticated ? 'authenticated' : 'connected',
                        tools: serverInfo.tools || []
                    });
                }
            }

            // Collect available external tools
            capabilities.availableTools = this.externalTools.map(tool => ({
                name: tool.name,
                description: tool.description || 'No description available'
            }));

            // Get OAuth provider capabilities
            const oauthConfig = this.configManager?.oauthProviders || {};
            capabilities.remoteServices = Object.keys(oauthConfig).map(provider => ({
                provider,
                available: true,
                capabilities: this._getProviderCapabilities(provider)
            }));

            // Format for context
            const contextParts = [];
            
            if (capabilities.connectedServices.length > 0) {
                contextParts.push('**Currently Connected Services:**');
                capabilities.connectedServices.forEach(service => {
                    contextParts.push(`- ${service.name} (${service.status}) - ${service.tools.length} tools available`);
                });
            }

            if (capabilities.availableTools.length > 0) {
                contextParts.push('\n**Available MCP Tools:**');
                capabilities.availableTools.slice(0, 10).forEach(tool => { // Limit to top 10
                    contextParts.push(`- ${tool.name}: ${tool.description}`);
                });
            }

            if (capabilities.remoteServices.length > 0) {
                contextParts.push('\n**Available Integrations:**');
                capabilities.remoteServices.forEach(service => {
                    const caps = service.capabilities.join(', ');
                    contextParts.push(`- ${service.provider}: ${caps}`);
                });
            }

            const context = contextParts.join('\n');
            console.log(`[MCPClient] MCP capabilities context: ${context.length} characters`);
            return context;

        } catch (error) {
            console.error('[MCPClient] Failed to gather MCP capabilities:', error);
            return 'MCP system is available but capability details are currently unavailable.';
        }
    }

    /**
     * Get capabilities for a specific OAuth provider
     * @param {string} provider - Provider name (notion, github, etc.)
     * @returns {string[]} Array of capability descriptions
     */
    _getProviderCapabilities(provider) {
        const providerCapabilities = {
            notion: ['Read pages and databases', 'Search content', 'Create and update pages', 'Manage workspace content'],
            github: ['Read repositories', 'Access issues and PRs', 'Code search', 'Repository management'],
            google: ['Access Google Drive', 'Calendar integration', 'Gmail reading', 'Document collaboration'],
            slack: ['Read channel messages', 'Send messages', 'User management', 'Workspace integration'],
            default: ['API access', 'Data integration', 'External service connectivity']
        };

        return providerCapabilities[provider] || providerCapabilities.default;
    }

    async performEnhancedResearch(question) {
        try {
            console.log('[MCPClient] 🔍 Performing enhanced research with external tools...');
            
            const researchResults = [];

            // Extract key terms from the question for research
            const searchTerms = this.extractSearchTerms(question);
            
            // Use web search for capability questions
            if (question.type === 'mcp_capabilities' || question.type === 'service_integration') {
                try {
                    const webContext = await this.performWebSearch(searchTerms);
                    if (webContext) {
                        researchResults.push({
                            source: 'web_search',
                            content: webContext
                        });
                    }
                } catch (error) {
                    console.warn('[MCPClient] Web search failed:', error.message);
                }
            }
            
            // Use fetch tool for web research if available
            try {
                const fetchTool = this.externalTools.find(t => t.name === 'fetch_url');
                if (fetchTool && searchTerms && !question.type.includes('mcp')) {
                    // Use web search to find relevant URLs, then fetch content
                    // For now, we'll skip this to avoid external dependencies
                    console.log('[MCPClient] Fetch tool available but skipping general web research');
                }
            } catch (error) {
                console.warn('[MCPClient] Fetch tool research failed:', error.message);
            }

            // Use memory tool for context if available
            try {
                const memoryTool = this.externalTools.find(t => t.name === 'search_memory');
                if (memoryTool) {
                    const memoryResults = await this.callExternalTool('search_memory', { query: searchTerms });
                    if (memoryResults && memoryResults.content) {
                        researchResults.push({
                            source: 'memory',
                            content: memoryResults.content
                        });
                    }
                }
            } catch (error) {
                console.warn('[MCPClient] Memory tool research failed:', error.message);
            }

            // Combine research results
            const researchContext = researchResults
                .map(result => `### ${result.source}\n${result.content}`)
                .join('\n\n');

            console.log(`[MCPClient] Enhanced research completed: ${researchContext.length} characters`);
            return researchContext;
        } catch (error) {
            console.error('[MCPClient] Enhanced research failed:', error);
            return '';
        }
    }

    // Enhanced authentication and authorization methods
    async setupExternalService(serviceName, authType = 'oauth') {
        try {
            // Start OAuth callback server before setting up the service
            if (authType === 'oauth') {
                console.log(`[MCPClient] Starting OAuth callback server for ${serviceName}...`);
                await this.startOAuthCallbackServer();
            }
            
            // Check if we already have valid credentials
            const hasValidToken = await this.configManager.getValidAccessToken(serviceName, serviceName);
            
            if (hasValidToken) {
                console.log(`[MCPClient] ${serviceName} already has valid token, starting MCP server...`);
                
                // Get the server configuration
                const serverConfig = this.serverManager.availableServers[serviceName];
                if (serverConfig) {
                    await this.startConfiguredServer(serviceName, serverConfig);
                    this.updateExternalToolsList();
                    
                    return {
                        success: true,
                        serverName: serviceName,
                        message: `Successfully connected ${serviceName} with existing authentication`
                    };
                }
            }
            
            // If no valid token, proceed with OAuth setup
            const result = await this.configManager.setupPrebuiltServer(serviceName);
            
            if (result.requires_auth) {
                return {
                    success: false,
                    requiresAuth: true,
                    authUrl: result.oauth_url,
                    provider: result.provider,
                    service: result.service,
                    message: `Please complete OAuth authentication for ${serviceName}`
                };
            }
            
            // Server was configured successfully, start it
            if (result.success) {
                const serverConfig = this.serverManager.availableServers[serviceName];
                if (serverConfig) {
                    await this.startConfiguredServer(serviceName, serverConfig);
                    this.updateExternalToolsList();
                }
                
                return {
                    success: true,
                    serverName: result.server_name,
                    message: `Successfully set up ${serviceName}`
                };
            }
            
        } catch (error) {
            console.error(`[MCPClient] Error setting up ${serviceName}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async handleOAuthCallback(code, state) {
        try {
            const tokenData = await this.configManager.handleOAuthCallback(code, state);
            console.log('[MCPClient] OAuth callback handled successfully');
            
            // Try to start any servers that were waiting for authentication
            await this.retryPendingAuthentications();
            
            return { success: true, tokenData };
            
        } catch (error) {
            console.error('[MCPClient] OAuth callback failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async retryPendingAuthentications() {
        const pendingAuths = Array.from(this.authenticationInProgress.entries());
        
        for (const [serverName, authInfo] of pendingAuths) {
            try {
                await this.startConfiguredServer(serverName, authInfo.config);
                this.authenticationInProgress.delete(serverName);
                console.log(`[MCPClient] Successfully authenticated and started ${serverName}`);
            } catch (error) {
                console.log(`[MCPClient] Server ${serverName} still requires authentication`);
            }
        }
        
        // Update authentication status for remote services that now have valid tokens
        await this.updateRemoteServiceAuthenticationStatus();
        
        // Update tools list
        this.externalTools = this.serverManager.getAllAvailableTools();
        
        // Notify UI of server status changes
        this.notifyServersUpdated();
    }

    /**
     * Update authentication status for remote services based on available tokens
     */
    async updateRemoteServiceAuthenticationStatus() {
        const remoteServices = ['notion', 'github', 'slack', 'google-drive'];
        
        for (const serviceName of remoteServices) {
            // Use the correct OAuth service identifier for token lookup
            const oauthService = this.getOAuthServiceIdentifier(serviceName);
            
            // Check if the service now has valid credentials
            const hasValidToken = await this.configManager.getValidAccessToken(serviceName, oauthService);
            const existingService = this.mcpServers.get(serviceName);
            
            console.log(`[MCPClient] 🔄 Updating auth status for ${serviceName}: hasToken=${!!hasValidToken}, existing=${!!existingService}, oauthService=${oauthService}`);
            
            if (hasValidToken && !existingService) {
                // Service just got authenticated - add it to the servers map
                console.log(`[MCPClient] ${serviceName} now has valid token, adding to servers map...`);
                
                this.mcpServers.set(serviceName, {
                    type: 'remote',
                    authenticated: true,
                    connected: false,
                    needsAuth: false,
                    tools: this.getRemoteServiceTools(serviceName)
                });
                
                // Try to start the MCP server
                const serverConfig = this.serverManager.availableServers[serviceName];
                if (serverConfig) {
                    try {
                        await this.startConfiguredServer(serviceName, serverConfig);
                        console.log(`[MCPClient] ✅ Started MCP server for ${serviceName} with OAuth authentication`);
                    } catch (error) {
                        console.error(`[MCPClient] Failed to start MCP server for ${serviceName}:`, error);
                    }
                }
                
            } else if (existingService && !existingService.authenticated && hasValidToken) {
                // Service was already in map but not authenticated - update it
                existingService.authenticated = true;
                existingService.connected = false;
                existingService.needsAuth = false;
                
                console.log(`[MCPClient] ✅ Updated authentication status for ${serviceName}: authenticated=true`);
                
                // Try to start the MCP server
                const serverConfig = this.serverManager.availableServers[serviceName];
                if (serverConfig) {
                    try {
                        await this.startConfiguredServer(serviceName, serverConfig);
                        console.log(`[MCPClient] ✅ Started MCP server for ${serviceName} with OAuth authentication`);
                    } catch (error) {
                        console.error(`[MCPClient] Failed to start MCP server for ${serviceName}:`, error);
                    }
                }
            }
        }
    }

    async setCredential(key, value) {
        this.configManager.setCredential(key, value);
        await this.configManager.saveConfiguration();
        
        // Trigger server restarts if needed
        await this.retryPendingAuthentications();
        
        // Notify UI of changes (retryPendingAuthentications will also notify, but this ensures coverage)
        this.notifyServersUpdated();
    }

    /**
     * Disconnect a service by removing its credentials and stopping its MCP server
     */
    async disconnectService(serviceName) {
        try {
            console.log(`[MCPClient] Disconnecting service: ${serviceName}`);
            
            // Stop the MCP server if it's running
            if (this.serverManager.servers.has(serviceName)) {
                await this.serverManager.stopServer(serviceName);
            }
            
            // Remove OAuth tokens
            const tokenKey = `${serviceName}_${serviceName}_token`;
            this.configManager.removeCredential(tokenKey);
            
            // Remove the service from the servers map entirely so it doesn't show as connected in UI
            this.mcpServers.delete(serviceName);
            console.log(`[MCPClient] Removed ${serviceName} from servers map`);
            
            // Update external tools list
            this.updateExternalToolsList();
            
            // Save configuration changes
            await this.configManager.saveConfiguration();
            
            // Notify UI of changes
            this.notifyServersUpdated();
            
            console.log(`[MCPClient] ✅ Successfully disconnected ${serviceName}`);
            return { success: true };
            
        } catch (error) {
            console.error(`[MCPClient] Error disconnecting ${serviceName}:`, error);
            return { success: false, error: error.message };
        }
    }

    async removeCredential(key) {
        this.configManager.removeCredential(key);
        await this.configManager.saveConfiguration();
    }

    getAuthenticationStatus() {
        const pendingAuths = Array.from(this.authenticationInProgress.keys());
        const configIssues = this.configManager.validateConfiguration();
        
        return {
            pendingAuthentications: pendingAuths,
            configurationIssues: configIssues,
            hasValidConfig: configIssues.length === 0
        };
    }

    getSupportedServices() {
        return this.configManager.getPrebuiltServerConfigs();
    }

    // Notify UI of server status changes
    notifyServersUpdated() {
        const status = {
            servers: this.getServerStatus(),
            authenticationStatus: this.getAuthenticationStatus(),
            supportedServices: this.getSupportedServices()
        };
        console.log(`[MCPClient] 📡 Emitting serversUpdated event to UI`);
        this.emit('serversUpdated', status);
    }

    // Event handlers for configuration changes
    handleOAuthSuccess(data) {
        console.log(`[MCPClient] OAuth success for ${data.provider}:${data.service}`);
        // Retry starting any servers that were waiting for this authentication
        this.retryPendingAuthentications();
        
        // Notify UI of server status changes after OAuth success
        this.notifyServersUpdated();
    }

    handleTokenRefreshed(data) {
        console.log(`[MCPClient] Token refreshed for ${data.provider}:${data.service}`);
    }

    async handleServerAdded(data) {
        console.log(`[MCPClient] Server added: ${data.name}`);
        await this.startConfiguredServer(data.name, data.config);
        this.externalTools = this.serverManager.getAllAvailableTools();
    }

    async handleServerRemoved(data) {
        console.log(`[MCPClient] Server removed: ${data.name}`);
        await this.serverManager.stopServer(data.name);
        this.externalTools = this.serverManager.getAllAvailableTools();
    }

    startPeriodicCleanup() {
        // Clean up expired OAuth states every hour
        setInterval(() => {
            this.configManager.cleanup();
        }, 60 * 60 * 1000);
        
        // Clean up old pending authentications (older than 24 hours)
        setInterval(() => {
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            for (const [serverName, authInfo] of this.authenticationInProgress.entries()) {
                if (authInfo.lastAttempt < dayAgo) {
                    this.authenticationInProgress.delete(serverName);
                }
            }
        }, 60 * 60 * 1000);
    }

    /**
     * Start a temporary localhost server for OAuth callbacks
     * This is the recommended approach for desktop apps
     */
    async startOAuthCallbackServer() {
        if (this.oauthServer) {
            console.log('[MCP Client] OAuth server already running on port', this.oauthPort);
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
                    
                    console.log('[MCP OAuth Server] Received callback:', url.toString());
                    
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
                        
                        // Process OAuth callback
                        setImmediate(() => {
                            this.handleOAuthCallback(code, state).catch(console.error);
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
                        console.log(`[MCP OAuth Server] Port ${port} unavailable, trying next...`);
                        this.oauthServer = null;
                        tryNextPort();
                        return;
                    }
                    
                    this.oauthPort = this.oauthServer.address().port;
                    console.log(`[MCP OAuth Server] Started on http://localhost:${this.oauthPort}`);
                    
                    // Auto-stop server after 10 minutes
                    setTimeout(() => {
                        this.stopOAuthCallbackServer();
                    }, 10 * 60 * 1000);
                    
                    resolve(this.oauthPort);
                });

                this.oauthServer.on('error', (err) => {
                    console.error('[MCP OAuth Server] Server error:', err);
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
            console.log('[MCP OAuth Server] Stopping server...');
            this.oauthServer.close(() => {
                console.log('[MCP OAuth Server] Server stopped');
                this.oauthServer = null;
                this.oauthPort = null;
                resolve();
            });
        });
    }

    /**
     * Perform comprehensive MCP debug test
     * @returns {Promise<string>} Debug information and test results
     */
    async performMCPDebugTest() {
        console.log('[MCPClient] 🔧 Performing comprehensive MCP debug test...');
        
        const debugResults = [];
        debugResults.push('# MCP Debug & Test Results\n');

        try {
            // 1. Check initialization status
            debugResults.push(`## Initialization Status`);
            debugResults.push(`- MCP Client Initialized: ${this.isInitialized ? '✅ Yes' : '❌ No'}`);
            debugResults.push(`- External Tools Loaded: ${this.externalTools.length}`);
            debugResults.push(`- Connected Servers: ${this.mcpServers.size}`);
            debugResults.push('');

            // 2. List available tools
            debugResults.push(`## Available MCP Tools (${this.externalTools.length})`);
            if (this.externalTools.length > 0) {
                this.externalTools.forEach((tool, index) => {
                    debugResults.push(`${index + 1}. **${tool.name}**`);
                    debugResults.push(`   - Description: ${tool.description || 'No description'}`);
                    debugResults.push(`   - Parameters: ${tool.parameters ? Object.keys(tool.parameters).length : 0}`);
                });
            } else {
                debugResults.push('❌ No MCP tools available');
            }
            debugResults.push('');

            // 3. Server status
            debugResults.push(`## Server Status`);
            const runningServers = this.serverManager.getRunningServers();
            debugResults.push(`- Running Servers: ${runningServers.length}`);
            runningServers.forEach(server => {
                debugResults.push(`  - ${server} ✅`);
            });
            debugResults.push('');

            // 4. Test tool execution
            debugResults.push(`## Tool Execution Test`);
            const executionTest = await this.testMCPToolExecution();
            debugResults.push(`- Tool Execution: ${executionTest ? '✅ Working' : '❌ Failed'}`);
            
            if (executionTest) {
                debugResults.push('- Test completed successfully - MCP tools are callable from ask bar');
            } else {
                debugResults.push('- Test failed - MCP tools may not be properly configured');
            }
            debugResults.push('');

            // 5. Service connections
            debugResults.push(`## Service Connections`);
            const serviceConnections = Array.from(this.mcpServers.entries());
            if (serviceConnections.length > 0) {
                serviceConnections.forEach(([serviceName, serviceInfo]) => {
                    const status = serviceInfo.connected ? '✅ Connected' : 
                                  serviceInfo.authenticated ? '🔑 Authenticated' : '❌ Disconnected';
                    debugResults.push(`- ${serviceName}: ${status}`);
                    debugResults.push(`  - Type: ${serviceInfo.type || 'Unknown'}`);
                    debugResults.push(`  - Tools: ${serviceInfo.tools?.length || 0}`);
                });
            } else {
                debugResults.push('❌ No service connections found');
            }
            debugResults.push('');

            // 6. Detailed tool capabilities by service
            debugResults.push(`## Tools by Service`);
            const serviceTools = this.categorizeToolsByService();
            Object.entries(serviceTools).forEach(([service, tools]) => {
                if (tools.length > 0) {
                    debugResults.push(`### ${service.charAt(0).toUpperCase() + service.slice(1)} (${tools.length} tools)`);
                    tools.forEach(tool => {
                        debugResults.push(`- ${tool.name}: ${tool.description || 'No description'}`);
                    });
                    debugResults.push('');
                }
            });

            // 7. Recommendations
            debugResults.push(`## Recommendations`);
            if (this.externalTools.length === 0) {
                debugResults.push('❗ **No MCP tools found** - Set up MCP integrations in settings');
            } else if (!executionTest) {
                debugResults.push('❗ **Tool execution failed** - Check MCP server connections');
            } else {
                debugResults.push('✅ **MCP is working properly** - Ready to access external service data');
            }

            return debugResults.join('\n');

        } catch (error) {
            console.error('[MCPClient] Error during MCP debug test:', error);
            debugResults.push(`## Error During Testing`);
            debugResults.push(`❌ Debug test failed: ${error.message}`);
            return debugResults.join('\n');
        }
    }

    /**
     * Categorize tools by service for better organization
     * @returns {object} Tools grouped by service
     */
    categorizeToolsByService() {
        const serviceTools = {
            notion: [],
            github: [],
            slack: [],
            google: [],
            file_system: [],
            other: []
        };

        this.externalTools.forEach(tool => {
            const toolName = tool.name.toLowerCase();
            const toolDesc = (tool.description || '').toLowerCase();

            if (toolName.includes('notion') || toolDesc.includes('notion')) {
                serviceTools.notion.push(tool);
            } else if (toolName.includes('github') || toolName.includes('git') || toolDesc.includes('github')) {
                serviceTools.github.push(tool);
            } else if (toolName.includes('slack') || toolDesc.includes('slack')) {
                serviceTools.slack.push(tool);
            } else if (toolName.includes('google') || toolName.includes('drive') || toolName.includes('gmail') || toolDesc.includes('google')) {
                serviceTools.google.push(tool);
            } else if (toolName.includes('file') || toolName.includes('directory') || toolName.includes('read') || toolName.includes('write')) {
                serviceTools.file_system.push(tool);
            } else {
                serviceTools.other.push(tool);
            }
        });

        return serviceTools;
    }

    // Clean shutdown method
    async shutdown() {
        try {
            // Save configuration before shutdown
            await this.configManager.saveConfiguration();
            
            // Stop all servers
            await this.serverManager.stopAllServers();
            
            console.log('[MCPClient] Shutdown complete');
        } catch (error) {
            console.error('[MCPClient] Error during shutdown:', error.message);
        }
    }

    /**
     * Get the OAuth service identifier for a given service name
     * This ensures consistent token lookup across all methods
     */
    getOAuthServiceIdentifier(serviceName) {
        const serviceToOAuthService = {
            'notion': 'read',        // Notion uses 'read' as default OAuth service
            'github': 'repo',        // GitHub uses 'repo' as default OAuth service  
            'slack': 'channels',     // Slack uses 'channels' as default OAuth service
            'google-drive': 'drive'  // Google Drive uses 'drive' as OAuth service
        };
        
        return serviceToOAuthService[serviceName] || serviceName;
    }

    // NEW: Get tools available for remote services
    getRemoteServiceTools(serviceName) {
        const remoteServiceTools = {
            notion: [
                'search_pages',
                'create_page', 
                'update_page',
                'get_page_content',
                'create_database',
                'query_database'
            ],
            github: [
                'search_repositories',
                'get_repository',
                'create_issue',
                'get_file',
                'list_branches'
            ],
            slack: [
                'send_message',
                'get_channels',
                'get_messages',
                'search_messages'
            ],
            'google-drive': [
                'list_files',
                'get_file',
                'upload_file',
                'search_files'
            ]
        };
        
        return remoteServiceTools[serviceName] || [];
    }

    /**
     * Use LLM to intelligently select the best tool and formulate proper arguments
     * Based on modern agent patterns for tool calling
     * @param {object} question - Question object
     * @param {Array} availableTools - Available MCP tools  
     * @param {string} serviceName - Name of the service (e.g., 'notion')
     * @returns {Promise<object>} Tool selection with selectedTool, toolArgs, and retryQuery
     */
    async selectToolWithLLM(question, availableTools, serviceName) {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const { createStreamingLLM } = require('../common/ai/factory');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.1, // Low temperature for consistent tool selection
                maxTokens: 500,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            // Create enhanced prompt for tool selection with modern agent patterns
            const toolDescriptions = availableTools.map(tool => {
                return `- ${tool.name}: ${tool.description || this.generateToolDescription(tool.name, serviceName)}`;
            }).join('\n');

            const systemPrompt = `You are an expert tool selection assistant for ${serviceName || 'service'} integration. Your job is to select the most appropriate tool and formulate the best arguments for the user's request.

AVAILABLE TOOLS:
${toolDescriptions}

IMPORTANT GUIDELINES:
1. For search queries, extract meaningful keywords rather than using raw question text
2. Focus on the core intent of what the user wants to find
3. Use specific, searchable terms rather than question words
4. If the user asks "what do you see in my ${serviceName}?", they want to search for recent or relevant content

Please respond ONLY with valid JSON in this exact format:
{
  "selectedTool": "tool_name_here",
  "query": "meaningful_search_terms_here",
  "reasoning": "brief explanation of choice",
  "retryQuery": "alternative_search_terms_if_first_fails"
}`;

            const userPrompt = `User question: "${question.text}"

Select the best tool and formulate appropriate search arguments. Remember:
- Extract meaningful search terms, not question words  
- Focus on what the user wants to find
- Make queries specific but not too narrow
- For general "what do you see" questions, use broad terms like "pages", "recent", or "content"

Respond with JSON only.`;

            const messages = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ];

            // Get LLM response
            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        if (data.trim() === '') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                fullResponse += parsed.choices[0].delta.content;
                            }
                        } catch (parseError) {
                            // Skip malformed chunks
                        }
                    }
                }
            }

            // Parse the LLM response
            console.log(`[MCPClient] 🤖 LLM tool selection response:`, fullResponse.trim());
            
            try {
                const selection = JSON.parse(fullResponse.trim());
                const selectedTool = availableTools.find(t => t.name === selection.selectedTool);
                
                if (!selectedTool) {
                    console.log(`[MCPClient] ⚠️ LLM selected unknown tool: ${selection.selectedTool}, falling back to heuristic`);
                    return this.fallbackToolSelection(question, availableTools, serviceName);
                }

                // Format tool arguments based on tool type
                let toolArgs = {};
                if (selectedTool.name.includes('search') || selectedTool.name.includes('query')) {
                    toolArgs.query = selection.query || selection.retryQuery || 'recent content';
                } else if (selectedTool.name.includes('list') || selectedTool.name.includes('get')) {
                    // For list/get tools, may need different parameters
                    toolArgs = { limit: 10 }; // Default limit for list operations
                }

                console.log(`[MCPClient] ✅ LLM selected tool: ${selectedTool.name} with reasoning: ${selection.reasoning}`);
                
                return {
                    selectedTool,
                    toolArgs,
                    retryQuery: selection.retryQuery,
                    reasoning: selection.reasoning
                };

            } catch (parseError) {
                console.error(`[MCPClient] ❌ Failed to parse LLM tool selection:`, parseError);
                console.log(`[MCPClient] Raw response:`, fullResponse);
                return this.fallbackToolSelection(question, availableTools, serviceName);
            }

        } catch (error) {
            console.error(`[MCPClient] ❌ Error in LLM tool selection:`, error);
            return this.fallbackToolSelection(question, availableTools, serviceName);
        }
    }

    /**
     * Fallback tool selection when LLM selection fails
     * @param {object} question - Question object
     * @param {Array} availableTools - Available tools
     * @param {string} serviceName - Service name
     * @returns {object} Tool selection
     */
    fallbackToolSelection(question, availableTools, serviceName) {
        console.log(`[MCPClient] 🔄 Using fallback tool selection`);
        
        // Default to search tool with improved query extraction
        let selectedTool = availableTools.find(t => t.name.includes('search')) || 
                          availableTools.find(t => t.name.includes('query')) ||
                          availableTools[0];
        
        let query = 'recent content'; // Default fallback
        
        // Better query extraction than the original broken logic
        if (question.text) {
            const text = question.text.toLowerCase();
            
            // Extract meaningful terms
            if (text.includes('recent') || text.includes('latest')) {
                query = 'recent';
            } else if (text.includes('page') || text.includes('document')) {
                query = 'pages';
            } else if (text.includes('todo') || text.includes('task')) {
                query = 'tasks';
            } else if (text.includes('note')) {
                query = 'notes';
            } else {
                // Remove question words and extract key terms
                const cleanText = text
                    .replace(/what (do you see|can you find|is there) in (my )?/g, '')
                    .replace(/show me|find|search for|look for/g, '')
                    .replace(/\?/g, '')
                    .replace(new RegExp(serviceName || '', 'gi'), '')
                    .trim();
                
                query = cleanText || 'content';
            }
        }

        return {
            selectedTool,
            toolArgs: selectedTool?.name.includes('search') ? { query } : {},
            retryQuery: 'pages',
            reasoning: 'Fallback selection due to LLM parsing error'
        };
    }

    /**
     * Generate helpful descriptions for tools that don't have them
     * @param {string} toolName - Name of the tool
     * @param {string} serviceName - Service name  
     * @returns {string} Generated description
     */
    generateToolDescription(toolName, serviceName) {
        const service = serviceName || 'service';
        
        if (toolName.includes('search')) {
            return `Search for content in your ${service} workspace using keywords`;
        } else if (toolName.includes('list')) {
            return `List recent items from your ${service}`;
        } else if (toolName.includes('get') || toolName.includes('retrieve')) {
            return `Get specific items from your ${service}`;
        } else if (toolName.includes('query')) {
            return `Query your ${service} database for specific information`;
        } else if (toolName.includes('create')) {
            return `Create new content in your ${service}`;
        } else if (toolName.includes('update')) {
            return `Update existing content in your ${service}`;
        } else {
            return `Interact with your ${service} workspace`;
        }
    }

    /**
     * Format Notion search results in a user-friendly way
     * @param {Array} results - Notion API results array
     * @param {string} serviceName - Service name for context
     * @returns {string} Formatted results
     */
    formatNotionResults(results, serviceName) {
        if (!results || results.length === 0) {
            return `No ${serviceName} content found with the search criteria.`;
        }

        const formatted = [];
        formatted.push(`Found ${results.length} item(s) in your ${serviceName} workspace:\n`);

        results.forEach((item, index) => {
            const title = this.extractNotionTitle(item);
            const type = item.object || 'item';
            const lastEdited = item.last_edited_time ? new Date(item.last_edited_time).toLocaleDateString() : 'unknown';
            const url = item.url || '';

            formatted.push(`${index + 1}. **${title}** (${type})`);
            formatted.push(`   Last edited: ${lastEdited}`);
            if (url) {
                formatted.push(`   URL: ${url}`);
            }
            
            // Add any additional properties that might be interesting
            if (item.properties) {
                const props = this.extractNotionProperties(item.properties);
                if (props.length > 0) {
                    formatted.push(`   Properties: ${props.join(', ')}`);
                }
            }
            formatted.push(''); // Empty line between items
        });

        return formatted.join('\n');
    }

    /**
     * Extract title from Notion item
     * @param {object} item - Notion item
     * @returns {string} Title or fallback
     */
    extractNotionTitle(item) {
        if (item.properties && item.properties.title) {
            const titleProp = item.properties.title;
            if (titleProp.title && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
                return titleProp.title[0].plain_text || titleProp.title[0].text?.content || 'Untitled';
            }
        }
        
        // Fallback for other title structures
        if (item.title && Array.isArray(item.title) && item.title.length > 0) {
            return item.title[0].plain_text || item.title[0].text?.content || 'Untitled';
        }
        
        // Last resort
        return item.id ? `Item ${item.id.substring(0, 8)}...` : 'Untitled';
    }

    /**
     * Extract interesting properties from Notion item
     * @param {object} properties - Notion properties object
     * @returns {Array} Array of property descriptions
     */
    extractNotionProperties(properties) {
        const props = [];
        
        Object.entries(properties).forEach(([key, value]) => {
            if (key === 'title') return; // Skip title as it's handled separately
            
            if (value.type === 'rich_text' && value.rich_text && value.rich_text.length > 0) {
                const text = value.rich_text[0].plain_text || value.rich_text[0].text?.content;
                if (text && text.trim()) {
                    props.push(`${key}: "${text}"`);
                }
            } else if (value.type === 'select' && value.select) {
                props.push(`${key}: ${value.select.name}`);
            } else if (value.type === 'multi_select' && value.multi_select && value.multi_select.length > 0) {
                const tags = value.multi_select.map(tag => tag.name).join(', ');
                props.push(`${key}: [${tags}]`);
            } else if (value.type === 'number' && value.number !== null) {
                props.push(`${key}: ${value.number}`);
            } else if (value.type === 'checkbox') {
                props.push(`${key}: ${value.checkbox ? 'checked' : 'unchecked'}`);
            } else if (value.type === 'date' && value.date) {
                const dateStr = value.date.start || '';
                props.push(`${key}: ${dateStr}`);
            }
        });
        
        return props;
    }

    /**
     * Format generic service data
     * @param {object} data - Service data  
     * @param {string} serviceName - Service name
     * @returns {string} Formatted data
     */
    formatGenericData(data, serviceName) {
        if (data.object === 'list' && data.results) {
            return this.formatNotionResults(data.results, serviceName);
        }
        
        // For other data types, provide a reasonable summary
        const formatted = [];
        formatted.push(`${serviceName} data retrieved:\n`);
        
        if (typeof data === 'object') {
            // Extract key information
            if (data.object) formatted.push(`Type: ${data.object}`);
            if (data.id) formatted.push(`ID: ${data.id}`);
            if (data.title) formatted.push(`Title: ${JSON.stringify(data.title)}`);
            if (data.name) formatted.push(`Name: ${data.name}`);
            if (data.url) formatted.push(`URL: ${data.url}`);
            
            // Add first few properties if it's a complex object
            const keys = Object.keys(data).slice(0, 5);
            if (keys.length > 0) {
                formatted.push('\nKey properties:');
                keys.forEach(key => {
                    const value = data[key];
                    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        formatted.push(`- ${key}: ${value}`);
                    } else if (Array.isArray(value)) {
                        formatted.push(`- ${key}: [${value.length} items]`);
                    } else if (typeof value === 'object' && value !== null) {
                        formatted.push(`- ${key}: {object}`);
                    }
                });
            }
        } else {
            formatted.push(String(data));
        }
        
        return formatted.join('\n');
    }
}

module.exports = MCPClient; 