import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

class MCPUIIntegration extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin: 16px 0;
      background: #f9f9f9;
    }

    .email-form {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .form-title {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #555;
      font-size: 14px;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #007acc;
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.1);
    }

    .form-group textarea {
      resize: vertical;
      min-height: 120px;
      font-family: inherit;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007acc;
      color: white;
    }

    .btn-primary:hover {
      background: #0066b3;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #666;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #ebebeb;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .status-message {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .status-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .status-info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .no-ui {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      font-style: italic;
    }
  `;

  constructor() {
    super();
    this.emailData = {
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: ''
    };
    this.isVisible = false;
    this.isLoading = false;
    this.statusMessage = null;
    this.statusType = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Listen for new UI resources
    window.addEventListener('mcp:ui-resource-available', this.handleNewResource.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('mcp:ui-resource-available', this.handleNewResource.bind(this));
  }

  handleNewResource(event) {
    console.log('New UI resource received:', event.detail);
    
    const { serverId, tool, resource } = event.detail;
    
    // Check if this is an email-related resource
    if (tool?.includes('gmail') || tool?.includes('email') || serverId === 'google') {
      this.showEmailForm();
      
      // Try to extract any pre-filled data from the context
      this.extractEmailContext(event.detail);
    }
  }

  extractEmailContext(resourceData) {
    // If there's context about the email from the conversation, extract it
    const context = resourceData.context || {};
    
    if (context.recipients) {
      this.emailData.to = Array.isArray(context.recipients) ? context.recipients.join(', ') : context.recipients;
    }
    
    if (context.subject) {
      this.emailData.subject = context.subject;
    }
    
    if (context.body) {
      this.emailData.body = context.body;
    }
    
    this.requestUpdate();
  }

  showEmailForm() {
    this.isVisible = true;
    this.statusMessage = null;
    this.requestUpdate();
  }

  hideEmailForm() {
    this.isVisible = false;
    this.resetForm();
    this.requestUpdate();
  }

  resetForm() {
    this.emailData = {
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: ''
    };
    this.statusMessage = null;
    this.statusType = null;
  }

  handleInputChange(field, event) {
    this.emailData[field] = event.target.value;
    this.requestUpdate();
  }

  async sendEmail() {
    // Validate required fields
    if (!this.emailData.to.trim()) {
      this.showStatus('Please enter at least one recipient', 'error');
      return;
    }
    
    if (!this.emailData.subject.trim()) {
      this.showStatus('Please enter a subject', 'error');
      return;
    }
    
    if (!this.emailData.body.trim()) {
      this.showStatus('Please enter a message', 'error');
      return;
    }

    this.isLoading = true;
    this.showStatus('Sending email...', 'info');
    
    try {
      // Call the Gmail MCP tool
      const result = await window.api.mcp.ui.invokeAction('gmail.send', {
        to: this.emailData.to.split(',').map(e => e.trim()).filter(e => e),
        cc: this.emailData.cc ? this.emailData.cc.split(',').map(e => e.trim()).filter(e => e) : [],
        bcc: this.emailData.bcc ? this.emailData.bcc.split(',').map(e => e.trim()).filter(e => e) : [],
        subject: this.emailData.subject,
        body: this.emailData.body
      });
      
      if (result.success) {
        this.showStatus('✅ Email sent successfully!', 'success');
        setTimeout(() => {
          this.hideEmailForm();
        }, 2000);
      } else {
        this.showStatus(`❌ Failed to send email: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      this.showStatus(`❌ Error sending email: ${error.message}`, 'error');
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  async saveDraft() {
    this.isLoading = true;
    this.showStatus('Saving draft...', 'info');
    
    try {
      const result = await window.api.mcp.ui.invokeAction('gmail.draft', {
        to: this.emailData.to.split(',').map(e => e.trim()).filter(e => e),
        cc: this.emailData.cc ? this.emailData.cc.split(',').map(e => e.trim()).filter(e => e) : [],
        bcc: this.emailData.bcc ? this.emailData.bcc.split(',').map(e => e.trim()).filter(e => e) : [],
        subject: this.emailData.subject,
        body: this.emailData.body
      });
      
      if (result.success) {
        this.showStatus('✅ Draft saved successfully!', 'success');
      } else {
        this.showStatus(`❌ Failed to save draft: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      this.showStatus(`❌ Error saving draft: ${error.message}`, 'error');
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  showStatus(message, type) {
    this.statusMessage = message;
    this.statusType = type;
    this.requestUpdate();
  }

  render() {
    if (!this.isVisible) {
      return html`
        <div class="no-ui">
          💌 Say "I need to send an email" to open the email composer
        </div>
      `;
    }

    return html`
      <div class="email-form">
        <h3 class="form-title">
          📧 Compose Email
        </h3>

        ${this.statusMessage ? html`
          <div class="status-message status-${this.statusType}">
            ${this.statusMessage}
          </div>
        ` : ''}

        <div class="form-group">
          <label for="to">To *</label>
          <input
            id="to"
            type="email"
            placeholder="recipient@example.com, another@example.com"
            .value=${this.emailData.to}
            @input=${(e) => this.handleInputChange('to', e)}
            ?disabled=${this.isLoading}
          />
        </div>

        <div class="form-group">
          <label for="cc">CC</label>
          <input
            id="cc"
            type="email"
            placeholder="cc@example.com"
            .value=${this.emailData.cc}
            @input=${(e) => this.handleInputChange('cc', e)}
            ?disabled=${this.isLoading}
          />
        </div>

        <div class="form-group">
          <label for="bcc">BCC</label>
          <input
            id="bcc"
            type="email"
            placeholder="bcc@example.com"
            .value=${this.emailData.bcc}
            @input=${(e) => this.handleInputChange('bcc', e)}
            ?disabled=${this.isLoading}
          />
        </div>

        <div class="form-group">
          <label for="subject">Subject *</label>
          <input
            id="subject"
            type="text"
            placeholder="Email subject"
            .value=${this.emailData.subject}
            @input=${(e) => this.handleInputChange('subject', e)}
            ?disabled=${this.isLoading}
          />
        </div>

        <div class="form-group">
          <label for="body">Message *</label>
          <textarea
            id="body"
            placeholder="Type your message here..."
            .value=${this.emailData.body}
            @input=${(e) => this.handleInputChange('body', e)}
            ?disabled=${this.isLoading}
          ></textarea>
        </div>

        <div class="form-actions">
          <button
            class="btn btn-primary"
            @click=${this.sendEmail}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading ? '⏳ Sending...' : '📤 Send Email'}
          </button>
          
          <button
            class="btn btn-secondary"
            @click=${this.saveDraft}
            ?disabled=${this.isLoading}
          >
            💾 Save Draft
          </button>
          
          <button
            class="btn btn-secondary"
            @click=${this.hideEmailForm}
            ?disabled=${this.isLoading}
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('mcp-ui-integration', MCPUIIntegration); 