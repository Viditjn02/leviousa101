import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class VoiceSessionIndicator extends LitElement {
    static styles = css`
        :host {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 10000;
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        :host(.hidden) {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
            pointer-events: none;
        }

        :host(.visible) {
            opacity: 1;
            transform: scale(1) translateY(0);
        }

        .session-indicator {
            width: 70px;
            height: 70px;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            position: relative;
            overflow: hidden;
        }

        .orb {
            width: 50px;
            height: 50px;
            border-radius: 8px;
            background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.3));
            position: relative;
            transition: all 0.3s ease;
        }

        /* Pulse animation for listening state */
        .session-indicator.listening {
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border-color: rgba(255, 255, 255, 0.2);
            }
            50% {
                transform: scale(1.05);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
                border-color: rgba(255, 255, 255, 0.4);
            }
        }

        /* Speaking animation with wave effect */
        .session-indicator.speaking {
            animation: speaking 0.8s ease-in-out infinite;
        }

        @keyframes speaking {
            0%, 100% {
                transform: scale(1);
            }
            25% {
                transform: scale(1.15);
            }
            50% {
                transform: scale(1.05);
            }
            75% {
                transform: scale(1.2);
            }
        }

        /* Processing animation with rotation */
        .session-indicator.processing {
            animation: processing 1.5s linear infinite;
        }

        @keyframes processing {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
        }

        .session-indicator.processing .orb {
            background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.5));
        }

        /* Wake word detected - quick flash */
        .session-indicator.wake-detected {
            animation: wakeFlash 0.5s ease-out;
        }

        @keyframes wakeFlash {
            0% {
                transform: scale(1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border-color: rgba(255, 255, 255, 0.2);
            }
            50% {
                transform: scale(1.15);
                box-shadow: 0 16px 50px rgba(255, 255, 255, 0.3);
                border-color: rgba(255, 255, 255, 0.6);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                border-color: rgba(255, 255, 255, 0.2);
            }
        }

        /* Audio visualization bars */
        .audio-bars {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            gap: 3px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .session-indicator.listening .audio-bars,
        .session-indicator.speaking .audio-bars {
            opacity: 1;
        }

        .audio-bar {
            width: 3px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 2px;
            animation: audioBar 1.2s ease-in-out infinite;
        }

        .audio-bar:nth-child(1) {
            height: 8px;
            animation-delay: 0ms;
        }

        .audio-bar:nth-child(2) {
            height: 12px;
            animation-delay: 150ms;
        }

        .audio-bar:nth-child(3) {
            height: 16px;
            animation-delay: 300ms;
        }

        .audio-bar:nth-child(4) {
            height: 12px;
            animation-delay: 450ms;
        }

        .audio-bar:nth-child(5) {
            height: 8px;
            animation-delay: 600ms;
        }

        @keyframes audioBar {
            0%, 100% {
                transform: scaleY(1);
            }
            50% {
                transform: scaleY(2.5);
            }
        }

        /* Session info text */
        .session-info {
            position: absolute;
            bottom: -35px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            white-space: nowrap;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 6px 10px;
            border-radius: 6px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        :host(.visible) .session-info {
            opacity: 1;
        }

        /* Click to end hint */
        .end-hint {
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.8);
            font-size: 10px;
            text-align: center;
            white-space: nowrap;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }

        .session-indicator:hover + .end-hint,
        .end-hint:hover {
            opacity: 1;
        }

        /* Responsive design */
        @media (max-width: 768px) {
            :host {
                bottom: 15px;
                left: 15px;
            }
            
            .session-indicator {
                width: 60px;
                height: 60px;
            }
            
            .orb {
                width: 40px;
                height: 40px;
            }
        }
    `;

    static properties = {
        sessionState: { type: String },
        isVisible: { type: Boolean },
        statusText: { type: String },
        canEnd: { type: Boolean }
    };

    constructor() {
        super();
        this.sessionState = 'idle'; // idle, listening, speaking, processing, wake-detected
        this.isVisible = false;
        this.statusText = '';
        this.canEnd = false;
        
        // Voice agent event listeners
        this.setupVoiceAgentListeners();
    }

    setupVoiceAgentListeners() {
        // Listen for voice agent events via IPC
        if (window.electronAPI && window.electronAPI.ipcRenderer) {
            console.log('[VoiceSessionIndicator] Setting up voice agent listeners via IPC');
            
            const ipc = window.electronAPI.ipcRenderer;
            
            ipc.on('voice-agent:wake-word-detected', (event, data) => {
                console.log('[VoiceSessionIndicator] Wake word detected');
                this.showSession('wake-detected', 'Hey Leviousa detected');
                
                // Transition to listening after flash
                setTimeout(() => {
                    this.setSessionState('listening', 'Listening...');
                }, 500);
            });

            ipc.on('voice-agent:conversation-started', (event, data) => {
                console.log('[VoiceSessionIndicator] Conversation started');
                this.setSessionState('listening', 'Listening...');
                this.canEnd = true;
            });

            ipc.on('voice-agent:speech-recognized', (event, data) => {
                console.log('[VoiceSessionIndicator] Speech recognized:', data);
                this.setSessionState('processing', 'Processing...');
            });

            ipc.on('voice-agent:processing-started', (event, data) => {
                console.log('[VoiceSessionIndicator] Processing started');
                this.setSessionState('processing', 'Processing...');
            });

            ipc.on('voice-agent:response-generated', (event, data) => {
                console.log('[VoiceSessionIndicator] Response generated');
                this.setSessionState('speaking', 'Speaking...');
            });

            ipc.on('voice-agent:speech-completed', (event, data) => {
                console.log('[VoiceSessionIndicator] Speech completed');
                this.setSessionState('listening', 'Listening...');
            });

            ipc.on('voice-agent:conversation-ended', (event, data) => {
                console.log('[VoiceSessionIndicator] Conversation ended');
                this.hideSession();
            });

            ipc.on('voice-agent:enabled', (event, data) => {
                console.log('[VoiceSessionIndicator] Voice agent enabled');
                // Don't show indicator until wake word is detected
            });

            ipc.on('voice-agent:disabled', (event, data) => {
                console.log('[VoiceSessionIndicator] Voice agent disabled');
                this.hideSession();
            });
        } else {
            console.warn('[VoiceSessionIndicator] electronAPI not available, trying window.api fallback');
            
            // Fallback to window.api if available
            if (window.api && window.api.voiceAgent) {
                console.log('[VoiceSessionIndicator] Using window.api fallback');
                // Note: These methods may not exist, but we'll try
                try {
                    window.api.voiceAgent.onWakeWordDetected && window.api.voiceAgent.onWakeWordDetected(() => {
                        this.showSession('wake-detected', 'Hey Leviousa detected');
                        setTimeout(() => this.setSessionState('listening', 'Listening...'), 500);
                    });

                    window.api.voiceAgent.onConversationStarted && window.api.voiceAgent.onConversationStarted(() => {
                        this.setSessionState('listening', 'Listening...');
                        this.canEnd = true;
                    });

                    window.api.voiceAgent.onConversationEnded && window.api.voiceAgent.onConversationEnded(() => {
                        this.hideSession();
                    });
                } catch (error) {
                    console.warn('[VoiceSessionIndicator] Error setting up window.api listeners:', error);
                }
            }
        }
    }

    showSession(state = 'listening', text = '') {
        console.log('[VoiceSessionIndicator] Showing session:', state, text);
        this.isVisible = true;
        this.sessionState = state;
        this.statusText = text;
        this.classList.remove('hidden');
        this.classList.add('visible');
    }

    setSessionState(state, text = '') {
        console.log('[VoiceSessionIndicator] Setting session state:', state, text);
        this.sessionState = state;
        this.statusText = text;
        
        if (!this.isVisible) {
            this.showSession(state, text);
        }
    }

    hideSession() {
        console.log('[VoiceSessionIndicator] Hiding session');
        this.isVisible = false;
        this.canEnd = false;
        this.classList.remove('visible');
        this.classList.add('hidden');
        
        // Reset state after animation
        setTimeout(() => {
            this.sessionState = 'idle';
            this.statusText = '';
        }, 300);
    }

    handleClick() {
        if (this.canEnd && this.isVisible) {
            console.log('[VoiceSessionIndicator] User clicked to end session');
            // End the conversation
            if (window.api && window.api.voiceAgent) {
                window.api.voiceAgent.endConversation();
            }
            this.hideSession();
        }
    }

    render() {
        return html`
            <div 
                class="session-indicator ${this.sessionState}"
                @click=${this.handleClick}
                style="pointer-events: ${this.canEnd ? 'auto' : 'none'}; cursor: ${this.canEnd ? 'pointer' : 'default'}"
            >
                <div class="orb"></div>
                <div class="audio-bars">
                    <div class="audio-bar"></div>
                    <div class="audio-bar"></div>
                    <div class="audio-bar"></div>
                    <div class="audio-bar"></div>
                    <div class="audio-bar"></div>
                </div>
            </div>
            <div class="session-info">${this.statusText}</div>
            ${this.canEnd ? html`<div class="end-hint">Click to end</div>` : ''}
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        console.log('[VoiceSessionIndicator] Connected to DOM');
        
        // Initialize as hidden
        this.classList.add('hidden');
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        console.log('[VoiceSessionIndicator] Disconnected from DOM');
    }
}

customElements.define('voice-session-indicator', VoiceSessionIndicator);
