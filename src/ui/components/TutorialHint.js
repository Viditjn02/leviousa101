import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class TutorialHint extends LitElement {
    static styles = css`
        :host {
            position: relative;
            display: inline-block;
        }

        .hint-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 12px;
            font-weight: 600;
        }

        .hint-trigger:hover {
            background: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
            transform: scale(1.1);
        }

        .hint-tooltip {
            position: absolute;
            z-index: 1000;
            max-width: 280px;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            font-size: 12px;
            line-height: 1.4;
            padding: 12px;
            pointer-events: none;
            opacity: 0;
            transform: translateY(10px) scale(0.9);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        :host(.show-tooltip) .hint-tooltip {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }

        /* Position variants */
        .hint-tooltip.top {
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%) translateY(10px) scale(0.9);
        }

        :host(.show-tooltip) .hint-tooltip.top {
            transform: translateX(-50%) translateY(0) scale(1);
        }

        .hint-tooltip.bottom {
            top: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%) translateY(-10px) scale(0.9);
        }

        :host(.show-tooltip) .hint-tooltip.bottom {
            transform: translateX(-50%) translateY(0) scale(1);
        }

        .hint-tooltip.left {
            right: calc(100% + 8px);
            top: 50%;
            transform: translateY(-50%) translateX(10px) scale(0.9);
        }

        :host(.show-tooltip) .hint-tooltip.left {
            transform: translateY(-50%) translateX(0) scale(1);
        }

        .hint-tooltip.right {
            left: calc(100% + 8px);
            top: 50%;
            transform: translateY(-50%) translateX(-10px) scale(0.9);
        }

        :host(.show-tooltip) .hint-tooltip.right {
            transform: translateY(-50%) translateX(0) scale(1);
        }

        .tooltip-title {
            font-weight: 600;
            color: white;
            margin: 0 0 6px 0;
            font-size: 13px;
        }

        .tooltip-content {
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
        }

        .tooltip-arrow {
            position: absolute;
            width: 8px;
            height: 8px;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transform: rotate(45deg);
        }

        .hint-tooltip.top .tooltip-arrow {
            top: 100%;
            left: 50%;
            margin-left: -4px;
            margin-top: -4px;
            border-top: none;
            border-left: none;
        }

        .hint-tooltip.bottom .tooltip-arrow {
            bottom: 100%;
            left: 50%;
            margin-left: -4px;
            margin-bottom: -4px;
            border-bottom: none;
            border-right: none;
        }

        .hint-tooltip.left .tooltip-arrow {
            left: 100%;
            top: 50%;
            margin-top: -4px;
            margin-left: -4px;
            border-top: none;
            border-right: none;
        }

        .hint-tooltip.right .tooltip-arrow {
            right: 100%;
            top: 50%;
            margin-top: -4px;
            margin-right: -4px;
            border-bottom: none;
            border-left: none;
        }

        .dismiss-button {
            position: absolute;
            top: 4px;
            right: 4px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            font-size: 12px;
            transition: color 0.2s ease;
        }

        .dismiss-button:hover {
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.1);
        }

        /* Glass bypass */
        :host-context(body.has-glass) .hint-tooltip {
            background: rgba(20, 20, 20, 0.98) !important;
            backdrop-filter: none !important;
        }
    `;

    static properties = {
        hintId: { type: String },
        title: { type: String },
        content: { type: String },
        position: { type: String },
        trigger: { type: String },
        persistent: { type: Boolean },
        showOnce: { type: Boolean },
        _isVisible: { type: Boolean, state: true },
        _isDismissed: { type: Boolean, state: true },
    };

    constructor() {
        super();
        this.hintId = '';
        this.title = '';
        this.content = '';
        this.position = 'top';
        this.trigger = 'hover';
        this.persistent = false;
        this.showOnce = false;
        this._isVisible = false;
        this._isDismissed = false;
        this._hoverTimeout = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this.checkIfDismissed();
    }

    checkIfDismissed() {
        if (this.showOnce && window.tutorialService) {
            this._isDismissed = window.tutorialService.isHintDismissed(this.hintId);
        }
    }

    handleTriggerClick() {
        if (this.trigger === 'click') {
            this._isVisible = !this._isVisible;
            this.classList.toggle('show-tooltip', this._isVisible);
        }
    }

    handleMouseEnter() {
        if (this.trigger === 'hover') {
            if (this._hoverTimeout) {
                clearTimeout(this._hoverTimeout);
            }
            this._isVisible = true;
            this.classList.add('show-tooltip');
        }
    }

    handleMouseLeave() {
        if (this.trigger === 'hover' && !this.persistent) {
            this._hoverTimeout = setTimeout(() => {
                this._isVisible = false;
                this.classList.remove('show-tooltip');
            }, 300);
        }
    }

    handleTooltipMouseEnter() {
        if (this.trigger === 'hover' && this._hoverTimeout) {
            clearTimeout(this._hoverTimeout);
        }
    }

    handleTooltipMouseLeave() {
        if (this.trigger === 'hover' && !this.persistent) {
            this._hoverTimeout = setTimeout(() => {
                this._isVisible = false;
                this.classList.remove('show-tooltip');
            }, 300);
        }
    }

    handleDismiss() {
        this._isVisible = false;
        this.classList.remove('show-tooltip');
        
        if (this.showOnce && window.tutorialService) {
            window.tutorialService.dismissHint(this.hintId);
            this._isDismissed = true;
        }
    }

    render() {
        // Don't render if globally disabled or dismissed
        if (this._isDismissed || (window.tutorialService && !window.tutorialService.showHints)) {
            return html`<slot></slot>`;
        }

        const hasTitle = this.title && this.title.trim();
        const hasContent = this.content && this.content.trim();

        if (!hasContent) {
            return html`<slot></slot>`;
        }

        return html`
            <div 
                class="hint-trigger"
                @click=${this.handleTriggerClick}
                @mouseenter=${this.handleMouseEnter}
                @mouseleave=${this.handleMouseLeave}
                title=${this.title || 'Click for help'}
            >
                ?
                <slot></slot>
            </div>

            <div 
                class="hint-tooltip ${this.position}"
                @mouseenter=${this.handleTooltipMouseEnter}
                @mouseleave=${this.handleTooltipMouseLeave}
            >
                <div class="tooltip-arrow"></div>
                
                ${hasTitle ? html`<h4 class="tooltip-title">${this.title}</h4>` : ''}
                <p class="tooltip-content">${this.content}</p>
                
                ${this.persistent || this.showOnce ? html`
                    <button class="dismiss-button" @click=${this.handleDismiss}>×</button>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('tutorial-hint', TutorialHint);
