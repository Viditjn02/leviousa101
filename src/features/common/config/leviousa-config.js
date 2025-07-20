// Leviousa101 Configuration Extension
// Pre-configured API keys and settings
require('dotenv').config();

const baseConfig = require('./config');

class LeviousaConfig {
    constructor() {
        // Pre-configured API keys (users cannot modify these)
        this.apiKeys = {
            anthropic: process.env.ANTHROPIC_API_KEY,
            openai: process.env.OPENAI_API_KEY,
            deepgram: process.env.DEEPGRAM_API_KEY,
            gemini: process.env.GEMINI_API_KEY || '',
            sieve: process.env.SIEVE_API_KEY || ''
        };

        // Default providers (pre-configured)
        this.providers = {
            llm: {
                provider: process.env.DEFAULT_LLM_PROVIDER || 'openai',
                model: process.env.DEFAULT_LLM_MODEL || 'gpt-4.1',
                apiKey: this.apiKeys.openai
            },
            stt: {
                provider: process.env.DEFAULT_STT_PROVIDER || 'deepgram',
                model: process.env.DEFAULT_STT_MODEL || 'nova-3',
                apiKey: this.apiKeys.deepgram
            }
        };

        // Feature flags
        this.features = {
            speakerIntelligence: process.env.ENABLE_SPEAKER_INTELLIGENCE === 'true',
            meetingIntelligence: process.env.ENABLE_MEETING_INTELLIGENCE === 'true',
            memorySystem: process.env.ENABLE_MEMORY_SYSTEM === 'true',
            localLLM: process.env.ENABLE_LOCAL_LLM === 'true',
            eyeContactCorrection: process.env.ENABLE_EYE_CONTACT_CORRECTION === 'true',
            userApiKeys: false // Disabled - we use pre-configured keys only
        };

        // Firebase configuration
        this.firebase = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID,
            measurementId: process.env.FIREBASE_MEASUREMENT_ID
        };
    }

    // Get API key for a provider
    getApiKey(provider) {
        return this.apiKeys[provider] || '';
    }

    // Check if providers are configured (always true for Leviousa101)
    areProvidersConfigured() {
        return true; // Always configured with pre-set API keys
    }

    // Get provider configuration
    getProviderConfig() {
        return {
            openai: {
                name: 'OpenAI',
                llmModels: [
                    { id: 'gpt-4.1', name: 'GPT-4.1' },
                    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
                ],
                sttModels: [
                    { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe' }
                ],
                apiKey: this.apiKeys.openai
            },
            anthropic: {
                name: 'Anthropic',
                llmModels: [
                    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' }
                ],
                sttModels: [],
                apiKey: this.apiKeys.anthropic
            },
            deepgram: {
                name: 'Deepgram',
                llmModels: [],
                sttModels: [
                    { id: 'nova-3', name: 'Nova-3 (General)' }
                ],
                apiKey: this.apiKeys.deepgram
            },
            gemini: {
                name: 'Google Gemini',
                llmModels: [
                    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
                ],
                sttModels: [
                    { id: 'gemini-live-2.5-flash-preview', name: 'Gemini Live 2.5 Flash' }
                ],
                apiKey: this.apiKeys.gemini
            }
            // Note: Local models (Ollama, Whisper) removed by user request
        };
    }

    // Get current LLM provider settings
    getLLMProvider() {
        return this.providers.llm;
    }

    // Get current STT provider settings
    getSTTProvider() {
        return this.providers.stt;
    }

    // Check if a feature is enabled
    isFeatureEnabled(feature) {
        return this.features[feature] || false;
    }

    // Get all features
    getFeatures() {
        return { ...this.features };
    }

    // Get Firebase config
    getFirebaseConfig() {
        return { ...this.firebase };
    }

    // Export combined configuration
    getConfig() {
        return {
            ...baseConfig.getAll(),
            apiKeys: this.apiKeys,
            providers: this.providers,
            features: this.features,
            firebase: this.firebase,
            // Override to skip API key header
            skipApiKeySetup: true,
            providersConfigured: true
        };
    }
}

// Create singleton instance
const leviousaConfig = new LeviousaConfig();

// Export both configs
module.exports = {
    baseConfig,
    leviousaConfig,
    // Default export is the combined config
    ...leviousaConfig.getConfig()
};
