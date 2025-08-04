/**
 * MCP UI Integration Service
 * Provides contextual MCP UI actions throughout the application
 */

const { EventEmitter } = require('events');
const { UIResourceGenerator } = require('../mcp-ui/utils/UIResourceGenerator');

class MCPUIIntegrationService extends EventEmitter {
  constructor() {
    super();
    this.mcpClient = null;
    this.activeActions = new Map();
    this.contextualActions = new Map();
    this.initialize();
  }

  initialize() {
    console.log('[MCPUIIntegrationService] Initializing MCP UI Integration...');
    
    // Register contextual action providers
    this.registerContextualActions();
  }

  /**
   * Set the MCP client instance
   */
  setMCPClient(mcpClient) {
    this.mcpClient = mcpClient;
    console.log('[MCPUIIntegrationService] MCP client set');
  }

  /**
   * Register contextual action providers for different scenarios
   */
  registerContextualActions() {
    // Email actions
    this.contextualActions.set('email', {
      draft: this.createEmailDraftAction.bind(this),
      send: this.createEmailSendAction.bind(this)
    });

    // Meeting actions
    this.contextualActions.set('meeting', {
      schedule: this.createMeetingScheduleAction.bind(this),
      followUp: this.createFollowUpMeetingAction.bind(this)
    });

    // Notes actions
    this.contextualActions.set('notes', {
      save: this.createNoteSaveAction.bind(this),
      summarize: this.createNoteSummarizeAction.bind(this)
    });

    // Note: Specific integration actions removed - now using Paragon for unified access
  }

  /**
   * Get contextual actions based on current state using LLM classification
   */
  async getContextualActions(context) {
    // Check if we have access to LLM services
    if (!global.modelStateService) {
      console.log('[MCPUIIntegrationService] No model state service available');
      return [];
    }

    try {
      // Get available MCP tools to inform the LLM about capabilities
      const availableTools = await this.getAvailableTools();

      // Classify using LLM
      let actions = await this.classifyIntentWithLLM(context, availableTools);

      // Map classification result IDs to dynamic capability IDs
      const dynamicCapabilities = await this.getDynamicCapabilities(availableTools);
      const dynamicByCapability = {};
      for (const [key, cap] of Object.entries(dynamicCapabilities)) {
        dynamicByCapability[cap.capability] = key;
      }
      actions = actions.map(action => {
        if (!dynamicCapabilities[action.id] && action.type) {
          const [, capName] = action.type.split('.');
          const mappedId = dynamicByCapability[capName];
          if (mappedId) {
            action.id = mappedId;
            // Keep action.type unchanged (e.g. 'email.send') so handlers match 'email' category
          }
        }
        return action;
      });
      // Remap email.compose to email.send for handler compatibility
      actions = actions.map(action => {
        if (action.type === 'email.compose') {
          console.log('[MCPUIIntegrationService] Remapping email.compose to email.send');
          action.type = 'email.send';
          action.id = 'gmail-send';
        }
        return action;
      });
      
      // Register actions so executeAction can find them
      this.registerActiveActions('context', actions);

      // Auto-execute high-confidence UI actions
      const autoActions = actions.filter(action => action.confidence > 0.8 && action.autoTrigger);
      for (const action of autoActions) {
        console.log(`[MCPUIIntegrationService] Auto-triggering UI for: ${action.type}`);
        await this.executeAction(action.id, context);
      }

      return actions;
    } catch (error) {
      console.error('[MCPUIIntegrationService] Error in LLM-based action classification:', error);
      return [];
    }
  }

  /**
   * Use LLM to classify user intent and determine relevant MCP actions
   */
  async classifyIntentWithLLM(context, availableTools) {
    try {
      // Get LLM provider for classification
      const provider = await this.getLLMProvider();
      if (!provider) {
        console.warn('[MCPUIIntegrationService] No LLM provider available for classification');
        return [];
      }

      // Build system prompt that describes available MCP capabilities
      const systemPrompt = await this.buildMCPCapabilitiesPrompt(availableTools, context);
      
      // Build user message with context
      const userMessage = `Analyze this conversation for UI triggers:
      
User said: "${context.message}"
Assistant response: "${context.response || 'Processing...'}"

Should any interactive UI be triggered? Focus on clear intent patterns:
- Email words: "send email", "email someone", "compose", "write to"
- Calendar words: "schedule", "book meeting", "calendar"
- Document words: "save to notion", "take notes"

Return JSON array with detected actions.`;

      console.log('[MCPUIIntegrationService] 🤖 LLM Classification Request:');
      console.log('User message:', context.message);
      console.log('Available tools:', Object.keys(availableTools).filter(k => availableTools[k]));

      // Make LLM request for action classification via chat interface
      const llmResponse = await provider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]);
      
      console.log('[MCPUIIntegrationService] 🤖 LLM Raw Response:', llmResponse);
      
      // Parse the returned content string to extract action recommendations
      const actions = this.parseLLMActionResponse(llmResponse);
      
      console.log('[MCPUIIntegrationService] 🎯 Parsed Actions:', actions);
      
      return actions;
    } catch (error) {
      console.error('[MCPUIIntegrationService] Error in LLM classification:', error);
      
      // Fallback: simple keyword-based detection if LLM fails
      return this.fallbackIntentDetection(context, availableTools);
    }
  }

  /**
   * Build system prompt that describes MCP capabilities
   */
  async buildMCPCapabilitiesPrompt(availableTools, context) {
    // Get dynamic capabilities from OAuth registry instead of hardcoded ones
    const dynamicCapabilities = await this.getDynamicCapabilities(availableTools);
    
    const capabilitiesText = Object.entries(dynamicCapabilities).map(([key, cap]) => 
      `- ${cap.label}: ${cap.description} (available: ${cap.available ? '✅' : '❌'})`
    ).join('\n');

    const connectedServices = Object.entries(availableTools)
      .map(([service, available]) => `${available ? '✅' : '❌'} ${service}`)
      .join(', ');

    return `You are analyzing user messages to determine when interactive UI components should be triggered.

Available MCP capabilities:
${capabilitiesText}

Connected services: ${connectedServices}

Analyze the user's message and conversation context to identify if any interactive UI should be triggered. Look for:

1. **Email Intent**: "send email", "email someone", "compose email", "write to [person]"
   - Extract recipients if mentioned (names, email addresses)
   - Extract subject if mentioned
   - Extract or generate draft content based on conversation context

2. **Calendar Intent**: "book meeting", "schedule", "calendar", "set appointment"
   - Extract meeting details if mentioned

3. **Document Intent**: "save to notion", "create document", "take notes"
   - Extract content to be saved

4. **Other tool usage**: Based on available capabilities

For each detected intent, extract specific context details to pre-populate the UI.

Current conversation context:
- Message: "${context.message}"
- Response: "${context.response || 'No response yet'}"
- Has screenshot: ${context.hasScreenshot || false}

Return a JSON array of actions with this structure:
[
  {
    "id": "action-identifier",
    "type": "category.action", 
    "confidence": 0.85,
    "autoTrigger": true,
    "context": {
      "recipients": "extracted email addresses or names",
      "subject": "extracted or suggested subject",
      "body": "draft content based on conversation context",
      "title": "for documents/meetings",
      "description": "additional context"
    }
  }
]

Only include actions with confidence > 0.8 and autoTrigger: true for immediate UI display.
Return [] if no high-confidence UI triggers are detected.`;
  }

  /**
   * Get dynamic capabilities from OAuth services registry
   */
  async getDynamicCapabilities(availableTools) {
    const capabilities = {};
    
    try {
      // Load OAuth services registry if not already loaded
      if (!this.oauthRegistry) {
        const fs = require('fs').promises;
        const path = require('path');
        const registryPath = path.join(__dirname, '../../config/oauth-services-registry.json');
        const registryContent = await fs.readFile(registryPath, 'utf-8');
        this.oauthRegistry = JSON.parse(registryContent);
      }

      // Generate capabilities dynamically from registry
      for (const [serviceKey, service] of Object.entries(this.oauthRegistry.services)) {
        if (!service.enabled) continue;

        const isAvailable = availableTools[serviceKey] || false;
        
        // Generate actions based on service capabilities
        if (service.capabilities) {
          for (const capability of service.capabilities) {
            const actionId = `${serviceKey}-${capability}`;
            
            capabilities[actionId] = {
              id: actionId,
              label: this.generateActionLabel(serviceKey, capability, service.name),
              description: this.generateActionDescription(serviceKey, capability, service.description),
              type: `${serviceKey}.${capability}`,
              service: serviceKey,
              capability: capability,
              available: isAvailable,
              triggers: this.generateTriggerWords(serviceKey, capability)
            };
          }
        }
      }
      
      console.log(`[MCPUIIntegrationService] Generated ${Object.keys(capabilities).length} dynamic capabilities from registry`);
      return capabilities;
      
    } catch (error) {
      console.error('[MCPUIIntegrationService] Error loading dynamic capabilities:', error);
      
      // Fallback to minimal hardcoded capabilities if registry fails
      return {
        'email-send': {
          id: 'send-email',
          label: '📧 Send Email',
          description: 'Compose and send emails',
          available: availableTools.email || false
        }
      };
    }
  }

  /**
   * Generate action label with appropriate emoji
   */
  generateActionLabel(serviceKey, capability, serviceName) {
    const emojiMap = {
      // Communication
      email: '📧', compose: '📧', send: '📤', message: '💬',
      // Calendar & Time
      calendar: '📅', schedule: '📅', event: '📅', meeting: '🤝', appointment: '⏰',
      // Documents & Content
      documents: '📄', docs: '📄', sheets: '📊', drive: '💾', files: '📁',
      pages: '📝', content: '📝', notes: '📝', write: '✍️',
      // Tasks & Productivity
      tasks: '✅', todo: '✅', projects: '📋', workspace: '🏢',
      // Search & Discovery
      search: '🔍', find: '🔍', lookup: '🔍', discover: '🔍',
      // Storage & Management
      save: '💾', store: '🗄️', manage: '⚙️', organize: '📂'
    };

    const emoji = emojiMap[capability] || emojiMap[serviceKey] || '🔧';
    const action = capability.charAt(0).toUpperCase() + capability.slice(1);
    
    return `${emoji} ${action} (${serviceName})`;
  }

  /**
   * Generate action description
   */
  generateActionDescription(serviceKey, capability, serviceDescription) {
    const actionTemplates = {
      send: `Send content via ${serviceDescription}`,
      compose: `Compose content in ${serviceDescription}`,
      create: `Create new items in ${serviceDescription}`,
      schedule: `Schedule events using ${serviceDescription}`,
      search: `Search content in ${serviceDescription}`,
      save: `Save content to ${serviceDescription}`,
      manage: `Manage items in ${serviceDescription}`,
      read: `Read content from ${serviceDescription}`,
      write: `Write content to ${serviceDescription}`
    };

    return actionTemplates[capability] || `${capability} using ${serviceDescription}`;
  }

  /**
   * Generate trigger words for LLM classification
   */
  generateTriggerWords(serviceKey, capability) {
    const baseWords = [serviceKey, capability];
    
    const wordMap = {
      email: ['email', 'send', 'compose', 'message', 'contact', 'reach out'],
      gmail: ['email', 'send', 'compose', 'message', 'contact', 'reach out'],
      calendar: ['meeting', 'calendar', 'schedule', 'appointment', 'book', 'plan', 'time'],
      notion: ['notion', 'save', 'notes', 'document', 'write', 'record'],
      drive: ['drive', 'file', 'upload', 'save', 'store', 'document'],
      tasks: ['task', 'todo', 'remind', 'list', 'complete', 'done']
    };

    const serviceWords = wordMap[serviceKey] || [];
    const capabilityWords = wordMap[capability] || [];
    
    return [...new Set([...baseWords, ...serviceWords, ...capabilityWords])];
  }

  /**
   * Build context message for LLM classification
   */
  buildContextMessage(context) {
    let message = `User message: "${context.message || ''}"`;
    
    if (context.type) {
      message += `\nContext type: ${context.type}`;
    }
    
    if (context.history && context.history.length > 0) {
      message += `\nConversation history: ${context.history.length} previous exchanges`;
    }
    
    if (context.response) {
      message += `\nCurrent response context available: ${context.response.substring(0, 100)}...`;
    }
    
    return message;
  }

  /**
   * Get LLM provider for classification (fallback to configured providers)
   */
  async getLLMProvider() {
    if (!this.mcpClient) {
      console.warn('[MCPUIIntegrationService] No MCP client available for LLM provider');
      return null;
    }
    try {
      // Try Anthropic via migration bridge
      const anthKey = await this.mcpClient.getProviderApiKey('anthropic');
      if (anthKey) {
        const { createLLM } = require('../common/ai/providers/anthropic');
        return createLLM({ apiKey: anthKey, model: 'claude-3-5-sonnet-20241022', temperature: 0.1 });
      }
      // Fallback to OpenAI
      const openKey = await this.mcpClient.getProviderApiKey('openai');
      if (openKey) {
        const { createLLM } = require('../common/ai/providers/openai');
        return createLLM({ apiKey: openKey, model: 'gpt-4', temperature: 0.1 });
      }
      // Fallback to Gemini
      const gemKey = await this.mcpClient.getProviderApiKey('gemini');
      if (gemKey) {
        const { createLLM } = require('../common/ai/providers/gemini');
        return createLLM({ apiKey: gemKey, model: 'gemini-pro', temperature: 0.1 });
      }
      console.warn('[MCPUIIntegrationService] No LLM provider available for classification');
      return null;
    } catch (error) {
      console.error('[MCPUIIntegrationService] Error fetching LLM API key:', error);
      return null;
    }
  }

  /**
   * Parse LLM response to extract action recommendations
   */
  parseLLMActionResponse(response) {
    try {
      // Extract content from response
      let content = '';
      if (typeof response === 'string') {
        content = response;
      } else if (response.content) {
        content = response.content;
      } else if (response.message && response.message.content) {
        content = response.message.content;
      }

      console.log('[MCPUIIntegrationService] 📋 Parsing LLM content:', content);

      // Try to parse as JSON
      const jsonMatch = content.match(/\[.*\]/s);
      if (!jsonMatch) {
        console.warn('[MCPUIIntegrationService] No JSON array found in LLM response');
        return [];
      }

      const actions = JSON.parse(jsonMatch[0]);
      
      // Validate and process actions
      return actions.filter(action => {
        const isValid = action.id && action.type && 
          typeof action.confidence === 'number' && 
          action.confidence > 0.8 &&
          action.autoTrigger === true;
        
        if (!isValid) {
          console.warn('[MCPUIIntegrationService] Filtered out invalid action:', action);
        }
        
        return isValid;
      });
    } catch (error) {
      console.error('[MCPUIIntegrationService] Error parsing LLM response:', error);
      return [];
    }
  }

  /**
   * Fallback intent detection for LLM failures
   */
  async fallbackIntentDetection(context, availableTools) {
    console.warn('[MCPUIIntegrationService] Falling back to keyword-based intent detection due to LLM failure.');
    const actions = [];

    // Simple keyword matching for email
    if (context.message && (
      context.message.toLowerCase().includes('send email') ||
      context.message.toLowerCase().includes('email someone') ||
      context.message.toLowerCase().includes('compose email') ||
      context.message.toLowerCase().includes('write to')
    )) {
      actions.push({
        id: 'email-send',
        label: '📧 Send Email',
        type: 'email.send',
        confidence: 0.9,
        autoTrigger: true,
        context: {
          recipients: '', // Will be extracted by LLM if needed
          subject: '', // Will be extracted by LLM if needed
          body: '', // Will be extracted by LLM if needed
          cc: '',
          bcc: ''
        }
      });
    }

    // Simple keyword matching for calendar
    if (context.message && (
      context.message.toLowerCase().includes('schedule') ||
      context.message.toLowerCase().includes('book meeting') ||
      context.message.toLowerCase().includes('calendar') ||
      context.message.toLowerCase().includes('set appointment')
    )) {
      actions.push({
        id: 'meeting-schedule',
        label: '📅 Schedule Meeting',
        type: 'meeting.schedule',
        confidence: 0.9,
        autoTrigger: true,
        context: {
          title: '', // Will be extracted by LLM if needed
          start: '', // Will be extracted by LLM if needed
          duration: 30, // Default
          attendees: [] // Will be extracted by LLM if needed
        }
      });
    }

    // Simple keyword matching for notes
    if (context.message && (
      context.message.toLowerCase().includes('save to notion') ||
      context.message.toLowerCase().includes('take notes') ||
      context.message.toLowerCase().includes('create document')
    )) {
      actions.push({
        id: 'notes-save',
        label: '📝 Save Notes',
        type: 'notes.save',
        confidence: 0.9,
        autoTrigger: true,
        context: {
          title: '', // Will be extracted by LLM if needed
          content: '', // Will be extracted by LLM if needed
          tags: ['notes'], // Default
          workspace: '' // Will be extracted by LLM if needed
        }
      });
    }

    console.log(`[MCPUIIntegrationService] Fallback detected ${actions.length} actions.`);
    return actions;
  }

  /**
   * Get available tools/services and their connection status
   */
  async getAvailableTools() {
    const tools = {};

    try {
      // Load OAuth services registry if not already loaded
      if (!this.oauthRegistry) {
        const fs = require('fs').promises;
        const path = require('path');
        const registryPath = path.join(__dirname, '../../config/oauth-services-registry.json');
        const registryContent = await fs.readFile(registryPath, 'utf-8');
        this.oauthRegistry = JSON.parse(registryContent);
      }

      // Initialize all services as unavailable
      for (const serviceKey of Object.keys(this.oauthRegistry.services)) {
        tools[serviceKey] = false;
      }

      // Check server registry for active servers instead of just tools
      if (this.mcpClient && this.mcpClient.serverRegistry) {
        const serverRegistry = this.mcpClient.serverRegistry;
        
        // Get active servers from the registry
        const activeServers = serverRegistry.getActiveServers ? 
          serverRegistry.getActiveServers() : [];
        
        console.log(`[MCPUIIntegrationService] Active MCP servers:`, 
          activeServers.map(s => s.name || s.serverName || 'unknown'));

        // Match active servers to services
        for (const [serviceKey, service] of Object.entries(this.oauthRegistry.services)) {
          if (!service.enabled) continue;

          // Check if server is active for this service
          tools[serviceKey] = activeServers.some(serverState => {
            const serverName = serverState.name || serverState.serverName || '';
            return serverName.toLowerCase().includes(serviceKey.toLowerCase()) ||
                   serverName.includes('google') && serviceKey === 'google' ||
                   serverName.includes('gmail') && serviceKey === 'google' ||
                   serverName.includes('workspace') && serviceKey === 'google';
          });
        }
        
        // Also check tool registry as fallback
        if (this.mcpClient.toolRegistry) {
          const allTools = await this.mcpClient.toolRegistry.getAllTools();
          
          if (allTools.length > 0) {
            console.log(`[MCPUIIntegrationService] Discovered ${allTools.length} MCP tools:`, 
              allTools.map(t => t.name));

            // Match discovered tools to services using intelligent matching
            for (const [serviceKey, service] of Object.entries(this.oauthRegistry.services)) {
              if (!service.enabled) continue;

              // If server check failed, try tool matching
              if (!tools[serviceKey]) {
                tools[serviceKey] = this.matchToolsToService(allTools, serviceKey, service);
              }
            }
          }
        }
      }

      console.log('[MCPUIIntegrationService] Available tools status:', tools);
    } catch (error) {
      console.error('[MCPUIIntegrationService] Error checking available tools:', error);
    }

    return tools;
  }

  /**
   * Match discovered tools to a service using multiple strategies
   */
  matchToolsToService(discoveredTools, serviceKey, serviceConfig) {
    // Strategy 1: Direct service name matching
    const serviceMatches = discoveredTools.some(tool => 
      tool.name.toLowerCase().includes(serviceKey.toLowerCase()) ||
      (serviceConfig.name && tool.name.toLowerCase().includes(serviceConfig.name.toLowerCase()))
    );

    if (serviceMatches) {
      console.log(`[MCPUIIntegrationService] ✅ ${serviceKey} matched by service name`);
      return true;
    }

    // Strategy 2: Capability-based matching
    if (serviceConfig.capabilities) {
      const capabilityMatches = serviceConfig.capabilities.some(capability =>
        discoveredTools.some(tool => 
          tool.name.toLowerCase().includes(capability.toLowerCase()) ||
          (tool.description && tool.description.toLowerCase().includes(capability.toLowerCase()))
        )
      );

      if (capabilityMatches) {
        console.log(`[MCPUIIntegrationService] ✅ ${serviceKey} matched by capabilities`);
        return true;
      }
    }

    // Strategy 3: Server command matching (for MCP servers)
    if (serviceConfig.serverConfig && serviceConfig.serverConfig.args) {
      const serverMatches = serviceConfig.serverConfig.args.some(arg =>
        discoveredTools.some(tool => 
          tool.server && tool.server.toLowerCase().includes(arg.toLowerCase())
        )
      );

      if (serverMatches) {
        console.log(`[MCPUIIntegrationService] ✅ ${serviceKey} matched by server config`);
        return true;
      }
    }

    // Strategy 4: OAuth provider matching (for Google services)
    if (serviceConfig.oauth && serviceConfig.oauth.provider) {
      const providerMatches = discoveredTools.some(tool =>
        tool.name.toLowerCase().includes(serviceConfig.oauth.provider.toLowerCase())
      );

      if (providerMatches) {
        console.log(`[MCPUIIntegrationService] ✅ ${serviceKey} matched by OAuth provider`);
        return true;
      }
    }

    console.log(`[MCPUIIntegrationService] ❌ ${serviceKey} not matched`);
    return false;
  }

  /**
   * Execute a contextual action
   */
  async executeAction(actionId, context) {
    const action = this.findAction(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    const [category, type] = action.type.split('.');
    const handler = this.contextualActions.get(category)?.[type];

    if (!handler) {
      throw new Error(`No handler for action type ${action.type}`);
    }

    // Pass the action-specific context if available
    const actionContext = action.context || context;
    return await handler(action, actionContext);
  }

  /**
   * Email Action Handlers
   */
  async createEmailSendAction(action, context) {
    try {
        const emailData = {
            to: context.recipients || '',
            subject: context.subject || '',
            body: context.body || '',
            cc: context.cc || '',
            bcc: context.bcc || ''
        };

        // Generate email composer UI resource
        const resource = UIResourceGenerator.generateEmailComposer(emailData);
        
        // Use inline form instead of modal for better theme integration
        this.emit('ui-resource-ready', {
            actionId: action.id,
            serverId: 'paragon',
            tool: 'gmail.send',
            context: {
                recipients: context.recipients || '',
                subject: context.subject || '',
                body: context.body || ''
            },
            resource,
            type: 'inline',
            onAction: async (tool, params) => {
                console.log('[MCPUIIntegrationService] OnAction called:', { tool, params });
                
                if (tool === 'gmail.send') {
                    try {
                        // Determine the full tool name with server prefix
                        const activeServers = this.mcpClient.serverRegistry.getActiveServers();
                        const serverName = activeServers[0]?.name || activeServers[0]?.serverName || 'paragon';
                        const fullToolName = `${serverName}.GMAIL_SEND_EMAIL`;
                        
                        console.log('[MCPUIIntegrationService] Using tool:', fullToolName);
                        console.log('[MCPUIIntegrationService] Active servers:', activeServers);
                        
                        // Handle both array and string formats for recipients
                        const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
                        const ccAddresses = Array.isArray(params.cc) ? params.cc : (params.cc ? [params.cc] : []);
                        const bccAddresses = Array.isArray(params.bcc) ? params.bcc : (params.bcc ? [params.bcc] : []);
                        
                        // Use correct Paragon API parameter names
                        const toolParams = {
                            toRecipients: toAddresses.map(addr => ({ emailAddress: { address: addr } })),
                            messageContent: {
                                subject: params.subject,
                                body: {
                                    content: params.body,
                                    contentType: 'text'
                                }
                            }
                        };
                        
                        // Add CC and BCC if present
                        if (ccAddresses.length > 0) {
                            toolParams.ccRecipients = ccAddresses.map(addr => ({ emailAddress: { address: addr } }));
                        }
                        if (bccAddresses.length > 0) {
                            toolParams.bccRecipients = bccAddresses.map(addr => ({ emailAddress: { address: addr } }));
                        }
                        
                        console.log('[MCPUIIntegrationService] Calling MCP tool with params:', toolParams);
                        
                        const result = await this.mcpClient.callTool(fullToolName, toolParams);
                        
                        console.log('[MCPUIIntegrationService] MCP tool result:', result);
                        
                        // Check if the result contains an error
                        if (result.content && result.content[0] && result.content[0].text) {
                            const responseText = result.content[0].text;
                            if (responseText.includes('"error"')) {
                                const errorData = JSON.parse(responseText);
                                throw new Error(`Email sending failed: ${errorData.error}`);
                            }
                        }
                        
                        return { success: true, result };
                    } catch (error) {
                        console.error('[MCPUIIntegrationService] Email sending error:', error);
                        return { success: false, error: error.message };
                    }
                }
            }
        });

        return { success: true, resourceId: resource.resource.uri };
    } catch (error) {
        console.error('[MCPUIIntegrationService] Email sending failed:', error);
        return { success: false, error: error.message };
    }
  }

  async createEmailDraftAction(action, context) {
    // Similar to send but saves as draft
    const result = await this.mcpClient.invokeTool('gmail.createDraft', {
      to: context.recipients,
      subject: context.subject,
      body: context.body
    });
    
    return result;
  }

  /**
   * Meeting Action Handlers
   */
  async createMeetingScheduleAction(action, context) {
    const meetingData = {
      title: context.title || 'New Meeting',
      start: context.start || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: context.duration || 30,
      attendees: context.attendees || []
    };

    // Generate calendar widget UI resource
    const resource = UIResourceGenerator.generateCalendarWidget(meetingData);
    
    this.emit('ui-resource-ready', {
      actionId: action.id,
      serverId: 'google',
      tool: 'google-calendar.createEvent',
      resource,
      type: 'modal',
      onAction: async (tool, params) => {
        if (tool === 'google-calendar.createEvent') {
          return await this.mcpClient.invokeTool('google-calendar.createEvent', params);
        }
      }
    });

    return { success: true, resourceId: resource.resource.uri };
  }

  async createFollowUpMeetingAction(action, context) {
    // Schedule a follow-up meeting based on context
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7); // Default to 1 week later

    return this.createMeetingScheduleAction(action, {
      ...context,
      title: `Follow-up: ${context.originalMeetingTitle || 'Meeting'}`,
      start: followUpDate.toISOString(),
      duration: 30
    });
  }

  /**
   * Notes Action Handlers
   */
  async createNoteSaveAction(action, context) {
    const noteData = {
      title: context.title || `Meeting Notes - ${new Date().toLocaleDateString()}`,
      content: context.content || context.summary || '',
      tags: context.tags || ['meeting-notes'],
      workspace: context.workspace
    };

    // Generate Notion saver UI resource
    const resource = UIResourceGenerator.generateNotionSaver(noteData);
    
    this.emit('ui-resource-ready', {
      actionId: action.id,
      resource,
      type: 'modal',
      onAction: async (tool, params) => {
        if (tool === 'notion.createPage') {
          return await this.mcpClient.invokeTool('notion.createPage', params);
        }
      }
    });

    return { success: true, resourceId: resource.resource.uri };
  }

  async createNoteSummarizeAction(action, context) {
    // Create a summary and save to Notion
    const summary = context.summary || 'No summary available';
    
    return this.createNoteSaveAction(action, {
      ...context,
      title: `Summary - ${context.title || new Date().toLocaleDateString()}`,
      content: summary
    });
  }

  /**
   * Helper methods
   */
  findAction(actionId) {
    for (const [, actions] of this.activeActions) {
      const action = actions.find(a => a.id === actionId);
      if (action) return action;
    }
    return null;
  }

  /**
   * Register active actions for a context
   */
  registerActiveActions(contextId, actions) {
    this.activeActions.set(contextId, actions);
  }

  /**
   * Clear active actions for a context
   */
  clearActiveActions(contextId) {
    this.activeActions.delete(contextId);
  }

  /**
   * Check if MCP tools are available
   */
  async checkToolAvailability() {
    if (!this.mcpClient) return {};

    const tools = await this.mcpClient.toolRegistry.getAllTools();
    const availability = {};

    // Check for email tools
    availability.email = tools.some(t => t.name.includes('gmail'));
    
    // Check for calendar tools
    availability.calendar = tools.some(t => t.name.includes('calendar'));
    
    // Check for Notion tools (now via Paragon)
    availability.notion = tools.some(t => t.name.includes('notion'));

    return availability;
  }
}

// Create singleton instance
const mcpUIIntegrationService = new MCPUIIntegrationService();

module.exports = { 
  MCPUIIntegrationService,
  mcpUIIntegrationService
}; 