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

    // Call any MCP tool
    ipcMain.handle('mcp:callTool', async (_event, toolName, args) => {
        try {
            // Use the global invisibility service which contains the MCPMigrationBridge
            if (!global.invisibilityService || !global.invisibilityService.mcpClient) {
                throw new Error('MCP client not available');
            }
            
            const mcpClient = global.invisibilityService.mcpClient;
            if (!mcpClient || !mcpClient.callTool) throw new Error('MCP client not properly initialized');
            
            const result = await mcpClient.callTool(toolName, args || {});
            return { success: true, content: JSON.stringify(result) };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // 🧪 Test subscription service directly in app context
    ipcMain.handle('test:subscription-access', async (event, testUserId) => {
        try {
            console.log(`[TestSubscription] Testing subscription access for user: ${testUserId}`);
            
            const subscriptionService = require('../features/common/services/subscriptionService');
            const authService = require('../features/common/services/authService');
            
            console.log('[TestSubscription] Current user from authService:', authService.getCurrentUser());
            console.log('[TestSubscription] Current user ID from authService:', authService.getCurrentUserId());
            
            // Test integration access directly
            const integrationAccess = await subscriptionService.checkIntegrationsAccess();
            
            console.log('[TestSubscription] ✅ Integration access result:', integrationAccess);
            
            return {
                success: true,
                integrationAccess,
                currentUser: authService.getCurrentUser(),
                currentUserId: authService.getCurrentUserId()
            };
        } catch (error) {
            console.error('[TestSubscription] ❌ Error:', error);
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    });

    // Handle Paragon credentials for SDK integration
    ipcMain.handle('paragon:getCredentials', async (event, userId) => {
        console.log(`[LeviousaBridge] Getting Paragon credentials for user: ${userId}`);
        
        try {
            const jwt = require('jsonwebtoken');
            const fs = require('fs');
            const path = require('path');
            
            // Load Paragon configuration from MCP service
            const paragonEnvPath = path.join(__dirname, '../../services/paragon-mcp/.env');
            let PROJECT_ID, SIGNING_KEY;
            
            if (fs.existsSync(paragonEnvPath)) {
                const envContent = fs.readFileSync(paragonEnvPath, 'utf8');
                const envLines = envContent.split('\n');
                for (const line of envLines) {
                    if (line.trim() && !line.startsWith('#')) {
                        const [key, ...valueParts] = line.split('=');
                        if (key && valueParts.length > 0) {
                            let value = valueParts.join('=');
                            // Remove quotes if present
                            if ((value.startsWith('"') && value.endsWith('"')) || 
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.slice(1, -1);
                            }
                            if (key === 'PROJECT_ID') PROJECT_ID = value;
                            if (key === 'SIGNING_KEY') SIGNING_KEY = value;
                        }
                    }
                }
            }
            
            if (!PROJECT_ID || !SIGNING_KEY) {
                throw new Error('Paragon PROJECT_ID or SIGNING_KEY not found in environment');
            }
            
            // Clean the signing key (convert \\n to actual newlines)
            const SIGNING_KEY_CLEAN = SIGNING_KEY.replace(/\\n/g, '\n');
            
            // Generate JWT token for the user
            const currentTime = Math.floor(Date.now() / 1000);
            const userToken = jwt.sign(
                {
                    sub: userId || 'default-user',
                    aud: `useparagon.com/${PROJECT_ID}`,
                    iat: currentTime,
                    exp: currentTime + 3600 // 1 hour expiration
                },
                SIGNING_KEY_CLEAN,
                { algorithm: 'RS256' }
            );
            
            console.log(`[LeviousaBridge] Generated Paragon credentials for user: ${userId}`);
            
            return {
                PROJECT_ID,
                userToken
            };
            
        } catch (error) {
            console.error('[LeviousaBridge] Error generating Paragon credentials:', error);
            throw error;
        }
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
