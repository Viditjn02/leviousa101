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

    // LinkedIn actions
    this.contextualActions.set('linkedin', {
      profile: this.createLinkedInProfileAction.bind(this),
      post: this.createLinkedInPostAction.bind(this),
      connections: this.createLinkedInConnectionsAction.bind(this),
      messaging: this.createLinkedInMessagingAction.bind(this),
      companies: this.createLinkedInCompaniesAction.bind(this),
      skills: this.createLinkedInSkillsAction.bind(this),
      search: this.createLinkedInSearchAction.bind(this),
      job_postings: this.createLinkedInJobsAction.bind(this)
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
      // Remap email action types to email.send for handler compatibility
      actions = actions.map(action => {
        if (action.type === 'email.compose') {
          console.log('[MCPUIIntegrationService] Remapping email.compose to email.send');
          action.type = 'email.send';
          action.id = 'gmail-send';
        } else if (action.type === 'paragon.gmail_send') {
          console.log('[MCPUIIntegrationService] Remapping paragon.gmail_send to email.send');
          action.type = 'email.send';
          action.id = 'gmail-send';
        } else if (action.type === 'gmail.send') {
          console.log('[MCPUIIntegrationService] Remapping gmail.send to email.send');
          action.type = 'email.send';
          action.id = 'gmail-send';
        }
        return action;
      });
      
      // Register actions so executeAction can find them
      this.registerActiveActions('context', actions);

      // Auto-execute high-confidence UI actions
      const autoActions = actions.filter(action => action.confidence > 0.8 && action.autoTrigger);
      console.log(`[MCPUIIntegrationService] 🎯 Found ${autoActions.length} auto-trigger actions:`, autoActions.map(a => a.type));
      
      for (const action of autoActions) {
        console.log(`[MCPUIIntegrationService] Auto-triggering UI for: ${action.type}`);
        await this.executeAction(action.id, context);
      }

      const result = {
        actions,
        autoTriggered: autoActions.length > 0,
        autoTriggeredTypes: autoActions.map(action => action.type)
      };
      
      console.log(`[MCPUIIntegrationService] 📤 Returning result:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('[MCPUIIntegrationService] Error in LLM-based action classification:', error);
      return {
        actions: [],
        autoTriggered: false,
        autoTriggeredTypes: []
      };
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
- LinkedIn words: "linkedin profile", "post on linkedin", "linkedin connections", "professional network"

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
    // Get current user's name from Firebase auth for personalized content
    let userName = '[Your name]'; // fallback
    try {
      const authService = require('../common/services/authService');
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.displayName) {
        userName = currentUser.displayName;
      } else if (currentUser && currentUser.email) {
        // Use email name part if displayName not available
        userName = currentUser.email.split('@')[0];
      }
    } catch (error) {
      console.warn('[MCPUIIntegrationService] Could not get user name:', error);
    }
    
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

4. **LinkedIn Intent**: "linkedin profile", "post on linkedin", "linkedin connections", "professional network"
   - For profile: Extract name or profile details to lookup
   - For posts: Extract content to share
   - For connections: Extract search criteria or networking intent
   - ONLY trigger if "linkedin" is explicitly mentioned in the message

5. **Other tool usage**: Based on available capabilities

For each detected intent, extract specific context details to pre-populate the UI.

**IMPORTANT**: For email actions, you MUST extract and include the following in the action context:
- Recipients: Extract email addresses or names mentioned (look for "to", "send to", "email to", etc.)  
- Subject: Extract any subject mentioned (look for "subject:", "about", "re:", etc.)
- Body: Extract the email content/message (look for quoted text, message content, or main communication intent)

Example email action response:
{
  "id": "email-send",
  "label": "📧 Send Email", 
  "type": "email.send",
  "confidence": 0.95,
  "autoTrigger": true,
  "context": {
    "recipients": "john@example.com",
    "subject": "Meeting Follow-up", 
    "body": "Hi John, Thanks for the great meeting today. I wanted to follow up on the action items we discussed...\\n\\nBest regards,\\n${userName}",
    "cc": "",
    "bcc": ""
  }
}

Example LinkedIn action responses:
{
  "id": "linkedin-profile",
  "label": "👤 View LinkedIn Profile",
  "type": "linkedin.profile",
  "confidence": 0.90,
  "autoTrigger": true,
  "context": {
    "name": "John Smith",
    "company": "Tech Corp",
    "searchQuery": "john smith tech corp"
  }
}

{
  "id": "linkedin-post",
  "label": "📝 Post on LinkedIn",
  "type": "linkedin.posts", 
  "confidence": 0.92,
  "autoTrigger": true,
  "context": {
    "content": "Excited to share our latest product launch!",
    "visibility": "PUBLIC"
  }
}

{
  "id": "linkedin-connections",
  "label": "🤝 View LinkedIn Connections",
  "type": "linkedin.connections",
  "confidence": 0.88,
  "autoTrigger": true,
  "context": {
    "searchCriteria": "colleagues in tech industry"
  }
}

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
Return [] if no high-confidence UI triggers are detected.

IMPORTANT: When generating email content, use "${userName}" as the sender name instead of "[Your name]" placeholder.`;
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
      save: '💾', store: '🗄️', manage: '⚙️', organize: '📂',
      // LinkedIn Professional 
      linkedin: '💼', profile: '👤', posts: '📝', connections: '🤝', messaging: '💬'
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
      tasks: ['task', 'todo', 'remind', 'list', 'complete', 'done'],
      // LinkedIn intelligent routing
      linkedin: ['linkedin', 'professional', 'network', 'connection', 'profile', 'post', 'share', 'business', 'company', 'organization', 'skill', 'activity', 'follower', 'search', 'job', 'messaging', 'article'],
      profile: ['profile', 'about', 'background', 'experience', 'bio', 'information', 'details', 'who is'],
      posts: ['post', 'share', 'publish', 'write', 'update', 'announce', 'content'],
      connections: ['connections', 'network', 'contacts', 'colleagues', 'friends', 'people'],
      messaging: ['message', 'dm', 'direct message', 'contact', 'reach out', 'send message']
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

      // Try to parse as JSON - extract only the JSON array portion
      let jsonString = '';
      
      // Find the first '[' that starts a JSON array of objects (allow whitespace/newlines before first '{')
      const startIndex = content.search(/\[\s*\{/);
      if (startIndex === -1) {
        console.warn('[MCPUIIntegrationService] No JSON array of objects found in LLM response');
        return [];
      }
      
      // Find the matching closing ']' by counting brackets
      let bracketCount = 0;
      let endIndex = -1;
      
      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '[') {
          bracketCount++;
        } else if (content[i] === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      
      if (endIndex === -1) {
        console.warn('[MCPUIIntegrationService] No matching JSON array end found in LLM response');
        return [];
      }
      
      jsonString = content.substring(startIndex, endIndex + 1);
      console.log('[MCPUIIntegrationService] 📋 Extracted JSON:', jsonString);
      
      // Validate that this actually looks like action JSON before parsing
      if (!/\{[\s\S]*?"id"[\s\S]*?\}/.test(jsonString) || !jsonString.includes('"type"') || !jsonString.includes('"confidence"')) {
        console.warn('[MCPUIIntegrationService] Extracted text does not contain required action fields (id, type, confidence):', jsonString);
        return [];
      }
      
      const actions = JSON.parse(jsonString);
      
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
   * Extract email context from conversation text
   */
  extractEmailContext(conversationText) {
    console.log('[MCPUIIntegrationService] 🔍 Extracting email context from:', conversationText);
    
    const context = {
      recipients: '',
      subject: '',
      body: '',
      cc: '',
      bcc: ''
    };

    // Extract recipients (email addresses or "to" patterns)
    const toPatterns = [
      /(?:send.*?(?:email|message).*?to|email.*?to|write.*?to|send.*?to)\s+([^\n\.,]+)/gi,
      /to:\s*([^\n\.,]+)/gi,
      /recipient[s]?:\s*([^\n\.,]+)/gi
    ];
    
    for (const pattern of toPatterns) {
      const match = conversationText.match(pattern);
      if (match && match[1]) {
        context.recipients = match[1].trim();
        break;
      }
    }

    // Extract subject 
    const subjectPatterns = [
      /subject:\s*([^\n]+)/gi,
      /(?:with.*?subject|about)\s+["']?([^"'\n]+)["']?/gi,
      /re:\s*([^\n]+)/gi
    ];
    
    for (const pattern of subjectPatterns) {
      const match = conversationText.match(pattern);
      if (match && match[1]) {
        context.subject = match[1].trim();
        break;
      }
    }

    // Extract body content - look for email content in the conversation
    const bodyPatterns = [
      /(?:email.*?content|message.*?content|body|write):\s*["']?([^"'\n]{10,})["']?/gi,
      /(?:say|tell.*?them|message):\s*["']?([^"'\n]{10,})["']?/gi,
      /content:\s*([^\n]{10,})/gi
    ];
    
    for (const pattern of bodyPatterns) {
      const match = conversationText.match(pattern);
      if (match && match[1]) {
        context.body = match[1].trim();
        break;
      }
    }

    // If no specific body found, try to extract from the overall conversation context
    if (!context.body) {
      // Look for quoted text or content that seems like email body
      const quotedContent = conversationText.match(/["']([^"']{20,})["']/);
      if (quotedContent && quotedContent[1]) {
        context.body = quotedContent[1].trim();
      } else {
        // Use a relevant portion of the conversation as body suggestion
        const sentences = conversationText.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          context.body = sentences[0].trim() + (sentences.length > 1 ? '...' : '');
        }
      }
    }

    console.log('[MCPUIIntegrationService] 📧 Extracted email context:', context);
    return context;
  }

  /**
   * Extract LinkedIn profile context from user message
   */
  extractLinkedInProfileContext(message) {
    const context = {
      searchQuery: '',
      name: '',
      company: ''
    };

    // Enhanced name patterns to catch more variations
    const namePatterns = [
      /(?:profile of|who is|about|find)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:'s|s)?\s+(?:profile|linkedin|background)/i,
      /(?:pull\s*up|pullup|get|lookup|search\s+for|find)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:from|on)\s+linkedin/i,
      /linkedin.*?([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      // More flexible pattern for names anywhere in the message
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        context.name = match[1].trim();
        context.searchQuery = context.name;
        break;
      }
    }

    // Extract company patterns
    const companyPatterns = [
      /(?:at|from|works?\s+at)\s+([A-Z][a-zA-Z\s&]+)/i,
      /([A-Z][a-zA-Z\s&]+)\s+(?:company|corporation|corp|inc|llc)/i
    ];

    for (const pattern of companyPatterns) {
      const match = message.match(pattern);
      if (match) {
        context.company = match[1].trim();
        context.searchQuery += ` ${context.company}`;
        break;
      }
    }

    // Default to general search if no specific name found
    if (!context.searchQuery) {
      context.searchQuery = 'profile search';
    }

    console.log('[MCPUIIntegrationService] 👤 Extracted LinkedIn profile context:', context);
    return context;
  }

  /**
   * Extract LinkedIn post context from user message
   */
  extractLinkedInPostContext(message) {
    const context = {
      content: '',
      visibility: 'PUBLIC'
    };

    // Extract content patterns
    const contentPatterns = [
      /(?:post|share|publish|announce)(?:\s+on\s+linkedin)?\s*[:\-]?\s*["']?([^"']+)["']?/i,
      /linkedin.*?(?:post|share|:).*?[:\-]?\s*(.+)/i,  // Enhanced pattern for "LinkedIn: content"
      /post\s+on\s+linkedin[:\-]?\s*(.+)/i,  // "Post on LinkedIn: content"
      /"([^"]+)"/,  // Quoted content
      /'([^']+)'/   // Single quoted content
    ];

    for (const pattern of contentPatterns) {
      const match = message.match(pattern);
      if (match) {
        context.content = match[1].trim();
        break;
      }
    }

    // Extract visibility patterns
    if (message.toLowerCase().includes('private')) {
      context.visibility = 'PRIVATE';
    } else if (message.toLowerCase().includes('connections only')) {
      context.visibility = 'CONNECTIONS';
    }

    // Default content if nothing specific found
    if (!context.content) {
      context.content = 'New post from Leviousa conversation';
    }

    console.log('[MCPUIIntegrationService] 📝 Extracted LinkedIn post context:', context);
    return context;
  }

  /**
   * Extract LinkedIn connections context from user message
   */
  extractLinkedInConnectionsContext(message) {
    const context = {
      searchCriteria: '',
      count: 50,
      start: 0
    };

    // Extract search criteria patterns
    const criteriaPatterns = [
      /(?:connections|network|colleagues|contacts)(?:\s+(?:in|from|at))?\s+(.+)/i,
      /(?:people|professionals)(?:\s+(?:in|from|at))?\s+(.+)/i,
      /(?:find|search).*?(?:connections|network).*?(.+)/i
    ];

    for (const pattern of criteriaPatterns) {
      const match = message.match(pattern);
      if (match) {
        context.searchCriteria = match[1].trim();
        break;
      }
    }

    // Extract count patterns
    const countMatch = message.match(/(\d+)\s+(?:connections|people|contacts)/i);
    if (countMatch) {
      context.count = Math.min(parseInt(countMatch[1]), 500); // LinkedIn API limit
    }

    // Default criteria if nothing specific found
    if (!context.searchCriteria) {
      context.searchCriteria = 'professional network';
    }

    console.log('[MCPUIIntegrationService] 🤝 Extracted LinkedIn connections context:', context);
    return context;
  }

  /**
   * Fallback intent detection for LLM failures
   */
  async fallbackIntentDetection(context, availableTools) {
    console.warn('[MCPUIIntegrationService] Falling back to keyword-based intent detection due to LLM failure.');
    const actions = [];
    const message = context.message?.toLowerCase() || '';

    // Check if LinkedIn is available
    const hasLinkedIn = availableTools.linkedin || false;

    // Simple keyword matching for email
    if (context.message && (
      message.includes('send email') ||
      message.includes('email someone') ||
      message.includes('compose email') ||
      message.includes('write to')
    )) {
      // Extract email context from the conversation
      const emailContext = this.extractEmailContext(context.message + ' ' + (context.conversationHistory || ''));
      
      actions.push({
        id: 'email-send',
        label: '📧 Send Email',
        type: 'email.send',
        confidence: 0.9,
        autoTrigger: true,
        context: emailContext
      });
    }

    // LinkedIn intelligent detection - ONLY if "linkedin" is explicitly mentioned
    if (hasLinkedIn && message.includes('linkedin')) {
      console.log('[MCPUIIntegrationService] LinkedIn explicitly mentioned, detecting specific intent...');
      
      // LinkedIn Post creation (check first to avoid conflicts)
      if (message.includes('post') || message.includes('share') || message.includes('publish') || message.includes('announce') || message.match(/linkedin.*?:/)) {
        const postContext = this.extractLinkedInPostContext(context.message);
        actions.push({
          id: 'linkedin-post',
          label: '📝 Post on LinkedIn',
          type: 'linkedin.posts',
          confidence: 0.85,
          autoTrigger: true,
          context: postContext
        });
      }
      
      // LinkedIn Profile lookup (enhanced detection for names and "pull up" patterns)
      else if (message.includes('profile') || message.includes('who is') || message.includes('background') || message.includes('about') ||
               message.includes('pull up') || message.includes('pullup') || message.includes('find') || message.includes('lookup') ||
               message.includes('get') || message.includes('search for') || /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(message)) {
        const profileContext = this.extractLinkedInProfileContext(context.message);
        actions.push({
          id: 'linkedin-profile',
          label: '👤 View LinkedIn Profile',
          type: 'linkedin.profile',
          confidence: 0.85,
          autoTrigger: true,
          context: profileContext
        });
      }
      
      // LinkedIn Connections
      else if (message.includes('connections') || message.includes('network') || message.includes('colleagues') || message.includes('contacts')) {
        const connectionsContext = this.extractLinkedInConnectionsContext(context.message);
        actions.push({
          id: 'linkedin-connections',
          label: '🤝 View LinkedIn Connections',
          type: 'linkedin.connections',
          confidence: 0.85,
          autoTrigger: true,
          context: connectionsContext
        });
      }
      
      // Default LinkedIn action if no specific intent detected
      else {
        const profileContext = this.extractLinkedInProfileContext(context.message);
        actions.push({
          id: 'linkedin-profile',
          label: '👤 View LinkedIn Profile',
          type: 'linkedin.profile',
          confidence: 0.85,
          autoTrigger: true,
          context: profileContext
        });
      }
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

              // Special case: LinkedIn tools are discovered via Paragon server
              if (serviceKey === 'linkedin' && !tools.linkedin) {
                const hasLinkedInNamedTool = allTools.some(t =>
                  /linkedin[_\.\-]/i.test(t.name) || (t.fullName && /linkedin/i.test(t.fullName))
                );
                if (hasLinkedInNamedTool) {
                  console.log('[MCPUIIntegrationService] ✅ linkedin marked available via discovered Paragon tools');
                  tools.linkedin = true;
                }
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

    // Strategy 3: Paragon service matching (LinkedIn tools come through Paragon)
    if (serviceKey === 'linkedin') {
      const linkedinMatches = discoveredTools.some(tool => 
        tool.name.toLowerCase().includes('linkedin_') || 
        tool.name.toLowerCase().includes('linkedin-') ||
        tool.name.toLowerCase().includes('linkedin.') ||
        (tool.fullName && tool.fullName.toLowerCase().includes('linkedin'))
      );

      if (linkedinMatches) {
        console.log(`[MCPUIIntegrationService] ✅ ${serviceKey} matched via Paragon tools`);
        return true;
      }
    }

    // Strategy 4: Server command matching (for MCP servers)
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

    // Strategy 5: OAuth provider matching (for Google services)
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
   * Smart encoding for email fields to handle special characters
   * Like the working Paragon branch implementation
   */
  _encodeEmailField(text) {
    if (!text) return '';
    
    // Handle common encoding issues that were smartly handled in Paragon branch
    return text
      .replace(/&/g, '&amp;')          // Encode ampersands
      .replace(/</g, '&lt;')           // Encode less than
      .replace(/>/g, '&gt;')           // Encode greater than
      .replace(/"/g, '&quot;')         // Encode quotes
      .replace(/'/g, '&#39;')          // Encode single quotes
      .replace(/\n/g, '\\n')           // Encode newlines for JSON
      .replace(/\r/g, '\\r')           // Encode carriage returns
      .replace(/\t/g, '\\t');          // Encode tabs
  }

  /**
   * Email Action Handlers
   */
  async createEmailSendAction(action, context) {
    console.log('[MCPUIIntegrationService] 🔧 createEmailSendAction called with:', { action, context });
    try {
        const emailData = {
            to: context.recipients || '',
            subject: context.subject || '',
            body: context.body || '',
            cc: context.cc || '',
            bcc: context.bcc || ''
        };

        console.log('[MCPUIIntegrationService] 📧 Email data prepared:', emailData);

        // Generate email composer UI resource
        const resource = UIResourceGenerator.generateEmailComposer(emailData);
        
        const uiResourcePayload = {
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
                        // Determine the full tool name with server prefix (like working Paragon branch)
                        const activeServers = this.mcpClient.serverRegistry.getActiveServers();
                        const serverName = activeServers[0]?.name || activeServers[0]?.serverName || 'paragon';
                        const fullToolName = `${serverName}.GMAIL_SEND_EMAIL`;
                        
                        console.log('[MCPUIIntegrationService] Using tool:', fullToolName);
                        console.log('[MCPUIIntegrationService] Active servers:', activeServers);
                        
                        // Handle both array and string formats for recipients
                        const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
                        const ccAddresses = Array.isArray(params.cc) ? params.cc : (params.cc ? [params.cc] : []);
                        const bccAddresses = Array.isArray(params.bcc) ? params.bcc : (params.bcc ? [params.bcc] : []);
                        
                        console.log('[MCPUIIntegrationService] 📤 Raw params received from UI:', JSON.stringify(params, null, 2));
                        console.log('[MCPUIIntegrationService] 📤 toAddresses:', toAddresses);
                        console.log('[MCPUIIntegrationService] 📤 Subject:', params.subject);
                        console.log('[MCPUIIntegrationService] 📤 Body:', params.body);
                        console.log('[MCPUIIntegrationService] 📤 Body length:', (params.body || '').length);
                        
                        // Use correct Microsoft Graph API parameter format (like working Paragon branch)
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
                        
                        console.log('[MCPUIIntegrationService] 📤 Final toolParams being sent to MCP:', JSON.stringify(toolParams, null, 2));
                        
                        // Call MCP tool directly (like working Paragon branch)
                        const result = await this.mcpClient.callTool(fullToolName, toolParams);
                        
                        console.log('[MCPUIIntegrationService] MCP tool result:', result);
                        
                        // Check if the result contains an error (like working Paragon branch)
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
        };
        
        console.log('[MCPUIIntegrationService] 📤 Emitting ui-resource-ready with payload:', JSON.stringify(uiResourcePayload, null, 2));
        
        // Use inline form instead of modal for better theme integration
        this.emit('ui-resource-ready', uiResourcePayload);

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

  /**
   * Extract LinkedIn profile context from user message
   */
  extractLinkedInProfileContext(message) {
    const context = {
      searchQuery: '',
      name: '',
      company: ''
    };

    // Extract name patterns
    const namePatterns = [
      /(?:profile of|who is|about|find)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:'s|s)?\s+(?:profile|linkedin|background)/i,
      /linkedin.*?([A-Z][a-z]+\s+[A-Z][a-z]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        context.name = match[1].trim();
        context.searchQuery = context.name;
        break;
      }
    }

    console.log('[MCPUIIntegrationService] 👤 Extracted LinkedIn profile context:', context);
    return context;
  }

  /**
   * Extract LinkedIn post context from user message
   */
  extractLinkedInPostContext(message) {
    const context = {
      content: '',
      visibility: 'PUBLIC',
      hashtags: []
    };

    // Extract content patterns
    const contentPatterns = [
      /(?:post|share|publish|announce)(?:\s+on\s+linkedin)?\s*[:\-]?\s*["']?([^"']+)["']?/i,
      /linkedin.*?(?:post|share|:).*?[:\-]?\s*(.+)/i,  // Enhanced pattern for "LinkedIn: content"
      /post\s+on\s+linkedin[:\-]?\s*(.+)/i,  // "Post on LinkedIn: content"
      /"([^"]+)"/,  // Quoted content
      /'([^']+)'/   // Single quoted content
    ];

    for (const pattern of contentPatterns) {
      const match = message.match(pattern);
      if (match) {
        context.content = match[1].trim();
        break;
      }
    }

    // Extract hashtags if any
    const hashtagMatches = context.content.match(/#\w+/g);
    if (hashtagMatches) {
      context.hashtags = hashtagMatches;
    }

    // Extract visibility if mentioned
    if (message.includes('private') || message.includes('connections only')) {
      context.visibility = 'CONNECTIONS';
    }

    console.log('[MCPUIIntegrationService] 📝 Extracted LinkedIn post context:', context);
    return context;
  }

  /**
   * Extract LinkedIn connections context from user message
   */
  extractLinkedInConnectionsContext(message) {
    const context = {
      searchCriteria: '',
      industry: '',
      location: ''
    };

    // Extract search criteria
    const criteriaPatterns = [
      /(?:connections|network).*?in\s+([a-zA-Z\s&,-]+)/i,
      /([a-zA-Z\s&,-]+)\s+(?:connections|colleagues)/i,
      /find.*?(?:connections|people).*?([a-zA-Z\s&,-]+)/i
    ];

    for (const pattern of criteriaPatterns) {
      const match = message.match(pattern);
      if (match) {
        context.searchCriteria = match[1].trim();
        break;
      }
    }

    console.log('[MCPUIIntegrationService] 🔗 Extracted LinkedIn connections context:', context);
    return context;
  }

  // ========================================
  // LinkedIn Action Handlers
  // ========================================

  /**
   * Create LinkedIn Profile Action
   */
  async createLinkedInProfileAction(action, context) {
    console.log('[MCPUIIntegrationService] 🔍 Executing LinkedIn profile search action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      // Extract the search query from context
      const searchQuery = context.name || context.searchQuery || 'profile';
      
      // Call the LinkedIn get profile endpoint
      const result = await this.mcpClient.callTool('linkedin_get_profile', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2', // Use the authenticated user
        profile_id: searchQuery
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn profile search completed');
      return {
        success: true,
        result: result,
        message: `Found LinkedIn profile for: ${searchQuery}`
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn profile search failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to search LinkedIn profile: ${error.message}`
      };
    }
  }

  /**
   * Create LinkedIn Post Action
   */
  async createLinkedInPostAction(action, context) {
    console.log('[MCPUIIntegrationService] 📝 Executing LinkedIn post creation action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      const result = await this.mcpClient.callTool('linkedin_create_post', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        text: context.content || context.text || 'Default post content',
        visibility: context.visibility || 'PUBLIC'
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn post created');
      return {
        success: true,
        result: result,
        message: 'LinkedIn post created successfully'
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn post creation failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create LinkedIn post: ${error.message}`
      };
    }
  }

  /**
   * Create LinkedIn Connections Action
   */
  async createLinkedInConnectionsAction(action, context) {
    console.log('[MCPUIIntegrationService] 🤝 Executing LinkedIn connections action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      const result = await this.mcpClient.callTool('linkedin_get_connections', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        start: context.start || 0,
        count: context.count || 50
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn connections retrieved');
      return {
        success: true,
        result: result,
        message: 'LinkedIn connections retrieved successfully'
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn connections failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get LinkedIn connections: ${error.message}`
      };
    }
  }

  /**
   * Create LinkedIn Messaging Action
   */
  async createLinkedInMessagingAction(action, context) {
    console.log('[MCPUIIntegrationService] 💬 Executing LinkedIn messaging action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      const result = await this.mcpClient.callTool('linkedin_send_message', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        recipient_id: context.recipient || context.recipientId,
        message: context.message || context.text || 'Hello!'
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn message sent');
      return {
        success: true,
        result: result,
        message: 'LinkedIn message sent successfully'
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn messaging failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to send LinkedIn message: ${error.message}`
      };
    }
  }

  /**
   * Create LinkedIn Companies Action
   */
  async createLinkedInCompaniesAction(action, context) {
    console.log('[MCPUIIntegrationService] 🏢 Executing LinkedIn companies action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      const result = await this.mcpClient.callTool('linkedin_get_companies', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        start: context.start || 0,
        count: context.count || 20
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn companies retrieved');
      return {
        success: true,
        result: result,
        message: 'LinkedIn companies retrieved successfully'
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn companies failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get LinkedIn companies: ${error.message}`
      };
    }
  }

  /**
   * Create LinkedIn Skills Action
   */
  async createLinkedInSkillsAction(action, context) {
    console.log('[MCPUIIntegrationService] 💪 Executing LinkedIn skills action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      const result = await this.mcpClient.callTool('linkedin_get_skills', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        profile_id: context.profileId || context.profile_id
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn skills retrieved');
      return {
        success: true,
        result: result,
        message: 'LinkedIn skills retrieved successfully'
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn skills failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get LinkedIn skills: ${error.message}`
      };
    }
  }

  /**
   * Create LinkedIn Search Action
   */
  async createLinkedInSearchAction(action, context) {
    console.log('[MCPUIIntegrationService] 🔍 Executing LinkedIn search action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      const result = await this.mcpClient.callTool('linkedin_search_people', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        query: context.query || context.searchQuery || 'people',
        start: context.start || 0,
        count: context.count || 25
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn search completed');
      return {
        success: true,
        result: result,
        message: 'LinkedIn search completed successfully'
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn search failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to search LinkedIn: ${error.message}`
      };
    }
  }

  /**
   * Create LinkedIn Jobs Action
   */
  async createLinkedInJobsAction(action, context) {
    console.log('[MCPUIIntegrationService] 💼 Executing LinkedIn jobs action');
    
    try {
      if (!this.mcpClient) {
        throw new Error('MCP client not available');
      }

      const result = await this.mcpClient.callTool('linkedin_get_job_postings', {
        user_id: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        company_id: context.companyId || context.company_id,
        start: context.start || 0,
        count: context.count || 25
      });

      console.log('[MCPUIIntegrationService] ✅ LinkedIn jobs retrieved');
      return {
        success: true,
        result: result,
        message: 'LinkedIn job postings retrieved successfully'
      };

    } catch (error) {
      console.error('[MCPUIIntegrationService] ❌ LinkedIn jobs failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to get LinkedIn jobs: ${error.message}`
      };
    }
  }
}

// Create singleton instance
const mcpUIIntegrationService = new MCPUIIntegrationService();

module.exports = { 
  MCPUIIntegrationService,
  mcpUIIntegrationService
}; 