// Eye Contact Correction UI Component
import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class EyeContactSettings extends LitElement {
    static properties = {
        enabled: { type: Boolean },
        hasApiKey: { type: Boolean },
        processing: { type: Boolean },
        apiKey: { type: String },
        status: { type: Object }
    };

    static styles = css`
        :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .container {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }

        .title {
            font-size: 18px;
            font-weight: 600;
            color: white;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .beta-badge {
            background: rgba(255, 200, 0, 0.2);
            color: #ffc800;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .toggle-switch {
            position: relative;
            width: 48px;
            height: 24px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.3s ease;
        }

        .toggle-switch.enabled {
            background: #4CAF50;
        }

        .toggle-switch.disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }

        .toggle-slider {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s ease;
        }

        .toggle-switch.enabled .toggle-slider {
            transform: translateX(24px);
        }

        .description {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 16px;
        }

        .api-key-section {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
        }

        .api-key-label {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .api-key-input {
            width: 100%;
            padding: 10px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-family: monospace;
        }

        .api-key-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        .save-button {
            margin-top: 12px;
            padding: 8px 16px;
            background: #2196F3;
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .save-button:hover {
            background: #1976D2;
        }

        .save-button:disabled {
            background: rgba(255, 255, 255, 0.2);
            cursor: not-allowed;
        }

        .status {
            margin-top: 16px;
            padding: 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            font-size: 12px;
        }

        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
            color: rgba(255, 255, 255, 0.7);
        }

        .status-item:last-child {
            margin-bottom: 0;
        }

        .status-value {
            color: white;
            font-weight: 500;
        }

        .status-value.active {
            color: #4CAF50;
        }

        .status-value.inactive {
            color: #f44336;
        }

        .info-link {
            color: #2196F3;
            text-decoration: none;
            font-size: 12px;
            margin-top: 8px;
            display: inline-block;
        }

        .info-link:hover {
            text-decoration: underline;
        }
    `;

    constructor() {
        super();
        this.enabled = false;
        this.hasApiKey = false;
        this.processing = false;
        this.apiKey = '';
        this.status = {
            enabled: false,
            processing: false,
            hasApiKey: false,
            lastProcessed: 0
        };
        
        this.loadStatus();
    }

    async loadStatus() {
        if (window.api?.eyecontact) {
            const status = await window.api.eyecontact.getStatus();
            this.status = status;
            this.enabled = status.enabled;
            this.hasApiKey = status.hasApiKey;
            this.processing = status.processing;
        }
    }

    async toggleEyeContact() {
        if (!this.hasApiKey) {
            alert('Please add a Sieve API key first');
            return;
        }

        this.enabled = !this.enabled;
        
        if (window.api?.eyecontact) {
            if (this.enabled) {
                await window.api.eyecontact.enable();
            } else {
                await window.api.eyecontact.disable();
            }
        }
        
        this.requestUpdate();
    }

    async saveApiKey() {
        if (window.api?.eyecontact) {
            await window.api.eyecontact.setApiKey(this.apiKey);
            await this.loadStatus();
            
            // Clear the input for security
            this.apiKey = '';
            this.requestUpdate();
        }
    }

    handleApiKeyInput(e) {
        this.apiKey = e.target.value;
    }

    openSieveDocs() {
        if (window.api?.common) {
            window.api.common.openExternal('https://www.sievedata.com/functions/sieve/eye-contact-correction');
        }
    }

    render() {
        return html`
            <div class="container">
                <div class="header">
                    <div class="title">
                        👁️ Eye Contact Correction
                        <span class="beta-badge">BETA</span>
                    </div>
                    <div 
                        class="toggle-switch ${this.enabled ? 'enabled' : ''} ${!this.hasApiKey ? 'disabled' : ''}"
                        @click=${this.toggleEyeContact}
                    >
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                
                <div class="description">
                    Automatically correct eye contact in video calls using Sieve AI. 
                    This feature processes your video feed in real-time to make it appear 
                    as if you're looking at the camera.
                </div>

                ${!this.hasApiKey ? html`
                    <div class="api-key-section">
                        <div class="api-key-label">Sieve API Key Required</div>
                        <input 
                            type="password"
                            class="api-key-input"
                            placeholder="Enter your Sieve API key"
                            .value=${this.apiKey}
                            @input=${this.handleApiKeyInput}
                        />
                        <button 
                            class="save-button"
                            @click=${this.saveApiKey}
                            ?disabled=${!this.apiKey}
                        >
                            Save API Key
                        </button>
                        <a 
                            href="#" 
                            class="info-link"
                            @click=${(e) => { e.preventDefault(); this.openSieveDocs(); }}
                        >
                            Get your API key from Sieve →
                        </a>
                    </div>
                ` : html`
                    <div class="status">
                        <div class="status-item">
                            <span>Status</span>
                            <span class="status-value ${this.enabled ? 'active' : 'inactive'}">
                                ${this.enabled ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div class="status-item">
                            <span>API Key</span>
                            <span class="status-value active">✓ Configured</span>
                        </div>
                        <div class="status-item">
                            <span>Processing</span>
                            <span class="status-value ${this.processing ? 'active' : ''}">
                                ${this.processing ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
}

customElements.define('eye-contact-settings', EyeContactSettings);
