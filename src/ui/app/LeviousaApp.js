import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import { SettingsView } from '../settings/SettingsView.js';
import { ListenView } from '../listen/ListenView.js';
import { AskView } from '../ask/AskView.js';
import { ShortcutSettingsView } from '../settings/ShortCutSettingsView.js';
import { VoiceSessionIndicator } from '../components/VoiceSessionIndicator.js';

import '../listen/audioCore/renderer.js';

export class LeviousaApp extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
            color: var(--text-color);
            background: transparent;
            border-radius: 7px;
        }

        listen-view {
            display: block;
            width: 100%;
            height: 100%;
        }

        ask-view, settings-view, history-view, help-view, setup-view {
            display: block;
            width: 100%;
            height: 100%;
        }

    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        currentResponseIndex: { type: Number },
        isMainViewVisible: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        isClickThrough: { type: Boolean, state: true },
        layoutMode: { type: String },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        structuredData: { type: Object }, 
    };

    constructor() {
        super();
        console.log('[LeviousaApp] 🚀 Constructor called, URL:', window.location.href);
        const urlParams = new URLSearchParams(window.location.search);
        this.currentView = urlParams.get('view') || 'listen';
        console.log('[LeviousaApp] 🎯 URL params:', Object.fromEntries(urlParams));
        console.log('[LeviousaApp] 🎯 Set currentView to:', this.currentView);
        this.currentResponseIndex = -1;
        
        // Ensure AskView is not tree-shaken by referencing it
        if (AskView && typeof AskView === 'function') {
            console.log('[LeviousaApp] ✅ AskView loaded successfully');
        }
        this.selectedProfile = localStorage.getItem('selectedProfile') || 'interview';
        
        // Language format migration for legacy users
        let lang = localStorage.getItem('selectedLanguage') || 'en';
        if (lang.includes('-')) {
            const newLang = lang.split('-')[0];
            console.warn(`[Migration] Correcting language format from "${lang}" to "${newLang}".`);
            localStorage.setItem('selectedLanguage', newLang);
            lang = newLang;
        }
        this.selectedLanguage = lang;

        this.selectedScreenshotInterval = localStorage.getItem('selectedScreenshotInterval') || '5';
        this.selectedImageQuality = localStorage.getItem('selectedImageQuality') || 'medium';
        this._isClickThrough = false;

    }

    connectedCallback() {
        super.connectedCallback();
        
        if (window.api) {
            window.api.leviousaApp.onClickThroughToggled((_, isEnabled) => {
                this._isClickThrough = isEnabled;
            });
        }

        // Tutorial system now uses dedicated window - no initialization needed here
    }



    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.api) {
            window.api.leviousaApp.removeAllClickThroughListeners();
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('currentView')) {
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        // Only update localStorage when these specific properties change
        if (changedProperties.has('selectedProfile')) {
            localStorage.setItem('selectedProfile', this.selectedProfile);
        }
        if (changedProperties.has('selectedLanguage')) {
            localStorage.setItem('selectedLanguage', this.selectedLanguage);
        }
        if (changedProperties.has('selectedScreenshotInterval')) {
            localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        }
        if (changedProperties.has('selectedImageQuality')) {
            localStorage.setItem('selectedImageQuality', this.selectedImageQuality);
        }
        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
        }
    }

    async handleClose() {
        if (window.api) {
            await window.api.common.quitApplication();
        }
    }




    render() {
        console.log(`[LeviousaApp] 🎨 Rendering view: "${this.currentView}"`);
        console.log(`[LeviousaApp] 🔍 Available custom elements:`, {
            'ask-view': !!customElements.get('ask-view'),
            'listen-view': !!customElements.get('listen-view'),
            'settings-view': !!customElements.get('settings-view'),
            'voice-session-indicator': !!customElements.get('voice-session-indicator')
        });
        
        let mainView;
        switch (this.currentView) {
            case 'listen':
                mainView = html`<listen-view
                    .currentResponseIndex=${this.currentResponseIndex}
                    .selectedProfile=${this.selectedProfile}
                    .structuredData=${this.structuredData}
                    @response-index-changed=${e => (this.currentResponseIndex = e.detail.index)}
                ></listen-view>`;
                break;
            case 'ask':
                console.log('[LeviousaApp] 📝 Rendering ask-view component');
                console.log('[LeviousaApp] 🔍 AskView constructor available?', typeof AskView);
                console.log('[LeviousaApp] 🔍 Custom element ask-view defined?', !!customElements.get('ask-view'));
                mainView = html`<ask-view></ask-view>`;
                break;
            case 'settings':
                mainView = html`<settings-view
                    .selectedProfile=${this.selectedProfile}
                    .selectedLanguage=${this.selectedLanguage}
                    .onProfileChange=${profile => (this.selectedProfile = profile)}
                    .onLanguageChange=${lang => (this.selectedLanguage = lang)}
                ></settings-view>`;
                break;
            case 'shortcut-settings':
                mainView = html`<shortcut-settings-view></shortcut-settings-view>`;
                break;
            case 'history':
                mainView = html`<history-view></history-view>`;
                break;
            case 'help':
                mainView = html`<help-view></help-view>`;
                break;
            case 'setup':
                mainView = html`<setup-view></setup-view>`;
                break;
            default:
                mainView = html`<div>Unknown view: ${this.currentView}</div>`;
        }

        return html`
            ${mainView}
            <voice-session-indicator></voice-session-indicator>
        `;
    }
}

customElements.define('leviousa-app', LeviousaApp);
