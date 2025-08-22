import { LitElement, html, css } from 'lit-element';

export class MCPActionBar extends LitElement {
  static properties = {
    actions: { type: Array },
    isLoading: { type: Boolean },
    context: { type: Object }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .action-bar {
      display: flex;
      gap: 8px;
      padding: 8px 0;
      flex-wrap: wrap;
      align-items: center;
    }

    .action-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      white-space: nowrap;
    }

    .action-button:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .action-button:active {
      transform: translateY(0);
    }

    .action-button.primary {
      background: rgba(0, 122, 255, 0.2);
      border-color: rgba(0, 122, 255, 0.3);
      color: #007aff;
    }

    .action-button.primary:hover {
      background: rgba(0, 122, 255, 0.3);
      border-color: rgba(0, 122, 255, 0.4);
    }

    .action-icon {
      font-size: 14px;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
    }

    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
      font-style: italic;
    }

    .divider {
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      margin: 0 8px;
    }
  `;

  constructor() {
    super();
    this.actions = [];
    this.isLoading = false;
    this.context = {};
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // Show built-in actions immediately if available
    const builtInActions = this.getBuiltInActions();
    if (builtInActions.length > 0) {
      this.actions = builtInActions;
      this.requestUpdate();
      console.log(`[MCPActionBar] Showing ${builtInActions.length} built-in actions immediately`);
    }
    
    // Then try to load MCP actions (these may replace or supplement built-in actions)
    await this.loadContextualActions();
  }

  async loadContextualActions() {
    if (!window.api?.mcp?.getContextualActions) return;

    this.isLoading = true;
    this.requestUpdate(); // Trigger re-render to show loading
    
    try {
      // Get contextual actions from the LLM-based MCP UI Integration Service
      const result = await window.api.mcp.getContextualActions({
        type: this.context.type || 'ask',
        message: this.context.message || '',
        history: this.context.history || [],
        response: this.context.response || '',
        ...this.context // Pass through all context properties
      });

      if (result.success && result.actions) {
        this.actions = result.actions;
        console.log(`[MCPActionBar] Loaded ${this.actions.length} contextual actions via LLM classification`);
      } else {
        // Fallback to built-in actions from context if MCP actions aren't available
        this.actions = this.getBuiltInActions();
        console.log(`[MCPActionBar] Using ${this.actions.length} built-in actions as fallback`);
        if (result.error) {
          console.warn(`[MCPActionBar] Failed to load MCP actions: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('[MCPActionBar] Error loading contextual actions:', error);
      // Fallback to built-in actions if there's an error
      this.actions = this.getBuiltInActions();
      console.log(`[MCPActionBar] Using ${this.actions.length} built-in actions due to error`);
    } finally {
      this.isLoading = false;
      this.requestUpdate(); // Trigger re-render with results
    }
  }

  /**
   * Get built-in actions from context as fallback when MCP actions aren't available
   */
  getBuiltInActions() {
    const builtInActions = [];
    
    // Use actions from context if available
    if (this.context.actions && Array.isArray(this.context.actions)) {
      this.context.actions.forEach((action, index) => {
        builtInActions.push({
          id: `builtin-action-${index}`,
          label: action,
          type: 'builtin.action',
          confidence: 0.9,
          autoTrigger: false,
          isBuiltIn: true
        });
      });
    }
    
    // Use followUps from context if available and recording completed
    if (this.context.followUps && Array.isArray(this.context.followUps)) {
      this.context.followUps.forEach((followUp, index) => {
        builtInActions.push({
          id: `builtin-followup-${index}`,
          label: followUp,
          type: 'builtin.followup',
          confidence: 0.8,
          autoTrigger: false,
          isBuiltIn: true
        });
      });
    }
    
    return builtInActions;
  }

  async handleActionClick(action) {
    console.log('[MCPActionBar] Action clicked:', action);
    
    // Handle built-in actions differently
    if (action.isBuiltIn) {
      console.log('[MCPActionBar] Built-in action clicked, sending to ask service:', action.label);
      
      // Send built-in actions to the ask service for processing
      if (window.api?.summaryView?.sendQuestionFromSummary) {
        try {
          await window.api.summaryView.sendQuestionFromSummary(action.label);
          console.log('[MCPActionBar] Built-in action sent successfully');
        } catch (error) {
          console.error('[MCPActionBar] Error sending built-in action:', error);
        }
      }
      return;
    }
    
    // Emit event for parent to handle MCP actions
    this.dispatchEvent(new CustomEvent('mcp-action', {
      detail: { action },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="action-bar">
          <div class="loading">
            <div class="loading-spinner"></div>
            <span>Loading actions...</span>
          </div>
        </div>
      `;
    }

    if (!this.actions || this.actions.length === 0) {
      return html``;
    }

    return html`
      <div class="action-bar">
        ${this.actions.map((action, index) => html`
          ${index > 0 && index % 3 === 0 ? html`<div class="divider"></div>` : ''}
          <button
            class="action-button ${action.primary ? 'primary' : ''}"
            @click=${() => this.handleActionClick(action)}
            title=${action.description || action.label}
          >
            <span class="action-icon">${action.label.split(' ')[0]}</span>
            <span>${action.label.split(' ').slice(1).join(' ')}</span>
          </button>
        `)}
      </div>
    `;
  }

  async updateContext(newContext) {
    this.context = newContext;
    await this.loadContextualActions();
  }

  // Add lifecycle hook to reload actions on context change
  updated(changedProps) {
    if (changedProps.has('context')) {
      // Show built-in actions immediately if available
      const builtInActions = this.getBuiltInActions();
      if (builtInActions.length > 0) {
        this.actions = builtInActions;
        this.requestUpdate();
        console.log(`[MCPActionBar] Updated built-in actions: ${builtInActions.length}`);
      }
      
      // Then load MCP actions
      this.loadContextualActions();
    }
  }
}

customElements.define('mcp-action-bar', MCPActionBar); 