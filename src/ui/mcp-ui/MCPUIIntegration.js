import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class MCPUIIntegration extends LitElement {
  static properties = {
    isActive: { type: Boolean },
    activeResources: { type: Array },
    loading: { type: Boolean },
    error: { type: String }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .ui-integration-section {
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 8px;
      padding: 20px;
      margin: 10px 0;
      border: 1px solid var(--border-color, #333);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
    }

    h3 {
      margin: 0;
      color: var(--text-primary, #fff);
      font-size: 16px;
      font-weight: 500;
    }

    .toggle-button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .toggle-button:hover {
      background: #45a049;
      transform: translateY(-1px);
    }

    .toggle-button.inactive {
      background: #666;
    }

    .toggle-button.inactive:hover {
      background: #555;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .feature-card {
      background: var(--bg-tertiary, #2a2a2a);
      border-radius: 8px;
      padding: 15px;
      border: 1px solid var(--border-color, #444);
      transition: all 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .feature-icon {
      width: 32px;
      height: 32px;
      margin-bottom: 10px;
      opacity: 0.8;
    }

    .feature-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 5px;
      color: var(--text-primary, #fff);
    }

    .feature-description {
      font-size: 12px;
      color: var(--text-secondary, #999);
      line-height: 1.4;
    }

    .try-button {
      margin-top: 10px;
      background: transparent;
      color: #4CAF50;
      border: 1px solid #4CAF50;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s ease;
    }

    .try-button:hover {
      background: #4CAF50;
      color: white;
    }

    .dashboard-container {
      margin-top: 20px;
      padding: 15px;
      background: var(--bg-tertiary, #2a2a2a);
      border-radius: 8px;
      border: 1px solid var(--border-color, #444);
      max-height: 600px;
      overflow-y: auto;
    }

    .loading {
      text-align: center;
      padding: 20px;
      color: var(--text-secondary, #999);
    }

    .error {
      color: #f44336;
      padding: 10px;
      background: rgba(244, 67, 54, 0.1);
      border-radius: 4px;
      margin: 10px 0;
    }

    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }

    .loading-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      margin: 0 2px;
      animation: pulse 1.4s ease-in-out infinite;
    }

    .loading-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .loading-dot:nth-child(3) {
      animation-delay: 0.4s;
    }
  `;

  constructor() {
    super();
    this.isActive = false;
    this.activeResources = [];
    this.loading = false;
    this.error = null;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.loadActiveResources();
    
    // Listen for UI resource events
    window.api.mcp.ui.onResourceAvailable((event, data) => {
      this.handleNewResource(data);
    });
    
    window.api.mcp.ui.onResourceRemoved((event, data) => {
      this.handleResourceRemoved(data);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up event listeners
    window.api.mcp.ui.removeResourceAvailable();
    window.api.mcp.ui.removeResourceRemoved();
  }

  async loadActiveResources() {
    this.loading = true;
    this.error = null;
    
    try {
      const result = await window.api.mcp.ui.getActiveResources();
      if (result.success) {
        this.activeResources = result.resources || [];
      } else {
        throw new Error(result.error || 'Failed to load resources');
      }
    } catch (error) {
      console.error('Error loading UI resources:', error);
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }

  handleNewResource(data) {
    const existing = this.activeResources.find(r => r.id === data.resourceId);
    if (!existing) {
      this.activeResources = [...this.activeResources, {
        id: data.resourceId,
        toolName: data.toolName,
        resource: data.resource,
        timestamp: new Date()
      }];
    }
  }

  handleResourceRemoved(data) {
    this.activeResources = this.activeResources.filter(r => r.id !== data.resourceId);
  }

  toggleUIMode() {
    this.isActive = !this.isActive;
    this.dispatchEvent(new CustomEvent('ui-mode-toggled', {
      detail: { active: this.isActive }
    }));
  }

  async tryFeature(feature) {
    this.loading = true;
    this.error = null;
    
    try {
      // Create sample data based on feature
      let result;
      
      switch (feature) {
        case 'email':
          result = await window.api.mcp.callTool('gmail.createDraft', {
            to: 'example@gmail.com',
            subject: 'Meeting Follow-up',
            body: 'Thank you for the productive meeting today. Here are the key points we discussed...'
          });
          break;
          
        case 'calendar':
          result = await window.api.mcp.callTool('google-calendar.createEvent', {
            summary: 'Follow-up Meeting',
            description: 'Discuss action items from today\'s meeting',
            start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 30
          });
          break;
          
        case 'linkedin':
          result = await window.api.mcp.callTool('linkedin.searchPeople', {
            query: 'software engineer',
            limit: 5
          });
          break;
          
        case 'notion':
          result = await window.api.mcp.callTool('notion.createPage', {
            title: 'Meeting Summary',
            content: 'Key points from today\'s meeting...'
          });
          break;
      }
      
      if (result && result.type === 'ui_resource') {
        // UI resource will be handled by event listeners
        console.log('UI resource created:', result);
      }
    } catch (error) {
      console.error('Error trying feature:', error);
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="ui-integration-section">
        <div class="section-header">
          <h3>🎨 MCP Interactive UI</h3>
          <button 
            class="toggle-button ${this.isActive ? '' : 'inactive'}"
            @click=${this.toggleUIMode}
          >
            ${this.isActive ? 'Active' : 'Inactive'}
          </button>
        </div>

        <p style="color: var(--text-secondary, #999); font-size: 14px; margin: 10px 0;">
          Transform MCP tools into interactive UI components. Send emails, book meetings, and save summaries with beautiful interfaces.
        </p>

        ${this.error ? html`
          <div class="error">
            Error: ${this.error}
          </div>
        ` : ''}

        <div class="feature-grid">
          <div class="feature-card">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <div class="feature-title">Interactive Email Composer</div>
            <div class="feature-description">
              Compose and send emails directly through Gmail with a rich editor
            </div>
            <button class="try-button" @click=${() => this.tryFeature('email')}>
              Try It
            </button>
          </div>

          <div class="feature-card">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            <div class="feature-title">Visual Calendar Widget</div>
            <div class="feature-description">
              Book meetings and manage your schedule with an interactive calendar
            </div>
            <button class="try-button" @click=${() => this.tryFeature('calendar')}>
              Try It
            </button>
          </div>

          <div class="feature-card">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <div class="feature-title">LinkedIn Profile Cards</div>
            <div class="feature-description">
              View LinkedIn profiles with rich previews and contact options
            </div>
            <button class="try-button" @click=${() => this.tryFeature('linkedin')}>
              Try It
            </button>
          </div>

          <div class="feature-card">
            <svg class="feature-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <div class="feature-title">Notion Summary Saver</div>
            <div class="feature-description">
              Save meeting summaries to Notion with one click
            </div>
            <button class="try-button" @click=${() => this.tryFeature('notion')}>
              Try It
            </button>
          </div>
        </div>

        ${this.loading ? html`
          <div class="loading">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
          </div>
        ` : ''}

        ${this.isActive && this.activeResources.length > 0 ? html`
          <div class="dashboard-container">
            <mcp-dashboard 
              .activeResources=${this.activeResources}
            ></mcp-dashboard>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('mcp-ui-integration', MCPUIIntegration); 