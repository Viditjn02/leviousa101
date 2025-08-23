import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import './InvisibilitySettings.js';
import './VoiceAgentSettings.js';
import './MCPSettingsComponent.js';

// import { getOllamaProgressTracker } from '../../features/common/services/localProgressTracker.js'; // 제거됨

export class SettingsView extends LitElement {
    static styles = css`
        * {
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            width: 240px;
            height: 100%;
            color: white;
        }

        .settings-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            background: rgba(20, 20, 20, 0.8);
            border-radius: 12px;
            outline: 0.5px rgba(255, 255, 255, 0.2) solid;
            outline-offset: -1px;
            box-sizing: border-box;
            position: relative;
            overflow-y: auto;
            padding: 12px 12px;
            z-index: 1000;
        }

        .settings-container::-webkit-scrollbar {
            width: 6px;
        }

        .settings-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .settings-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .settings-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .settings-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.15);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            filter: blur(10px);
            z-index: -1;
        }
            
        .settings-button[disabled],
        .api-key-section input[disabled] {
            opacity: 0.4;
            cursor: not-allowed;
            pointer-events: none;
        }

        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            z-index: 1;
        }

        .title-line {
            display: flex;
            align-items: center;
            width: 100%;
        }

        .icons-container {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .app-title {
            font-size: 13px;
            font-weight: 500;
            color: white;
            margin: 0 0 4px 0;
        }

        .account-info {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .subscription-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .subscription-button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .subscription-button:active {
            transform: translateY(1px);
        }

        .pro-badge {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            background: linear-gradient(45deg, #fbbf24, #f59e0b);
            color: #000;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: 700;
            margin-left: 6px;
        }

        .info-button {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-size: 10px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
            position: relative;
        }

        .info-button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            transform: scale(1.05);
        }

        .info-tooltip {
            position: absolute;
            top: 25px;
            right: -15px;
            width: 240px;
            max-height: 350px;
            background: rgba(20, 20, 20, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 6px;
            padding: 12px 12px 12px 18px;
            opacity: 0;
            visibility: hidden;
            transition: all 0.15s ease;
            z-index: 9999;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
            pointer-events: auto;
            overflow-y: auto;
            box-sizing: border-box;
        }

        .info-tooltip::-webkit-scrollbar {
            width: 6px;
        }

        .info-tooltip::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .info-tooltip::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .info-tooltip::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .info-button:hover .info-tooltip,
        .info-tooltip:hover {
            opacity: 1;
            visibility: visible;
        }

        .tooltip-title {
            font-size: 10px;
            font-weight: 600;
            color: white;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .tooltip-section {
            margin-bottom: 5px;
        }

        .tooltip-section-title {
            font-size: 9px;
            font-weight: 600;
            color: #4a90e2;
            margin-bottom: 2px;
        }

        .tooltip-item {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.9);
            margin: 1px 0;
            padding-left: 8px;
            position: relative;
            line-height: 1.4;
            word-wrap: break-word;
        }

        .tooltip-item::before {
            content: '•';
            position: absolute;
            left: 0;
            color: rgba(255, 255, 255, 0.5);
            font-size: 7px;
        }

        .invisibility-icon {
            padding-top: 2px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .invisibility-icon.visible {
            opacity: 1;
        }

        .invisibility-icon svg {
            width: 16px;
            height: 16px;
        }

        /* Legacy shortcuts section - now integrated into new organization */

        .shortcut-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            color: white;
            font-size: 11px;
        }

        .shortcut-name {
            font-weight: 300;
        }

        .shortcut-keys {
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .cmd-key, .shortcut-key {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }

        /* Legacy section - integrated into new organization */

        .settings-button {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 400;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        }

        .settings-button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .settings-button:active {
            transform: translateY(1px);
        }

        .settings-button.full-width {
            width: 100%;
        }

        .settings-button.half-width {
            flex: 1;
        }

        .settings-button.danger {
            background: rgba(255, 59, 48, 0.1);
            border-color: rgba(255, 59, 48, 0.3);
            color: rgba(255, 59, 48, 0.9);
        }

        .settings-button.danger:hover {
            background: rgba(255, 59, 48, 0.15);
            border-color: rgba(255, 59, 48, 0.4);
        }

        .move-buttons, .bottom-buttons {
            display: flex;
            gap: 4px;
        }

        /* Legacy - moved to section-based organization */

        .api-key-section input {
            width: 100%;
            background: rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            border-radius: 4px;
            padding: 4px;
            font-size: 11px;
            margin-bottom: 4px;
            box-sizing: border-box;
        }

        .api-key-section input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        /* Legacy preset section - now integrated into new organization */

        .preset-toggle {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 2px;
            transition: background-color 0.15s ease;
        }

        .preset-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .preset-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
            max-height: 120px;
            overflow-y: auto;
        }

        .preset-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 11px;
            border: 1px solid transparent;
        }

        .preset-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .preset-item.selected {
            background: rgba(0, 122, 255, 0.25);
            border-color: rgba(0, 122, 255, 0.6);
            box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.3);
        }

        .preset-name {
            color: white;
            flex: 1;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            font-weight: 300;
        }

        .preset-item.selected .preset-name {
            font-weight: 500;
        }

        .preset-status {
            font-size: 9px;
            color: rgba(0, 122, 255, 0.8);
            font-weight: 500;
            margin-left: 6px;
        }

        .no-presets-message {
            padding: 12px 8px;
            text-align: center;
            color: rgba(255, 255, 255, 0.5);
            font-size: 10px;
            line-height: 1.4;
        }

        .no-presets-message .web-link {
            color: rgba(0, 122, 255, 0.8);
            text-decoration: underline;
            cursor: pointer;
        }

        .no-presets-message .web-link:hover {
            color: rgba(0, 122, 255, 1);
        }

        .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 11px;
        }

        .loading-spinner {
            width: 12px;
            height: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 6px;
        }

        .hidden {
            display: none;
        }

        /* ═══════════════════════════════════════════════════════════ */
        /* SETTINGS SECTIONS ORGANIZATION */
        /* ═══════════════════════════════════════════════════════════ */
        
        .settings-section {
            margin-bottom: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 8px;
        }
        
        .settings-section:first-of-type {
            border-top: none;
            padding-top: 0;
        }
        
        .section-title {
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 4px;
        }
        
        .section-content {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .info-box {
            margin-bottom: 8px;
        }
        
        .shortcuts-display {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .preset-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            padding: 4px 0;
        }
        
        .preset-count {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 400;
        }

        .api-key-section, .model-selection-section {
            padding: 8px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .provider-key-group, .model-select-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        label {
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.8);
            margin-left: 2px;
        }
        label > strong {
            color: white;
            font-weight: 600;
        }
        .provider-key-group input {
            width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2);
            color: white; border-radius: 4px; padding: 5px 8px; font-size: 11px; box-sizing: border-box;
        }
        .key-buttons { display: flex; gap: 4px; }
        .key-buttons .settings-button { flex: 1; padding: 4px; }
        .model-list {
            display: flex; flex-direction: column; gap: 2px; max-height: 120px;
            overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 4px;
            padding: 4px; margin-top: 4px;
        }
        .model-item { 
            padding: 5px 8px; 
            font-size: 11px; 
            border-radius: 3px; 
            cursor: pointer; 
            transition: background-color 0.15s; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .model-item:hover { background-color: rgba(255,255,255,0.1); }
        .model-item.selected { background-color: rgba(0, 122, 255, 0.4); font-weight: 500; }
        .model-status { 
            font-size: 9px; 
            color: rgba(255,255,255,0.6); 
            margin-left: 8px; 
        }
        .model-status.installed { color: rgba(0, 255, 0, 0.8); }
        .model-status.not-installed { color: rgba(255, 200, 0, 0.8); }
        .install-progress {
            flex: 1;
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            margin-left: 8px;
            overflow: hidden;
        }
        .install-progress-bar {
            height: 100%;
            background: rgba(0, 122, 255, 0.8);
            transition: width 0.3s ease;
        }
        
        /* Dropdown styles */
        select.model-dropdown {
            background: rgba(0,0,0,0.2);
            color: white;
            cursor: pointer;
        }
        
        select.model-dropdown option {
            background: #1a1a1a;
            color: white;
        }
        
        select.model-dropdown option:disabled {
            color: rgba(255,255,255,0.4);
        }
            
        /* ────────────────[ GLASS BYPASS ]─────────────── */
        :host-context(body.has-glass) {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            will-change: auto !important;
        }

        :host-context(body.has-glass) * {
            background: transparent !important;
            filter: none !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            outline: none !important;
            border: none !important;
            border-radius: 0 !important;
            transition: none !important;
            animation: none !important;
        }

        :host-context(body.has-glass) .settings-container::before {
            display: none !important;
        }
    `;


    //////// after_modelStateService ////////
    static properties = {
        shortcuts: { type: Object, state: true },
        firebaseUser: { type: Object, state: true },
        isLoading: { type: Boolean, state: true },
        isContentProtectionOn: { type: Boolean, state: true },
        saving: { type: Boolean, state: true },
        providerConfig: { type: Object, state: true },
        apiKeys: { type: Object, state: true },
        availableLlmModels: { type: Array, state: true },
        availableSttModels: { type: Array, state: true },
        selectedLlm: { type: String, state: true },
        selectedStt: { type: String, state: true },
        isLlmListVisible: { type: Boolean },
        isSttListVisible: { type: Boolean },
        presets: { type: Array, state: true },
        selectedPreset: { type: Object, state: true },
        showPresets: { type: Boolean, state: true },
        autoUpdateEnabled: { type: Boolean, state: true },
        autoUpdateLoading: { type: Boolean, state: true },
        subscription: { type: Object, state: true },
        subscriptionLoading: { type: Boolean, state: true },

    };
    //////// after_modelStateService ////////

    constructor() {
        super();
        //////// after_modelStateService ////////
        this.shortcuts = {};
        this.firebaseUser = null;
        this.apiKeys = { openai: '', gemini: '', anthropic: '', whisper: '' };
        this.providerConfig = {};
        this.isLoading = true;
        this.isContentProtectionOn = true;
        this.saving = false;
        this.availableLlmModels = [];
        this.availableSttModels = [];
        this.selectedLlm = null;
        this.selectedStt = null;
        this.isLlmListVisible = false;
        this.isSttListVisible = false;
        this.presets = [];
        this.selectedPreset = null;
        this.showPresets = false;

        this.handleUseLeviousasKey = this.handleUseLeviousasKey.bind(this)
        this.handleSubscriptionAction = this.handleSubscriptionAction.bind(this)
        this.autoUpdateEnabled = true;
        this.autoUpdateLoading = true;
        this.subscription = null;
        this.subscriptionLoading = true;
        this.loadInitialData();
        //////// after_modelStateService ////////
    }

    async loadAutoUpdateSetting() {
        if (!window.api) return;
        this.autoUpdateLoading = true;
        try {
            const enabled = await window.api.settingsView.getAutoUpdate();
            this.autoUpdateEnabled = enabled;
            console.log('Auto-update setting loaded:', enabled);
        } catch (e) {
            console.error('Error loading auto-update setting:', e);
            this.autoUpdateEnabled = true; // fallback
        }
        this.autoUpdateLoading = false;
        this.requestUpdate();
    }

    async handleToggleAutoUpdate() {
        if (!window.api || this.autoUpdateLoading) return;
        this.autoUpdateLoading = true;
        this.requestUpdate();
        try {
            const newValue = !this.autoUpdateEnabled;
            const result = await window.api.settingsView.setAutoUpdate(newValue);
            if (result && result.success) {
                this.autoUpdateEnabled = newValue;
            } else {
                console.error('Failed to update auto-update setting');
            }
        } catch (e) {
            console.error('Error toggling auto-update:', e);
        }
        this.autoUpdateLoading = false;
        this.requestUpdate();
    }



    //////// after_modelStateService ////////
    async loadInitialData() {
        if (!window.api) return;
        this.isLoading = true;
        try {
            // Load essential data first
            const [userState, modelSettings, presets, contentProtection, shortcuts] = await Promise.all([
                window.api.settingsView.getCurrentUser(),
                window.api.settingsView.getModelSettings(), // Facade call
                window.api.settingsView.getPresets(),
                window.api.settingsView.getContentProtectionStatus(),
                window.api.settingsView.getCurrentShortcuts()
            ]);
            
            if (userState && userState.isLoggedIn) this.firebaseUser = userState;
            
            if (modelSettings.success) {
                const { config, storedKeys, availableLlm, availableStt, selectedModels } = modelSettings.data;
                this.providerConfig = config;
                this.apiKeys = storedKeys;
                this.availableLlmModels = availableLlm;
                this.availableSttModels = availableStt;
                this.selectedLlm = selectedModels.llm;
                this.selectedStt = selectedModels.stt;
            }

            this.presets = presets || [];
            this.isContentProtectionOn = contentProtection;
            this.shortcuts = shortcuts || {};
            if (this.presets.length > 0) {
                const firstUserPreset = this.presets.find(p => p.is_default === 0);
                if (firstUserPreset) this.selectedPreset = firstUserPreset;
            }
            
            // Load subscription data if user is logged in
            if (this.firebaseUser) {
                await this.loadSubscriptionData();
            } else {
                this.subscriptionLoading = false;
            }
            
            // Local AI models removed by user request
        } catch (error) {
            console.error('Error loading initial settings data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadSubscriptionData() {
        if (!this.firebaseUser) {
            this.subscriptionLoading = false;
            return;
        }

        try {
            // Get Firebase ID token for API authentication
            let token = 'mock-token';
            try {
                if (window.api && window.api.settingsView && window.api.settingsView.getFirebaseToken) {
                    token = await window.api.settingsView.getFirebaseToken();
                    console.log('[SettingsView] Got Firebase token for API call');
                }
            } catch (tokenError) {
                console.warn('[SettingsView] Failed to get Firebase token, using mock:', tokenError);
            }
            
            // Fetch subscription data from web API
            const response = await fetch('https://www.leviousa.com/api/subscription/current', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                this.subscription = data.subscription;
            }
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
            // Fallback to mock data for testing
            this.subscription = {
                plan: 'free', // Change to 'pro' to test Pro user UI
                status: 'active',
                current_period_end: Date.now() + (30 * 24 * 60 * 60 * 1000),
                cancel_at_period_end: false
            };
        } finally {
            this.subscriptionLoading = false;
            this.requestUpdate();
        }
    }


    async handleSaveKey(provider) {
        const input = this.shadowRoot.querySelector(`#key-input-${provider}`);
        if (!input) return;
        const key = input.value;
        
        // For Ollama, we need to ensure it's ready first
        if (provider === 'ollama') {
        this.saving = true;
            
            // First ensure Ollama is installed and running
            const ensureResult = await window.api.settingsView.ensureOllamaReady();
            if (!ensureResult.success) {
                alert(`Failed to setup Ollama: ${ensureResult.error}`);
                this.saving = false;
                return;
            }
            
            // Now validate (which will check if service is running)
            const result = await window.api.settingsView.validateKey({ provider, key: 'local' });
            
            if (result.success) {
                await this.refreshModelData();
                await this.refreshOllamaStatus();
            } else {
                alert(`Failed to connect to Ollama: ${result.error}`);
            }
            this.saving = false;
            return;
        }
        
        // For Whisper, just enable it
        if (provider === 'whisper') {
            this.saving = true;
            const result = await window.api.settingsView.validateKey({ provider, key: 'local' });
            
            if (result.success) {
                await this.refreshModelData();
            } else {
                alert(`Failed to enable Whisper: ${result.error}`);
            }
            this.saving = false;
            return;
        }
        
        // For other providers, use the normal flow
        this.saving = true;
        const result = await window.api.settingsView.validateKey({ provider, key });
        
        if (result.success) {
            await this.refreshModelData();
        } else {
            alert(`Failed to save ${provider} key: ${result.error}`);
            input.value = this.apiKeys[provider] || '';
        }
        this.saving = false;
    }
    
    async handleClearKey(provider) {
        console.log(`[SettingsView] handleClearKey: ${provider}`);
        this.saving = true;
        await window.api.settingsView.removeApiKey(provider);
        this.apiKeys = { ...this.apiKeys, [provider]: '' };
        await this.refreshModelData();
        this.saving = false;
    }

    async refreshModelData() {
        const [availableLlm, availableStt, selected, storedKeys] = await Promise.all([
            window.api.settingsView.getAvailableModels({ type: 'llm' }),
            window.api.settingsView.getAvailableModels({ type: 'stt' }),
            window.api.settingsView.getSelectedModels(),
            window.api.settingsView.getAllKeys()
        ]);
        this.availableLlmModels = availableLlm;
        this.availableSttModels = availableStt;
        this.selectedLlm = selected.llm;
        this.selectedStt = selected.stt;
        this.apiKeys = storedKeys;
        this.requestUpdate();
    }
    
    async toggleModelList(type) {
        const visibilityProp = type === 'llm' ? 'isLlmListVisible' : 'isSttListVisible';

        if (!this[visibilityProp]) {
            this.saving = true;
            this.requestUpdate();
            
            await this.refreshModelData();

            this.saving = false;
        }

        // 데이터 새로고침 후, 목록의 표시 상태를 토글합니다.
        this[visibilityProp] = !this[visibilityProp];
        this.requestUpdate();
    }
    
    async selectModel(type, modelId) {
        this.saving = true;
        await window.api.settingsView.setSelectedModel({ type, modelId });
        if (type === 'llm') this.selectedLlm = modelId;
        if (type === 'stt') this.selectedStt = modelId;
        this.isLlmListVisible = false;
        this.isSttListVisible = false;
        this.saving = false;
        this.requestUpdate();
    }
    



    handleUseLeviousasKey(e) {
        e.preventDefault()
        if (this.wasJustDragged) return
    
        console.log("Requesting Firebase authentication from main process...")
        window.api.settingsView.startFirebaseAuth();
    }
    //////// after_modelStateService ////////

    openShortcutEditor() {
        window.api.settingsView.openShortcutSettingsWindow();
    }

    connectedCallback() {
        super.connectedCallback();
        
        this.setupEventListeners();
        this.setupIpcListeners();
        this.setupWindowResize();
        this.loadAutoUpdateSetting();
        // Force one height calculation immediately (innerHeight may be 0 at first)
        setTimeout(() => this.updateScrollHeight(), 0);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanupEventListeners();
        this.cleanupIpcListeners();
        this.cleanupWindowResize();
        
        // Cancel any ongoing Ollama installations when component is destroyed
        const installingModels = Object.keys(this.installingModels);
        if (installingModels.length > 0) {
            installingModels.forEach(modelName => {
                window.api.settingsView.cancelOllamaInstallation(modelName);
            });
        }
    }

    setupEventListeners() {
        this.addEventListener('mouseenter', this.handleMouseEnter);
        this.addEventListener('mouseleave', this.handleMouseLeave);
    }

    cleanupEventListeners() {
        this.removeEventListener('mouseenter', this.handleMouseEnter);
        this.removeEventListener('mouseleave', this.handleMouseLeave);
    }

    setupIpcListeners() {
        if (!window.api) return;
        
        this._userStateListener = (event, userState) => {
            console.log('[SettingsView] Received user-state-changed:', userState);
            if (userState && userState.isLoggedIn) {
                this.firebaseUser = userState;
            } else {
                this.firebaseUser = null;
            }
            this.loadAutoUpdateSetting();
            // Reload model settings when user state changes (Firebase login/logout)
            this.loadInitialData();
        };
        
        this._settingsUpdatedListener = (event, settings) => {
            console.log('[SettingsView] Received settings-updated');
            this.settings = settings;
            this.requestUpdate();
        };

        // 프리셋 업데이트 리스너 추가
        this._presetsUpdatedListener = async (event) => {
            console.log('[SettingsView] Received presets-updated, refreshing presets');
            try {
                const presets = await window.api.settingsView.getPresets();
                this.presets = presets || [];
                
                // 현재 선택된 프리셋이 삭제되었는지 확인 (사용자 프리셋만 고려)
                const userPresets = this.presets.filter(p => p.is_default === 0);
                if (this.selectedPreset && !userPresets.find(p => p.id === this.selectedPreset.id)) {
                    this.selectedPreset = userPresets.length > 0 ? userPresets[0] : null;
                }
                
                this.requestUpdate();
            } catch (error) {
                console.error('[SettingsView] Failed to refresh presets:', error);
            }
        };
        this._shortcutListener = (event, keybinds) => {
            console.log('[SettingsView] Received updated shortcuts:', keybinds);
            this.shortcuts = keybinds;
        };
        
        window.api.settingsView.onUserStateChanged(this._userStateListener);
        window.api.settingsView.onSettingsUpdated(this._settingsUpdatedListener);
        window.api.settingsView.onPresetsUpdated(this._presetsUpdatedListener);
        window.api.settingsView.onShortcutsUpdated(this._shortcutListener);
    }

    cleanupIpcListeners() {
        if (!window.api) return;
        
        if (this._userStateListener) {
            window.api.settingsView.removeOnUserStateChanged(this._userStateListener);
        }
        if (this._settingsUpdatedListener) {
            window.api.settingsView.removeOnSettingsUpdated(this._settingsUpdatedListener);
        }
        if (this._presetsUpdatedListener) {
            window.api.settingsView.removeOnPresetsUpdated(this._presetsUpdatedListener);
        }
        if (this._shortcutListener) {
            window.api.settingsView.removeOnShortcutsUpdated(this._shortcutListener);
        }
    }

    setupWindowResize() {
        this.resizeHandler = () => {
            this.requestUpdate();
            this.updateScrollHeight();
        };
        window.addEventListener('resize', this.resizeHandler);
        
        // Initial setup
        setTimeout(() => this.updateScrollHeight(), 100);
    }

    cleanupWindowResize() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
    }

    updateScrollHeight() {
        // Electron 일부 시점에서 window.innerHeight 가 0 으로 보고되는 버그 보호
        const rawHeight = window.innerHeight || (window.screen ? window.screen.height : 0);
        const MIN_HEIGHT = 300; // 최소 보장 높이
        const maxHeight = Math.max(MIN_HEIGHT, rawHeight);

        this.style.maxHeight = `${maxHeight}px`;

        const container = this.shadowRoot?.querySelector('.settings-container');
        if (container) {
            container.style.maxHeight = `${maxHeight}px`;
        }
    }

    handleMouseEnter = () => {
        window.api.settingsView.cancelHideSettingsWindow();
        // Recalculate height in case it was set to 0 before
        this.updateScrollHeight();
    }

    handleMouseLeave = () => {
        window.api.settingsView.hideSettingsWindow();
    }


    getMainShortcuts() {
        return [
            { name: 'Show / Hide', accelerator: this.shortcuts.toggleVisibility },
            { name: 'Ask Anything', accelerator: this.shortcuts.nextStep },
            { name: 'Scroll Up Response', accelerator: this.shortcuts.scrollUp },
            { name: 'Scroll Down Response', accelerator: this.shortcuts.scrollDown },
        ];
    }

    renderShortcutKeys(accelerator) {
        if (!accelerator) return html`N/A`;
        
        const keyMap = {
            'Cmd': '⌘', 'Command': '⌘', 'Ctrl': '⌃', 'Alt': '⌥', 'Shift': '⇧', 'Enter': '↵',
            'Up': '↑', 'Down': '↓', 'Left': '←', 'Right': '→'
        };

        // scrollDown/scrollUp의 특수 처리
        if (accelerator.includes('↕')) {
            const keys = accelerator.replace('↕','').split('+');
            keys.push('↕');
             return html`${keys.map(key => html`<span class="shortcut-key">${keyMap[key] || key}</span>`)}`;
        }

        const keys = accelerator.split('+');
        return html`${keys.map(key => html`<span class="shortcut-key">${keyMap[key] || key}</span>`)}`;
    }

    togglePresets() {
        this.showPresets = !this.showPresets;
    }

    async handlePresetSelect(preset) {
        this.selectedPreset = preset;
        // Here you could implement preset application logic
        console.log('Selected preset:', preset);
    }

    handleMoveLeft() {
        console.log('Move Left clicked');
        window.api.settingsView.moveWindowStep('left');
    }

    handleMoveRight() {
        console.log('Move Right clicked');
        window.api.settingsView.moveWindowStep('right');
    }

    async handlePersonalize() {
        console.log('Personalize clicked');
        try {
            await window.api.settingsView.openPersonalizePage();
        } catch (error) {
            console.error('Failed to open personalize page:', error);
        }
    }

    async handleToggleInvisibility() {
        console.log('Toggle Invisibility clicked');
        this.isContentProtectionOn = await window.api.settingsView.toggleContentProtection();
        this.requestUpdate();
    }

    async handleSaveApiKey() {
        const input = this.shadowRoot.getElementById('api-key-input');
        if (!input || !input.value) return;

        const newApiKey = input.value;
        try {
            const result = await window.api.settingsView.saveApiKey(newApiKey);
            if (result.success) {
                console.log('API Key saved successfully via IPC.');
                this.apiKey = newApiKey;
                this.requestUpdate();
            } else {
                 console.error('Failed to save API Key via IPC:', result.error);
            }
        } catch(e) {
            console.error('Error invoking save-api-key IPC:', e);
        }
    }

    handleQuit() {
        console.log('Quit clicked');
        window.api.settingsView.quitApplication();
    }

    handleFirebaseLogout() {
        console.log('Firebase Logout clicked');
        window.api.settingsView.firebaseLogout();
    }

    handleSubscriptionAction() {
        console.log('Subscription action clicked');
        const isProUser = this.subscription?.plan === 'pro';
        const url = 'https://www.leviousa.com/settings/billing';
        
        console.log(`Opening ${isProUser ? 'manage' : 'upgrade'} page:`, url);
        
        // Use the existing MCP openExternalUrl method from preload.js
        if (window.api && window.api.mcp && window.api.mcp.openExternalUrl) {
            window.api.mcp.openExternalUrl(url);
            console.log('Opened URL using api.mcp.openExternalUrl');
        } else if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(url);
            console.log('Opened URL using electronAPI.openExternal');
        } else {
            console.log('No electron API available, using fallback');
            this.fallbackOpenUrl(url);
        }
    }

    fallbackOpenUrl(url) {
        console.log('Using fallback method to open URL:', url);
        // Create a temporary link and click it
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async handleOllamaShutdown() {
        console.log('[SettingsView] Shutting down Ollama service...');
        
        if (!window.api) return;
        
        try {
            // Show loading state
            this.ollamaStatus = { ...this.ollamaStatus, running: false };
            this.requestUpdate();
            
            const result = await window.api.settingsView.shutdownOllama(false); // Graceful shutdown
            
            if (result.success) {
                console.log('[SettingsView] Ollama shut down successfully');
                // Refresh status to reflect the change
                await this.refreshOllamaStatus();
            } else {
                console.error('[SettingsView] Failed to shutdown Ollama:', result.error);
                // Restore previous state on error
                await this.refreshOllamaStatus();
            }
        } catch (error) {
            console.error('[SettingsView] Error during Ollama shutdown:', error);
            // Restore previous state on error
            await this.refreshOllamaStatus();
        }
    }

    //////// after_modelStateService ////////
    render() {
        if (this.isLoading) {
            return html`
                <div class="settings-container">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <span>Loading...</span>
                    </div>
                </div>
            `;
        }

        const loggedIn = !!this.firebaseUser;

        // Helper function to get model display name
        const getModelName = (type, id) => {
            const models = type === 'llm' ? this.availableLlmModels : this.availableSttModels;
            const model = models.find(m => m.id === id);
            return model ? model.name : id;
        }

        return html`
            <div class="settings-container" data-tutorial="settings-area">
                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- HEADER SECTION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div class="header-section">
                    <div>
                        <div class="title-line">
                            <h1 class="app-title">
                                Leviousa
                                ${this.subscription?.plan === 'pro' ? html`
                                    <span class="pro-badge">
                                        Pro
                                    </span>
                                ` : ''}
                            </h1>
                        </div>
                        <div class="account-info">
                            <span>
                                ${this.firebaseUser
                                    ? html`Profile: ${this.firebaseUser.email || 'Logged In'}`
                                    : `Profile: Not Logged In`
                                }
                            </span>
                            ${this.firebaseUser && !this.subscriptionLoading ? html`
                                <button 
                                    class="subscription-button"
                                    @click="${this.handleSubscriptionAction}"
                                    title="${this.subscription?.plan === 'pro' ? 'Manage subscription' : 'Upgrade to Pro'}"
                                >
                                    ${this.subscription?.plan === 'pro' ? 'Manage' : 'Upgrade'}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="icons-container">
                        <div class="invisibility-icon ${this.isContentProtectionOn ? 'visible' : ''}" title="Invisibility is On">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.785 7.41787C8.7 7.41787 7.79 8.19371 7.55667 9.22621C7.0025 8.98704 6.495 9.05121 6.11 9.22037C5.87083 8.18204 4.96083 7.41787 3.88167 7.41787C2.61583 7.41787 1.58333 8.46204 1.58333 9.75121C1.58333 11.0404 2.61583 12.0845 3.88167 12.0845C5.08333 12.0845 6.06333 11.1395 6.15667 9.93787C6.355 9.79787 6.87417 9.53537 7.51 9.94954C7.615 11.1454 8.58333 12.0845 9.785 12.0845C11.0508 12.0845 12.0833 11.0404 12.0833 9.75121C12.0833 8.46204 11.0508 7.41787 9.785 7.41787ZM3.88167 11.4195C2.97167 11.4195 2.2425 10.6729 2.2425 9.75121C2.2425 8.82954 2.9775 8.08287 3.88167 8.08287C4.79167 8.08287 5.52083 8.82954 5.52083 9.75121C5.52083 10.6729 4.79167 11.4195 3.88167 11.4195ZM9.785 11.4195C8.875 11.4195 8.14583 10.6729 8.14583 9.75121C8.14583 8.82954 8.875 8.08287 9.785 8.08287C10.695 8.08287 11.43 8.82954 11.43 9.75121C11.43 10.6729 10.6892 11.4195 9.785 11.4195ZM12.6667 5.95954H1V6.83454H12.6667V5.95954ZM8.8925 1.36871C8.76417 1.08287 8.4375 0.931207 8.12833 1.03037L6.83333 1.46204L5.5325 1.03037L5.50333 1.02454C5.19417 0.93704 4.8675 1.10037 4.75083 1.39787L3.33333 5.08454H10.3333L8.91 1.39787L8.8925 1.36871Z" fill="white"/>
                            </svg>
                        </div>
                        <div class="info-button">
                            i
                            <div class="info-tooltip">
                                <div class="tooltip-title">
                                    ℹ️ How to Use Leviousa
                                </div>
                                
                                <div class="tooltip-section">
                                    <div class="tooltip-section-title">Setup Required:</div>
                                    <div class="tooltip-item">System Preferences → Privacy & Security → Accessibility</div>
                                    <div class="tooltip-item">Grant permission to Leviousa app</div>
                                    <div class="tooltip-item">Restart app after granting access</div>
                                </div>

                                <div class="tooltip-section">
                                    <div class="tooltip-section-title">Voice Assistant:</div>
                                    <div class="tooltip-item">Say "Hey Leviousa" to activate</div>
                                    <div class="tooltip-item">Voice commands with screen analysis</div>
                                    <div class="tooltip-item">Automated task execution</div>
                                </div>

                                <div class="tooltip-section">
                                    <div class="tooltip-section-title">Key Shortcuts:</div>
                                    <div class="tooltip-item">⌘+I - Toggle invisibility mode</div>
                                    <div class="tooltip-item">⌘+L - Auto-answer questions</div>
                                    <div class="tooltip-item">⌘+B - Open internal browser</div>
                                    <div class="tooltip-item">⌘+Enter - Ask anything</div>
                                </div>

                                <div class="tooltip-section">
                                    <div class="tooltip-section-title">Integrations:</div>
                                    <div class="tooltip-item">Gmail, Calendar, LinkedIn, Notion</div>
                                    <div class="tooltip-item">Meeting intelligence & summaries</div>
                                    <div class="tooltip-item">Pre-configured AI models</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- ACCOUNT & PROFILE SECTION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div class="settings-section">
                    <div class="section-title">Account & Profile</div>
                    <div class="section-content">
                        <button class="settings-button full-width" @click=${this.handlePersonalize}>
                            <span>Personalize / Meeting Notes</span>
                        </button>
                        <div class="bottom-buttons">
                            ${this.firebaseUser
                                ? html`
                                    <button class="settings-button half-width danger" @click=${this.handleFirebaseLogout}>
                                        <span>Logout</span>
                                    </button>
                                    `
                                : html`
                                    <button class="settings-button half-width" @click=${this.handleUseLeviousasKey}>
                                        <span>Login</span>
                                    </button>
                                    `
                            }
                            <button class="settings-button half-width" @click=${this.handleToggleAutoUpdate} ?disabled=${this.autoUpdateLoading}>
                                <span>Updates: ${this.autoUpdateEnabled ? 'On' : 'Off'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- AI MODELS & PROVIDERS SECTION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div class="settings-section">
                    <div class="section-title">AI Models & Providers</div>
                    <div class="section-content">

                        
                        <!-- Model Selection -->
                        <div class="model-select-group">
                            <label>LLM Model: <strong>${getModelName('llm', this.selectedLlm) || 'Not Set'}</strong></label>
                            <button class="settings-button full-width" @click=${() => this.toggleModelList('llm')} ?disabled=${this.saving || this.availableLlmModels.length === 0}>
                                Change LLM Model
                            </button>
                            ${this.isLlmListVisible ? html`
                                <div class="model-list">
                                    ${this.availableLlmModels.map(model => html`
                                        <div class="model-item ${this.selectedLlm === model.id ? 'selected' : ''}" 
                                             @click=${() => this.selectModel('llm', model.id)}>
                                            <span>${model.name}</span>
                                        </div>
                                    `)}
                                </div>
                            ` : ''}
                        </div>
                        <div class="model-select-group">
                            <label>STT Model: <strong>${getModelName('stt', this.selectedStt) || 'Not Set'}</strong></label>
                            <button class="settings-button full-width" @click=${() => this.toggleModelList('stt')} ?disabled=${this.saving || this.availableSttModels.length === 0}>
                                Change STT Model
                            </button>
                            ${this.isSttListVisible ? html`
                                <div class="model-list">
                                    ${this.availableSttModels.map(model => html`
                                        <div class="model-item ${this.selectedStt === model.id ? 'selected' : ''}" 
                                             @click=${() => this.selectModel('stt', model.id)}>
                                            <span>${model.name}</span>
                                        </div>
                                    `)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- SHORTCUTS & CONTROLS SECTION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div class="settings-section">
                    <div class="section-title">Shortcuts & Controls</div>
                    <div class="section-content">
                        <button class="settings-button full-width" @click=${this.openShortcutEditor}>
                            Edit Shortcuts
                        </button>
                        
                        <div class="shortcuts-display">
                            ${this.getMainShortcuts().map(shortcut => html`
                                <div class="shortcut-item">
                                    <span class="shortcut-name">${shortcut.name}</span>
                                    <div class="shortcut-keys">
                                        ${this.renderShortcutKeys(shortcut.accelerator)}
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- MY PRESETS SECTION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div class="settings-section">
                    <div class="section-title">My Presets</div>
                    <div class="section-content">
                        <div class="preset-header">
                            <span class="preset-count">${this.presets.filter(p => p.is_default === 0).length} custom presets</span>
                            <span class="preset-toggle" @click=${this.togglePresets}>
                                ${this.showPresets ? '▼' : '▶'}
                            </span>
                        </div>
                        
                        <div class="preset-list ${this.showPresets ? '' : 'hidden'}">
                            ${this.presets.filter(p => p.is_default === 0).length === 0 ? html`
                                <div class="no-presets-message">
                                    No custom presets yet.<br>
                                    <span class="web-link" @click=${this.handlePersonalize}>
                                        Create your first preset
                                    </span>
                                </div>
                            ` : this.presets.filter(p => p.is_default === 0).map(preset => html`
                                <div class="preset-item ${this.selectedPreset?.id === preset.id ? 'selected' : ''}"
                                     @click=${() => this.handlePresetSelect(preset)}>
                                    <span class="preset-name">${preset.title}</span>
                                    ${this.selectedPreset?.id === preset.id ? html`<span class="preset-status">Selected</span>` : ''}
                                </div>
                            `)}
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- PRIVACY & AUTOMATION SECTION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div class="settings-section">
                    <div class="section-title">Privacy & Automation</div>
                    <div class="section-content">
                        <!-- Privacy Protection -->
                        <invisibility-settings></invisibility-settings>
                        
                        <!-- Voice Control -->
                        <voice-agent-settings></voice-agent-settings>
                        
                        <!-- Connected Apps -->
                        <mcp-settings></mcp-settings>
                        
                        <button class="settings-button full-width" @click=${this.handleToggleInvisibility}>
                            <span>${this.isContentProtectionOn ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}</span>
                        </button>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- WINDOW & SYSTEM SECTION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div class="settings-section">
                    <div class="section-title">Window & System</div>
                    <div class="section-content">
                        <div class="move-buttons">
                            <button class="settings-button half-width" @click=${this.handleMoveLeft}>
                                <span>← Move</span>
                            </button>
                            <button class="settings-button half-width" @click=${this.handleMoveRight}>
                                <span>Move →</span>
                            </button>
                        </div>
                        
                        <button class="settings-button full-width danger" @click=${this.handleQuit}>
                            <span>Quit Application</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    //////// after_modelStateService ////////
}

customElements.define('settings-view', SettingsView);