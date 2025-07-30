// Note: These will be loaded differently in browser vs Node.js
let LitElement, html, css, mcpUIBridge;

if (typeof window !== 'undefined') {
  // Browser environment - will be imported via script tags
  ({ LitElement, html, css } = window.LitElement || {});
  // MCPUIBridge will be available globally in browser
  mcpUIBridge = window.mcpUIBridge;
} else {
  // Node.js environment for testing
  try {
    ({ LitElement, html, css } = require('lit-element'));
    ({ default: mcpUIBridge } = require('../services/MCPUIBridge.js'));
  } catch (e) {
    // Fallback for testing environment
    LitElement = class { static properties = {}; };
    html = (strings, ...values) => strings.join('');
    css = (strings, ...values) => strings.join('');
    mcpUIBridge = { getActiveUIResources: () => [], removeUIResource: () => {} };
  }
}

class MCPDashboard extends LitElement {
  static properties = {
    activeResources: { type: Array },
    activeTab: { type: String },
    loading: { type: Boolean },
    error: { type: String },
    mcpStatus: { type: Object }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background: var(--bg-primary, #0f0f0f);
      color: var(--text-primary, #fff);
    }

    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .dashboard-header {
      background: var(--bg-secondary, #1a1a1a);
      border-bottom: 1px solid var(--border-color, #333);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .dashboard-title {
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--status-color, #666);
    }

    .status-indicator.active {
      background: #00ff00;
      box-shadow: 0 0 8px #00ff00;
    }

    .dashboard-actions {
      display: flex;
      gap: 12px;
    }

    .action-button {
      padding: 8px 16px;
      background: var(--button-bg, #333);
      color: var(--button-text, #fff);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-button:hover {
      background: var(--button-hover-bg, #444);
      transform: translateY(-1px);
    }

    .action-button.primary {
      background: var(--accent-bg, #0066ff);
    }

    .action-button.primary:hover {
      background: var(--accent-hover-bg, #0052cc);
    }

    .dashboard-tabs {
      background: var(--bg-secondary, #1a1a1a);
      padding: 0 24px;
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border-color, #333);
    }

    .tab {
      padding: 12px 20px;
      background: transparent;
      color: var(--text-secondary, #999);
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      position: relative;
    }

    .tab:hover {
      color: var(--text-primary, #fff);
    }

    .tab.active {
      color: var(--text-primary, #fff);
      border-bottom-color: var(--accent-color, #0066ff);
    }

    .tab-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--accent-bg, #0066ff);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 16px;
      text-align: center;
    }

    .dashboard-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .resource-card {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s;
    }

    .resource-card:hover {
      border-color: var(--accent-color, #0066ff);
      box-shadow: 0 4px 12px rgba(0, 102, 255, 0.1);
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .quick-action-card {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
    }

    .quick-action-card:hover {
      background: var(--bg-hover, #222);
      border-color: var(--accent-color, #0066ff);
      transform: translateY(-2px);
    }

    .quick-action-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .quick-action-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .quick-action-description {
      font-size: 13px;
      color: var(--text-secondary, #999);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary, #999);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state-title {
      font-size: 18px;
      margin-bottom: 8px;
      color: var(--text-primary, #fff);
    }

    .empty-state-description {
      font-size: 14px;
      max-width: 400px;
      margin: 0 auto;
    }

    .status-panel {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .status-item {
      text-align: center;
    }

    .status-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--accent-color, #0066ff);
    }

    .status-label {
      font-size: 12px;
      color: var(--text-secondary, #999);
      margin-top: 4px;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--spinner-color, #333);
      border-top-color: var(--accent-color, #0066ff);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this.activeResources = [];
    this.activeTab = 'overview';
    this.loading = false;
    this.error = null;
    this.mcpStatus = {
      activeServers: 0,
      availableTools: 0,
      activeResources: 0,
      totalInteractions: 0
    };
    
    this._handleUIResourceAvailable = this._onUIResourceAvailable.bind(this);
    this._handleUIResourceRemoved = this._onUIResourceRemoved.bind(this);
    this._handleUIAction = this._onUIAction.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Subscribe to MCPUIBridge events
    mcpUIBridge.on('ui-resource-available', this._handleUIResourceAvailable);
    mcpUIBridge.on('ui-resource-removed', this._handleUIResourceRemoved);
    mcpUIBridge.on('ui-action-request', this._handleUIAction);
    
    // Load initial data
    this._loadInitialData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Unsubscribe from events
    mcpUIBridge.off('ui-resource-available', this._handleUIResourceAvailable);
    mcpUIBridge.off('ui-resource-removed', this._handleUIResourceRemoved);
    mcpUIBridge.off('ui-action-request', this._handleUIAction);
  }

  render() {
    return html`
      <div class="dashboard-container">
        ${this._renderHeader()}
        ${this._renderTabs()}
        <div class="dashboard-content">
          ${this._renderContent()}
        </div>
        ${this.loading ? html`
          <div class="loading-overlay">
            <div class="spinner"></div>
          </div>
        ` : ''}
      </div>
    `;
  }

  _renderHeader() {
    return html`
      <div class="dashboard-header">
        <div class="dashboard-title">
          <div class="status-indicator ${this.mcpStatus.activeServers > 0 ? 'active' : ''}"></div>
          MCP Dashboard
        </div>
        <div class="dashboard-actions">
          <button class="action-button" @click=${this._refreshAll}>
            <span>↻</span> Refresh
          </button>
          <button class="action-button" @click=${this._showSettings}>
            <span>⚙</span> Settings
          </button>
          <button class="action-button primary" @click=${this._showQuickActions}>
            <span>+</span> New Action
          </button>
        </div>
      </div>
    `;
  }

  _renderTabs() {
    const tabs = [
      { id: 'overview', label: 'Overview', badge: null },
      { id: 'resources', label: 'Active Resources', badge: this.activeResources.length || null },
      { id: 'tools', label: 'Available Tools', badge: this.mcpStatus.availableTools || null },
      { id: 'history', label: 'History', badge: null }
    ];

    return html`
      <div class="dashboard-tabs">
        ${tabs.map(tab => html`
          <button 
            class="tab ${this.activeTab === tab.id ? 'active' : ''}"
            @click=${() => this.activeTab = tab.id}
          >
            ${tab.label}
            ${tab.badge ? html`<span class="tab-badge">${tab.badge}</span>` : ''}
          </button>
        `)}
      </div>
    `;
  }

  _renderContent() {
    switch (this.activeTab) {
      case 'overview':
        return this._renderOverview();
      case 'resources':
        return this._renderResources();
      case 'tools':
        return this._renderTools();
      case 'history':
        return this._renderHistory();
      default:
        return html``;
    }
  }

  _renderOverview() {
    return html`
      <div class="overview-content">
        ${this._renderStatusPanel()}
        ${this._renderQuickActions()}
        ${this._renderRecentActivity()}
      </div>
    `;
  }

  _renderStatusPanel() {
    return html`
      <div class="status-panel">
        <h3>System Status</h3>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-value">${this.mcpStatus.activeServers}</div>
            <div class="status-label">Active Servers</div>
          </div>
          <div class="status-item">
            <div class="status-value">${this.mcpStatus.availableTools}</div>
            <div class="status-label">Available Tools</div>
          </div>
          <div class="status-item">
            <div class="status-value">${this.activeResources.length}</div>
            <div class="status-label">Active Resources</div>
          </div>
          <div class="status-item">
            <div class="status-value">${this.mcpStatus.totalInteractions}</div>
            <div class="status-label">Total Interactions</div>
          </div>
        </div>
      </div>
    `;
  }

  _renderQuickActions() {
    const quickActions = [
      { id: 'email', icon: '✉️', title: 'Compose Email', description: 'Create and send emails' },
      { id: 'calendar', icon: '📅', title: 'Schedule Meeting', description: 'Book calendar events' }
    ];

    return html`
      <h3>Quick Actions</h3>
      <div class="quick-actions">
        ${quickActions.map(action => html`
          <div class="quick-action-card" @click=${() => this._triggerQuickAction(action.id)}>
            <div class="quick-action-icon">${action.icon}</div>
            <div class="quick-action-title">${action.title}</div>
            <div class="quick-action-description">${action.description}</div>
          </div>
        `)}
      </div>
    `;
  }

  _renderRecentActivity() {
    // This would show recent MCP interactions
    return html`
      <h3>Recent Activity</h3>
      <div class="recent-activity">
        <!-- Activity items would go here -->
      </div>
    `;
  }

  _renderResources() {
    if (this.activeResources.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">No Active Resources</div>
          <div class="empty-state-description">
            UI resources will appear here when you interact with MCP tools that provide visual interfaces.
          </div>
        </div>
      `;
    }

    return html`
      <div class="resources-grid">
        ${this.activeResources.map(resource => html`
          <div class="resource-card">
            <mcp-ui-renderer
              .resource=${resource.resource}
              .serverId=${resource.serverId}
              .toolName=${resource.tool}
              @ui-action=${this._handleRendererAction}
              @close=${() => this._closeResource(resource.resourceId)}
              @refresh=${() => this._refreshResource(resource.resourceId)}
            ></mcp-ui-renderer>
          </div>
        `)}
      </div>
    `;
  }

  _renderTools() {
    // This would show available MCP tools
    return html`
      <div class="tools-content">
        <h3>Available MCP Tools</h3>
        <!-- Tool list would go here -->
      </div>
    `;
  }

  _renderHistory() {
    // This would show interaction history
    return html`
      <div class="history-content">
        <h3>Interaction History</h3>
        <!-- History items would go here -->
      </div>
    `;
  }

  async _loadInitialData() {
    this.loading = true;
    
    try {
      // Get active resources from bridge
      this.activeResources = mcpUIBridge.getActiveUIResources();
      
      // Get MCP status (this would come from the MCP client)
      // For now, using mock data
      this.mcpStatus = {
        activeServers: 3,
        availableTools: 12,
        activeResources: this.activeResources.length,
        totalInteractions: 42
      };
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.error = 'Failed to load dashboard data';
    } finally {
      this.loading = false;
    }
  }

  _onUIResourceAvailable(event) {
    const { resourceId, serverId, tool, resource } = event;
    
    // Add to active resources if not already present
    if (!this.activeResources.find(r => r.resourceId === resourceId)) {
      this.activeResources = [...this.activeResources, {
        resourceId,
        serverId,
        tool,
        resource,
        timestamp: Date.now()
      }];
      
      // Switch to resources tab to show new resource
      this.activeTab = 'resources';
    }
  }

  _onUIResourceRemoved(event) {
    const { resourceId } = event;
    this.activeResources = this.activeResources.filter(r => r.resourceId !== resourceId);
  }

  _onUIAction(event) {
    // Update interaction count
    this.mcpStatus = {
      ...this.mcpStatus,
      totalInteractions: this.mcpStatus.totalInteractions + 1
    };
  }

  _handleRendererAction(event) {
    // UI action from renderer is already handled by MCPUIBridge
    console.log('Dashboard: UI action from renderer', event.detail);
  }

  _closeResource(resourceId) {
    mcpUIBridge.removeUIResource(resourceId);
  }

  _refreshResource(resourceId) {
    // Implement resource refresh logic
    console.log('Refreshing resource:', resourceId);
  }

  async _triggerQuickAction(actionId) {
    // Import the UI resource generator
    const { UIResourceGenerator } = await import('../utils/UIResourceGenerator.js');
    
    let resource;
    switch (actionId) {
      case 'email':
        resource = UIResourceGenerator.generateEmailComposer({
          serverId: 'gmail'
        });
        break;
      case 'calendar':
        resource = UIResourceGenerator.generateCalendarWidget({
          serverId: 'google-calendar'
        });
        break;
    }
    
    if (resource) {
      // Register the resource with the bridge
      const resourceId = mcpUIBridge.registerUIResource(
        actionId, 
        `quick-action-${actionId}`,
        resource.resource
      );
    }
  }

  _refreshAll() {
    this._loadInitialData();
  }

  _showSettings() {
    // Emit event to show settings
    this.dispatchEvent(new CustomEvent('show-settings', {
      bubbles: true,
      composed: true
    }));
  }

  _showQuickActions() {
    // Show quick actions menu
    console.log('Show quick actions menu');
  }
}

customElements.define('mcp-dashboard', MCPDashboard);

module.exports = { MCPDashboard }; 