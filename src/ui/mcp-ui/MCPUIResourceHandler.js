import { LitElement, html, css } from '../assets/lit-core-2.7.4.min.js';

export class MCPUIResourceHandler extends LitElement {
  static properties = {
    activeResource: { type: Object },
    isVisible: { type: Boolean },
    displayType: { type: String }
  };

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .overlay.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      background: #1a1a1a;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      max-width: 90%;
      max-height: 90%;
      width: 600px;
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: none;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal.visible {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
      pointer-events: auto;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.03);
    }

    .modal-title {
      font-size: 16px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }

    .close-button {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }

    .modal-content {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    .resource-frame {
      width: 100%;
      height: 500px;
      border: none;
      background: white;
    }

    .inline-container {
      position: relative;
      margin: 16px 0;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .inline-frame {
      width: 100%;
      height: 300px;
      border: none;
      background: white;
    }
  `;

  constructor() {
    super();
    this.activeResource = null;
    this.isVisible = false;
    this.displayType = 'modal';
    this.onAction = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Listen for UI resource events
    if (window.api?.mcp?.ui) {
      window.api.mcp.ui.onResourceAvailable((event, data) => {
        this.showResource(data);
      });
    }

    // Listen for escape key to close modal
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.isVisible && this.displayType === 'modal') {
      this.close();
    }
  }

  showResource(data) {
    console.log('[MCPUIResourceHandler] Showing resource:', data);
    
    this.activeResource = data.resource;
    this.displayType = data.type || 'modal';
    this.onAction = data.onAction;
    this.isVisible = true;

    // Set up message listener for iframe
    if (this.onAction) {
      window.addEventListener('message', this.handleIframeMessage.bind(this));
    }
  }

  handleIframeMessage(event) {
    // Validate origin if needed
    const message = event.data;
    
    if (message.type === 'ui-action' && this.onAction) {
      console.log('[MCPUIResourceHandler] Received UI action:', message);
      
      // Call the action handler
      this.onAction(message.tool, message.params)
        .then(result => {
          console.log('[MCPUIResourceHandler] Action result:', result);
          
          // Send result back to iframe if needed
          if (event.source) {
            event.source.postMessage({
              type: 'ui-action-result',
              success: true,
              result
            }, '*');
          }
        })
        .catch(error => {
          console.error('[MCPUIResourceHandler] Action error:', error);
          
          if (event.source) {
            event.source.postMessage({
              type: 'ui-action-result',
              success: false,
              error: error.message
            }, '*');
          }
        });
    }
  }

  close() {
    this.isVisible = false;
    
    // Clean up message listener
    window.removeEventListener('message', this.handleIframeMessage.bind(this));
    
    // Clear resource after animation
    setTimeout(() => {
      this.activeResource = null;
      this.onAction = null;
    }, 300);
  }

  render() {
    if (!this.activeResource) {
      return html``;
    }

    const resource = this.activeResource;
    const isModal = this.displayType === 'modal';

    if (isModal) {
      return html`
        <div class="overlay ${this.isVisible ? 'visible' : ''}" @click=${this.close}>
          <div class="modal ${this.isVisible ? 'visible' : ''}" @click=${(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h3 class="modal-title">${resource.title || 'MCP Action'}</h3>
              <button class="close-button" @click=${this.close}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-content">
              <iframe
                class="resource-frame"
                srcdoc=${resource.text || ''}
                sandbox="allow-scripts allow-forms allow-same-origin"
                @load=${this.handleIframeLoad}
              ></iframe>
            </div>
          </div>
        </div>
      `;
    } else {
      return html`
        <div class="inline-container">
          <iframe
            class="inline-frame"
            srcdoc=${resource.text || ''}
            sandbox="allow-scripts allow-forms allow-same-origin"
            @load=${this.handleIframeLoad}
          ></iframe>
        </div>
      `;
    }
  }

  handleIframeLoad(event) {
    console.log('[MCPUIResourceHandler] Iframe loaded');
    
    // Inject styles to make the iframe content look good
    const iframe = event.target;
    if (iframe.contentDocument) {
      const style = iframe.contentDocument.createElement('style');
      style.textContent = `
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: transparent;
        }
      `;
      iframe.contentDocument.head.appendChild(style);
    }
  }
}

customElements.define('mcp-ui-resource-handler', MCPUIResourceHandler); 