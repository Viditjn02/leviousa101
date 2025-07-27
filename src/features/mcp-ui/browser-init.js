/**
 * Browser initialization for MCP UI components
 * This file sets up MCP UI in the browser environment without ES6 modules
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMCPUI);
  } else {
    initMCPUI();
  }

  function initMCPUI() {
    // Check if we're in the main process (Node.js/Electron)
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize MCPUIBridge globally for browser access
    if (!window.mcpUIBridge) {
      // Import the MCPUIBridge class
      const script = document.createElement('script');
      script.textContent = `
        // Simplified MCPUIBridge for browser
        class MCPUIBridge {
          constructor() {
            this.activeResources = new Map();
            this.pendingActions = new Map();
            this.mcpClient = null;
          }

          initialize(mcpClient) {
            this.mcpClient = mcpClient;
            console.log('[MCPUIBridge] Initialized in browser');
          }

          registerUIResource(serverId, toolName, resource) {
            const resourceId = 'ui-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            this.activeResources.set(resourceId, {
              id: resourceId,
              serverId,
              toolName,
              resource,
              timestamp: new Date()
            });

            return resourceId;
          }

          getActiveUIResources() {
            return Array.from(this.activeResources.values());
          }

          removeUIResource(resourceId) {
            this.activeResources.delete(resourceId);
          }

          async invokeMCPTool(serverId, tool, params) {
            if (window.api && window.api.mcp && window.api.mcp.callTool) {
              return await window.api.mcp.callTool(tool, params);
            }
            throw new Error('MCP API not available');
          }
        }

        // Create global instance
        window.mcpUIBridge = new MCPUIBridge();
      `;
      document.head.appendChild(script);
    }

    console.log('[MCP UI] Browser initialization complete');
  }
})(); 