import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

export class TutorialManager extends LitElement {
    static styles = css`
        :host {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
        }

        .help-button {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            opacity: 0.8;
            backdrop-filter: blur(10px);
        }

        .help-button:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.4);
            transform: scale(1.05);
            opacity: 1;
        }

        .help-button:active {
            transform: scale(0.95);
        }

        .help-icon {
            width: 18px;
            height: 18px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: bold;
            font-size: 16px;
        }

        .tutorial-menu {
            position: absolute;
            bottom: 60px;
            right: 0;
            width: 280px;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            color: white;
            font-family: 'Helvetica Neue', -apple-system, sans-serif;
            backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            opacity: 0;
            transform: translateY(20px) scale(0.9);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: none;
        }

        :host(.menu-open) .tutorial-menu {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }

        .menu-header {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .menu-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 4px 0;
            color: white;
        }

        .menu-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
        }

        .menu-content {
            padding: 8px;
            max-height: 300px;
            overflow-y: auto;
        }

        .tutorial-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s ease;
            border: none;
            background: transparent;
            width: 100%;
            text-align: left;
            color: white;
        }

        .tutorial-item:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .tutorial-icon {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
        }

        .tutorial-content {
            flex: 1;
            min-width: 0;
        }

        .tutorial-name {
            font-size: 14px;
            font-weight: 500;
            margin: 0 0 2px 0;
            color: white;
        }

        .tutorial-description {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
            line-height: 1.3;
        }

        .tutorial-status {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
            flex-shrink: 0;
        }

        .status-completed {
            background: rgba(0, 255, 136, 0.2);
            color: #00ff88;
        }

        .status-available {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
        }

        .menu-footer {
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
        }

        /* Glass bypass */
        :host-context(body.has-glass) .help-button {
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            backdrop-filter: none !important;
        }

        :host-context(body.has-glass) .help-button:hover {
            background: rgba(255, 255, 255, 0.2) !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
        }

        :host-context(body.has-glass) .tutorial-menu {
            background: rgba(20, 20, 20, 0.98) !important;
            backdrop-filter: none !important;
        }
    `;

    static properties = {
        _isMenuOpen: { type: Boolean, state: true },
        _tutorialFlows: { type: Array, state: true },
    };

    constructor() {
        super();
        this._isMenuOpen = false;
        this._tutorialFlows = [];
        this.tutorialService = null;
    }

    async connectedCallback() {
        super.connectedCallback();
        await this.initializeTutorialService();
        
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Click outside to close
        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        document.removeEventListener('click', this.handleDocumentClick.bind(this));
    }

    async initializeTutorialService() {
        try {
            const { tutorialService } = await import('../../features/tutorial/tutorialService.js');
            this.tutorialService = tutorialService;
            this._tutorialFlows = tutorialService.getAvailableFlows();
            console.log('[TutorialManager] Tutorial service connected');
        } catch (error) {
            console.error('[TutorialManager] Failed to load tutorial service:', error);
        }
    }

    handleKeydown(e) {
        // F1 or Cmd/Ctrl + ? to open help
        if (e.key === 'F1' || ((e.metaKey || e.ctrlKey) && e.key === '?')) {
            e.preventDefault();
            this.toggleMenu();
        }
        
        // Escape to close
        if (e.key === 'Escape' && this._isMenuOpen) {
            this.closeMenu();
        }
    }

    handleDocumentClick(e) {
        // Close menu if clicking outside
        if (this._isMenuOpen && !this.contains(e.target)) {
            this.closeMenu();
        }
    }

    toggleMenu() {
        this._isMenuOpen = !this._isMenuOpen;
        this.classList.toggle('menu-open', this._isMenuOpen);
    }

    closeMenu() {
        this._isMenuOpen = false;
        this.classList.remove('menu-open');
    }

    handleTutorialStart(tutorialId) {
        if (this.tutorialService) {
            this.tutorialService.startTutorial(tutorialId);
            this.closeMenu();
        }
    }

    getTutorialStatus(tutorial) {
        if (!this.tutorialService) return 'available';
        
        if (this.tutorialService.isFlowCompleted(tutorial.id)) {
            return 'completed';
        }
        return 'available';
    }

    getTutorialIcon(tutorial) {
        // Return emoji or symbol based on tutorial type
        switch (tutorial.id) {
            case 'welcome': return '👋';
            case 'ask-features': return '💬';
            case 'voice-features': return '🎤';
            case 'settings-customization': return '⚙️';
            case 'advanced-features': return '🚀';
            case 'quick-tips': return '💡';
            default: return '📚';
        }
    }

    render() {
        return html`
            <button 
                class="help-button"
                @click=${this.toggleMenu}
                title="Help & Tutorials (F1)"
            >
                <div class="help-icon">?</div>
            </button>

            <div class="tutorial-menu">
                <div class="menu-header">
                    <h3 class="menu-title">Help & Tutorials</h3>
                    <p class="menu-subtitle">Learn how to use Leviousa effectively</p>
                </div>

                <div class="menu-content">
                    ${this._tutorialFlows.map(tutorial => {
                        const status = this.getTutorialStatus(tutorial);
                        return html`
                            <button 
                                class="tutorial-item"
                                @click=${() => this.handleTutorialStart(tutorial.id)}
                            >
                                <div class="tutorial-icon">
                                    ${this.getTutorialIcon(tutorial)}
                                </div>
                                <div class="tutorial-content">
                                    <h4 class="tutorial-name">${tutorial.name}</h4>
                                    <p class="tutorial-description">${tutorial.description}</p>
                                </div>
                                <div class="tutorial-status ${status === 'completed' ? 'status-completed' : 'status-available'}">
                                    ${status === 'completed' ? '✓' : 'Start'}
                                </div>
                            </button>
                        `;
                    })}
                </div>

                <div class="menu-footer">
                    Press F1 or Cmd+? to open this menu
                </div>
            </div>
        `;
    }
}

customElements.define('tutorial-manager', TutorialManager);
