import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class InvisibilitySettings extends LitElement {
    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
            box-sizing: border-box;
        }

        :host {
            display: block;
            width: 100%;
            color: white;
        }

        .section {
            margin-bottom: 20px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
        }

        .status-badge.active {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .status-badge.inactive {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-badge.monitoring {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .control-group {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 0;
        }

        .control-label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            flex: 1;
        }

        .control-description {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 2px;
            line-height: 1.3;
        }

        /* Toggle Switch Styles - Same as Integrations */
        .toggle-switch {
            position: relative;
            width: 44px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #333;
            transition: 0.3s;
            border-radius: 24px;
            border: 1px solid #555;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: #aaa;
            transition: 0.3s;
            border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
            background-color: #4CAF50;
            border-color: #4CAF50;
        }

        .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(18px);
            background-color: white;
        }

        .toggle-switch input:disabled + .toggle-slider {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            padding: 6px 12px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin: 2px;
        }

        .button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .button.primary {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(59, 130, 246, 0.4);
            color: #60a5fa;
        }

        .button.primary:hover {
            background: rgba(59, 130, 246, 0.3);
            border-color: rgba(59, 130, 246, 0.6);
        }

        .button.danger {
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.4);
            color: #f87171;
        }

        .button.danger:hover {
            background: rgba(239, 68, 68, 0.3);
            border-color: rgba(239, 68, 68, 0.6);
        }

        .button.success {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.4);
            color: #4ade80;
        }

        .button.success:hover {
            background: rgba(34, 197, 94, 0.3);
            border-color: rgba(34, 197, 94, 0.6);
        }

        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }



        .hotkey-display {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 4px 8px;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.9);
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .key {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 10px;
        }

        .warning {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 6px;
            padding: 8px;
            margin-top: 8px;
            font-size: 10px;
            color: rgba(245, 158, 11, 0.9);
            line-height: 1.4;
        }

        .info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 6px;
            padding: 8px;
            margin-top: 8px;
            font-size: 10px;
            color: rgba(59, 130, 246, 0.9);
            line-height: 1.4;
        }


    `;

    static properties = {
        status: { type: Object },
        isLoading: { type: Boolean }
    };

    constructor() {
        super();
        this.status = {
            isInvisibilityModeActive: false,
            isMonitoring: false,
            isProcessingQuestion: false,
            lastRemoteAccessState: false,
            config: {}
        };
        this.isLoading = true;
        
        this.loadStatus();
        this.setupEventListeners();
    }

    async loadStatus() {
        try {
            const result = await window.api.invisibility.getStatus();
            if (result.success) {
                this.status = result.status;
            }
        } catch (error) {
            console.error('Failed to load invisibility status:', error);
        } finally {
            this.isLoading = false;
        }
    }

    setupEventListeners() {
        // Listen for invisibility events
        window.api.invisibility.onModeEnabled(() => {
            this.status = { ...this.status, isInvisibilityModeActive: true };
        });

        window.api.invisibility.onModeDisabled(() => {
            this.status = { ...this.status, isInvisibilityModeActive: false };
        });

        window.api.invisibility.onRemoteAccessDetected(() => {
            this.status = { ...this.status, lastRemoteAccessState: true };
        });

        window.api.invisibility.onRemoteAccessEnded(() => {
            this.status = { ...this.status, lastRemoteAccessState: false };
        });

        window.api.invisibility.onConfigUpdated((config) => {
            this.status = { ...this.status, config };
        });
    }

    async toggleInvisibilityMode() {
        try {
            const result = this.status.isInvisibilityModeActive 
                ? await window.api.invisibility.disable()
                : await window.api.invisibility.enable();
            
            if (!result.success) {
                console.error('Failed to toggle invisibility mode:', result.error);
            }
        } catch (error) {
            console.error('Error toggling invisibility mode:', error);
        }
    }

    async updateConfig(key, value) {
        try {
            const newConfig = { [key]: value };
            const result = await window.api.invisibility.updateConfig(newConfig);
            
            if (!result.success) {
                console.error('Failed to update config:', result.error);
            }
        } catch (error) {
            console.error('Error updating config:', error);
        }
    }



    async triggerManualAnswer() {
        try {
            const result = await window.api.invisibility.processQuestion();
            if (!result.success) {
                console.error('Failed to process question:', result.error);
            }
        } catch (error) {
            console.error('Error processing question:', error);
        }
    }

    render() {
        if (this.isLoading) {
            return html`
                <div class="section">
                    <div class="section-title">Loading...</div>
                </div>
            `;
        }

        return html`
            <div class="section">
                <div class="section-title">
                    🕵️ Complete Invisibility Mode
                    <span class="status-badge ${this.status.isInvisibilityModeActive ? 'active' : 'inactive'}">
                        ${this.status.isInvisibilityModeActive ? 'On' : 'Off'}
                    </span>
                </div>

                <div class="control-group">
                    <div>
                        <div class="control-label">Enable Complete Invisibility</div>
                        <div class="control-description">
                            Automatically hide Leviousa when screen sharing and enable instant help
                        </div>
                    </div>
                    <label class="toggle-switch">
                        <input 
                            type="checkbox" 
                            .checked=${this.status.isInvisibilityModeActive}
                            @change=${this.toggleInvisibilityMode}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="info">
                    <strong>How it works:</strong> Leviousa automatically hides when you're sharing your screen to keep it private.
                    <br><br>
                    <strong>Shortcuts:</strong><br>
                    • <span class="hotkey-display"><span class="key">⌘</span> + <span class="key">I</span></span> - Toggle complete invisibility mode on/off<br>
                    • <span class="hotkey-display"><span class="key">⌘</span> + <span class="key">L</span></span> - Detect questions and auto-type answers
                </div>

                ${this.status.lastRemoteAccessState ? html`
                    <div class="warning">
                        🚨 Screen sharing detected! Leviousa is now hidden for privacy.
                    </div>
                ` : ''}
            </div>

            <div class="section">
                <div class="section-title">🎯 Auto-Answer Controls</div>
                
                <div class="control-group">
                    <div>
                        <div class="control-label">Smart Recognition</div>
                        <div class="control-description">Automatically spot questions and problems on your screen</div>
                    </div>
                    <label class="toggle-switch">
                        <input 
                            type="checkbox" 
                            .checked=${this.status.config?.questionDetectionEnabled}
                            @change=${() => this.updateConfig('questionDetectionEnabled', !this.status.config?.questionDetectionEnabled)}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="control-group">
                    <div>
                        <div class="control-label">Auto-Type Answers</div>
                        <div class="control-description">Instantly type solutions when problems are found</div>
                    </div>
                    <label class="toggle-switch">
                        <input 
                            type="checkbox" 
                            .checked=${this.status.config?.autoAnsweringEnabled}
                            @change=${() => this.updateConfig('autoAnsweringEnabled', !this.status.config?.autoAnsweringEnabled)}
                        />
                        <span class="toggle-slider"></span>
                    </label>
                </div>


            </div>




        `;
    }
}

customElements.define('invisibility-settings', InvisibilitySettings); 