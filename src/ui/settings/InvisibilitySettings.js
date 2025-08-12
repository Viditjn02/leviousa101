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

        .toggle {
            width: 40px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            position: relative;
            cursor: pointer;
            transition: background 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .toggle.active {
            background: rgba(34, 197, 94, 0.3);
            border-color: rgba(34, 197, 94, 0.5);
        }

        .toggle::after {
            content: '';
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 1px;
            left: 1px;
            transition: transform 0.3s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .toggle.active::after {
            transform: translateX(20px);
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

        .test-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
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

        .log-output {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            padding: 8px;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            font-size: 9px;
            color: rgba(255, 255, 255, 0.7);
            max-height: 120px;
            overflow-y: auto;
            margin-top: 8px;
            white-space: pre-wrap;
        }
    `;

    static properties = {
        status: { type: Object },
        isLoading: { type: Boolean },
        testResults: { type: Object },
        showAdvanced: { type: Boolean }
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
        this.testResults = {};
        this.showAdvanced = false;
        
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

    async runTest(testType) {
        try {
            this.testResults = { ...this.testResults, [testType]: 'Running...' };
            
            let result;
            switch (testType) {
                case 'questionDetection':
                    result = await window.api.invisibility.testQuestionDetection();
                    break;
                case 'fieldDetection':
                    result = await window.api.invisibility.testFieldDetection();
                    break;
                case 'typing':
                    result = await window.api.invisibility.testTyping();
                    break;
                case 'answerGeneration':
                    result = await window.api.invisibility.testAnswerGeneration();
                    break;
                case 'remoteAccess':
                    result = await window.api.invisibility.testRemoteAccessDetection();
                    break;
                default:
                    throw new Error(`Unknown test type: ${testType}`);
            }
            
            this.testResults = { 
                ...this.testResults, 
                [testType]: result.success ? 'Success' : `Error: ${result.error}` 
            };
        } catch (error) {
            this.testResults = { 
                ...this.testResults, 
                [testType]: `Error: ${error.message}` 
            };
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
                        ${this.status.isInvisibilityModeActive ? 'Active' : 'Inactive'}
                    </span>
                    ${this.status.isMonitoring ? html`
                        <span class="status-badge monitoring">Monitoring</span>
                    ` : ''}
                </div>

                <div class="control-group">
                    <div>
                        <div class="control-label">Enable Complete Invisibility</div>
                        <div class="control-description">
                            Automatically hide overlay during remote access and enable CMD+L auto-answering
                        </div>
                    </div>
                    <div 
                        class="toggle ${this.status.isInvisibilityModeActive ? 'active' : ''}"
                        @click=${this.toggleInvisibilityMode}
                    ></div>
                </div>

                <div class="info">
                    <strong>How it works:</strong> When enabled, the system monitors for remote access and keeps the overlay hidden.
                    <br><br>
                    <strong>Shortcuts:</strong><br>
                    • <span class="hotkey-display"><span class="key">⌘</span> + <span class="key">I</span></span> - Toggle complete invisibility mode on/off<br>
                    • <span class="hotkey-display"><span class="key">⌘</span> + <span class="key">L</span></span> - Detect questions and auto-type answers
                </div>

                ${this.status.lastRemoteAccessState ? html`
                    <div class="warning">
                        🚨 Remote access currently detected! Overlay is hidden for safety.
                    </div>
                ` : ''}
            </div>

            <div class="section">
                <div class="section-title">🎯 Auto-Answer Controls</div>
                
                <div class="control-group">
                    <div>
                        <div class="control-label">Question Detection</div>
                        <div class="control-description">Automatically detect coding, interview, and technical questions</div>
                    </div>
                    <div 
                        class="toggle ${this.status.config?.questionDetectionEnabled ? 'active' : ''}"
                        @click=${() => this.updateConfig('questionDetectionEnabled', !this.status.config?.questionDetectionEnabled)}
                    ></div>
                </div>

                <div class="control-group">
                    <div>
                        <div class="control-label">Auto-Answering</div>
                        <div class="control-description">Automatically type answers when questions are detected</div>
                    </div>
                    <div 
                        class="toggle ${this.status.config?.autoAnsweringEnabled ? 'active' : ''}"
                        @click=${() => this.updateConfig('autoAnsweringEnabled', !this.status.config?.autoAnsweringEnabled)}
                    ></div>
                </div>

                <div class="control-group">
                    <div>
                        <div class="control-label">Typing Speed Mode</div>
                        <div class="control-description">Choose between human-like or instant typing</div>
                    </div>
                    <div 
                        class="toggle ${this.status.config?.typingSpeedMode === 'human' ? 'active' : ''}"
                        @click=${() => this.updateConfig('typingSpeedMode', this.status.config?.typingSpeedMode === 'human' ? 'bolt' : 'human')}
                    ></div>
                </div>
                <div class="info" style="font-size: 10px; margin-top: 4px;">
                    ${this.status.config?.typingSpeedMode === 'human' ? '🧑 Human-like typing' : '⚡ Instant typing'}
                </div>

                <button class="button primary" @click=${this.triggerManualAnswer}>
                    🧠 Trigger Answer Detection (CMD+L)
                </button>
            </div>

            <!-- MCP UI Integration - Now integrated throughout the app -->
            <!-- <mcp-ui-integration></mcp-ui-integration> -->

            <div class="section">
                <div class="section-title">ℹ️ Usage Notes</div>
                <div class="info">
                    <strong>Requirements:</strong><br>
                    • Accessibility permissions in System Preferences<br>
                    • Works with web browsers and most applications<br><br>
                    <strong>Usage Guidelines:</strong><br>
                    • Use responsibly and follow platform guidelines<br>
                    • Best for learning and practice environments
                </div>
            </div>
        `;
    }
}

customElements.define('invisibility-settings', InvisibilitySettings); 