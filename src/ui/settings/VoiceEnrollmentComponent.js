import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class VoiceEnrollmentComponent extends LitElement {
    static styles = css`
        :host {
            display: block;
            padding: 8px 0;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            color: white;
            margin: 6px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .enrollment-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            padding: 0 8px;
        }

        .enrollment-icon {
            width: 16px;
            height: 16px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
            font-size: 10px;
        }

        .enrollment-title {
            font-size: 11px;
            font-weight: 500;
            color: white;
        }

        .enrollment-subtitle {
            opacity: 0.7;
            font-size: 9px;
            margin-top: 2px;
            color: rgba(255, 255, 255, 0.6);
        }

        .enrollment-status {
            padding: 6px 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
            margin: 4px 8px;
            border-left: 2px solid rgba(255, 255, 255, 0.3);
            font-size: 10px;
        }

        .enrollment-status.warning {
            border-left-color: rgba(255, 255, 255, 0.4);
        }

        .enrollment-status.error {
            border-left-color: rgba(255, 255, 255, 0.5);
        }

        .enrollment-progress {
            display: flex;
            align-items: center;
            margin: 8px;
            padding: 0 4px;
        }

        .progress-bar {
            flex: 1;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            margin: 0 6px;
        }

        .progress-fill {
            height: 100%;
            background: rgba(255, 255, 255, 0.4);
            transition: width 0.3s ease;
            border-radius: 2px;
        }

        .progress-text {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.8);
        }

        .enrollment-steps {
            margin: 8px;
            padding: 0 4px;
        }

        .step {
            display: flex;
            align-items: center;
            padding: 3px 0;
            opacity: 0.4;
            transition: opacity 0.3s ease;
        }

        .step.active {
            opacity: 0.8;
        }

        .step.completed {
            opacity: 0.6;
        }

        .step-number {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: 500;
            margin-right: 6px;
        }

        .step.active .step-number {
            background: rgba(255, 255, 255, 0.3);
            color: white;
        }

        .step.completed .step-number {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .step.completed .step-number::after {
            content: '✓';
        }

        .step-text {
            flex: 1;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
        }

        .enrollment-actions {
            display: flex;
            gap: 4px;
            margin: 8px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 4px 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            font-size: 10px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .btn-primary {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.2);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
        }

        .btn-danger {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.8);
        }

        .btn-danger:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
        }

        .recording-indicator {
            display: none;
            align-items: center;
            gap: 4px;
            padding: 6px 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
            margin: 4px 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 10px;
        }

        .recording-indicator.active {
            display: flex;
        }

        .recording-pulse {
            width: 6px;
            height: 6px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
        }

        .enrollment-tips {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
            padding: 6px 8px;
            margin: 4px 8px;
            font-size: 9px;
            line-height: 1.4;
        }

        .tips-title {
            font-weight: 500;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
            color: white;
        }

        .tip-item {
            margin: 2px 0;
            padding-left: 8px;
            position: relative;
            color: rgba(255, 255, 255, 0.7);
        }

        .tip-item::before {
            content: '•';
            position: absolute;
            left: 0;
            color: rgba(255, 255, 255, 0.4);
        }

        .hidden {
            display: none;
        }

        .enrollment-listening {
            text-align: center;
            padding: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            margin: 4px 8px;
        }

        .listening-indicator {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
            margin-bottom: 2px;
            animation: pulse 2s infinite;
        }

        .listening-instruction {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.6);
        }
    `;

    static properties = {
        enrollmentStatus: { type: Object },
        isEnrolling: { type: Boolean },
        isRecording: { type: Boolean },
        currentStep: { type: Number },
        progress: { type: Number },
        statusMessage: { type: String },
        showTips: { type: Boolean }
    };

    constructor() {
        super();
        this.enrollmentStatus = null;
        this.isEnrolling = false;
        this.isRecording = false;
        this.currentStep = 0;
        this.progress = 0;
        this.statusMessage = '';
        this.showTips = false;

        this.setupEventListeners();
        this.loadEnrollmentStatus();
    }

    async loadEnrollmentStatus() {
        try {
            this.enrollmentStatus = await window.api.voiceAgent.getVoiceEnrollmentStatus();
            this.updateUI();
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to load status:', error);
            this.statusMessage = 'Failed to load enrollment status';
        }
    }

    setupEventListeners() {
        // Voice enrollment event listeners
        window.api.voiceAgent.onVoiceEnrollmentStarted((event, data) => {
            console.log('[VoiceEnrollment] Enrollment started:', data);
            this.isEnrolling = true;
            this.currentStep = 1;
            this.progress = 0;
            this.statusMessage = data.instructions;
            this.showTips = true;
            this.updateUI();
        });

        window.api.voiceAgent.onVoiceSampleRecordingStarted((event, data) => {
            console.log('[VoiceEnrollment] Sample recording started:', data);
            this.isRecording = true;
            this.currentStep = 2;
            this.statusMessage = data.instruction;
            this.updateUI();
        });

        window.api.voiceAgent.onVoiceSampleRecorded((event, data) => {
            console.log('[VoiceEnrollment] Sample recorded:', data);
            this.isRecording = false;
            this.progress = (data.sampleNumber / data.totalSamples) * 100;
            this.statusMessage = `Sample ${data.sampleNumber}/${data.totalSamples} recorded (${Math.round(data.similarity * 100)}% match)`;
            
            if (data.isComplete) {
                this.currentStep = 3;
                this.statusMessage = 'Processing enrollment...';
            }
            this.updateUI();
        });

        window.api.voiceAgent.onVoiceSampleRejected((event, data) => {
            console.log('[VoiceEnrollment] Sample rejected:', data);
            this.isRecording = false;
            this.statusMessage = data.reason;
            // Show that we're still trying, don't reset progress completely
            this.updateUI();
        });

        window.api.voiceAgent.onVoiceEnrollmentCompleted((event, data) => {
            console.log('[VoiceEnrollment] Enrollment completed:', data);
            this.isEnrolling = false;
            this.isRecording = false;
            this.currentStep = 4;
            this.progress = 100;
            this.statusMessage = data.message;
            this.showTips = false;
            this.loadEnrollmentStatus(); // Reload status
            this.updateUI();
        });

        window.api.voiceAgent.onVoiceEnrollmentCancelled((event, data) => {
            console.log('[VoiceEnrollment] Enrollment cancelled:', data);
            this.isEnrolling = false;
            this.isRecording = false;
            this.currentStep = 0;
            this.progress = 0;
            // Show more detailed cancellation reason if available
            this.statusMessage = data?.reason ? `Enrollment cancelled: ${data.reason}` : 'Enrollment cancelled';
            this.showTips = false;
            this.updateUI();
        });
    }

    updateUI() {
        this.requestUpdate();
    }

    async startEnrollment() {
        try {
            const result = await window.api.voiceAgent.startVoiceEnrollment();
            if (!result.success) {
                this.statusMessage = `Failed to start enrollment: ${result.error}`;
                this.updateUI();
            }
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to start enrollment:', error);
            this.statusMessage = 'Failed to start enrollment';
            this.updateUI();
        }
    }

    async recordSample() {
        try {
            const result = await window.api.voiceAgent.recordEnrollmentSample();
            if (!result.success) {
                this.statusMessage = `Failed to record sample: ${result.error}`;
                this.updateUI();
            }
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to record sample:', error);
            this.statusMessage = 'Failed to record sample';
            this.updateUI();
        }
    }

    async cancelEnrollment() {
        try {
            const result = await window.api.voiceAgent.cancelVoiceEnrollment();
            if (result.success) {
                this.statusMessage = 'Enrollment cancelled';
            }
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to cancel enrollment:', error);
        }
    }

    async resetVoiceTemplate() {
        try {
            const result = await window.api.voiceAgent.resetVoiceTemplate();
            if (result.success) {
                this.statusMessage = 'Voice template reset successfully';
                await this.loadEnrollmentStatus();
            } else {
                this.statusMessage = `Failed to reset: ${result.error}`;
            }
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to reset template:', error);
            this.statusMessage = 'Failed to reset voice template';
        }
        this.updateUI();
    }

    toggleTips() {
        this.showTips = !this.showTips;
        this.updateUI();
    }

    getStepStatus(stepNumber) {
        if (stepNumber < this.currentStep) return 'completed';
        if (stepNumber === this.currentStep) return 'active';
        return '';
    }

    render() {
        const isEnrolled = this.enrollmentStatus?.isEnrolled;
        
        return html`
            <div class="enrollment-header">
                <div class="enrollment-icon">🎤</div>
                <div>
                    <div class="enrollment-title">Voice Training - "Hey Leviousa"</div>
                    <div class="enrollment-subtitle">
                        ${isEnrolled ? 'Voice is trained and ready' : 'Train the system to recognize your voice'}
                    </div>
                </div>
            </div>

            ${this.statusMessage ? html`
                <div class="enrollment-status ${this.isEnrolling ? 'warning' : ''}">
                    ${this.statusMessage}
                    ${this.isEnrolling ? html`
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                            💡 Tip: Speak clearly and say "Hey Leviousa" naturally
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            ${this.isEnrolling ? html`
                <div class="enrollment-progress">
                    <span class="progress-text">${Math.round(this.progress)}%</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${this.progress}%"></div>
                    </div>
                    <span class="progress-text">Complete</span>
                </div>

                <div class="enrollment-steps">
                    <div class="step ${this.getStepStatus(1)}">
                        <div class="step-number">${this.getStepStatus(1) === 'completed' ? '' : '1'}</div>
                        <div class="step-text">Start voice enrollment</div>
                    </div>
                    <div class="step ${this.getStepStatus(2)}">
                        <div class="step-number">${this.getStepStatus(2) === 'completed' ? '' : '2'}</div>
                        <div class="step-text">Record 5 samples of "Hey Leviousa"</div>
                    </div>
                    <div class="step ${this.getStepStatus(3)}">
                        <div class="step-number">${this.getStepStatus(3) === 'completed' ? '' : '3'}</div>
                        <div class="step-text">Process voice template</div>
                    </div>
                    <div class="step ${this.getStepStatus(4)}">
                        <div class="step-number">${this.getStepStatus(4) === 'completed' ? '' : '4'}</div>
                        <div class="step-text">Enrollment complete</div>
                    </div>
                </div>
            ` : ''}

            <div class="recording-indicator ${this.isRecording ? 'active' : ''}">
                <div class="recording-pulse"></div>
                <span>Recording... Say "Hey Leviousa" now</span>
            </div>

            <div class="enrollment-actions">
                ${!this.isEnrolling && !isEnrolled ? html`
                    <button class="btn btn-primary" @click="${this.startEnrollment}">
                        🎯 Start Voice Training
                    </button>
                ` : ''}

                ${this.isEnrolling ? html`
                    <div class="enrollment-listening">
                        <div class="listening-indicator">
                            ${this.isRecording ? '🎤 Recording...' : '👂 Listening automatically...'}
                        </div>
                        <div class="listening-instruction">
                            ${this.isRecording ? 'Say "Hey Leviousa" now!' : 'Waiting for your voice...'}
                        </div>
                    </div>
                    <button class="btn btn-secondary" @click="${this.cancelEnrollment}">
                        ✖️ Cancel Training
                    </button>
                ` : ''}

                ${isEnrolled && !this.isEnrolling ? html`
                    <button class="btn btn-danger" @click="${this.resetVoiceTemplate}">
                        🔄 Reset Voice Training
                    </button>
                ` : ''}

                <button class="btn btn-secondary" @click="${this.toggleTips}">
                    ${this.showTips ? '👁️ Hide Tips' : '💡 Show Tips'}
                </button>
            </div>

            <div class="enrollment-tips ${this.showTips ? '' : 'hidden'}">
                <div class="tips-title">
                    💡 Tips for Better Recognition
                </div>
                <div class="tip-item">Speak clearly and at normal volume</div>
                <div class="tip-item">Use the same tone each time</div>
                <div class="tip-item">Record in a quiet environment</div>
                <div class="tip-item">Hold your device at the same distance</div>
                <div class="tip-item">Say "Hey Leviousa" naturally, not robotically</div>
            </div>
        `;
    }
}

customElements.define('voice-enrollment-component', VoiceEnrollmentComponent); 