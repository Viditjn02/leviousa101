import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import './VoiceEnrollmentComponent.js';

export class VoiceAgentSettings extends LitElement {
    static styles = css`
        :host {
            display: block;
            padding: 6px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .section-title {
            font-size: 11px;
            font-weight: 500;
            color: white;
            margin: 0;
        }

        .status-indicator {
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid;
        }

        .status-indicator.active {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 0.8);
        }

        .status-indicator.inactive {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
        }

        .status-indicator.listening {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.7);
        }

        .status-indicator.conversing {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.7);
        }

        .status-indicator.error {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.6);
        }

        .main-toggle {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            width: 100%;
            margin-bottom: 6px;
        }

        .main-toggle:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .main-toggle.active {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 0.9);
        }

        .main-toggle:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            pointer-events: none;
        }

        .config-section {
            margin: 6px 0;
        }

        .config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 0;
            font-size: 10px;
        }

        .config-label {
            color: rgba(255, 255, 255, 0.8);
            flex: 1;
        }

        .config-toggle {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            color: white;
            padding: 2px 6px;
            font-size: 9px;
            cursor: pointer;
            min-width: 40px;
            text-align: center;
        }

        .config-toggle:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .config-toggle.enabled {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 0.9);
        }

        .voice-selector {
            width: 100%;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            border-radius: 3px;
            padding: 3px;
            font-size: 10px;
            margin: 3px 0;
        }

        .voice-selector option {
            background: #1a1a1a;
            color: white;
        }

        .action-buttons {
            display: flex;
            gap: 3px;
            margin: 6px 0;
        }

        .action-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            color: white;
            padding: 4px 8px;
            font-size: 10px;
            cursor: pointer;
            flex: 1;
            text-align: center;
        }

        .action-button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .action-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .action-button.primary {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 0.9);
        }

        .action-button.primary:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .action-button.warning {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.8);
        }

        .action-button.danger {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.7);
        }

        .test-section {
            margin: 6px 0;
        }

        .test-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px;
            margin: 3px 0;
        }

        .test-button {
            background: rgba(142, 142, 147, 0.1);
            border: 1px solid rgba(142, 142, 147, 0.2);
            border-radius: 3px;
            color: rgba(255, 255, 255, 0.8);
            padding: 3px 6px;
            font-size: 9px;
            cursor: pointer;
            text-align: center;
        }

        .test-button:hover {
            background: rgba(142, 142, 147, 0.2);
        }

        .test-button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .status-section {
            margin: 6px 0;
            padding: 6px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            font-size: 9px;
        }

        .status-row {
            display: flex;
            justify-content: space-between;
            padding: 1px 0;
            color: rgba(255, 255, 255, 0.7);
        }

        .status-value {
            color: white;
            font-weight: 500;
        }

        .conversation-history {
            max-height: 60px;
            overflow-y: auto;
            margin: 3px 0;
            padding: 3px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
            font-size: 9px;
        }

        .conversation-item {
            padding: 2px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
        }

        .conversation-item:last-child {
            border-bottom: none;
        }

        .conversation-user {
            color: #007aff;
        }

        .conversation-assistant {
            color: #34c759;
        }

        .hidden {
            display: none;
        }

        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        .collapsible-section {
            margin: 3px 0;
        }

        .section-toggle {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 2px 0;
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .section-toggle:hover {
            color: rgba(255, 255, 255, 0.8);
        }

        .toggle-icon {
            font-size: 8px;
        }
    `;

    static properties = {
        status: { type: Object },
        isLoading: { type: Boolean },
        availableVoices: { type: Array },
        selectedVoice: { type: String },
        conversationHistory: { type: Array },
        showAdvanced: { type: Boolean },
        showConversations: { type: Boolean },
        showTesting: { type: Boolean },
        lastTestResult: { type: Object }
    };

    constructor() {
        super();
        this.status = {
            isInitialized: false,
            isActive: false,
            isListening: false,
            isConversing: false,
            config: {}
        };
        this.isLoading = false;
        this.availableVoices = [];
        this.selectedVoice = 'Samantha';
        this.conversationHistory = [];
        this.showAdvanced = false;
        this.showConversations = false;
        this.showTesting = false;
        this.lastTestResult = null;

        this.loadStatus();
        this.loadVoices();
        this.setupEventListeners();
    }

    async loadStatus() {
        try {
            this.isLoading = true;
            this.status = await window.api.voiceAgent.getStatus() || this.status;
            
            // Load conversation history
            this.conversationHistory = await window.api.voiceAgent.getConversationHistory() || [];
            
        } catch (error) {
            console.error('[VoiceAgentSettings] Error loading status:', error);
        } finally {
            this.isLoading = false;
            this.requestUpdate();
        }
    }

    async loadVoices() {
        try {
            const result = await window.api.voiceAgent.getAvailableVoices();
            if (result.success) {
                this.availableVoices = result.voices || [];
            }
        } catch (error) {
            console.error('[VoiceAgentSettings] Error loading voices:', error);
        }
    }

    setupEventListeners() {
        // Voice agent events
        window.api.voiceAgent.onEnabled(() => {
            this.status.isActive = true;
            this.requestUpdate();
        });

        window.api.voiceAgent.onDisabled(() => {
            this.status.isActive = false;
            this.status.isListening = false;
            this.status.isConversing = false;
            this.requestUpdate();
        });

        window.api.voiceAgent.onConversationStarted(() => {
            this.status.isConversing = true;
            this.requestUpdate();
        });

        window.api.voiceAgent.onConversationEnded(() => {
            this.status.isConversing = false;
            this.loadStatus(); // Reload to get updated conversation history
        });

        window.api.voiceAgent.onListeningStarted(() => {
            this.status.isListening = true;
            this.requestUpdate();
        });

        window.api.voiceAgent.onListeningStopped(() => {
            this.status.isListening = false;
            this.requestUpdate();
        });

        window.api.voiceAgent.onWakeWordDetected((event, data) => {
            console.log('[VoiceAgentSettings] Wake word detected:', data);
        });

        window.api.voiceAgent.onSpeechRecognized((event, data) => {
            console.log('[VoiceAgentSettings] Speech recognized:', data.text);
        });

        window.api.voiceAgent.onActionCompleted((event, result) => {
            console.log('[VoiceAgentSettings] Action completed:', result);
        });

        window.api.voiceAgent.onConfigUpdated((event, config) => {
            this.status.config = config;
            this.requestUpdate();
        });
    }

    async toggleVoiceAgent() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            
            if (this.status.isActive) {
                const result = await window.api.voiceAgent.disable();
                if (result.success) {
                    this.status.isActive = false;
                }
            } else {
                const result = await window.api.voiceAgent.enable();
                if (result.success) {
                    this.status.isActive = true;
                }
            }
        } catch (error) {
            console.error('[VoiceAgentSettings] Error toggling voice agent:', error);
        } finally {
            this.isLoading = false;
            this.requestUpdate();
        }
    }

    async updateConfig(key, value) {
        try {
            const newConfig = { ...this.status.config, [key]: value };
            await window.api.voiceAgent.updateConfig(newConfig);
        } catch (error) {
            console.error('[VoiceAgentSettings] Error updating config:', error);
        }
    }

    async changeVoice(event) {
        const voiceName = event.target.value;
        try {
            const result = await window.api.voiceAgent.setVoice(voiceName);
            if (result.success) {
                this.selectedVoice = voiceName;
            }
        } catch (error) {
            console.error('[VoiceAgentSettings] Error changing voice:', error);
        }
    }

    async triggerWakeWord() {
        try {
            await window.api.voiceAgent.triggerWakeWord();
        } catch (error) {
            console.error('[VoiceAgentSettings] Error triggering wake word:', error);
        }
    }

    async testVoiceCommand() {
        try {
            await window.api.voiceAgent.triggerVoiceCommand('click the button');
        } catch (error) {
            console.error('[VoiceAgentSettings] Error testing voice command:', error);
        }
    }

    async testTTS() {
        try {
            const result = await window.api.voiceAgent.speak('This is a test of the voice agent text to speech system.');
            console.log('[VoiceAgentSettings] TTS test result:', result);
        } catch (error) {
            console.error('[VoiceAgentSettings] Error testing TTS:', error);
        }
    }

    async endConversation() {
        try {
            await window.api.voiceAgent.endConversation();
        } catch (error) {
            console.error('[VoiceAgentSettings] Error ending conversation:', error);
        }
    }

    async runTest(testType) {
        try {
            this.isLoading = true;
            let result;
            
            switch (testType) {
                case 'wakeWord':
                    result = await window.api.voiceAgent.testWakeWord();
                    break;
                case 'tts':
                    result = await window.api.voiceAgent.testTTS();
                    break;
                case 'screenAnalysis':
                    result = await window.api.voiceAgent.testScreenAnalysis();
                    break;
                case 'actionExecution':
                    result = await window.api.voiceAgent.testActionExecution();
                    break;
                case 'fullSystem':
                    result = await window.api.voiceAgent.testFullSystem();
                    break;
            }
            
            this.lastTestResult = { type: testType, ...result };
            console.log(`[VoiceAgentSettings] ${testType} test result:`, result);
            
        } catch (error) {
            console.error(`[VoiceAgentSettings] Error running ${testType} test:`, error);
            this.lastTestResult = { type: testType, success: false, error: error.message };
        } finally {
            this.isLoading = false;
            this.requestUpdate();
        }
    }

    getStatusIndicator() {
        if (!this.status.isInitialized) {
            return { text: 'Not Initialized', class: 'error' };
        }
        if (this.status.isConversing) {
            return { text: 'Conversing', class: 'conversing' };
        }
        if (this.status.isListening) {
            return { text: 'Listening', class: 'listening' };
        }
        if (this.status.isActive) {
            return { text: 'Active', class: 'active' };
        }
        return { text: 'Inactive', class: 'inactive' };
    }

    toggleSection(section) {
        this[section] = !this[section];
        this.requestUpdate();
    }

    render() {
        const statusIndicator = this.getStatusIndicator();

        return html`
            <div class="${this.isLoading ? 'loading' : ''}">
                <!-- Section Header -->
                <div class="section-header">
                    <h3 class="section-title">Voice Agent - "Hey Leviousa"</h3>
                    <span class="status-indicator ${statusIndicator.class}">
                        ${statusIndicator.text}
                    </span>
                </div>

                <!-- Main Toggle -->
                <button 
                    class="main-toggle ${this.status.isActive ? 'active' : ''}"
                    @click=${this.toggleVoiceAgent}
                    ?disabled=${this.isLoading}
                >
                    ${this.status.isActive ? 'Disable Voice Agent' : 'Enable Voice Agent'}
                </button>

                <!-- Quick Actions -->
                ${this.status.isActive ? html`
                    <div class="action-buttons">
                        <button class="action-button primary" @click=${this.triggerWakeWord}>
                            Trigger Wake Word
                        </button>
                        <button class="action-button" @click=${this.testTTS}>
                            Test Voice
                        </button>
                        ${this.status.isConversing ? html`
                            <button class="action-button danger" @click=${this.endConversation}>
                                End Chat
                            </button>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Voice Selection -->
                ${this.availableVoices.length > 0 ? html`
                    <select class="voice-selector" @change=${this.changeVoice} .value=${this.selectedVoice}>
                        ${this.availableVoices.map(voice => html`
                            <option value="${voice}">${voice}</option>
                        `)}
                    </select>
                ` : ''}

                <!-- Voice Training Section -->
                <voice-enrollment-component></voice-enrollment-component>

                <!-- Configuration Section - HIDDEN IN OVERLAY -->
                <!-- 
                <div class="collapsible-section">
                    <div class="section-toggle" @click=${() => this.toggleSection('showAdvanced')}>
                        <span class="toggle-icon">${this.showAdvanced ? '▼' : '▶'}</span>
                        Advanced Settings
                    </div>
                    
                    ${this.showAdvanced ? html`
                        <div class="config-section">
                            <div class="config-item">
                                <span class="config-label">Voice Responses</span>
                                <button 
                                    class="config-toggle ${this.status.config.voiceResponseEnabled ? 'enabled' : ''}"
                                    @click=${() => this.updateConfig('voiceResponseEnabled', !this.status.config.voiceResponseEnabled)}
                                >
                                    ${this.status.config.voiceResponseEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            
                            <div class="config-item">
                                <span class="config-label">Screen Analysis</span>
                                <button 
                                    class="config-toggle ${this.status.config.screenAnalysisEnabled ? 'enabled' : ''}"
                                    @click=${() => this.updateConfig('screenAnalysisEnabled', !this.status.config.screenAnalysisEnabled)}
                                >
                                    ${this.status.config.screenAnalysisEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            
                            <div class="config-item">
                                <span class="config-label">Action Execution</span>
                                <button 
                                    class="config-toggle ${this.status.config.actionExecutionEnabled ? 'enabled' : ''}"
                                    @click=${() => this.updateConfig('actionExecutionEnabled', !this.status.config.actionExecutionEnabled)}
                                >
                                    ${this.status.config.actionExecutionEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                            
                            <div class="config-item">
                                <span class="config-label">Auto Screenshots</span>
                                <button 
                                    class="config-toggle ${this.status.config.autoScreenshots ? 'enabled' : ''}"
                                    @click=${() => this.updateConfig('autoScreenshots', !this.status.config.autoScreenshots)}
                                >
                                    ${this.status.config.autoScreenshots ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                -->

                <!-- Testing Section - HIDDEN IN OVERLAY -->
                <!-- 
                <div class="collapsible-section">
                    <div class="section-toggle" @click=${() => this.toggleSection('showTesting')}>
                        <span class="toggle-icon">${this.showTesting ? '▼' : '▶'}</span>
                        Testing & Diagnostics
                    </div>
                    
                    ${this.showTesting ? html`
                        <div class="test-section">
                            <div class="test-buttons">
                                <button class="test-button" @click=${() => this.runTest('wakeWord')} ?disabled=${this.isLoading}>
                                    Wake Word
                                </button>
                                <button class="test-button" @click=${() => this.runTest('tts')} ?disabled=${this.isLoading}>
                                    Text-to-Speech
                                </button>
                                <button class="test-button" @click=${() => this.runTest('screenAnalysis')} ?disabled=${this.isLoading}>
                                    Screen Analysis
                                </button>
                                <button class="test-button" @click=${() => this.runTest('actionExecution')} ?disabled=${this.isLoading}>
                                    Action Execution
                                </button>
                            </div>
                            
                            <button class="action-button warning" @click=${() => this.runTest('fullSystem')} ?disabled=${this.isLoading}>
                                Run Full System Test
                            </button>
                            
                            ${this.lastTestResult ? html`
                                <div class="status-section">
                                    <div class="status-row">
                                        <span>Last Test:</span>
                                        <span class="status-value">${this.lastTestResult.type}</span>
                                    </div>
                                    <div class="status-row">
                                        <span>Result:</span>
                                        <span class="status-value ${this.lastTestResult.success ? '' : 'error'}">
                                            ${this.lastTestResult.success ? 'Success' : 'Failed'}
                                        </span>
                                    </div>
                                    ${this.lastTestResult.error ? html`
                                        <div class="status-row">
                                            <span>Error:</span>
                                            <span class="status-value error">${this.lastTestResult.error}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                -->

                <!-- Conversation History -->
                ${this.conversationHistory.length > 0 ? html`
                    <div class="collapsible-section">
                        <div class="section-toggle" @click=${() => this.toggleSection('showConversations')}>
                            <span class="toggle-icon">${this.showConversations ? '▼' : '▶'}</span>
                            Recent Conversations (${this.conversationHistory.length})
                        </div>
                        
                        ${this.showConversations ? html`
                            <div class="conversation-history">
                                ${this.conversationHistory.slice(-5).map(conv => html`
                                    <div class="conversation-item">
                                        ${conv.turns?.slice(-2).map(turn => html`
                                            <div class="conversation-${turn.type}">
                                                ${turn.type === 'user' ? '🎤' : '🤖'} ${turn.text?.substring(0, 40)}${turn.text?.length > 40 ? '...' : ''}
                                            </div>
                                        `)}
                                    </div>
                                `)}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Status Information -->
                <div class="status-section">
                    <div class="status-row">
                        <span>Initialized:</span>
                        <span class="status-value">${this.status.isInitialized ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="status-row">
                        <span>Listening:</span>
                        <span class="status-value">${this.status.isListening ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="status-row">
                        <span>In Conversation:</span>
                        <span class="status-value">${this.status.isConversing ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="status-row">
                        <span>Wake Word:</span>
                        <span class="status-value">${this.status.config.wakeWord || 'Hey Leviousa'}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('voice-agent-settings', VoiceAgentSettings); 