import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class TutorialOverlay extends LitElement {
    static styles = css`
        :host {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99999;  /* Above all windows */
            pointer-events: none;
            display: none;
        }

        :host(.active) {
            display: block;
        }

        .overlay-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);  /* Slightly darker like UserPilot */
            backdrop-filter: blur(3px);     /* More blur for better focus */
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: all;  /* Can receive clicks to close tutorial */
        }



        :host(.active) .overlay-backdrop {
            opacity: 1;
        }

        .highlight-box {
            position: absolute;
            border: 2px solid #00ff88;
            border-radius: 8px;
            background: transparent;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 
                        0 0 20px rgba(0, 255, 136, 0.3);
            pointer-events: none;
            transition: all 0.3s ease;
            opacity: 0;
        }

        :host(.active) .highlight-box {
            opacity: 1;
        }

        .tutorial-tooltip {
            position: absolute;
            width: 350px;  /* Slightly wider for better readability */
            max-width: 85vw;
            max-height: 450px;
            background: rgba(20, 20, 20, 0.96);  /* Slightly more opaque */
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 12px;  /* Slightly rounder like UserPilot */
            color: white;
            font-family: 'Helvetica Neue', -apple-system, sans-serif;
            font-size: 13px;  /* Slightly larger text */
            line-height: 1.5;
            backdrop-filter: blur(15px);  /* More blur for prominence */
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);  /* Enhanced shadow */
            pointer-events: all;  /* Tooltip can receive events */
            transform: scale(0.95) translateY(15px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);  /* Slightly slower for prominence */
            overflow: hidden;
            z-index: 1;  /* Ensure tooltip is above backdrop */
        }

        :host(.active) .tutorial-tooltip {
            transform: scale(1) translateY(0);
            opacity: 1;
        }

        .tooltip-header {
            padding: 12px 16px 6px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
        }

        .tooltip-close {
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            transition: all 0.2s ease;
            font-size: 14px;
            line-height: 1;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .tooltip-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
        }

        .tooltip-title {
            font-size: 15px;
            font-weight: 600;
            margin: 0 0 3px 0;
            color: white;
        }

        .tooltip-subtitle {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
        }

        .tooltip-content {
            padding: 18px 22px;  /* More generous padding like UserPilot */
        }
            color: rgba(255, 255, 255, 0.9);
        }

        .tooltip-content p {
            margin: 0;
            font-size: 12px;
            line-height: 1.4;
        }

        .tooltip-progress {
            padding: 0 16px 6px 16px;
        }

        .progress-bar {
            width: 100%;
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff88, #00cc6a);
            border-radius: 2px;
            transition: width 0.4s ease;
        }

        .progress-text {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
        }

        .tooltip-actions {
            padding: 8px 16px 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }

        .btn-secondary {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.8);
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-primary {
            background: rgba(255, 255, 255, 0.9);
            border: none;
            color: rgba(20, 20, 20, 0.9);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .btn-primary:hover {
            background: white;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
        }

        .btn-skip {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            padding: 6px 8px;
            font-size: 10px;
            cursor: pointer;
            transition: color 0.2s ease;
        }

        .btn-skip:hover {
            color: rgba(255, 255, 255, 0.8);
        }

        /* Arrow indicators */
        .tooltip-arrow {
            position: absolute;
            width: 12px;
            height: 12px;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transform: rotate(45deg);
        }

        .tooltip-arrow.top {
            bottom: -6px;
            left: 50%;
            margin-left: -6px;
            border-top: none;
            border-left: none;
        }

        .tooltip-arrow.bottom {
            top: -6px;
            left: 50%;
            margin-left: -6px;
            border-bottom: none;
            border-right: none;
        }

        .tooltip-arrow.left {
            right: -6px;
            top: 50%;
            margin-top: -6px;
            border-top: none;
            border-right: none;
        }

        .tooltip-arrow.right {
            left: -6px;
            top: 50%;
            margin-top: -6px;
            border-bottom: none;
            border-left: none;
        }

        /* Glass bypass for transparent overlays */
        :host-context(body.has-glass) .tutorial-tooltip,
        :host-context(body.has-glass) .highlight-box {
            background: transparent !important;
            border: 2px solid rgba(0, 255, 136, 0.8) !important;
            backdrop-filter: none !important;
        }

        :host-context(body.has-glass) .tooltip-arrow {
            background: transparent !important;
            border: 2px solid rgba(0, 255, 136, 0.8) !important;
        }
    `;

    static properties = {
        isActive: { type: Boolean, reflect: true },
        currentStep: { type: Object },
        totalSteps: { type: Number },
        currentStepIndex: { type: Number },
        tutorialName: { type: String },
    };

    constructor() {
        super();
        this.isActive = false;
        this.currentStep = null;
        this.totalSteps = 0;
        this.currentStepIndex = 0;
        this.tutorialName = '';
        this._targetRect = null;
        this._tooltipPosition = null;
    }

    firstUpdated() {
        window.addEventListener('resize', this.updatePositions.bind(this));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this.updatePositions.bind(this));
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        
        console.log('[TutorialOverlay] 🔄 Component updated, changed properties:', Array.from(changedProperties.keys()));
        console.log('[TutorialOverlay] 🔍 Current state - isActive:', this.isActive, 'currentStep:', this.currentStep?.title);
        
        if (changedProperties.has('currentStep') || changedProperties.has('isActive')) {
            console.log('[TutorialOverlay] 🎯 Updating positions due to property changes...');
            this.updatePositions();
        }
    }

    updatePositions() {
        console.log('[TutorialOverlay] 🎯 updatePositions called - isActive:', this.isActive, 'currentStep:', this.currentStep?.title);
        
        if (!this.isActive || !this.currentStep) {
            console.log('[TutorialOverlay] ⚠️ Not updating positions - not active or no current step');
            return;
        }

        console.log('[TutorialOverlay] 🔍 Looking for target element:', this.currentStep.target);
        const targetElement = this.findTargetElement(this.currentStep.target);
        if (!targetElement) {
            console.warn(`[TutorialOverlay] ❌ Target element not found: ${this.currentStep.target}`);
            return;
        }

        console.log('[TutorialOverlay] ✅ Target element found:', targetElement.tagName, targetElement.className);

        const rect = targetElement.getBoundingClientRect();
        const padding = this.currentStep.highlightPadding || 8;

        this._targetRect = {
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + (padding * 2),
            height: rect.height + (padding * 2),
        };

        // Calculate tooltip position
        this.calculateTooltipPosition();
        this.requestUpdate();
    }

    findTargetElement(selector) {
        console.log('[TutorialOverlay] 🔍 Looking for element:', selector);
        
        // Try to find in document first
        let element = document.querySelector(selector);
        
        // If not found, try to find in shadow roots of custom elements
        if (!element) {
            const customElements = document.querySelectorAll('ask-view, listen-view, settings-view, leviousa-app');
            console.log('[TutorialOverlay] 🔍 Searching in', customElements.length, 'custom elements');
            
            for (const customEl of customElements) {
                if (customEl.shadowRoot) {
                    element = customEl.shadowRoot.querySelector(selector);
                    if (element) {
                        console.log('[TutorialOverlay] ✅ Found element in', customEl.tagName, 'shadowRoot');
                        break;
                    }
                }
            }
        } else {
            console.log('[TutorialOverlay] ✅ Found element in document');
        }

        if (!element && this.currentStep?.waitForElement) {
            console.log('[TutorialOverlay] ⏳ Element not found but waitForElement is true, will retry...');
            // Retry after a delay if element should exist but doesn't yet
            setTimeout(() => {
                console.log('[TutorialOverlay] 🔄 Retrying element search...');
                this.updatePositions();
            }, 1000);
        }

        return element;
    }

    calculateTooltipPosition() {
        const position = this.currentStep.position || 'center';
        const margin = 40; // More generous margin like UserPilot example
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Tooltip size estimates (match actual CSS values)
        const tooltipWidth = 350;
        const tooltipHeight = 180;

        let top = 0;
        let left = 0;

        // For target-based positioning
        if (this._targetRect && position !== 'center') {
            switch (position) {
                case 'top':
                    top = this._targetRect.top - tooltipHeight - margin;
                    left = this._targetRect.left + (this._targetRect.width / 2) - (tooltipWidth / 2);
                    break;
                case 'bottom':
                    top = this._targetRect.top + this._targetRect.height + margin;
                    left = this._targetRect.left + (this._targetRect.width / 2) - (tooltipWidth / 2);
                    break;
                case 'left':
                    top = this._targetRect.top + (this._targetRect.height / 2) - (tooltipHeight / 2);
                    left = this._targetRect.left - tooltipWidth - margin;
                    break;
                case 'right':
                    top = this._targetRect.top + (this._targetRect.height / 2) - (tooltipHeight / 2);
                    left = this._targetRect.left + this._targetRect.width + margin;
                    break;
            }
        } else {
            // Center positioning (like UserPilot) - prominent and always visible
            left = (viewportWidth / 2) - (tooltipWidth / 2);
            top = (viewportHeight / 2) - (tooltipHeight / 2);
            
            // Slight upward offset for better visual balance (like in UserPilot example)
            top = Math.max(margin * 2, top - 40);
        }

        // Ensure tooltip stays comfortably within viewport
        const minLeft = margin;
        const maxLeft = Math.max(margin, viewportWidth - tooltipWidth - margin);
        const minTop = margin;
        const maxTop = Math.max(margin, viewportHeight - tooltipHeight - margin);

        left = Math.max(minLeft, Math.min(left, maxLeft));
        top = Math.max(minTop, Math.min(top, maxTop));

        this._tooltipPosition = { top, left };
        
        console.log('[TutorialOverlay] 📍 Tooltip positioned at:', this._tooltipPosition, 'Viewport:', { width: viewportWidth, height: viewportHeight });
    }

    handleBackdropClick(e) {
        // Close tutorial if clicking the backdrop
        if (e.target.classList.contains('overlay-backdrop')) {
            console.log('[TutorialOverlay] 🔚 Backdrop clicked, closing tutorial');
            this.handleSkip();
        }
    }

    handleNext() {
        this.dispatchEvent(new CustomEvent('tutorial-next', { bubbles: true }));
    }

    handlePrevious() {
        this.dispatchEvent(new CustomEvent('tutorial-previous', { bubbles: true }));
    }

    handleSkip() {
        this.dispatchEvent(new CustomEvent('tutorial-skip', { bubbles: true }));
    }

    getProgressPercent() {
        if (this.totalSteps === 0) return 0;
        return ((this.currentStepIndex + 1) / this.totalSteps) * 100;
    }

    getArrowClass() {
        if (!this.currentStep) return '';
        const position = this.currentStep.position || 'bottom';
        return position;
    }

    render() {
        if (!this.isActive || !this.currentStep || !this._targetRect || !this._tooltipPosition) {
            return html``;
        }

        const progressPercent = this.getProgressPercent();
        const isFirstStep = this.currentStepIndex === 0;
        const isLastStep = this.currentStepIndex === this.totalSteps - 1;

        return html`
            <div class="overlay-backdrop" @click=${this.handleBackdropClick}></div>
            
            <!-- Highlight box -->
            <div 
                class="highlight-box"
                style="
                    top: ${this._targetRect.top}px;
                    left: ${this._targetRect.left}px;
                    width: ${this._targetRect.width}px;
                    height: ${this._targetRect.height}px;
                "
            ></div>

            <!-- Tutorial tooltip -->
            <div 
                class="tutorial-tooltip"
                style="
                    top: ${this._tooltipPosition.top}px;
                    left: ${this._tooltipPosition.left}px;
                "
                @click=${(e) => e.stopPropagation()}
                @mouseenter=${(e) => e.stopPropagation()}
                @mouseleave=${(e) => e.stopPropagation()}
                @mouseover=${(e) => e.stopPropagation()}
                @mouseout=${(e) => e.stopPropagation()}
            >
                <div class="tooltip-arrow ${this.getArrowClass()}"></div>
                
                <div class="tooltip-header">
                    <button class="tooltip-close" @click=${this.handleSkip}>×</button>
                    <h3 class="tooltip-title">${this.currentStep.title}</h3>
                    <p class="tooltip-subtitle">
                        ${this.tutorialName} • Step ${this.currentStepIndex + 1} of ${this.totalSteps}
                    </p>
                </div>

                <div class="tooltip-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-text">${Math.round(progressPercent)}% Complete</div>
                </div>

                <div class="tooltip-content">
                    <p>${this.currentStep.content}</p>
                </div>

                <div class="tooltip-actions">
                    <div class="left-actions">
                        ${!isFirstStep && this.currentStep.showPrevious !== false ? html`
                            <button class="btn-secondary" @click=${this.handlePrevious}>
                                ← Previous
                            </button>
                        ` : ''}
                    </div>

                    <div class="right-actions" style="display: flex; gap: 8px;">
                        ${this.currentStep.showSkip !== false ? html`
                            <button class="btn-skip" @click=${this.handleSkip}>
                                Skip Tour
                            </button>
                        ` : ''}
                        
                        <button class="btn-primary" @click=${this.handleNext}>
                            ${isLastStep ? 'Complete' : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('tutorial-overlay', TutorialOverlay);
