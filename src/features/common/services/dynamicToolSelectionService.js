/**
 * Dynamic Tool Selection Service
 * Implements LLM-based dynamic tool selection using MCP tools
 * Replaces hardcoded pattern matching with intelligent function calling
 */

const winston = require('winston');
const userTimezoneService = require('./userTimezoneService');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[DynamicToolSelection] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class DynamicToolSelectionService {
    constructor(toolRegistry, llmProvider) {
        this.toolRegistry = toolRegistry;
        this.llmProvider = llmProvider;
        
        logger.info('DynamicToolSelectionService initialized');
    }

    /**
     * Get count of available tools
     */
    getAvailableToolCount() {
        try {
            const tools = this.toolRegistry.listTools();
            return tools ? tools.length : 0;
        } catch (error) {
            logger.error('Error getting tool count', { error: error.message });
            return 0;
        }
    }

    /**
     * Select and execute tools dynamically based on user input
     */
    async selectAndExecuteTools(userMessage, context = {}) {
        try {
            // Store the original user query for LLM response generation
            this.currentUserQuery = userMessage;
            
            logger.info('Processing dynamic tool selection', { 
                message: userMessage.substring(0, 100),
                hasContext: !!context 
            });

            // Check if this should use the enhanced answer generation from MCPClient
            const questionType = this.detectQuestionType(userMessage);
            if (questionType && this.shouldUseEnhancedAnswer(questionType)) {
                logger.info('Using enhanced MCP answer generation', { questionType });
                return await this.useEnhancedAnswering(userMessage, context, questionType);
            }

            // Get all available tools from MCP registry
            const availableTools = this.toolRegistry.listTools();
            
            if (!availableTools || availableTools.length === 0) {
                logger.warn('No MCP tools available for dynamic selection');
                return {
                    response: "I don't have access to any external tools right now. Please check your MCP connections.",
                    toolCalled: null,
                    needsTools: true
                };
            }

            logger.info('Available tools for selection', { 
                toolCount: availableTools.length,
                toolNames: availableTools.map(t => t.name).slice(0, 10) // Log first 10 tool names
            });

            // Build system prompt for dynamic tool selection with context
            const systemPrompt = this.buildToolSelectionPrompt(availableTools, context);

            // Include conversation history for better context understanding
            const messages = [
                { role: 'system', content: systemPrompt }
            ];
            
            // Enhanced context integration (817b99ee pattern)
            let advancedContext = null;
            let followUpAnalysis = null;
            
            // Get advanced context if session ID is available  
            if (context.sessionId && global.askService?.contextService) {
                try {
                    advancedContext = global.askService.contextService.getContextForLLM(context.sessionId, {
                        includeRecentMessages: true,
                        includeEntityDetails: true,
                        includeTopicAnalysis: true,
                        maxMessages: 10
                    });
                    
                    followUpAnalysis = global.askService.contextService.analyzeFollowUp(context.sessionId, userMessage);
                    
                    logger.info('Advanced context retrieved', {
                        sessionId: context.sessionId,
                        hasAdvancedContext: !!advancedContext,
                        isFollowUp: followUpAnalysis?.isFollowUp || false,
                        entities: advancedContext?.relevantEntities?.length || 0,
                        topics: advancedContext?.activeTopics?.length || 0
                    });
                } catch (contextError) {
                    logger.warn('Advanced context retrieval failed', { error: contextError.message });
                }
            }

            // Add conversation history (prioritize advanced context, fallback to simple context)
            const conversationHistory = advancedContext?.immediate || context.conversationHistory || [];
            
            if (conversationHistory && conversationHistory.length > 0) {
                console.log(`[DynamicToolSelection] 📜 Including ${conversationHistory.length} conversation history messages for context`);
                console.log(`[DynamicToolSelection] 🔍 Conversation history preview:`, conversationHistory.slice(-2));
                
                conversationHistory.forEach(msg => {
                    if (msg.role === 'user' || msg.role === 'assistant') {
                        messages.push({
                            role: msg.role,
                            content: typeof msg.content === 'string' ? msg.content : msg.content.text || JSON.stringify(msg.content)
                        });
                    }
                });
            } else {
                console.log(`[DynamicToolSelection] ⚠️ No conversation history available for context`);
            }
            
            // Enhanced context-aware prompt building
            const contextualPrompt = this.buildContextualPrompt(userMessage, {
                conversationHistory,
                advancedContext,
                followUpAnalysis,
                entities: advancedContext?.relevantEntities || [],
                topics: advancedContext?.activeTopics || []
            });
            
            console.log(`[DynamicToolSelection] 🔄 Original prompt: "${userMessage}"`);
            console.log(`[DynamicToolSelection] ✨ Enhanced contextual prompt: "${contextualPrompt}"`);
            messages.push({ role: 'user', content: contextualPrompt });

            // Sanitize tool names for function calling (remove dots and create mapping)
            const { sanitizedTools, toolNameMapping } = this.sanitizeToolsForFunctionCalling(availableTools);
            
            // Get LLM response with function calling
            const response = await this.llmProvider.chatWithTools(messages, sanitizedTools);
            
            logger.info('LLM response received', { 
                hasContent: !!response.content,
                toolCallCount: response.toolCalls?.length || 0
            });

            // If LLM wants to call a function, execute it
            if (response.toolCalls && response.toolCalls.length > 0) {
                return await this.executeToolCalls(response, messages, toolNameMapping);
            }
            
            // No tool calling needed - return direct response
            return {
                response: response.content || "I understand, but I don't need to use any tools for this request.",
                toolCalled: null,
                directResponse: true
            };

        } catch (error) {
            logger.error('Dynamic tool selection failed', { 
                error: error.message,
                stack: error.stack,
                message: userMessage.substring(0, 100)
            });
            
            return {
                response: `I encountered an error while processing your request: ${error.message}`,
                toolCalled: null,
                error: error.message
            };
        }
    }

    /**
     * Execute tool calls from LLM response
     */
    async executeToolCalls(response, originalMessages, toolNameMapping = new Map()) {
        const results = [];
        const calendarResults = [];
        
        // Execute all tool calls first
        for (const toolCall of response.toolCalls) {
            const sanitizedToolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);
            
            // Map sanitized tool name back to original MCP tool name
            const originalToolName = toolNameMapping.get(sanitizedToolName) || sanitizedToolName;
            
            try {
                
                logger.info('Executing tool call', { 
                    toolName: originalToolName,
                    sanitizedName: sanitizedToolName,
                    toolArgs 
                });
                
                const toolResult = await this.toolRegistry.invokeTool(originalToolName, toolArgs);
                
                logger.info('Tool call successful', { 
                    toolName: originalToolName, 
                    resultType: typeof toolResult,
                    hasContent: !!(toolResult && toolResult.content)
                });
                
                results.push({
                    toolName: originalToolName,
                    toolArgs,
                    result: toolResult,
                    success: true
                });

                // Collect calendar results for unified processing
                if (originalToolName.includes('calendar') || originalToolName.includes('calendly')) {
                    calendarResults.push({
                        toolName: originalToolName,
                        toolResult,
                        toolArgs
                    });
                }
                
            } catch (error) {
                logger.error('Tool call failed', { 
                    toolName: originalToolName,
                    sanitizedName: sanitizedToolName,
                    error: error.message 
                });
                
                results.push({
                    toolName: originalToolName,
                    toolArgs: toolArgs,
                    error: error.message,
                    success: false
                });
                
                // If calendar tool failed, still include in calendar results for unified handling
                if (originalToolName.includes('calendar') || originalToolName.includes('calendly')) {
                    calendarResults.push({
                        toolName: originalToolName,
                        toolResult: null,
                        toolArgs,
                        error: error.message
                    });
                }
            }
        }
        
        // Process calendar results if any calendar tools were called
        if (calendarResults.length > 0) {
            return await this.processUnifiedCalendarResults(calendarResults, results);
        }
        
        // For non-calendar tools, use LLM processing with actual tool results
        if (results.length > 0) {
            const userQuery = originalMessages.find(m => m.role === 'user')?.content || 'user question';
            const successfulResults = results.filter(r => r.success);
            
            if (successfulResults.length > 0) {
                // Enhanced tool result formatting (817b99ee pattern)
                let toolResultsText = '';
                let hasEmailResult = false;
                let hasCalendarResult = false;
                let hasDataResult = false;
                
                successfulResults.forEach((result, idx) => {
                    toolResultsText += `\n=== Tool ${idx + 1}: ${result.toolName} ===\n`;
                    
                    // Track result types for better processing
                    if (result.toolName.toLowerCase().includes('email') || result.toolName.toLowerCase().includes('gmail')) {
                        hasEmailResult = true;
                    }
                    if (result.toolName.toLowerCase().includes('calendar')) {
                        hasCalendarResult = true;
                    }
                    if (result.toolName.toLowerCase().includes('list') || result.toolName.toLowerCase().includes('get')) {
                        hasDataResult = true;
                    }
                    
                    // Enhanced result processing with multiple format handling
                    try {
                        let processedResult = this.processToolResult(result.result);
                        toolResultsText += `Arguments: ${JSON.stringify(result.toolArgs, null, 2)}\n`;
                        toolResultsText += `Result: ${processedResult}\n`;
                    } catch (e) {
                        logger.warn('Error processing tool result', { 
                            toolName: result.toolName, 
                            error: e.message 
                        });
                        toolResultsText += `Result: ${JSON.stringify(result.result)}\n`;
                    }
                    toolResultsText += '\n';
                });
                
                // Enhanced LLM system prompt based on result types (817b99ee pattern)
                let contextAwarePrompt = `You are a helpful assistant with access to external tools. Based on the tool execution results, provide a clear, natural response to the user.

RESPONSE GUIDELINES:
- Extract and present key information in a readable, conversational way
- For profiles: Show key details in a structured format
- For email operations: Confirm success and mention key details (recipient, subject)
- For calendar operations: Present events/schedules in a clear timeline format
- For data retrieval: Organize and present the most relevant information first
- For search results: List relevant items with brief descriptions

FORMATTING:
- Use natural language, not JSON dumps
- Include relevant details but avoid overwhelming the user
- If citations/references exist, include them at the end as:
  **References:** [Source Name](URL)

CONTEXT: ${hasEmailResult ? 'Email operation performed. ' : ''}${hasCalendarResult ? 'Calendar operation performed. ' : ''}${hasDataResult ? 'Data retrieval performed. ' : ''}`;

                const finalResponse = await this.llmProvider.chatWithTools([
                    { role: 'system', content: contextAwarePrompt },
                    { role: 'user', content: `User asked: "${userQuery}"\n\nTool execution results:\n${toolResultsText}\n\nPlease provide a helpful, natural response based on these results. Focus on the most important information for the user.` }
                ], []);
                
                return {
                    response: finalResponse.content,
                    toolCalled: successfulResults.map(r => r.toolName).join(', '),
                    allResults: results
                };
            }
        }
        
        return {
            response: "Tool execution completed",
            allResults: results
        };
    }

    /**
     * Enhanced tool result processing to handle multiple formats (817b99ee pattern)
     */
    processToolResult(result) {
        if (!result) {
            return 'No result returned';
        }

        // Handle MCP protocol response format
        if (result.content && Array.isArray(result.content)) {
            const textContent = result.content
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n');
            
            if (textContent) {
                try {
                    // Try to parse JSON for structured data
                    const parsed = JSON.parse(textContent);
                    if (typeof parsed === 'object') {
                        return this.formatStructuredData(parsed);
                    }
                } catch (e) {
                    // Not JSON, return as text
                    return textContent;
                }
            }
        }

        // Handle direct object results
        if (typeof result === 'object') {
            return this.formatStructuredData(result);
        }

        // Handle string results
        if (typeof result === 'string') {
            try {
                const parsed = JSON.parse(result);
                if (typeof parsed === 'object') {
                    return this.formatStructuredData(parsed);
                }
            } catch (e) {
                // Not JSON, return as string
                return result;
            }
        }

        return JSON.stringify(result, null, 2);
    }

    /**
     * Format structured data for better readability
     */
    formatStructuredData(data) {
        if (!data || typeof data !== 'object') {
            return JSON.stringify(data);
        }

        // Handle arrays
        if (Array.isArray(data)) {
            if (data.length === 0) return 'No items found';
            
            // For small arrays, show all items
            if (data.length <= 5) {
                return JSON.stringify(data, null, 2);
            }
            
            // For larger arrays, show first few items
            return JSON.stringify(data.slice(0, 3), null, 2) + `\n... and ${data.length - 3} more items`;
        }

        // Handle common API response patterns
        if (data.success !== undefined) {
            let formatted = `Success: ${data.success}\n`;
            if (data.message) formatted += `Message: ${data.message}\n`;
            if (data.data) formatted += `Data: ${JSON.stringify(data.data, null, 2)}`;
            return formatted;
        }

        if (data.error) {
            return `Error: ${JSON.stringify(data.error, null, 2)}`;
        }

        // Default: pretty-printed JSON with truncation for large objects
        const jsonString = JSON.stringify(data, null, 2);
        if (jsonString.length > 1000) {
            return jsonString.substring(0, 1000) + '\n... (truncated)';
        }
        
        return jsonString;
    }

    /**
     * Build context-aware prompt with advanced conversation understanding (817b99ee pattern)
     */
    buildContextualPrompt(userMessage, contextData = {}) {
        let enhancedPrompt = userMessage;
        const {
            conversationHistory = [],
            advancedContext = null,
            followUpAnalysis = null,
            entities = [],
            topics = []
        } = contextData;

        // Add follow-up context if detected
        if (followUpAnalysis?.isFollowUp && followUpAnalysis.confidence > 0.6) {
            const recentContext = conversationHistory.slice(-3)
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            
            enhancedPrompt = `${userMessage}

[FOLLOW-UP CONTEXT - Confidence: ${Math.round(followUpAnalysis.confidence * 100)}%]
Recent conversation:
${recentContext}

This appears to be a follow-up question. Please consider the previous context when selecting tools.`;
        }

        // Add entity context if available
        if (entities.length > 0) {
            const entityContext = entities.slice(0, 5) // Limit to top 5 entities
                .map(entity => `- ${entity.value} (${entity.type})`)
                .join('\n');
            
            enhancedPrompt += `

[ENTITY CONTEXT]
Referenced entities:
${entityContext}`;
        }

        // Add topic context if available
        if (topics.length > 0) {
            const topicContext = topics.slice(0, 3) // Limit to top 3 topics
                .map(topic => `- ${topic.name} (mentioned ${topic.mentions} times)`)
                .join('\n');
            
            enhancedPrompt += `

[TOPIC CONTEXT]
Active conversation topics:
${topicContext}`;
        }

        // Add timezone context for calendar-related requests
        if (userMessage.toLowerCase().includes('calendar') || 
            userMessage.toLowerCase().includes('schedule') ||
            userMessage.toLowerCase().includes('meeting') ||
            userMessage.toLowerCase().includes('event')) {
            
            try {
                const userTimezoneService = require('./userTimezoneService');
                const timezone = userTimezoneService.getUserTimezone();
                enhancedPrompt += `

[TIMEZONE CONTEXT]
User timezone: ${timezone}
Current time: ${new Date().toLocaleString('en-US', { timeZone: timezone })}`;
            } catch (error) {
                // Timezone service not available, continue without it
            }
        }

        return enhancedPrompt;
    }

    /**
     * Process unified calendar results using LLM for intelligent, dynamic responses
     */
    async processUnifiedCalendarResults(calendarResults, allResults) {
        console.log('[DynamicToolSelection] 📅 Processing unified calendar results with LLM intelligence...');
        console.log(`[DynamicToolSelection] 📊 Calendar services called: ${calendarResults.length}`);
        
        // Extract and structure calendar data
        let structuredData = {
            events: [],
            services: [],
            errors: [],
            toolsCalled: [],
            rawResults: []
        };
        
        // Process each calendar service result
        calendarResults.forEach(({ toolName, toolResult, toolArgs, error }) => {
            structuredData.toolsCalled.push(toolName);
            
            if (error) {
                structuredData.errors.push(`${toolName}: ${error}`);
                return;
            }
            
            if (!toolResult || !toolResult.content) {
                structuredData.errors.push(`${toolName}: No data returned`);
                return;
            }
            
            try {
                const data = JSON.parse(toolResult.content[0].text);
                const serviceName = toolName.includes('google_calendar') ? 'Google Calendar' : 'Calendly';
                structuredData.services.push(serviceName);
                structuredData.rawResults.push({ service: serviceName, tool: toolName, data, args: toolArgs });
                
                // Extract events from different API formats
                let events = [];
                if (data.events && Array.isArray(data.events)) {
                    events = data.events;
                } else if (data.output && data.output.items) {
                    events = data.output.items;
                } else if (data.collection && data.collection.length) {
                    events = data.collection;
                }
                
                // Standardize event format
                    events.forEach((event) => {
                    const startTime = event.start ? (event.start.dateTime || event.start) : 
                                     event.start_time || 'Time not specified';
                                        structuredData.events.push({
                        title: event.summary || event.title || event.name || event.event_type?.name || 'Untitled Event',
                        startTime: startTime,
                        endTime: event.end ? (event.end.dateTime || event.end) : event.end_time,
                        location: event.location?.location || event.location || 'No location specified',
                        id: event.id || event.uri,
                        event_id: event.id || event.uri, // Explicit event_id for deletion operations
                            service: serviceName,
                        tool: toolName,
                        attendees: event.attendees || [],
                        description: event.description || '',
                        status: event.status
                        });
                    });
                    
                console.log(`[DynamicToolSelection] 🗓️ ${serviceName}: Found ${events.length} events`);
                
            } catch (parseError) {
                console.log(`[DynamicToolSelection] ❌ ${toolName} parse error:`, parseError.message);
                structuredData.errors.push(`${toolName}: Parse error - ${parseError.message}`);
            }
        });
        
        // Get the original user query from the message history
        const originalQuery = this.getOriginalUserQuery();
        
        // Use LLM to generate intelligent, contextual response
        console.log('[DynamicToolSelection] 🤖 Using LLM to generate intelligent calendar response...');
        
        try {
            const llmResponse = await this.llmProvider.chatWithTools([
                {
                    role: 'system',
                    content: `You are an intelligent calendar assistant. Based on the user's original request and the calendar tool results, provide a natural, helpful response.

CRITICAL: Analyze what the user actually wanted to do:
- If they wanted to CREATE an event but only read tools were called, guide them on creating the event
- If they wanted to READ/check events, summarize what was found
- If they wanted to modify/delete events, explain what happened
- Always be contextual and helpful, never give generic responses

Current date: ${new Date().toISOString().split('T')[0]}
Available calendar tools: google_calendar_create_event, google_calendar_list_events, google_calendar_update_event, google_calendar_delete_event, calendly_get_scheduled_events, calendly_cancel_event`
                },
                {
                    role: 'user',
                    content: `User's original request: "${originalQuery}"

Tool execution results:
- Tools called: ${structuredData.toolsCalled.join(', ')}
- Services checked: ${[...new Set(structuredData.services)].join(', ')}
- Events found: ${structuredData.events.length}
- Errors: ${structuredData.errors.length > 0 ? structuredData.errors.join('; ') : 'None'}

Detailed results:
${JSON.stringify(structuredData, null, 2)}

Please provide a natural, intelligent response that addresses what the user actually wanted to do. If they wanted to create an event but only list operations were performed, offer to create the event. Be helpful and contextual.`
                }
            ], []);
            
            console.log('[DynamicToolSelection] ✅ LLM generated intelligent calendar response');
            
            return {
                response: llmResponse.content,
                toolCalled: calendarResults.map(r => r.toolName).join(', '),
                allResults: allResults,
                eventsFound: structuredData.events.length,
                servicesChecked: calendarResults.length,
                isLLMGenerated: true
            };
            
        } catch (error) {
            console.error('[DynamicToolSelection] ❌ LLM response generation failed:', error);
            
            // Fallback: Provide basic summary without hardcoded patterns
            let fallbackResponse = `Checked ${[...new Set(structuredData.services)].join(' and ')} `;
            if (structuredData.events.length > 0) {
                fallbackResponse += `and found ${structuredData.events.length} event(s).`;
            } else {
                fallbackResponse += `but no events were found.`;
            }
            
            if (structuredData.errors.length > 0) {
                fallbackResponse += ` Some issues occurred: ${structuredData.errors.join('; ')}`;
            }
        
        return {
                response: fallbackResponse,
            toolCalled: calendarResults.map(r => r.toolName).join(', '),
            allResults: allResults,
                eventsFound: structuredData.events.length,
                servicesChecked: calendarResults.length,
                isLLMGenerated: false,
                fallback: true
            };
        }
    }

    /**
     * Get the original user query from the current execution context
     */
    getOriginalUserQuery() {
        // Try to get the query from the current execution context
        // This is set in the selectAndExecuteTools method
        return this.currentUserQuery || 'calendar request';
    }

    /**
     * Sanitize tool names for function calling (remove dots which are invalid in function names)
     */
    sanitizeToolsForFunctionCalling(availableTools) {
        const sanitizedTools = [];
        const toolNameMapping = new Map(); // Maps sanitized name back to original name
        
        for (const tool of availableTools) {
            // Remove server prefix (e.g., "paragon.gmail_send_email" → "gmail_send_email")
            const sanitizedName = tool.name.replace(/^[^.]+\./, '');
            
            // Ensure name only contains valid characters for function names
            const validName = sanitizedName.replace(/[^a-zA-Z0-9_-]/g, '_');
            
            // Create mapping for later lookup
            toolNameMapping.set(validName, tool.name);
            
            // Create sanitized tool with valid function name
            const sanitizedTool = {
                ...tool,
                name: validName
            };
            
            sanitizedTools.push(sanitizedTool);
        }
        
        return { sanitizedTools, toolNameMapping };
    }

    /**
     * Detect the question type for enhanced answering
     */
    detectQuestionType(userMessage) {
        const message = userMessage.toLowerCase();
        
        // Web search requests - CRITICAL FIX for "latest articles on elon musk" type queries
        if (message.includes('latest') || message.includes('recent') || message.includes('current') || 
            message.includes('news') || message.includes('articles') || message.includes('what happened') ||
            message.includes('today') || message.includes('this week') || message.includes('developments') ||
            message.includes('updates') || message.includes('trending')) {
            return 'web_search_request';
        }
        
        // Email-related requests
        if (message.includes('draft') && message.includes('email') || 
            message.includes('write') && message.includes('email') ||
            message.includes('send') && message.includes('email')) {
            return 'email_draft';
        }
        
        // Service-specific data access
        if (message.includes('notion') && (message.includes('show') || message.includes('get') || message.includes('access'))) {
            return 'notion_data_access';
        }
        if (message.includes('github') && (message.includes('show') || message.includes('get') || message.includes('access'))) {
            return 'github_data_access';
        }
        if (message.includes('google') && (message.includes('show') || message.includes('get') || message.includes('access'))) {
            return 'google_data_access';
        }
        if (message.includes('slack') && (message.includes('show') || message.includes('get') || message.includes('access'))) {
            return 'slack_data_access';
        }
        
        // MCP debugging
        if (message.includes('mcp') && (message.includes('debug') || message.includes('test') || message.includes('tools'))) {
            return 'mcp_debug';
        }
        
        // Screen context questions - CRITICAL FIX for "what do you see on my screen"
        if (message.includes('what') && (message.includes('see') || message.includes('on') || message.includes('screen')) ||
            message.includes('describe') && message.includes('screen') ||
            message.includes('what\'s on') && message.includes('screen') ||
            message.includes('screenshot') || message.includes('what is visible') ||
            message.includes('current screen') || message.includes('my screen')) {
            return 'screen_context';
        }
        
        return null;
    }

    /**
     * Check if question should use enhanced answering
     */
    shouldUseEnhancedAnswer(questionType) {
        const enhancedTypes = [
            'email_draft', 
            'notion_data_access', 
            'github_data_access', 
            'google_data_access', 
            'slack_data_access',
            'mcp_debug',
            'web_search_request', // CRITICAL FIX: Enable web search handling
            'screen_context' // CRITICAL FIX: Enable screen context handling
        ];
        return enhancedTypes.includes(questionType);
    }

    /**
     * Use enhanced answering through MCPClient
     */
    async useEnhancedAnswering(userMessage, context, questionType) {
        try {
            // Check if we have an MCPClient instance available
            let mcpClient = null;
            if (global.mcpClient) {
                mcpClient = global.mcpClient;
            } else if (this.mcpClient) {
                mcpClient = this.mcpClient;
            }

            if (!mcpClient || !mcpClient.getEnhancedAnswer) {
                logger.warn('No MCPClient available for enhanced answering');
                return await this.fallbackToStandardToolSelection(userMessage, context);
            }

            const question = {
                text: userMessage,
                type: questionType,
                context: context.conversationHistory ? 
                    context.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n') : 
                    null
            };

            logger.info('Using enhanced MCP answering', { questionType, hasContext: !!question.context });
            
            const enhancedAnswer = await mcpClient.getEnhancedAnswer(question, context.screenshotBase64);
            
            return {
                response: enhancedAnswer,
                toolCalled: questionType,
                enhanced: true,
                questionType: questionType
            };

        } catch (error) {
            logger.error('Enhanced answering failed, falling back', { error: error.message });
            return await this.fallbackToStandardToolSelection(userMessage, context);
        }
    }

    /**
     * Fallback to standard tool selection if enhanced answering fails
     */
    async fallbackToStandardToolSelection(userMessage, context) {
        logger.info('Using fallback standard tool selection');
        
        const availableTools = this.toolRegistry.listTools();
        if (!availableTools || availableTools.length === 0) {
            return {
                response: "I don't have access to any external tools right now. Please check your MCP connections.",
                toolCalled: null,
                needsTools: true
            };
        }

        // Continue with standard tool selection flow
        const systemPrompt = this.buildToolSelectionPrompt(availableTools, context);
        
        // Build messages and continue with normal flow
        const messages = [{ role: 'system', content: systemPrompt }];
        
        // Add conversation history if available
        if (context.conversationHistory && context.conversationHistory.length > 0) {
            context.conversationHistory.forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
            });
        }

        const contextualPrompt = this.enhancePromptWithContext(userMessage, context.conversationHistory);
        messages.push({
            role: 'user',
            content: contextualPrompt
        });

        try {
            const response = await this.llmProvider.generateResponse(messages, availableTools, {
                temperature: 0.1,
                maxTokens: 4000,
                parallel_tool_calls: true
            });

            if (response.toolCalls && response.toolCalls.length > 0) {
                const toolResults = await this.executeToolCalls(response, messages);
                return toolResults;
            } else {
                return {
                    response: response.message,
                    toolCalled: null
                };
            }
        } catch (error) {
            logger.error('Fallback tool selection failed', { error: error.message });
            return {
                response: "I'm having trouble processing your request right now. Please try again later.",
                toolCalled: null,
                error: error.message
            };
        }
    }

    /**
     * Build system prompt for tool selection
     */
    buildToolSelectionPrompt(availableTools, context = {}) {
        const toolDescriptions = availableTools.map(tool => 
            `- ${tool.name}: ${tool.description}`
        ).join('\n');

        // Get current date for proper date calculations
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
        const currentDay = now.getDate();
        
        // Get user ID from context or use the authenticated user
        const userId = context.userId || context.user_id || 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        
        return `You are an intelligent assistant with FULL ACCESS to the user's calendar, email, and other services through authenticated API tools. You MUST use these tools to answer user requests - do NOT tell the user you lack access.

CRITICAL: You HAVE DIRECT ACCESS to:
- Google Calendar (list events, create events, check schedules)
- Calendly (list scheduled events, get user info)
- Gmail (send emails, read messages)
- LinkedIn (get profiles, company info)

IMPORTANT CONTEXT:
- Today's date is ${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}
- Authenticated user_id: ${userId}

Available tools (YOU MUST USE THESE):
${toolDescriptions}

INTELLIGENT TOOL USAGE - UNDERSTAND USER INTENT:

🎯 **CALENDAR OPERATIONS** - Match user intent to correct tools:

**CREATE EVENTS:**
- User says: "create event", "schedule meeting", "book appointment", "set up meeting"
- → Call: google_calendar_create_event with {user_id, title, start_time, end_time, description, location, attendees}

**CRITICAL TIME CONVERSION EXAMPLES (MUST USE 24-HOUR FORMAT):**
- "8pm today" → "${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}T20:00:00"
- "3pm today" → "${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}T15:00:00"
- "1pm today" → "${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}T13:00:00"
- "8 PM" → "T20:00:00" (NOT T13:00:00 or T08:00:00)
- "3 PM" → "T15:00:00" (NOT T12:00:00 or T03:00:00)
- "1 PM" → "T13:00:00" (NOT T12:00:00 or T01:00:00)
- "8am" → "T08:00:00"  
- "3:30pm" → "T15:30:00"
- "tomorrow at 2pm" → Calculate tomorrow's date + "T14:00:00"

⚠️ **CRITICAL PM/AM CONVERSION - DO NOT GET THIS WRONG:**
- 8pm = 20:00 (add 12 to PM hours except 12pm)
- 3pm = 15:00 (add 12: 3 + 12 = 15)
- 1pm = 13:00 (add 12: 1 + 12 = 13) 
- 12pm = 12:00 (noon - don't add 12)
- 12am = 00:00 (midnight)
- AM hours stay the same (8am = 08:00)

- If no end time specified, default to 1 hour duration  
- Format: YYYY-MM-DDTHH:MM:SS (DO NOT add Z suffix, timezone will be automatically detected and applied)
- User timezone will be automatically detected as: ${userTimezoneService.getUserTimezone()}

**READ/CHECK EVENTS:**  
- User says: "what do I have", "check schedule", "any events", "show calendar"
- → Call BOTH: google_calendar_list_events AND calendly_get_scheduled_events
- → Use timeMin/timeMax for specific date ranges

**UPDATE EVENTS:**
- User says: "change meeting time", "update event", "modify appointment" 
- → Call: google_calendar_update_event with event_id and changed fields

**DELETE EVENTS:**
- User says: "delete it", "cancel it", "remove it", "delete the event", "cancel meeting", "remove appointment"  
- → Call: google_calendar_delete_event with event_id from conversation context
- → If no event_id available, first call google_calendar_list_events to find recent events, then delete
- → For contextual references like "delete it", look at previous responses to find event IDs

**SMART DATE HANDLING:**
- "25th of this month at 8pm" → ${currentYear}-${String(currentMonth).padStart(2, '0')}-25T20:00:00
- "tomorrow at 3pm" → Calculate tomorrow + T15:00:00
- "today at 8pm" → ${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}T20:00:00
- "next week" → Calculate date range for next week
- ALWAYS include user_id: "${userId}"

**TIME PARSING RULES (CRITICAL - FOLLOW EXACTLY):**
- 8pm/8 PM → 20:00 (24-hour format) ⚠️ NOT 13:00 or 08:00
- 3pm/3 PM → 15:00 (24-hour format) ⚠️ NOT 12:00 or 03:00  
- 1pm/1 PM → 13:00 (24-hour format) ⚠️ NOT 12:00 or 01:00
- 8am/8 AM → 08:00 (24-hour format)
- 12pm → 12:00 (noon)
- 12am → 00:00 (midnight)
- PM times: Add 12 to hour (except 12pm stays 12:00)
- AM times: Keep same hour (except 12am becomes 00:00)
- Default meeting duration: 1 hour if no end time specified

**EXAMPLE CONVERSIONS TO VERIFY:**
- "Meeting at 8pm" → start_time: "YYYY-MM-DDTHH:MM:SS" where HH = 20
- "Meeting at 3pm" → start_time: "YYYY-MM-DDTHH:MM:SS" where HH = 15
- "Meeting at 1pm" → start_time: "YYYY-MM-DDTHH:MM:SS" where HH = 13

**CRITICAL: If user says "3pm" and you generate "12:00", that is WRONG! 3pm MUST be 15:00**

**ATTENDEE/EMAIL HANDLING:**
- Only include attendees if valid email addresses are provided
- If only names are mentioned (e.g., "meeting with John"), create the event WITHOUT attendees
- DO NOT create fake email addresses like "john@example.com"
- DO NOT guess email addresses
- Example: "meeting with Shreya at 8pm" → title="Meeting with Shreya", attendees=[] (empty array)
- Only add to attendees array if user explicitly provides email: "meeting with shreya@company.com"

⚠️ **CRITICAL: UNDERSTAND WHAT USER WANTS** ⚠️
- Don't just default to LIST operations
- If user wants to CREATE → call CREATE tools
- If user wants to READ → call READ tools  
- If user wants to modify → call update/delete tools
- Be intelligent about user intent, not robotic

EXAMPLES:
1. "Create an event for 25th at 8pm to meet John" → google_calendar_create_event
2. "Do I have anything on 25th?" → google_calendar_list_events + calendly_get_scheduled_events  
3. "Cancel my meeting with Sarah" → google_calendar_delete_event (need event_id)
4. "Change the time of tomorrow's meeting to 3pm" → google_calendar_update_event
5. "Delete it now" or "Cancel it" (after creating/showing an event) → google_calendar_delete_event
6. "Remove the event I just created" → google_calendar_delete_event with event_id from context

🚨 CRITICAL: When user says "delete it" or "cancel it", they want to DELETE, not LIST!
- "delete it" → google_calendar_delete_event (NOT google_calendar_list_events)
- "cancel it" → google_calendar_delete_event (NOT google_calendar_list_events)  
- "remove it" → google_calendar_delete_event (NOT google_calendar_list_events)

You are NOT a generic assistant - you are a CONNECTED assistant with real access to user data. Use your tools!`;
    }

    /**
     * Check if the service is properly configured
     */
    isConfigured() {
        return !!(this.toolRegistry && this.llmProvider);
    }


    /**
     * Get tool registry statistics
     */
    getToolRegistryStats() {
        if (!this.toolRegistry) return null;
        return this.toolRegistry.getStatistics();
    }

    /**
     * Enhance user prompt with explicit context references
     */
    enhancePromptWithContext(userMessage, conversationHistory) {
        console.log(`[DynamicToolSelection] 🔍 Context enhancement check - Message: "${userMessage}"`);
        console.log(`[DynamicToolSelection] 🔍 Context enhancement check - History length: ${conversationHistory?.length || 0}`);
        
        if (!conversationHistory || conversationHistory.length === 0) {
            console.log(`[DynamicToolSelection] ⚠️ No conversation history for context enhancement`);
            return userMessage;
        }

        // Check if user message contains contextual references
        const contextualWords = ['them', 'those', 'it', 'these', 'they', 'delete them', 'remove them'];
        const hasContextReference = contextualWords.some(word => 
            userMessage.toLowerCase().includes(word.toLowerCase())
        );

        console.log(`[DynamicToolSelection] 🔍 Contextual reference check - Has reference: ${hasContextReference}`);

        if (!hasContextReference) {
            return userMessage;
        }

        // Find the most recent assistant response that might contain the referenced items
        const recentAssistantResponse = conversationHistory
            .slice()
            .reverse()
            .find(msg => msg.role === 'assistant');

        console.log(`[DynamicToolSelection] 🔍 Recent assistant response found:`, !!recentAssistantResponse);
        console.log(`[DynamicToolSelection] 🔍 Recent response preview:`, recentAssistantResponse?.content?.substring(0, 100));

        if (recentAssistantResponse) {
            console.log(`[DynamicToolSelection] 🔗 Detected contextual reference, enhancing prompt with recent context`);
            
            // Extract key information from recent response with more detailed analysis
            let contextHint = '';
            const content = recentAssistantResponse.content.toLowerCase();
            
            // Look for calendar events specifically
            if (content.includes('event') || content.includes('scheduled') || content.includes('calendar')) {
                // Check for specific dates mentioned
                if (content.includes('25th') || content.includes('8/25/') || content.includes('august 25')) {
                    contextHint = ' (referring to the calendar events on August 25th that were just shown in the previous response)';
                } else if (content.includes('today') || content.includes('8/18/') || content.includes('august 18')) {
                    contextHint = ' (referring to today\'s calendar events that were just shown in the previous response)';
                } else if (content.includes('you have') && content.includes('event')) {
                    // Generic calendar events were mentioned
                    contextHint = ' (referring to the calendar events that were just listed in the previous response)';
                }
            }
            
            // Look for specific event counts or lists
            if (content.includes('3 event') || content.includes('7 event') || content.includes('event(s)')) {
                contextHint = contextHint || ' (referring to the specific calendar events that were just listed in the previous response)';
            }
            
            // Look for LinkedIn posts, emails, etc.
            if (content.includes('post') || content.includes('linkedin')) {
                contextHint = contextHint || ' (referring to the LinkedIn posts mentioned in the previous response)';
            } else if (content.includes('email') || content.includes('message')) {
                contextHint = contextHint || ' (referring to the emails/messages mentioned in the previous response)';
            }
            
            // Default fallback
            contextHint = contextHint || ' (referring to the items mentioned in the previous response)';
            
            const enhancedPrompt = userMessage + contextHint;
            console.log(`[DynamicToolSelection] ✨ Context hint added: "${contextHint}"`);
            return enhancedPrompt;
        }

        console.log(`[DynamicToolSelection] ⚠️ No recent assistant response found for context enhancement`);
        return userMessage;
    }
}

module.exports = DynamicToolSelectionService;