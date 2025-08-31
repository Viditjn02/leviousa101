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
            
            // Add recent conversation history if available
            if (context.conversationHistory && context.conversationHistory.length > 0) {
                console.log(`[DynamicToolSelection] 📜 Including ${context.conversationHistory.length} conversation history messages for context`);
                console.log(`[DynamicToolSelection] 🔍 Conversation history preview:`, context.conversationHistory.slice(-2));
                context.conversationHistory.forEach(msg => {
                    if (msg.role === 'user' || msg.role === 'assistant') {
                        messages.push({
                            role: msg.role,
                            content: msg.content
                        });
                    }
                });
            } else {
                console.log(`[DynamicToolSelection] ⚠️ No conversation history available for context`);
            }
            
            // Add current user message with enhanced context understanding
            const contextualPrompt = this.enhancePromptWithContext(userMessage, context.conversationHistory);
            console.log(`[DynamicToolSelection] 🔄 Original prompt: "${userMessage}"`);
            console.log(`[DynamicToolSelection] ✨ Enhanced prompt: "${contextualPrompt}"`);
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
                // Format tool results for LLM
                let toolResultsText = '';
                successfulResults.forEach((result, idx) => {
                    toolResultsText += `\nTool ${idx + 1}: ${result.toolName}\n`;
                    try {
                        if (result.result && result.result.content && result.result.content[0]) {
                            const resultData = result.result.content[0].text;
                            // Try to parse and format JSON responses
                            try {
                                const parsed = JSON.parse(resultData);
                                toolResultsText += `Result: ${JSON.stringify(parsed, null, 2)}\n`;
                            } catch (e) {
                                // If not JSON, use raw text
                                toolResultsText += `Result: ${resultData}\n`;
                            }
                        } else {
                            toolResultsText += `Result: ${JSON.stringify(result.result)}\n`;
                        }
                    } catch (e) {
                        toolResultsText += `Result: ${JSON.stringify(result.result)}\n`;
                    }
                });
                
                const finalResponse = await this.llmProvider.chatWithTools([
                    { role: 'system', content: `You are a helpful assistant. Based on the tool execution results, provide a clear, formatted response to the user. Extract and present the key information in a readable way. For profiles, show key details. For posts/content creation, confirm success. For search results, list relevant items.

IMPORTANT: If the tool results include web search results with citations, you MUST include the reference links at the end of your response. Format them as:

**References:**
1. [Source Name](URL)
2. [Source Name](URL)
etc.

Always include citations when they are provided in the tool results to give users access to the original sources.` },
                    { role: 'user', content: `User asked: "${userQuery}"\n\nTool execution results:${toolResultsText}\n\nPlease provide a helpful response based on these results.` }
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