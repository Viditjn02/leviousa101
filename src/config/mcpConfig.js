/**
 * MCP Configuration Management System
 * Handles authentication, credential storage, and OAuth flows for external services
 */

// Ensure environment variables are loaded
require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class MCPConfigManager extends EventEmitter {
    constructor() {
        super();
        this.configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.mcp-config');
        this.credentialsPath = path.join(this.configPath, 'credentials.json');
        this.serversPath = path.join(this.configPath, 'servers.json');
        this.oauthStatesPath = path.join(this.configPath, 'oauth-states.json');
        
        this.config = {
            servers: {},
            credentials: {},
            oauthStates: {}
        };
        
        this.encryptionKey = this.getOrCreateEncryptionKey();
        
        // OAuth providers will be loaded dynamically from registry
        this.oauthProviders = {};
        this.oauthServicesRegistry = null;
    }

    /**
     * Load OAuth services registry
     */
    async loadOAuthServicesRegistry() {
        try {
            const registryPath = path.join(__dirname, 'oauth-services-registry.json');
            const registryContent = await fs.readFile(registryPath, 'utf-8');
            this.oauthServicesRegistry = JSON.parse(registryContent);
            
            // Convert OAuth services to provider configurations
            this.oauthProviders = {};
            
            for (const [serviceKey, service] of Object.entries(this.oauthServicesRegistry.services)) {
                if (service.oauth) {
                    const provider = service.oauth.provider;
                    
                    // Initialize provider if not exists
                    if (!this.oauthProviders[provider]) {
                        this.oauthProviders[provider] = {
                            authUrl: service.oauth.authUrl,
                            tokenUrl: service.oauth.tokenUrl,
                            scopes: {}
                        };
                    }
                    
                    // Add service-specific scopes
                    const scopes = service.oauth.scopes.default || service.oauth.scopes.required || [];
                    this.oauthProviders[provider].scopes[serviceKey] = scopes;
                    
                    // Update URLs if they're more specific (e.g., different for different services)
                    if (service.oauth.authUrl && !service.oauth.authUrl.includes('{')) {
                        this.oauthProviders[provider].authUrl = service.oauth.authUrl;
                    }
                    if (service.oauth.tokenUrl && !service.oauth.tokenUrl.includes('{')) {
                        this.oauthProviders[provider].tokenUrl = service.oauth.tokenUrl;
                    }
                }
            }
            
            // Add legacy providers as fallback
            this.addLegacyProviders();
            
            console.log('[MCPConfig] OAuth services registry loaded successfully');
        } catch (error) {
            console.error('[MCPConfig] Failed to load OAuth services registry:', error.message);
            // Fall back to legacy providers
            this.addLegacyProviders();
        }
    }

    /**
     * Add legacy OAuth providers as fallback
     */
    addLegacyProviders() {
        // Legacy providers for backward compatibility
        const legacyProviders = {
            google: {
                authUrl: 'https://accounts.google.com/o/oauth2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scopes: {
                    drive: ['https://www.googleapis.com/auth/drive.readonly'],
                    calendar: ['https://www.googleapis.com/auth/calendar.readonly'],
                    gmail: ['https://www.googleapis.com/auth/gmail.readonly']
                }
            },
            github: {
                authUrl: 'https://github.com/login/oauth/authorize',
                tokenUrl: 'https://github.com/login/oauth/access_token',
                scopes: {
                    repo: ['repo'],
                    user: ['user:email'],
                    public_repo: ['public_repo']
                }
            },
            notion: {
                authUrl: 'https://api.notion.com/v1/oauth/authorize',
                tokenUrl: 'https://api.notion.com/v1/oauth/token',
                scopes: {
                    // Notion uses capabilities set in the integration settings, not OAuth scopes
                    read: [],
                    write: []
                }
            },
            slack: {
                authUrl: 'https://slack.com/oauth/v2/authorize',
                tokenUrl: 'https://slack.com/api/oauth.v2.access',
                scopes: {
                    channels: [
                        'channels:read', 
                        'channels:history',
                        'groups:read',
                        'groups:history', 
                        'im:read',
                        'im:history',
                        'mpim:read',
                        'mpim:history'
                    ],
                    messaging: ['chat:write']
                }
            }
        };
        
        // Merge legacy providers with loaded providers
        for (const [provider, config] of Object.entries(legacyProviders)) {
            if (!this.oauthProviders[provider]) {
                this.oauthProviders[provider] = config;
            } else {
                // Merge scopes
                this.oauthProviders[provider].scopes = {
                    ...config.scopes,
                    ...this.oauthProviders[provider].scopes
                };
            }
        }
    }

    /**
     * Get OAuth provider configuration
     */
    getOAuthProviderConfig(provider) {
        return this.oauthProviders[provider];
    }

    /**
     * Get available OAuth services from registry
     */
    getAvailableOAuthServices() {
        if (!this.oauthServicesRegistry) {
            return [];
        }
        
        return Object.entries(this.oauthServicesRegistry.services)
            .filter(([_, service]) => service.enabled && service.oauth)
            .map(([key, service]) => ({
                key,
                name: service.name,
                description: service.description,
                provider: service.oauth.provider,
                priority: service.priority
            }))
            .sort((a, b) => a.priority - b.priority);
    }

                async initialize() {
        try {
            // Ensure config directory exists
            await this.ensureConfigDirectory();
            
            // Load OAuth services registry first
            await this.loadOAuthServicesRegistry();
            
            // Load existing configuration
            await this.loadConfiguration();
            
            // Load environment credentials
            await this.loadEnvironmentCredentials();
            
            console.log('[MCPConfig] Configuration manager initialized');
        } catch (error) {
            console.error('[MCPConfig] Failed to initialize:', error.message);
            throw error;
        }
    }

    async ensureConfigDirectory() {
        try {
            await fs.access(this.configPath);
        } catch {
            await fs.mkdir(this.configPath, { recursive: true });
        }
    }

    getOrCreateEncryptionKey() {
        const keyPath = path.join(this.configPath, '.key');
        try {
            return require('fs').readFileSync(keyPath, 'utf8');
        } catch {
            // Ensure config directory exists before writing key
            try {
                require('fs').mkdirSync(this.configPath, { recursive: true });
            } catch (dirError) {
                // Directory might already exist, ignore error
            }
            
            const key = crypto.randomBytes(32).toString('hex');
            require('fs').writeFileSync(keyPath, key, { mode: 0o600 });
            return key;
        }
    }

            encrypt(text) {
            const iv = crypto.randomBytes(16);
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        }

        decrypt(encryptedText) {
            try {
                // Handle modern format (with IV)
                if (encryptedText.includes(':')) {
                    const parts = encryptedText.split(':');
                    if (parts.length === 2) {
                        const iv = Buffer.from(parts[0], 'hex');
                        const encrypted = parts[1];
                        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
                        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
                        decrypted += decipher.final('utf8');
                        return decrypted;
                    }
                }
                
                // Legacy credentials need to be migrated - return empty and let them be reloaded
                console.warn('[MCPConfig] Legacy credential format detected, will be migrated on next save');
                return '';
            } catch (error) {
                console.warn('[MCPConfig] Failed to decrypt credential, will be regenerated:', error.message);
                return '';
            }
        }

            async loadConfiguration() {
            try {
                // Load server configurations
                try {
                    const serversData = await fs.readFile(this.serversPath, 'utf8');
                    this.config.servers = JSON.parse(serversData);
                } catch {
                    this.config.servers = {};
                }

                // Load encrypted credentials
                try {
                    const credentialsData = await fs.readFile(this.credentialsPath, 'utf8');
                    const encryptedCreds = JSON.parse(credentialsData);
                    this.config.credentials = {};
                    for (const [key, encryptedValue] of Object.entries(encryptedCreds)) {
                        this.config.credentials[key] = this.decrypt(encryptedValue);
                    }
                } catch {
                    this.config.credentials = {};
                }

                // Load OAuth states
                try {
                    const oauthData = await fs.readFile(this.oauthStatesPath, 'utf8');
                    this.config.oauthStates = JSON.parse(oauthData);
                } catch {
                    this.config.oauthStates = {};
                }
            } catch (error) {
                console.error('[MCPConfig] Error loading configuration:', error.message);
            }
        }

        async loadEnvironmentCredentials() {
            console.log('[MCPConfig] 🔄 Loading environment credentials...');
            
            // Load OAuth credentials from environment variables
            const envCredentials = {
                // Notion credentials
                'notion_client_id': process.env.NOTION_CLIENT_ID,
                'notion_client_secret': process.env.NOTION_CLIENT_SECRET,
                
                // GitHub credentials
                'github_client_id': process.env.GITHUB_CLIENT_ID,
                'github_client_secret': process.env.GITHUB_CLIENT_SECRET,
                
                // Slack credentials
                'slack_client_id': process.env.SLACK_CLIENT_ID,
                'slack_client_secret': process.env.SLACK_CLIENT_SECRET,
                
                // Google credentials (if you want to add them later)
                'google_client_id': process.env.GOOGLE_CLIENT_ID,
                'google_client_secret': process.env.GOOGLE_CLIENT_SECRET,
            };

            console.log('[MCPConfig] 📋 Environment variables check:');
            Object.entries(envCredentials).forEach(([key, value]) => {
                if (value && value.trim()) {
                    console.log(`[MCPConfig] ✅ ${key}: ${value.substring(0, 8)}...`);
                } else {
                    console.log(`[MCPConfig] ❌ ${key}: MISSING`);
                }
            });

            // Only set credentials that exist in environment
            let credentialsLoaded = 0;
            for (const [key, value] of Object.entries(envCredentials)) {
                if (value && value.trim()) {
                    this.config.credentials[key] = value.trim();
                    credentialsLoaded++;
                    console.log(`[MCPConfig] 💾 Stored credential: ${key}`);
                }
            }

            console.log(`[MCPConfig] 📊 Loaded ${credentialsLoaded} credentials from environment`);
            console.log(`[MCPConfig] 🗃️ Total credentials available:`, Object.keys(this.config.credentials));

            // Save the updated configuration
            if (credentialsLoaded > 0) {
                await this.saveConfiguration();
                console.log('[MCPConfig] 💿 Environment credentials saved to config');
            } else {
                console.warn('[MCPConfig] ⚠️ No environment credentials found! Please check your .env file');
            }
        }

    async saveConfiguration() {
        try {
            // Save server configurations
            await fs.writeFile(this.serversPath, JSON.stringify(this.config.servers, null, 2));

            // Save encrypted credentials
            const encryptedCreds = {};
            for (const [key, value] of Object.entries(this.config.credentials)) {
                if (typeof value === 'string') {
                    encryptedCreds[key] = this.encrypt(value);
                }
            }
            await fs.writeFile(this.credentialsPath, JSON.stringify(encryptedCreds, null, 2));

            // Save OAuth states
            await fs.writeFile(this.oauthStatesPath, JSON.stringify(this.config.oauthStates, null, 2));

            this.emit('config-saved');
        } catch (error) {
            console.error('[MCPConfig] Error saving configuration:', error.message);
            throw error;
        }
    }

            // OAuth Flow Management
        generateOAuthUrl(provider, service, scopes = [], redirectUri = null) {
        console.log(`[MCPConfig] 🔧 Generating OAuth URL for ${provider}:${service}`);
        
        // Use localhost callback if available (most reliable for all providers)
        if (!redirectUri) {
            // First, try to use localhost OAuth server for ALL providers (preferred method)
            const mcpClient = global.invisibilityService?.mcpClient;
            if (mcpClient && mcpClient.oauthPort) {
                redirectUri = `http://localhost:${mcpClient.oauthPort}/callback`;
                console.log(`[MCPConfig] 🏠 Using localhost callback server for ${provider}: ${redirectUri}`);
            } else {
                // Fallback to web callback for providers that require HTTPS
                const webCallbackProviders = ['notion', 'slack'];
                
                if (webCallbackProviders.includes(provider.toLowerCase())) {
                    redirectUri = 'https://leviousa-101.web.app/api/oauth/callback';
                    console.log(`[MCPConfig] 🌐 Using API route fallback for ${provider}: ${redirectUri}`);
                } else {
                    // Direct to Electron for providers that support custom protocols
                    redirectUri = 'leviousa://oauth/callback';
                    console.log(`[MCPConfig] 🔄 Using custom protocol for ${provider}: ${redirectUri}`);
                }
            }
        } else {
            console.log(`[MCPConfig] 🎯 Using provided redirect URI: ${redirectUri}`);
        }
        
        if (!this.oauthProviders[provider]) {
            throw new Error(`Unsupported OAuth provider: ${provider}`);
        }

        // Debug credential loading
        const clientIdKey = `${provider}_client_id`;
        const clientId = this.getCredential(clientIdKey);
        console.log(`[MCPConfig] 🔑 Looking for credential: ${clientIdKey}`);
        console.log(`[MCPConfig] 🔑 Found client_id: ${clientId ? `${clientId.substring(0, 8)}...` : 'MISSING!'}`);
        
        if (!clientId) {
            console.error(`[MCPConfig] ❌ Missing client_id for ${provider}! Available credentials:`, Object.keys(this.config.credentials));
            throw new Error(`Missing OAuth client_id for ${provider}. Please check your environment variables.`);
        }

        const state = crypto.randomBytes(16).toString('hex');
        
        // Store OAuth state
        this.config.oauthStates[state] = {
            provider,
            service,
            redirectUri,
            timestamp: Date.now()
        };

        const providerConfig = this.oauthProviders[provider];
        const requestedScopes = scopes.length > 0 ? scopes : (providerConfig.scopes[service] || []);

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: requestedScopes.join(' '),
            state: state,
            response_type: 'code'
        });

        // Add provider-specific parameters
        if (provider === 'notion') {
            params.append('owner', 'user');
            console.log(`[MCPConfig] 📝 Added Notion-specific owner=user parameter`);
        } else if (provider === 'github' || provider === 'google') {
            // Use PKCE for providers that support it
            const codeVerifier = crypto.randomBytes(32).toString('base64url');
            const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
            
            // Update state with code verifier
            this.config.oauthStates[state].codeVerifier = codeVerifier;
            
            params.append('code_challenge', codeChallenge);
            params.append('code_challenge_method', 'S256');
            console.log(`[MCPConfig] 🔒 Added PKCE parameters for ${provider}`);
        }

        const oauthUrl = `${providerConfig.authUrl}?${params.toString()}`;
        console.log(`[MCPConfig] 🌐 Generated OAuth URL: ${oauthUrl}`);
        console.log(`[MCPConfig] ✨ OAuth flow initialized for ${provider}:${service} with state: ${state}`);
        
        return oauthUrl;
    }

    async handleOAuthCallback(code, state) {
        console.log(`[MCPConfig] 🔄 Processing OAuth callback with code: ${code?.substring(0, 10)}... and state: ${state}`);
        console.log(`[MCPConfig] 🗃️ Available OAuth states:`, Object.keys(this.config.oauthStates));
        
        const oauthState = this.config.oauthStates[state];
        if (!oauthState) {
            console.warn(`[MCPConfig] ⚠️ OAuth state not found: ${state}`);
            console.log(`[MCPConfig] 📋 Available states:`, this.config.oauthStates);
            
            // For development/testing, try to find a recent state for the same provider
            const recentStates = Object.entries(this.config.oauthStates)
                .filter(([_, stateData]) => Date.now() - stateData.timestamp < 60 * 60 * 1000) // Within 1 hour
                .sort(([_, a], [__, b]) => b.timestamp - a.timestamp); // Most recent first
            
            if (recentStates.length > 0) {
                const [recentState, recentStateData] = recentStates[0];
                console.log(`[MCPConfig] 🔄 Using most recent OAuth state: ${recentState} for provider: ${recentStateData.provider}`);
                
                // Use the recent state data but continue with the original state key for cleanup
                const provider = recentStateData.provider;
                const providerConfig = this.oauthProviders[provider];
                
                try {
                    const tokenResponse = await fetch(providerConfig.tokenUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json'
                        },
                        body: new URLSearchParams({
                            client_id: this.getCredential(`${provider}_client_id`),
                            client_secret: this.getCredential(`${provider}_client_secret`),
                            code: code,
                            ...(recentStateData.codeVerifier && { code_verifier: recentStateData.codeVerifier }),
                            grant_type: 'authorization_code',
                            redirect_uri: recentStateData.redirectUri
                        })
                    });

                    if (!tokenResponse.ok) {
                        const errorText = await tokenResponse.text();
                        throw new Error(`Token exchange failed: ${tokenResponse.statusText} - ${errorText}`);
                    }

                    const tokenData = await tokenResponse.json();
                    console.log(`[MCPConfig] ✅ Token exchange successful for ${provider}`);
                    
                    // Store the access token securely
                    const tokenKey = `${provider}_${recentStateData.service}_token`;
                    this.setCredential(tokenKey, JSON.stringify({
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token,
                        expires_at: Date.now() + (tokenData.expires_in * 1000),
                        scope: tokenData.scope
                    }));

                    // Clean up OAuth states
                    delete this.config.oauthStates[recentState];
                    await this.saveConfiguration();

                    this.emit('oauth-success', { provider, service: recentStateData.service, tokenData });
                    return tokenData;

                } catch (error) {
                    console.error(`[MCPConfig] ❌ Token exchange failed:`, error);
                    throw error;
                }
            } else {
                throw new Error(`Invalid OAuth state: ${state}. No recent states available. Please restart the OAuth flow.`);
            }
        }

        // Normal state validation - check if state is not expired (30 minutes)
        if (Date.now() - oauthState.timestamp > 30 * 60 * 1000) {
            delete this.config.oauthStates[state];
            throw new Error('OAuth state expired. Please restart the OAuth flow.');
        }

        const provider = oauthState.provider;
        const providerConfig = this.oauthProviders[provider];

        try {
            console.log(`[MCPConfig] 🔄 Exchanging code for token with ${provider}`);
            
            // Debug: Log the credentials being used (without exposing full values)
            const clientId = this.getCredential(`${provider}_client_id`);
            const clientSecret = this.getCredential(`${provider}_client_secret`);
            console.log(`[MCPConfig] 🔑 Using client_id: ${clientId ? clientId.substring(0, 8) + '...' : 'NOT FOUND'}`);
            console.log(`[MCPConfig] 🔑 Using client_secret: ${clientSecret ? clientSecret.substring(0, 8) + '...' : 'NOT FOUND'}`);
            console.log(`[MCPConfig] 🔄 Redirect URI: ${oauthState.redirectUri}`);
            console.log(`[MCPConfig] 🔐 Using HTTP Basic Auth for client credentials (Notion requirement)`);
            
            const tokenResponse = await fetch(this.oauthProviders[provider].tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    // Use HTTP Basic Auth for client credentials (required by Notion)
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                },
                body: new URLSearchParams({
                    // Remove client credentials from body - they go in Authorization header
                    code: code,
                    ...(oauthState.codeVerifier && { code_verifier: oauthState.codeVerifier }),
                    grant_type: 'authorization_code',
                    redirect_uri: oauthState.redirectUri
                })
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                console.error(`[MCPConfig] ❌ Token response error:`, errorText);
                throw new Error(`Token exchange failed: ${tokenResponse.statusText} - ${errorText}`);
            }

            const tokenData = await tokenResponse.json();
            console.log(`[MCPConfig] ✅ Token exchange successful for ${provider}:${oauthState.service}`);
            
            // Store the access token securely
            const tokenKey = `${provider}_${oauthState.service}_token`;
            this.setCredential(tokenKey, JSON.stringify({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: Date.now() + (tokenData.expires_in * 1000),
                scope: tokenData.scope
            }));

            // Clean up OAuth state
            delete this.config.oauthStates[state];
            await this.saveConfiguration();

            this.emit('oauth-success', { provider, service: oauthState.service, tokenData });
            return tokenData;

        } catch (error) {
            console.error(`[MCPConfig] ❌ OAuth callback error:`, error);
            delete this.config.oauthStates[state];
            throw error;
        }
    }

    async refreshAccessToken(provider, service) {
        const tokenKey = `${provider}_${service}_token`;
        const tokenData = this.getCredential(tokenKey);
        
        if (!tokenData) {
            throw new Error(`No token found for ${provider}:${service}`);
        }

        const tokens = JSON.parse(tokenData);
        if (!tokens.refresh_token) {
            throw new Error(`No refresh token available for ${provider}:${service}`);
        }

        const providerConfig = this.oauthProviders[provider];
        
        try {
            const response = await fetch(providerConfig.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    client_id: this.getCredential(`${provider}_client_id`),
                    client_secret: this.getCredential(`${provider}_client_secret`),
                    refresh_token: tokens.refresh_token,
                    grant_type: 'refresh_token'
                })
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }

            const newTokenData = await response.json();
            
            // Update stored token
            this.setCredential(tokenKey, JSON.stringify({
                access_token: newTokenData.access_token,
                refresh_token: newTokenData.refresh_token || tokens.refresh_token,
                expires_at: Date.now() + (newTokenData.expires_in * 1000),
                scope: newTokenData.scope || tokens.scope
            }));

            await this.saveConfiguration();
            this.emit('token-refreshed', { provider, service });
            
            return newTokenData.access_token;

        } catch (error) {
            console.error(`[MCPConfig] Failed to refresh token for ${provider}:${service}:`, error.message);
            throw error;
        }
    }

    async getValidAccessToken(provider, service) {
        const tokenKey = `${provider}_${service}_token`;
        const tokenData = this.getCredential(tokenKey);
        
        if (!tokenData) {
            return null;
        }

        const tokens = JSON.parse(tokenData);
        
        // Check if token is expired (with 5 minute buffer)
        if (tokens.expires_at && Date.now() > (tokens.expires_at - 5 * 60 * 1000)) {
            try {
                return await this.refreshAccessToken(provider, service);
            } catch (error) {
                console.error(`[MCPConfig] Failed to refresh expired token:`, error.message);
                return null;
            }
        }

        return tokens.access_token;
    }

    // Server Configuration Management
    addServer(name, config) {
        this.config.servers[name] = {
            ...config,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            enabled: true
        };
        this.emit('server-added', { name, config: this.config.servers[name] });
    }

    removeServer(name) {
        if (this.config.servers[name]) {
            delete this.config.servers[name];
            this.emit('server-removed', { name });
        }
    }

    updateServer(name, updates) {
        if (this.config.servers[name]) {
            this.config.servers[name] = { ...this.config.servers[name], ...updates };
            this.emit('server-updated', { name, config: this.config.servers[name] });
        }
    }

    getServer(name) {
        return this.config.servers[name];
    }

    getAllServers() {
        return { ...this.config.servers };
    }

    // Credential Management
    setCredential(key, value) {
        this.config.credentials[key] = value;
        this.emit('credential-updated', { key });
    }

    getCredential(key) {
        return this.config.credentials[key];
    }

    removeCredential(key) {
        if (this.config.credentials[key]) {
            delete this.config.credentials[key];
            this.emit('credential-removed', { key });
        }
    }

    // Check if a service has valid credentials (for OAuth services)
    async hasValidCredentials(serviceName) {
        try {
            // Check for OAuth token first
            const tokenKey = `${serviceName}_token`;
            const tokenData = this.getCredential(tokenKey);
            
            if (tokenData) {
                const token = JSON.parse(tokenData);
                
                // Check if token exists and is not expired
                if (token.access_token) {
                    // If there's an expiry time, check if it's still valid
                    if (token.expires_at) {
                        const now = Date.now();
                        const expiresAt = new Date(token.expires_at).getTime();
                        
                        if (now < expiresAt) {
                            console.log(`[MCPConfig] ${serviceName} has valid non-expired token`);
                            return true;
                        } else {
                            console.log(`[MCPConfig] ${serviceName} token is expired`);
                            return false;
                        }
                    } else {
                        // No expiry information, assume token is valid
                        console.log(`[MCPConfig] ${serviceName} has token with no expiry`);
                        return true;
                    }
                }
            }
            
            // Check for API key as fallback
            const apiKeyKey = `${serviceName}_api_key`;
            const apiKey = this.getCredential(apiKeyKey);
            
            if (apiKey) {
                console.log(`[MCPConfig] ${serviceName} has API key`);
                return true;
            }
            
            console.log(`[MCPConfig] ${serviceName} has no valid credentials`);
            return false;
            
        } catch (error) {
            console.error(`[MCPConfig] Error checking credentials for ${serviceName}:`, error);
            return false;
        }
    }

    // Check if OAuth client credentials are available (for starting OAuth flow)
    hasOAuthClientCredentials(serviceName) {
        const clientId = this.getCredential(`${serviceName}_client_id`);
        const clientSecret = this.getCredential(`${serviceName}_client_secret`);
        
        const hasCredentials = !!(clientId && clientSecret);
        console.log(`[MCPConfig] ${serviceName} OAuth client credentials available:`, hasCredentials);
        return hasCredentials;
    }

    // OAuth credential access methods (for OAuthManager compatibility)
    getClientId(provider) {
        return this.getCredential(`${provider}_client_id`);
    }

    getClientSecret(provider) {
        return this.getCredential(`${provider}_client_secret`);
    }

    getRefreshToken(provider) {
        // Try service-specific token first, then general token
        const serviceToken = this.getCredential(`${provider}_token`);
        if (serviceToken) {
            try {
                const tokenData = JSON.parse(serviceToken);
                return tokenData.refresh_token;
            } catch (error) {
                console.warn(`[MCPConfig] Error parsing token data for ${provider}:`, error.message);
            }
        }
        
        // Fallback to direct refresh token credential
        return this.getCredential(`${provider}_refresh_token`);
    }

    // Save OAuth tokens (for OAuthManager compatibility)
    async saveTokens(provider, tokenData) {
        const tokenKey = `${provider}_token`;
        const tokenValue = JSON.stringify({
            access_token: tokenData.accessToken,
            refresh_token: tokenData.refreshToken,
            expires_at: tokenData.expiresIn ? Date.now() + (tokenData.expiresIn * 1000) : null
        });
        
        this.setCredential(tokenKey, tokenValue);
        await this.saveConfiguration();
        
        console.log(`[MCPConfig] Saved tokens for ${provider}`);
        this.emit('tokens-saved', { provider });
    }

    // Revoke tokens (for OAuthManager compatibility)
    async revokeTokens(provider) {
        const tokenKey = `${provider}_token`;
        this.removeCredential(tokenKey);
        
        // Also remove any refresh token
        const refreshTokenKey = `${provider}_refresh_token`;
        this.removeCredential(refreshTokenKey);
        
        await this.saveConfiguration();
        
        console.log(`[MCPConfig] Revoked tokens for ${provider}`);
        this.emit('tokens-revoked', { provider });
    }

    // API Key rotation management
    async rotateApiKey(provider, service) {
        const oldKey = this.getCredential(`${provider}_${service}_api_key`);
        if (!oldKey) {
            throw new Error(`No API key found for ${provider}:${service}`);
        }

        // For API key rotation, we would typically need to:
        // 1. Generate new key via provider's API
        // 2. Update the stored credential
        // 3. Notify connected servers to update their configuration
        
        console.log(`[MCPConfig] API key rotation requested for ${provider}:${service}`);
        this.emit('api-key-rotation-requested', { provider, service });
    }

    // Predefined server configurations for popular services
    getPrebuiltServerConfigs() {
        return {
            'google-drive': {
                name: 'Google Drive MCP Server',
                command: 'npx',
                args: ['-y', '@felores/gdrive-mcp-server'],
                env: {
                    'GOOGLE_ACCESS_TOKEN': () => this.getValidAccessToken('firebase', 'drive') || this.getCredential('firebase_drive_token')
                },
                requires_oauth: false, // Will use Firebase Auth tokens
                oauth_provider: 'firebase',
                oauth_service: 'drive',
                setup_instructions: 'Extend your existing Firebase Auth Google provider with Drive scope'
            },
            'github': {
                name: 'GitHub MCP Server',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: {
                    'GITHUB_PERSONAL_ACCESS_TOKEN': () => this.getValidAccessToken('github', 'repo') || this.getCredential('github_api_key')
                },
                requires_oauth: true,
                oauth_provider: 'github',
                oauth_service: 'repo'
            },
            'notion': {
                name: 'Notion MCP Server',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-notion'],
                env: {
                    'NOTION_TOKEN': () => this.getValidAccessToken('notion', 'read') || this.getCredential('notion_api_key')
                },
                requires_oauth: true,
                oauth_provider: 'notion',
                oauth_service: 'read'
            },
            'slack': {
                name: 'Slack MCP Server',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-slack'],
                env: {
                    'SLACK_BOT_TOKEN': () => this.getValidAccessToken('slack', 'chat') || this.getCredential('slack_bot_token')
                },
                requires_oauth: true,
                oauth_provider: 'slack',
                oauth_service: 'chat'
            }
        };
    }

    async setupPrebuiltServer(serverType) {
        const configs = this.getPrebuiltServerConfigs();
        const config = configs[serverType];
        
        if (!config) {
            throw new Error(`Unknown server type: ${serverType}`);
        }

        // Check if OAuth is required and not configured
        if (config.requires_oauth) {
            const hasValidToken = await this.getValidAccessToken(config.oauth_provider, config.oauth_service);
            const hasApiKey = this.getCredential(`${config.oauth_provider}_api_key`);
            
            if (!hasValidToken && !hasApiKey) {
                // Return OAuth URL for user to complete authentication
                return {
                    requires_auth: true,
                    oauth_url: this.generateOAuthUrl(config.oauth_provider, config.oauth_service),
                    provider: config.oauth_provider,
                    service: config.oauth_service
                };
            }
        }

        // Add the server configuration
        this.addServer(serverType, config);
        await this.saveConfiguration();

        return {
            success: true,
            server_name: serverType,
            config: this.config.servers[serverType]
        };
    }

    // Security and validation
    validateConfiguration() {
        const issues = [];

        // Check for missing OAuth client credentials
        for (const [provider, config] of Object.entries(this.oauthProviders)) {
            const clientId = this.getCredential(`${provider}_client_id`);
            const clientSecret = this.getCredential(`${provider}_client_secret`);
            
            if (!clientId || !clientSecret) {
                issues.push(`Missing OAuth credentials for ${provider}`);
            }
        }

        // Check for expired tokens
        for (const [key, value] of Object.entries(this.config.credentials)) {
            if (key.endsWith('_token')) {
                try {
                    const tokenData = JSON.parse(value);
                    if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
                        issues.push(`Expired token: ${key}`);
                    }
                } catch (error) {
                    // Not a JSON token, skip validation
                }
            }
        }

        return issues;
    }

    // Cleanup and maintenance
    async cleanup() {
        // Remove expired OAuth states (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        let statesRemoved = 0;
        
        for (const [state, data] of Object.entries(this.config.oauthStates)) {
            if (data.timestamp < oneHourAgo) {
                delete this.config.oauthStates[state];
                statesRemoved++;
            }
        }

        if (statesRemoved > 0) {
            console.log(`[MCPConfig] Cleaned up ${statesRemoved} expired OAuth states`);
            await this.saveConfiguration();
        }
    }
}

module.exports = MCPConfigManager; 