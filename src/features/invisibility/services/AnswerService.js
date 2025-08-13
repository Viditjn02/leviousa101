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
    
    linkedin_data_access: {
        systemPrompt: `You are accessing LinkedIn data through MCP tools. When users ask for someone's LinkedIn profile by name, ALWAYS follow this approach:

1. IMMEDIATELY call the web_search_person tool to get real web results about the person
2. Present the actual web search results you found
3. Mention you can get their exact LinkedIn profile if they provide the username

Your response format should be:
"I can help you get their exact LinkedIn profile if you provide their LinkedIn username (the part after linkedin.com/in/), but for now here's what I found on the web about [person name]:

[Present the ACTUAL web search results from the web_search_person tool - include relevant details about their professional background, current role, company, etc.]"

IMPORTANT: 
- ALWAYS call web_search_person first to get real results
- Present actual information, not placeholder text
- Be concise but informative
- Don't just explain limitations - provide value immediately`,
        useResearch: false,
        maxTokens: 1500,
        temperature: 0.2,
        timeout: 10000,
        useMCPTools: true,
        requiresServiceMCP: 'linkedin'
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
            await this.validateStrategyRequirements(strategy, context);
            
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
        
        if (lowerQuestion.includes('linkedin') && 
            (lowerQuestion.includes('profile') || 
             lowerQuestion.includes('pullup') || 
             lowerQuestion.includes('pull up') ||
             lowerQuestion.includes('get') || 
             lowerQuestion.includes('find') ||
             lowerQuestion.includes('search') ||
             lowerQuestion.includes('from linkedin'))) {
            return 'linkedin_data_access';
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
    async validateStrategyRequirements(strategy, context) {
        if (strategy.requiresScreenshot && !context.screenshot) {
            throw new Error('This question requires a screenshot');
        }
        
        if (strategy.requiresServiceMCP && this.mcpToolInvoker) {
            // For LinkedIn, check if we have LinkedIn tools available through Paragon
            if (strategy.requiresServiceMCP === 'linkedin') {
                const availableTools = await this.mcpToolInvoker.getAvailableTools();
                const hasWebSearch = availableTools.some(tool => 
                    tool.name === 'web_search_person' || 
                    tool.name.includes('web_search_person')
                );
                const hasLinkedInProfile = availableTools.some(tool => 
                    tool.name === 'linkedin_get_profile' || 
                    tool.name.includes('linkedin_get_profile')
                );
                
                if (!hasWebSearch && !hasLinkedInProfile) {
                    throw new Error('LinkedIn functionality requires web search tools or Paragon authentication');
                }
            } else {
                const hasRequiredService = this.mcpToolInvoker.hasService(strategy.requiresServiceMCP);
                if (!hasRequiredService && strategy.requiresServiceMCP !== 'any') {
                    throw new Error(`This question requires ${strategy.requiresServiceMCP} MCP integration`);
                }
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
            timeout: strategy.timeout // Pass timeout if specified in strategy
        };
        
        // Perform MCP test if needed
        if (strategy.performMCPTest && this.mcpToolInvoker) {
            const testResults = await this.performMCPTest();
            prompt.context.mcpTestResults = testResults;
        }
        
        // Pre-call LinkedIn web search for linkedin_data_access strategy
        if (strategy.requiresServiceMCP === 'linkedin' && this.mcpToolInvoker) {
            try {
                logger.info('LinkedIn strategy detected, checking for person name extraction', { 
                    query: prompt.userPrompt,
                    strategyRequires: strategy.requiresServiceMCP,
                    hasMcpInvoker: !!this.mcpToolInvoker
                });
                
                const personName = this.extractPersonName(prompt.userPrompt);
                logger.info('Person name extraction result', { personName, originalQuery: prompt.userPrompt });
                
                if (personName) {
                    logger.info('Pre-calling web search for LinkedIn query', { personName });
                    
                    const webSearchResult = await this.mcpToolInvoker.invokeTool('web_search_person', {
                        person_name: personName,
                        additional_context: 'professional background LinkedIn profile'
                    });
                    
                    logger.info('Web search result received', { 
                        hasResult: !!webSearchResult,
                        hasContent: !!(webSearchResult && webSearchResult.content),
                        resultType: typeof webSearchResult
                    });
                    
                    if (webSearchResult && webSearchResult.content) {
                        // Add real web search results to context
                        prompt.context.webSearchResults = webSearchResult.content;
                        
                        // Extract the actual web search text
                        const searchResultData = JSON.parse(webSearchResult.content[0].text);
                        const actualWebResults = searchResultData.webResults || '';
                        const citations = searchResultData.citations || [];
                        const searchQuery = searchResultData.searchQuery || '';
                        
                        logger.info('Extracted web search data', { 
                            hasResults: actualWebResults.length > 0,
                            resultLength: actualWebResults.length,
                            citationCount: citations.length,
                            searchQuery 
                        });
                        
                        // Update system prompt with STRICT enforcement
                        prompt.systemPrompt = `You are responding to a LinkedIn profile search. You MUST use ONLY the real web search results provided below. DO NOT generate placeholder text, templates, or generic examples.

SEARCH QUERY: ${searchQuery}
PERSON SEARCHED: ${personName}

ACTUAL WEB SEARCH RESULTS:
${actualWebResults}

CITATIONS: ${citations.join(', ')}

CRITICAL INSTRUCTIONS:
1. Use ONLY the information from the web search results above
2. If the results say "no information found" or similar, tell the user exactly that
3. NEVER use placeholder text like "insert company name" or "relevant field"
4. NEVER generate template responses
5. If no useful information was found, be direct about it
6. ALWAYS end with: "Note: If you're connected to them on LinkedIn and have their exact LinkedIn username (e.g., john-smith from linkedin.com/in/john-smith), I can pull up their complete profile for you."

Your response should be based entirely on the actual search results above. If the search found no relevant information, say so clearly and mention the LinkedIn username option.`;
                        
                        logger.info('Updated LinkedIn strategy with real web search results');
                    } else {
                        logger.warn('Web search returned no usable content', { webSearchResult });
                    }
                } else {
                    logger.warn('No person name extracted from LinkedIn query', { query: prompt.userPrompt });
                }
            } catch (error) {
                logger.error('Failed to pre-call web search for LinkedIn', { 
                    error: error.message,
                    stack: error.stack,
                    query: prompt.userPrompt
                });
                // Continue with original strategy if web search fails
            }
        }
        
        // Set the system prompt in llmOptions AFTER all processing is complete
        llmOptions.systemPrompt = prompt.systemPrompt;
        
        // Debug: Log the exact prompt being sent to LLM
        if (strategy.requiresServiceMCP === 'linkedin') {
            logger.info('=== LLM PROMPT DEBUG ===');
            logger.info('System Prompt being sent to LLM:', {
                systemPrompt: prompt.systemPrompt.substring(0, 500) + '...',
                fullLength: prompt.systemPrompt.length
            });
            logger.info('User Prompt:', prompt.userPrompt);
            logger.info('Context keys:', Object.keys(prompt.context));
            logger.info('LLM Options system prompt preview:', llmOptions.systemPrompt.substring(0, 200) + '...');
            logger.info('=== END PROMPT DEBUG ===');
        }
        
        // Generate the answer
        const answer = await this.llmService.generateResponse(
            prompt.userPrompt,
            prompt.context,
            llmOptions
        );
        
        // Debug: Log the LLM response for LinkedIn queries
        if (strategy.requiresServiceMCP === 'linkedin') {
            logger.info('=== LLM RESPONSE DEBUG ===');
            logger.info('LLM Response:', {
                answer: answer.substring(0, 300) + '...',
                fullLength: answer.length,
                containsPlaceholder: answer.includes('insert') || answer.includes('relevant field')
            });
            logger.info('=== END RESPONSE DEBUG ===');
        }
        
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
     * Extract person name from LinkedIn query
     */
    extractPersonName(query) {
        console.log('[AnswerService] Extracting person name from:', query);
        
        // Common patterns for LinkedIn queries - more flexible with case
        const patterns = [
            // "pullup [name] from linkedin" - most flexible
            /(?:pullup|pull\s+up)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+from\s+linkedin/i,
            // "find [name] on linkedin"
            /find\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:on\s+)?linkedin/i,
            // "get [name] linkedin profile"
            /get\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+linkedin/i,
            // "search [name] linkedin"
            /search\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+linkedin/i,
            // "[name] linkedin profile"
            /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+linkedin\s+profile/i,
            // "linkedin [name]"
            /linkedin\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
            // Just name with linkedin anywhere
            /([a-zA-Z]{2,}\s+[a-zA-Z]{2,}).*linkedin|linkedin.*([a-zA-Z]{2,}\s+[a-zA-Z]{2,})/i
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const match = query.match(pattern);
            console.log(`[AnswerService] Pattern ${i + 1} result:`, match);
            
            if (match) {
                // Check both capture groups (some patterns have name in group 1, others in group 2)
                const name = (match[1] && match[1].trim()) || (match[2] && match[2].trim());
                if (name && name.length > 1) {
                    // Clean up the name
                    const cleanName = name.replace(/\s+/g, ' ').trim();
                    console.log(`[AnswerService] Extracted name: "${cleanName}"`);
                    console.log(`[AnswerService] Name validation - length: ${cleanName.length}, regex match:`, cleanName.match(/^[a-zA-Z]+(\s+[a-zA-Z]+)*$/));
                    
                    // Basic validation - at least looks like a name
                    if (cleanName.match(/^[a-zA-Z]+(\s+[a-zA-Z]+)*$/) && cleanName.length > 2) {
                        console.log(`[AnswerService] ✅ Name validation passed: "${cleanName}"`);
                        return cleanName;
                    } else {
                        console.log(`[AnswerService] ❌ Name validation failed for: "${cleanName}"`);
                    }
                }
            }
        }
        
        console.log('[AnswerService] No person name extracted');
        return null;
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