// Note: These will be loaded differently in browser vs Node.js
let LitElement, html, css, DOMPurify;

if (typeof window !== 'undefined') {
  // Browser environment - will be imported via script tags
  ({ LitElement, html, css } = window.LitElement || {});
  DOMPurify = window.DOMPurify;
} else {
  // Node.js environment for testing
  try {
    ({ LitElement, html, css } = require('lit-element'));
    DOMPurify = require('dompurify');
  } catch (e) {
    // Fallback for testing environment
    LitElement = class { static properties = {}; };
    html = (strings, ...values) => strings.join('');
    css = (strings, ...values) => strings.join('');
    DOMPurify = { sanitize: (html) => html };
  }
}

class MCPUIRenderer extends LitElement {
  static properties = {
    resource: { type: Object },
    serverId: { type: String },
    toolName: { type: String },
    loading: { type: Boolean },
    error: { type: String },
    iframeHeight: { type: Number }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      margin: 10px 0;
    }

    .ui-container {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .ui-header {
      background: var(--bg-primary, #2a2a2a);
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color, #333);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ui-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary, #fff);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .server-badge {
      font-size: 12px;
      padding: 2px 8px;
      background: var(--accent-bg, #0066ff22);
      color: var(--accent-color, #0066ff);
      border-radius: 4px;
    }

    .ui-content {
      position: relative;
      background: white;
      min-height: 100px;
      max-height: 600px;
      overflow-y: auto;
    }

    iframe {
      width: 100%;
      border: none;
      display: block;
      transition: height 0.3s ease;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--text-secondary, #999);
    }

    .error {
      padding: 20px;
      color: var(--error-color, #ff4444);
      background: var(--error-bg, #ff444422);
      border-radius: 4px;
      margin: 16px;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .action-button {
      padding: 4px 12px;
      background: var(--button-bg, #333);
      color: var(--button-text, #fff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .action-button:hover {
      background: var(--button-hover-bg, #444);
    }

    .action-button.refresh {
      background: var(--accent-bg, #0066ff22);
      color: var(--accent-color, #0066ff);
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--spinner-color, #333);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this.resource = null;
    this.serverId = '';
    this.toolName = '';
    this.loading = false;
    this.error = null;
    this.iframeHeight = 200;
    this._messageHandler = this._handleMessage.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this._messageHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this._messageHandler);
  }

  render() {
    if (this.error) {
      return html`
        <div class="ui-container">
          <div class="ui-header">
            <div class="ui-title">
              <span>UI Resource Error</span>
              ${this.serverId ? html`<span class="server-badge">${this.serverId}</span>` : ''}
            </div>
          </div>
          <div class="error">${this.error}</div>
        </div>
      `;
    }

    if (this.loading) {
      return html`
        <div class="ui-container">
          <div class="ui-header">
            <div class="ui-title">Loading UI Resource...</div>
          </div>
          <div class="loading">
            <div class="spinner"></div>
          </div>
        </div>
      `;
    }

    if (!this.resource) {
      return html``;
    }

    return html`
      <div class="ui-container">
        <div class="ui-header">
          <div class="ui-title">
            <span>${this.resource.title || this.toolName || 'UI Component'}</span>
            ${this.serverId ? html`<span class="server-badge">${this.serverId}</span>` : ''}
          </div>
          <div class="actions">
            <button class="action-button refresh" @click=${this._refresh}>
              Refresh
            </button>
            <button class="action-button" @click=${this._close}>
              Close
            </button>
          </div>
        </div>
        <div class="ui-content">
          ${this._renderContent()}
        </div>
      </div>
    `;
  }

  _renderContent() {
    if (!this.resource) return html``;

    const { mimeType, content, text, uri } = this.resource;

    // Handle different content types
    if (mimeType === 'text/html' || (uri && uri.startsWith('ui://'))) {
      return this._renderHTMLContent(text || content);
    } else if (mimeType === 'application/json') {
      return this._renderJSONContent(text || content);
    } else {
      return html`<div style="padding: 20px;">Unsupported content type: ${mimeType}</div>`;
    }
  }

  _renderHTMLContent(htmlContent) {
    // Create a sandboxed iframe for security
    const iframeId = `mcp-ui-iframe-${Math.random().toString(36).substr(2, 9)}`;
    
    // Wrap the content with necessary scripts for communication
    const wrappedContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
          }
          
          button {
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid #ddd;
            background: #f0f0f0;
            transition: all 0.2s;
          }
          
          button:hover {
            background: #e0e0e0;
          }
          
          input, select, textarea {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
            margin: 4px 0;
          }
          
          .form-group {
            margin-bottom: 16px;
          }
          
          label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
          }
        </style>
        <script>
          // Set up communication with parent window
          window.addEventListener('load', function() {
            // Notify parent of content height
            function updateHeight() {
              const height = document.body.scrollHeight;
              window.parent.postMessage({
                type: 'resize',
                height: height,
                frameId: '${iframeId}'
              }, '*');
            }
            
            // Initial height update
            updateHeight();
            
            // Watch for content changes
            const observer = new MutationObserver(updateHeight);
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true
            });
            
            // Override window.parent.postMessage for UI actions
            const originalPostMessage = window.parent.postMessage.bind(window.parent);
            window.parent.postMessage = function(message, targetOrigin) {
              if (message.type === 'ui-action') {
                message.frameId = '${iframeId}';
                message.serverId = '${this.serverId}';
              }
              originalPostMessage(message, targetOrigin);
            };
          });
        </script>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    // Create blob URL for the iframe content
    const blob = new Blob([wrappedContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    // Clean up blob URL after iframe loads
    setTimeout(() => {
      const iframe = this.shadowRoot.querySelector(`#${iframeId}`);
      if (iframe) {
        iframe.addEventListener('load', () => {
          URL.revokeObjectURL(blobUrl);
        }, { once: true });
      }
    }, 0);

    return html`
      <iframe
        id=${iframeId}
        src=${blobUrl}
        height=${this.iframeHeight}
        sandbox="allow-scripts allow-forms allow-same-origin"
        @load=${this._onIframeLoad}
      ></iframe>
    `;
  }

  _renderJSONContent(jsonContent) {
    try {
      const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      return html`
        <pre style="padding: 16px; margin: 0; overflow-x: auto;">
          ${JSON.stringify(data, null, 2)}
        </pre>
      `;
    } catch (e) {
      return html`<div style="padding: 16px; color: red;">Invalid JSON content</div>`;
    }
  }

  _handleMessage(event) {
    const { data } = event;
    
    if (!data || typeof data !== 'object') return;

    // Handle iframe resize messages
    if (data.type === 'resize' && data.frameId) {
      const iframe = this.shadowRoot.querySelector(`#${data.frameId}`);
      if (iframe && data.height) {
        this.iframeHeight = Math.min(600, Math.max(100, data.height + 20));
      }
    }

    // Handle UI actions from iframe
    if (data.type === 'ui-action' && data.serverId === this.serverId) {
      this._handleUIAction(data);
    }
  }

  async _handleUIAction(action) {
    const { tool, params } = action;
    
    if (!tool || !params) {
      console.error('Invalid UI action:', action);
      return;
    }

    try {
      // Dispatch event to parent component
      this.dispatchEvent(new CustomEvent('ui-action', {
        detail: {
          serverId: this.serverId,
          tool,
          params
        },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Error handling UI action:', error);
    }
  }

  _refresh() {
    this.dispatchEvent(new CustomEvent('refresh', {
      detail: { serverId: this.serverId, toolName: this.toolName },
      bubbles: true,
      composed: true
    }));
  }

  _close() {
    this.dispatchEvent(new CustomEvent('close', {
      detail: { serverId: this.serverId, toolName: this.toolName },
      bubbles: true,
      composed: true
    }));
  }

  _onIframeLoad(event) {
    // Additional iframe load handling if needed
    console.log('UI iframe loaded:', this.serverId, this.toolName);
  }
}

customElements.define('mcp-ui-renderer', MCPUIRenderer);

module.exports = { MCPUIRenderer }; 