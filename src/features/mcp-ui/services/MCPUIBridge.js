const { EventEmitter } = require('events');

class MCPUIBridge extends EventEmitter {
  constructor() {
    super();
    this.activeUIResources = new Map();
    this.pendingActions = new Map();
    this.mcpClient = null;
    this.setupMessageHandling();
  }

  /**
   * Initialize the bridge with an MCP client instance
   * @param {Object} mcpClient - The MCP client instance
   */
  initialize(mcpClient) {
    this.mcpClient = mcpClient;
    console.log('MCPUIBridge initialized with MCP client');
  }

  /**
   * Set up global message handling for UI actions
   */
  setupMessageHandling() {
    // Note: In main process, we handle UI actions through IPC instead of window events
    // UI actions are handled in invisibilityBridge.js via ipcMain.handle
    console.log('[MCPUIBridge] Message handling setup for main process (IPC-based)');
  }

  /**
   * Handle UI actions from rendered components
   * @param {CustomEvent} event - The UI action event
   */
  async handleUIAction(event) {
    const { serverId, tool, params } = event.detail;
    
    if (!this.mcpClient) {
      console.error('MCPUIBridge: No MCP client available');
      this.emit('error', {
        type: 'no-client',
        message: 'MCP client not initialized'
      });
      return;
    }

    try {
      console.log('MCPUIBridge: Handling UI action', { serverId, tool, params });
      
      // Generate action ID for tracking
      const actionId = `ui-action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store pending action
      this.pendingActions.set(actionId, {
        serverId,
        tool,
        params,
        timestamp: Date.now()
      });

      // Emit action for handling by the MCP client
      this.emit('ui-action-request', {
        actionId,
        serverId,
        tool,
        params
      });

      // Invoke the tool through MCP
      const result = await this.invokeMCPTool(serverId, tool, params);
      
      // Remove from pending
      this.pendingActions.delete(actionId);
      
      // Process the result
      if (result) {
        this.handleToolResult(serverId, tool, result);
      }
    } catch (error) {
      console.error('MCPUIBridge: Error handling UI action', error);
      this.emit('error', {
        type: 'action-error',
        serverId,
        tool,
        error: error.message
      });
    }
  }

  /**
   * Invoke an MCP tool through the client
   * @param {string} serverId - The MCP server ID
   * @param {string} tool - The tool name
   * @param {Object} params - The tool parameters
   * @returns {Promise<Object>} The tool result
   */
  async invokeMCPTool(serverId, tool, params) {
    if (!this.mcpClient) {
      throw new Error('MCP client not initialized');
    }

    try {
      // Invoke the tool directly through the MCP client using the correct method name
      const result = await this.mcpClient.callTool(tool, params);
      return result;
    } catch (error) {
      console.error('MCPUIBridge: Error invoking MCP tool', error);
      throw error;
    }
  }

  /**
   * Handle tool responses that may contain UI resources
   * @param {CustomEvent} event - The tool response event
   */
  handleToolResponse(event) {
    const { serverId, tool, response } = event.detail;
    
    if (!response) return;

    // Check if response contains UI resources
    if (response.type === 'ui_resource' || response.type === 'resource') {
      this.registerUIResource(serverId, tool, response.resource || response);
    }
  }

  /**
   * Handle tool execution results
   * @param {string} serverId - The server ID
   * @param {string} tool - The tool name
   * @param {Object} result - The tool result
   */
  handleToolResult(serverId, tool, result) {
    console.log('MCPUIBridge: Tool result', { serverId, tool, result });

    // Check if result contains UI resources
    if (result && result.content) {
      result.content.forEach(item => {
        if (item.type === 'resource' && item.resource) {
          this.registerUIResource(serverId, tool, item.resource);
        }
      });
    }

    // Emit result event
    this.emit('tool-result', {
      serverId,
      tool,
      result
    });
  }

  /**
   * Register a UI resource for rendering
   * @param {string} serverId - The server ID
   * @param {string} tool - The tool name
   * @param {Object} resource - The UI resource
   */
  registerUIResource(serverId, tool, resource) {
    const resourceId = `${serverId}-${tool}-${Date.now()}`;
    
    this.activeUIResources.set(resourceId, {
      serverId,
      tool,
      resource,
      timestamp: Date.now()
    });

    console.log('MCPUIBridge: Registered UI resource', resourceId);

    // Emit event for UI rendering
    this.emit('ui-resource-available', {
      resourceId,
      serverId,
      tool,
      resource
    });

    return resourceId;
  }

  /**
   * Get an active UI resource by ID
   * @param {string} resourceId - The resource ID
   * @returns {Object|null} The UI resource or null
   */
  getUIResource(resourceId) {
    return this.activeUIResources.get(resourceId) || null;
  }

  /**
   * Remove a UI resource
   * @param {string} resourceId - The resource ID
   */
  removeUIResource(resourceId) {
    const resource = this.activeUIResources.get(resourceId);
    if (resource) {
      this.activeUIResources.delete(resourceId);
      this.emit('ui-resource-removed', {
        resourceId,
        serverId: resource.serverId,
        tool: resource.tool
      });
    }
  }

  /**
   * Get all active UI resources
   * @returns {Array} Array of active UI resources
   */
  getActiveUIResources() {
    return Array.from(this.activeUIResources.entries()).map(([id, data]) => ({
      resourceId: id,
      ...data
    }));
  }

  /**
   * Clear all UI resources for a specific server
   * @param {string} serverId - The server ID
   */
  clearServerResources(serverId) {
    const toRemove = [];
    
    this.activeUIResources.forEach((data, id) => {
      if (data.serverId === serverId) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.removeUIResource(id));
  }

  /**
   * Handle security validation for UI resources
   * @param {Object} resource - The UI resource to validate
   * @returns {boolean} Whether the resource is safe to render
   */
  validateUIResource(resource) {
    // Basic validation rules
    if (!resource || typeof resource !== 'object') {
      return false;
    }

    // Check for required properties
    if (!resource.mimeType && !resource.uri) {
      return false;
    }

    // Validate mime type
    const allowedMimeTypes = ['text/html', 'application/json', 'text/plain'];
    if (resource.mimeType && !allowedMimeTypes.includes(resource.mimeType)) {
      console.warn('MCPUIBridge: Unsupported mime type', resource.mimeType);
      return false;
    }

    // Additional security checks can be added here
    return true;
  }

  /**
   * Clean up expired resources
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupExpiredResources(maxAge = 3600000) {
    const now = Date.now();
    const toRemove = [];

    this.activeUIResources.forEach((data, id) => {
      if (now - data.timestamp > maxAge) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.removeUIResource(id));
    
    if (toRemove.length > 0) {
      console.log(`MCPUIBridge: Cleaned up ${toRemove.length} expired resources`);
    }
  }

  /**
   * Destroy the bridge and clean up resources
   */
  destroy() {
    // Note: In main process, no window event listeners to remove
    // Event handling is managed through IPC in invisibilityBridge.js
    
    // Clear all resources
    this.activeUIResources.clear();
    this.pendingActions.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    this.mcpClient = null;
    console.log('MCPUIBridge destroyed');
  }
}

// Create singleton instance
const mcpUIBridge = new MCPUIBridge();

// Auto cleanup expired resources every 30 minutes
setInterval(() => {
  mcpUIBridge.cleanupExpiredResources();
}, 1800000);

module.exports = {
  default: mcpUIBridge,
  MCPUIBridge
}; 