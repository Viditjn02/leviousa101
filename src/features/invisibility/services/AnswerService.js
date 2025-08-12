/**
 * Answer Service
 * Manages answer strategies and response generation independently from MCP
 * Implements strategy pattern for different types of questions
 */

const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[AnswerService] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Answer strategies configuration
const ANSWER_STRATEGIES = {
    // MCP debug and testing
    mcp_debug: {
        systemPrompt: `You are providing MCP debugging and testing information. Show the user detailed information about available MCP tools, connections, and test results. If MCP tools are working, demonstrate with actual tool calls. If not working, provide troubleshooting guidance. Be technical but helpful.`,
        useResearch: false,
        maxTokens: 2000,
        temperature: 0.1,
        useMCPTools: true,
        performMCPTest: true
    },
    
    // Service-specific data access strategies
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
        maxTokens: 1200, // Reduced for faster responses
        temperature: 0.2,
        timeout: 7000, // 7 second timeout
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
    
    // MCP capability questions
    mcp_capabilities: {
        systemPrompt: `You are Leviousa, an AI assistant with MCP (Model Context Protocol) integrations that allow you to access real external services and data. Be specific about what tools and services you can connect to:

GOOGLE SERVICES: Google Drive (files, documents), Gmail (emails), Google Calendar (events), Google Docs, Google Sheets, Google Tasks
PRODUCTIVITY: Notion (pages, databases, workspaces), Slack (messages, channels), GitHub (repositories, code, issues)  
SYSTEM: File system access, SQLite databases, system monitoring
OTHER: Discord, LinkedIn, and various APIs through MCP servers

Explain that through MCP, you can actually retrieve, analyze, and work with their real data from these services - not just provide general information. You're not just a text generator, but can perform real-world tasks by accessing their connected accounts and data. Be confident about these capabilities while noting that specific services need to be authenticated first. Keep response concise and practical.`,
        useResearch: false,
        maxTokens: 800, // Reduced for faster responses
        temperature: 0.1, // Lower temperature for more focused responses
        timeout: 6000, // 6 second timeout for capability questions
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
    
    // Screen context questions
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

    // Technical questions
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
        systemPrompt: `You are answering a question naturally as yourself. Be helpful and informative but write as if you're just someone knowledgeable sharing information, not an AI assistant. Keep responses concise and practical.`,
        useResearch: true,
        maxTokens: 600, // Reduced for faster responses
        temperature: 0.3,
        timeout: 5000 // 5 second timeout for general questions
    }
};

// Research capabilities
const RESEARCH_CAPABILITIES = {
    webSearch: true,
    codeSearch: true,
    documentationSearch: true,
    stackOverflowSearch: true
};

class AnswerService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.strategies = { ...ANSWER_STRATEGIES, ...options.customStrategies };
        this.researchCapabilities = { ...RESEARCH_CAPABILITIES, ...options.researchCapabilities };
        this.defaultStrategy = options.defaultStrategy || 'general';
        
        // Dependency injection for external services
        this.mcpToolInvoker = options.mcpToolInvoker || null;
        this.researchService = options.researchService || null;
        this.llmService = options.llmService || null;
        
        logger.info('AnswerService initialized', {
            strategies: Object.keys(this.strategies).length,
            defaultStrategy: this.defaultStrategy
        });
    }

    /**
     * Get answer for a question using appropriate strategy
     */
    async getAnswer(question, context = {}) {
        const startTime = Date.now();
        
        try {
            // Ensure question is a string
            if (typeof question !== 'string') {
                logger.warn('Question is not a string, converting:', typeof question, question);
                question = String(question || '');
            }
            
            const questionPreview = question.substring(0, 100);
            logger.info('Processing question', {
                question: questionPreview,
                hasScreenshot: !!context.screenshot,
                hasConversationHistory: !!context.conversationHistory
            });
            
            // Classify the question
            const questionType = await this.classifyQuestion(question, context);
            logger.info('Question classified', { type: questionType });
            
            // Get the strategy
            const strategy = this.getStrategy(questionType);
            
            // Validate strategy requirements
            this.validateStrategyRequirements(strategy, context);
            
            // Build the prompt
            const prompt = await this.buildPrompt(strategy, question, context);
            
            // Execute strategy
            const answer = await this.executeStrategy(strategy, prompt, context);
            
            const duration = Date.now() - startTime;
            logger.info('Answer generated', {
                questionType,
                duration,
                answerLength: answer.length
            });
            
            this.emit('answerGenerated', {
                question,
                questionType,
                answer,
                duration
            });
            
            return {
                answer,
                questionType,
                strategy: strategy.name || questionType,
                duration
            };
            
        } catch (error) {
            const safeQuestion = typeof question === 'string' ? question.substring(0, 100) : String(question || '').substring(0, 100);
            logger.error('Failed to generate answer', {
                error: error.message,
                question: safeQuestion
            });
            
            this.emit('answerFailed', {
                question,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Classify question to determine strategy
     */
    async classifyQuestion(question, context) {
        const lowerQuestion = question.toLowerCase();
        
        // MCP debug questions
        if (lowerQuestion.includes('mcp test') || 
            lowerQuestion.includes('test mcp') ||
            lowerQuestion.includes('mcp tools')) {
            return 'mcp_debug';
        }
        
        // Service-specific data access
        if (lowerQuestion.includes('github') && 
            (lowerQuestion.includes('repo') || 
             lowerQuestion.includes('issue') || 
             lowerQuestion.includes('pull request'))) {
            return 'github_data_access';
        }
        
        if (lowerQuestion.includes('notion') && 
            (lowerQuestion.includes('page') || 
             lowerQuestion.includes('database') || 
             lowerQuestion.includes('workspace'))) {
            return 'notion_data_access';
        }
        
        if (lowerQuestion.includes('slack') && 
            (lowerQuestion.includes('message') || 
             lowerQuestion.includes('channel'))) {
            return 'slack_data_access';
        }
        
        if (lowerQuestion.includes('google') && 
            (lowerQuestion.includes('drive') || 
             lowerQuestion.includes('gmail') || 
             lowerQuestion.includes('calendar'))) {
            return 'google_data_access';
        }
        
        // MCP capabilities - capability questions about any service
        if ((lowerQuestion.includes('what can') || 
             lowerQuestion.includes('what do') ||
             lowerQuestion.includes('what tools') ||
             lowerQuestion.includes('what services') ||
             lowerQuestion.includes('what google') ||
             lowerQuestion.includes('google tools') ||
             lowerQuestion.includes('tools can') ||
             lowerQuestion.includes('tools do') ||
             lowerQuestion.includes('access to')) && 
            (lowerQuestion.includes('you') || 
             lowerQuestion.includes('access') ||
             lowerQuestion.includes('have') ||
             lowerQuestion.includes('capabilities'))) {
            return 'mcp_capabilities';
        }
        
        // Google data access (specific data retrieval actions)
        if (lowerQuestion.includes('google') && 
            (lowerQuestion.includes('drive') || 
             lowerQuestion.includes('gmail') || 
             lowerQuestion.includes('calendar') ||
             lowerQuestion.includes('get my') ||
             lowerQuestion.includes('retrieve') ||
             lowerQuestion.includes('show me') ||
             lowerQuestion.includes('find in'))) {
            return 'google_data_access';
        }
        
        // Service integration
        if (lowerQuestion.includes('integrate') || 
            lowerQuestion.includes('connect') ||
            lowerQuestion.includes('services')) {
            return 'service_integration';
        }
        
        // Screen context
        if (context.screenshot && 
            (lowerQuestion.includes('see') || 
             lowerQuestion.includes('screen') || 
             lowerQuestion.includes('what is'))) {
            return 'screen_context';
        }
        
        // System status
        if (lowerQuestion.includes('status') || 
            lowerQuestion.includes('oauth') ||
            lowerQuestion.includes('auth')) {
            return 'system_status';
        }
        
        // Help/conversation
        if (lowerQuestion.includes('help') || 
            lowerQuestion.includes('how do') ||
            context.conversationHistory) {
            return 'help_conversation';
        }
        
        // Technical questions
        if (lowerQuestion.includes('code') || 
            lowerQuestion.includes('program') ||
            lowerQuestion.includes('function')) {
            return 'coding';
        }
        
        if (lowerQuestion.includes('interview')) {
            return 'interview';
        }
        
        if ((lowerQuestion.includes('explain') || lowerQuestion.includes('how')) && 
            (this.isTechnicalTopic(lowerQuestion) || 
             lowerQuestion.includes('tcp') || 
             lowerQuestion.includes('works'))) {
            return 'technical';
        }
        
        if (this.isMathQuestion(lowerQuestion)) {
            return 'math';
        }
        
        // Default
        return 'general';
    }

    /**
     * Get strategy by type
     */
    getStrategy(type) {
        return this.strategies[type] || this.strategies[this.defaultStrategy];
    }

    /**
     * Validate strategy requirements
     */
    validateStrategyRequirements(strategy, context) {
        if (strategy.requiresScreenshot && !context.screenshot) {
            throw new Error('This question requires a screenshot');
        }
        
        if (strategy.requiresServiceMCP && this.mcpToolInvoker) {
            const hasRequiredService = this.mcpToolInvoker.hasService(strategy.requiresServiceMCP);
            if (!hasRequiredService && strategy.requiresServiceMCP !== 'any') {
                throw new Error(`This question requires ${strategy.requiresServiceMCP} MCP integration`);
            }
        }
    }

    /**
     * Build prompt for LLM
     */
    async buildPrompt(strategy, question, context) {
        let prompt = {
            systemPrompt: strategy.systemPrompt,
            userPrompt: question,
            context: {}
        };
        
        // Add screenshot if available
        if (context.screenshot) {
            prompt.context.screenshot = context.screenshot;
        }
        
        // Add conversation history if needed
        if (strategy.useConversationHistory && context.conversationHistory) {
            prompt.context.conversationHistory = context.conversationHistory;
        }
        
        // Add available MCP tools if needed
        if (strategy.useMCPTools && this.mcpToolInvoker) {
            const tools = await this.mcpToolInvoker.getAvailableTools();
            prompt.context.availableTools = tools;
        }
        
        // Add research results if needed
        if (strategy.useResearch && this.researchService) {
            const research = await this.performResearch(question);
            if (research) {
                prompt.context.research = research;
            }
        }
        
        return prompt;
    }

    /**
     * Execute strategy to generate answer
     */
    async executeStrategy(strategy, prompt, context) {
        if (!this.llmService) {
            throw new Error('LLM service not configured');
        }
        
        const llmOptions = {
            maxTokens: strategy.maxTokens,
            temperature: strategy.temperature,
            systemPrompt: prompt.systemPrompt,
            timeout: strategy.timeout // Pass timeout if specified in strategy
        };
        
        // Perform MCP test if needed
        if (strategy.performMCPTest && this.mcpToolInvoker) {
            const testResults = await this.performMCPTest();
            prompt.context.mcpTestResults = testResults;
        }
        
        // Generate the answer
        const answer = await this.llmService.generateResponse(
            prompt.userPrompt,
            prompt.context,
            llmOptions
        );
        
        return answer;
    }

    /**
     * Perform research for the question
     */
    async performResearch(question) {
        if (!this.researchService) {
            return null;
        }
        
        try {
            const results = await this.researchService.search(question, {
                capabilities: this.researchCapabilities
            });
            
            return results;
        } catch (error) {
            logger.error('Research failed', { error: error.message });
            return null;
        }
    }

    /**
     * Perform MCP functionality test
     */
    async performMCPTest() {
        if (!this.mcpToolInvoker) {
            return {
                status: 'not_configured',
                message: 'MCP tool invoker not configured'
            };
        }
        
        try {
            const tools = await this.mcpToolInvoker.getAvailableTools();
            const servers = await this.mcpToolInvoker.getActiveServers();
            
            return {
                status: 'operational',
                availableTools: tools.length,
                activeServers: servers.length,
                tools: tools.map(t => ({ name: t.name, description: t.description })),
                servers: servers
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Check if question is about technical topic
     */
    isTechnicalTopic(question) {
        const technicalKeywords = [
            'algorithm', 'data structure', 'api', 'database', 
            'framework', 'library', 'protocol', 'architecture',
            'design pattern', 'performance', 'security'
        ];
        
        return technicalKeywords.some(keyword => question.includes(keyword));
    }

    /**
     * Check if question is math-related
     */
    isMathQuestion(question) {
        const mathKeywords = [
            'calculate', 'solve', 'equation', 'formula',
            'integral', 'derivative', 'matrix', 'probability',
            'statistics', 'algebra', 'geometry'
        ];
        
        const mathSymbols = ['+', '-', '*', '/', '=', '^', '√'];
        
        return mathKeywords.some(keyword => question.includes(keyword)) ||
               mathSymbols.some(symbol => question.includes(symbol));
    }

    /**
     * Update strategy configuration
     */
    updateStrategy(type, updates) {
        if (this.strategies[type]) {
            this.strategies[type] = {
                ...this.strategies[type],
                ...updates
            };
            logger.info('Strategy updated', { type, updates: Object.keys(updates) });
            this.emit('strategyUpdated', { type, updates });
        }
    }

    /**
     * Add custom strategy
     */
    addStrategy(type, strategy) {
        this.strategies[type] = strategy;
        logger.info('Strategy added', { type });
        this.emit('strategyAdded', { type, strategy });
    }

    /**
     * Get all strategies
     */
    getStrategies() {
        return Object.keys(this.strategies);
    }

    /**
     * Get strategy configuration for a specific type
     */
    getStrategyConfig(type) {
        return this.strategies[type] || null;
    }

    /**
     * Get enhanced answer (compatibility method - delegates to getAnswer)
     */
    async getEnhancedAnswer(question, contextOrScreenshot = null) {
        let context = {};
        
        // Handle both old (screenshotBase64) and new (context object) calling patterns
        if (typeof contextOrScreenshot === 'string') {
            // Old pattern: screenshotBase64 string
            context.screenshot = contextOrScreenshot;
        } else if (contextOrScreenshot && typeof contextOrScreenshot === 'object') {
            // New pattern: enhanced context object
            context = { ...contextOrScreenshot };
        }
        
        return await this.getAnswer(question, context);
    }
}

module.exports = AnswerService; 