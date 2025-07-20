// Leviousa101 IPC Bridge Extensions
// Pre-configured API key system
const { ipcMain } = require('electron');
const leviousaConfig = require('../features/common/config/leviousa-config');
const modelStateService = require('../features/common/services/modelStateService');

// Initialize Leviousa-specific IPC handlers
function initializeLeviousaHandlers() {
    console.log('[LeviousaBridge] Initializing Leviousa-specific handlers');

    // Override the areProvidersConfigured to always return true
    ipcMain.handle('apikey:areProvidersConfigured', async () => {
        console.log('[LeviousaBridge] areProvidersConfigured called - returning true (pre-configured)');
        return true;
    });

    // Override validateKey to use pre-configured keys
    ipcMain.handle('apikey:validateKey', async (event, { provider, key }) => {
        console.log('[LeviousaBridge] Validating pre-configured key for provider:', provider);
        
        // For Leviousa101, keys are pre-configured and always valid
        if (provider === 'ollama' || provider === 'whisper') {
            return { success: true };
        }

        const configuredKey = leviousaConfig.leviousaConfig.getApiKey(provider);
        if (configuredKey) {
            // Set the key in the model state service
            await modelStateService.setApiKey(provider, configuredKey);
            return { success: true };
        }

        return { success: false, error: 'Provider not configured' };
    });

    // Override getProviderConfig to return pre-configured providers
    ipcMain.handle('apikey:getProviderConfig', async () => {
        console.log('[LeviousaBridge] Returning pre-configured provider config');
        return leviousaConfig.leviousaConfig.getProviderConfig();
    });

    // Handle selected model changes
    ipcMain.handle('apikey:setSelectedModel', async (event, { type, modelId }) => {
        console.log(`[LeviousaBridge] Setting ${type} model to:`, modelId);
        await modelStateService.setSelectedModel(type, modelId);
        return { success: true };
    });

    // Get current configuration
    ipcMain.handle('leviousa:getConfig', async () => {
        return leviousaConfig.leviousaConfig.getConfig();
    });

    // Check if a feature is enabled
    ipcMain.handle('leviousa:isFeatureEnabled', async (event, feature) => {
        return leviousaConfig.leviousaConfig.isFeatureEnabled(feature);
    });

    // Get speaker intelligence status
    ipcMain.handle('leviousa:getSpeakerIntelligenceStatus', async () => {
        return {
            enabled: leviousaConfig.leviousaConfig.isFeatureEnabled('speakerIntelligence'),
            initialized: false // Will be updated when the service starts
        };
    });

    console.log('[LeviousaBridge] Leviousa handlers initialized');
}

// Initialize pre-configured API keys on startup
async function initializePreConfiguredKeys() {
    console.log('[LeviousaBridge] Initializing pre-configured API keys');
    
    const config = leviousaConfig.leviousaConfig;
    const providers = config.getProviderConfig();
    
    // Set API keys for each configured provider
    for (const [providerId, providerConfig] of Object.entries(providers)) {
        if (providerConfig.apiKey) {
            try {
                await modelStateService.setApiKey(providerId, providerConfig.apiKey);
                console.log(`[LeviousaBridge] Set API key for ${providerId}`);
            } catch (error) {
                console.error(`[LeviousaBridge] Failed to set API key for ${providerId}:`, error);
            }
        }
    }

    // Set default models
    const llmProvider = config.getLLMProvider();
    const sttProvider = config.getSTTProvider();

    if (llmProvider.model) {
        await modelStateService.setSelectedModel('llm', llmProvider.model);
        console.log(`[LeviousaBridge] Set default LLM model: ${llmProvider.model}`);
    }

    if (sttProvider.model) {
        await modelStateService.setSelectedModel('stt', sttProvider.model);
        console.log(`[LeviousaBridge] Set default STT model: ${sttProvider.model}`);
    }

    console.log('[LeviousaBridge] Pre-configured API keys initialized');
}

module.exports = {
    initializeLeviousaHandlers,
    initializePreConfiguredKeys
};
