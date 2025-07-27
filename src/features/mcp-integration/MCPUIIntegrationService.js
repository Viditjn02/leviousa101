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
      lookup: this.createLinkedInLookupAction.bind(this),
      connect: this.createLinkedInConnectAction.bind(this)
    });
  }

  /**
   * Get contextual actions based on current state
   */
  getContextualActions(context) {
    const actions = [];

    // Analyze context to determine relevant actions
    if (context.type === 'ask') {
      // In Ask mode, provide quick actions
      if (context.message?.toLowerCase().includes('email')) {
        actions.push({
          id: 'send-email',
          label: '📧 Send Email',
          type: 'email.send'
        });
      }
      
      if (context.message?.toLowerCase().includes('meeting') || 
          context.message?.toLowerCase().includes('calendar')) {
        actions.push({
          id: 'schedule-meeting',
          label: '📅 Schedule Meeting',
          type: 'meeting.schedule'
        });
      }
      
      if (context.message?.toLowerCase().includes('linkedin') || 
          context.message?.toLowerCase().includes('profile')) {
        actions.push({
          id: 'linkedin-lookup',
          label: '🔍 LinkedIn Lookup',
          type: 'linkedin.lookup'
        });
      }
    } else if (context.type === 'listen-complete') {
      // After listening session, provide summary actions
      actions.push({
        id: 'save-to-notion',
        label: '📝 Save to Notion',
        type: 'notes.save'
      });
      
      actions.push({
        id: 'schedule-followup',
        label: '📅 Schedule Follow-up',
        type: 'meeting.followUp'
      });
      
      actions.push({
        id: 'send-summary-email',
        label: '✉️ Send Summary Email',
        type: 'email.send',
        metadata: { template: 'meeting-summary' }
      });
    } else if (context.type === 'conversation') {
      // During conversation, provide contextual actions
      if (context.participants?.length > 0) {
        actions.push({
          id: 'linkedin-participants',
          label: '👥 View LinkedIn Profiles',
          type: 'linkedin.lookup',
          metadata: { participants: context.participants }
        });
      }
    }

    return actions;
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

    return await handler(action, context);
  }

  /**
   * Email Action Handlers
   */
  async createEmailSendAction(action, context) {
    const emailData = {
      to: context.recipients || '',
      subject: context.subject || '',
      body: context.body || '',
      cc: context.cc || '',
      bcc: context.bcc || ''
    };

    // Generate email composer UI resource
    const resource = UIResourceGenerator.generateEmailComposer(emailData);
    
    // Emit event for UI to handle
    this.emit('ui-resource-ready', {
      actionId: action.id,
      resource,
      type: 'modal',
      onAction: async (tool, params) => {
        // Handle email sending through MCP
        if (tool === 'gmail.send') {
          return await this.mcpClient.invokeTool('gmail.send', params);
        }
      }
    });

    return { success: true, resourceId: resource.resource.uri };
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
   * LinkedIn Action Handlers
   */
  async createLinkedInLookupAction(action, context) {
    const searchQuery = context.query || context.name || '';
    
    // Search for LinkedIn profiles
    const searchResult = await this.mcpClient.invokeTool('linkedin.searchPeople', {
      query: searchQuery,
      limit: 5
    });

    if (searchResult.profiles && searchResult.profiles.length > 0) {
      // Generate LinkedIn profile cards
      const profiles = searchResult.profiles.map(profile => 
        UIResourceGenerator.generateLinkedInProfileCard(profile)
      );

      this.emit('ui-resource-ready', {
        actionId: action.id,
        resources: profiles,
        type: 'inline',
        onAction: async (tool, params) => {
          if (tool === 'linkedin.connect') {
            return await this.mcpClient.invokeTool('linkedin.sendConnectionRequest', params);
          }
        }
      });
    }

    return searchResult;
  }

  async createLinkedInConnectAction(action, context) {
    // Send connection request
    return await this.mcpClient.invokeTool('linkedin.sendConnectionRequest', {
      profileId: context.profileId,
      message: context.message || 'I\'d like to connect with you on LinkedIn.'
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
    
    // Check for LinkedIn tools
    availability.linkedin = tools.some(t => t.name.includes('linkedin'));
    
    // Check for Notion tools
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