/**
 * OAuth Manager
 * Handles OAuth authentication flows independently from MCP server lifecycle
 * Manages token storage, refresh, and validation
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const http = require('http');
const url = require('url');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;
const MCPConfigManager = require('../../../config/mcpConfig');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[OAuthManager] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// OAuth services registry
let OAUTH_SERVICES_REGISTRY = null;

// Legacy OAuth provider configurations (fallback)
const LEGACY_OAUTH_PROVIDERS = {
    notion: {
        authUrl: 'https://api.notion.com/v1/oauth/authorize',
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        scopes: []
    },
    github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'user:email']
    },
    slack: {
        authUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: [
            'channels:read',
            'channels:history',
            'chat:write',
            'files:read',
            'users:read'
        ]
    },
    'google-drive': {
        authUrl: 'https://accounts.google.com/o/oauth2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
    }
};

class OAuthManager extends EventEmitter {
    constructor() {
        super();
        this.configManager = new MCPConfigManager();
        this.authStates = new Map(); // Track ongoing auth flows
        this.tokens = new Map(); // Store OAuth tokens
        this.oauthServer = null;
        this.oauthPort = null;
        this.oauthProviders = { ...LEGACY_OAUTH_PROVIDERS };
        
        logger.info('OAuthManager initialized');
    }

    /**
     * Load OAuth services registry
     */
    async loadOAuthServicesRegistry() {
        try {
            const registryPath = path.join(__dirname, '../../..', 'config', 'oauth-services-registry.json');
            const registryContent = await fs.readFile(registryPath, 'utf-8');
            OAUTH_SERVICES_REGISTRY = JSON.parse(registryContent);
            
            // Convert OAuth services to provider configurations
            for (const [serviceKey, service] of Object.entries(OAUTH_SERVICES_REGISTRY.services)) {
                if (service.enabled && service.oauth) {
                    // Handle provider mapping (e.g., 'google-drive' uses 'google' provider)
                    const providerKey = serviceKey === 'google-drive' ? 'google-drive' : serviceKey;
                    
                    this.oauthProviders[providerKey] = {
                        authUrl: service.oauth.authUrl,
                        tokenUrl: service.oauth.tokenUrl,
                        scopes: service.oauth.scopes.default || service.oauth.scopes.required || [],
                        pkce: service.oauth.pkce || false,
                        customParams: service.oauth.customParams || {},
                        name: service.name,
                        description: service.description,
                        documentation: service.documentation
                    };
                    
                    logger.info('Loaded OAuth provider configuration', { 
                        provider: providerKey,
                        name: service.name,
                        authProvider: service.oauth.provider
                    });
                }
            }
            
            logger.info('OAuth services registry loaded successfully', {
                totalProviders: Object.keys(this.oauthProviders).length,
                registryServices: OAUTH_SERVICES_REGISTRY.metadata.enabledServices
            });
            
        } catch (error) {
            logger.error('Failed to load OAuth services registry', { error: error.message });
            // Continue with legacy providers only
        }
    }

    /**
     * Initialize the OAuth manager
     */
    async initialize() {
        try {
            // Load OAuth services registry first
            await this.loadOAuthServicesRegistry();
            
            // Initialize config manager
            await this.configManager.initialize();
            
            logger.info('OAuth Manager initialized successfully', {
                providers: Object.keys(this.oauthProviders)
            });
        } catch (error) {
            logger.error('Failed to initialize OAuth Manager', { error: error.message });
            throw error;
        }
    }

    /**
     * Check if we have client credentials for a provider
     */
    hasClientCredentials(provider) {
        return this.configManager.hasOAuthClientCredentials(provider);
    }

    /**
     * Get a valid access token (refresh if needed)
     */
    async getValidToken(provider) {
        const oauthService = this.getOAuthServiceIdentifier(provider);
        return await this.configManager.getValidAccessToken(provider, oauthService);
    }

    /**
     * Start the OAuth authorization flow
     */
    async startOAuthFlow(provider) {
        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        this.authStates.set(state, {
            provider,
            timestamp: Date.now()
        });

        // Start local callback server
        const callbackUrl = await this.startCallbackServer();
        
        // Build authorization URL
        const authUrl = this.buildAuthorizationUrl(provider, state, callbackUrl);
        
        logger.info('Opening authorization URL', { provider, authUrl });
        
        // Open the URL in the user's browser with proper error handling
        const { shell } = require('electron');
        try {
            logger.info('Calling shell.openExternal to open browser...', { provider });
            const openResult = await shell.openExternal(authUrl);
            logger.info('shell.openExternal result:', { openResult, provider });
            logger.info('OAuth URL opened successfully in browser', { provider });
        } catch (error) {
            logger.error('Failed to open browser for OAuth URL', { provider, error: error.message });
            throw new Error(`Failed to open browser for authentication: ${error.message}`);
        }

        // Wait for callback
        return await this.waitForCallback(state);
    }

    /**
     * Prepare OAuth flow (start callback server, generate state)
     * @param {string} provider - OAuth provider name
     * @returns {string} callback URL
     */
    async prepareOAuthFlow(provider) {
        if (!this.isProviderSupported(provider)) {
            throw new Error(`Unknown OAuth provider: ${provider}`);
        }

        logger.info('Preparing OAuth flow', { provider });

        // Start local callback server
        const callbackUrl = await this.startCallbackServer();
        
        logger.info('OAuth flow prepared', { provider, callbackUrl });
        return callbackUrl;
    }

    /**
     * Generate OAuth URL without starting full flow
     * @param {string} provider - OAuth provider name
     * @param {string} callbackUrl - Callback URL from prepareOAuthFlow
     * @returns {string} OAuth authorization URL
     */
    generateOAuthUrl(provider, callbackUrl) {
        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        this.authStates.set(state, {
            provider,
            timestamp: Date.now()
        });

        // Build authorization URL
        const authUrl = this.buildAuthorizationUrl(provider, state, callbackUrl);
        
        logger.info('OAuth URL generated', { provider, authUrl });
        return authUrl;
    }

    /**
     * Build the authorization URL
     */
    buildAuthorizationUrl(provider, state, callbackUrl) {
        const config = this.getProviderConfig(provider);
        if (!config) {
            throw new Error(`Provider ${provider} not configured`);
        }
        
        const clientId = this.configManager.getClientId(provider);
        
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: callbackUrl,
            state: state,
            response_type: 'code'
        });

        // Add scopes if configured
        if (config.scopes && config.scopes.length > 0) {
            params.append('scope', config.scopes.join(' '));
        }

        // Add custom parameters from registry
        if (config.customParams) {
            for (const [key, value] of Object.entries(config.customParams)) {
                params.append(key, value);
            }
        }

        // Provider-specific parameters (legacy support)
        if (provider === 'notion') {
            params.append('owner', 'user');
        }

        return `${config.authUrl}?${params.toString()}`;
    }

    /**
     * Handle OAuth callback requests
     */
    handleOAuthRequest(req, res) {
        const url = require('url');
        const parsedUrl = url.parse(req.url, true);
        
        logger.info('OAuth callback request received', { 
            pathname: parsedUrl.pathname, 
            query: parsedUrl.query 
        });
        
        if (parsedUrl.pathname === '/callback') {
            const { code, state, error } = parsedUrl.query;
            
            // Check for errors
            if (error) {
                logger.error('OAuth authorization error', { error });
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <body>
                            <h1>❌ Authorization Error</h1>
                            <p>Error: ${error}</p>
                            <p>You can close this window and try again.</p>
                        </body>
                    </html>
                `);
                return;
            }

            if (!code || !state) {
                logger.error('Missing OAuth parameters', { code: !!code, state: !!state });
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <body>
                            <h1>⚠️ Invalid Callback</h1>
                            <p>Missing required OAuth parameters.</p>
                            <p>You can close this window and try again.</p>
                        </body>
                    </html>
                `);
                return;
            }

            // Validate state
            const authState = this.authStates.get(state);
            if (!authState) {
                logger.error('Invalid OAuth state', { state });
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                        <body>
                            <h1>🔒 Security Error</h1>
                            <p>Invalid or expired state parameter.</p>
                            <p>You can close this window and try again.</p>
                        </body>
                    </html>
                `);
                return;
            }

            // Exchange code for token asynchronously
            this.exchangeCodeForToken(authState.provider, code, `http://localhost:${this.oauthPort}/callback`)
                .then(tokenResult => {
                    logger.info('OAuth token exchange successful', { provider: authState.provider });
                    
                    // Send success response
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                            <body>
                                <h1>✅ Authentication Successful!</h1>
                                <p>You have been successfully authenticated.</p>
                                <p>You can close this window and return to the application.</p>
                                <script>
                                    setTimeout(() => { 
                                        try { window.close(); } catch(e) {} 
                                    }, 2000);
                                </script>
                            </body>
                        </html>
                    `);
                    
                    // Notify UI of successful authentication
                    this.emit('authSuccess', { 
                        provider: authState.provider, 
                        success: true,
                        message: 'Authentication completed successfully'
                    });
                    
                    // Clean up state
                    this.authStates.delete(state);
                })
                .catch(error => {
                    logger.error('Token exchange failed', { error: error.message });
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                            <body>
                                <h1>🔧 Token Exchange Failed</h1>
                                <p>There was an error processing your authentication.</p>
                                <p>You can close this window and try again.</p>
                            </body>
                        </html>
                    `);
                });
        } else {
            // Handle other paths
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <body>
                        <h1>404 Not Found</h1>
                        <p>Invalid callback path. Expected /callback</p>
                    </body>
                </html>
            `);
        }
    }

    /**
     * Start the OAuth callback server
     */
    async startCallbackServer() {
        return new Promise((resolve, reject) => {
            // Check if server is already running
            if (this.oauthServer && this.oauthPort) {
                logger.info('OAuth callback server already running', { port: this.oauthPort });
                const callbackUrl = `http://localhost:${this.oauthPort}/callback`;
                resolve(callbackUrl);
                return;
            }
            
            // Create server with request handler immediately
            this.oauthServer = http.createServer((req, res) => {
                this.handleOAuthRequest(req, res);
            });
            
            this.oauthServer.on('error', (error) => {
                logger.error('OAuth callback server error', { error: error.message });
                
                // If port is in use, try to clean up and retry
                if (error.code === 'EADDRINUSE') {
                    logger.warn('Port in use, attempting cleanup and retry', { port: this.oauthPort });
                    this.cleanupCallbackServer();
                    
                    // Try a different port
                    setTimeout(() => {
                        this.tryAlternativePort(resolve, reject);
                    }, 1000);
                } else {
                    reject(error);
                }
            });

            // Try to find an available port (use same ports as Notion OAuth app config)
            const preferredPorts = [3000, 3001, 3002, 3003, 3004];
            let portIndex = 0;
            
            const tryPort = (port) => {
                this.oauthServer.listen(port, '127.0.0.1', () => {
                    this.oauthPort = port;
                    const callbackUrl = `http://localhost:${port}/callback`;
                    logger.info('OAuth callback server started', { port, callbackUrl });
                    resolve(callbackUrl);
                });
            };

            const tryNextPort = () => {
                if (portIndex >= preferredPorts.length) {
                    // If all preferred ports are taken, use random port as fallback
                    tryPort(0);
                    return;
                }
                
                const port = preferredPorts[portIndex++];
                this.oauthServer.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        logger.info('Port unavailable, trying next', { port });
                        this.oauthServer = http.createServer();
                        tryNextPort();
                    } else {
                        reject(error);
                    }
                });
                
                tryPort(port);
            };

            tryNextPort();
        });
    }

    /**
     * Try alternative ports if primary port is in use
     */
    tryAlternativePort(resolve, reject) {
        // Use same fallback ports as preferred ports
        const ports = [3001, 3002, 3003, 3004, 3005];
        
        let portIndex = 0;
        const tryNext = () => {
            if (portIndex >= ports.length) {
                reject(new Error('No available ports for OAuth callback server'));
                return;
            }
            
            const port = ports[portIndex++];
            this.oauthServer = http.createServer((req, res) => {
                this.handleOAuthRequest(req, res);
            });
            
            this.oauthServer.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.warn('Port in use, trying next', { port });
                    tryNext();
                } else {
                    reject(error);
                }
            });
            
            this.oauthServer.listen(port, '127.0.0.1', () => {
                this.oauthPort = port;
                const callbackUrl = `http://localhost:${port}/callback`;
                logger.info('OAuth callback server started on alternative port', { port, callbackUrl });
                resolve(callbackUrl);
            });
        };
        
        tryNext();
    }

    /**
     * Wait for OAuth callback (now handled by handleOAuthRequest)
     * This method is kept for compatibility but callback handling is automatic
     */
    async waitForCallback(expectedState) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.cleanupCallbackServer();
                reject(new Error('OAuth callback timeout'));
            }, 300000); // 5 minutes timeout

            // Note: Request handling is now done automatically by handleOAuthRequest
            // We just need to wait for the state to be processed
            const checkInterval = setInterval(() => {
                if (!this.authStates.has(expectedState)) {
                    // State was processed (removed), authentication completed
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    resolve({ success: true, message: 'OAuth completed' });
                }
            }, 500);
        });
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(provider, code, redirectUri) {
        const config = this.getProviderConfig(provider);
        if (!config) {
            throw new Error(`Provider ${provider} not configured`);
        }
        
        const clientId = this.configManager.getClientId(provider);
        const clientSecret = this.configManager.getClientSecret(provider);

        logger.info('Exchanging code for token', { provider });

        // Prepare form data for token exchange
        const tokenData = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
        });

        // Use Basic Authentication for client credentials (OAuth 2.0 standard)
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        try {
            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': `Basic ${credentials}`
                },
                body: tokenData.toString()
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || `Token exchange failed: ${response.status}`);
            }

            // Store the tokens
            await this.configManager.saveTokens(provider, {
                accessToken: result.access_token,
                refreshToken: result.refresh_token,
                expiresIn: result.expires_in
            });

            return {
                accessToken: result.access_token,
                refreshToken: result.refresh_token
            };

        } catch (error) {
            logger.error('Token exchange request failed', { provider, error: error.message });
            throw error;
        }
    }

    /**
     * Refresh an access token
     */
    async refreshToken(provider) {
        const config = this.getProviderConfig(provider);
        if (!config) {
            throw new Error(`Provider ${provider} not configured`);
        }
        
        const refreshToken = await this.configManager.getRefreshToken(provider);
        
        if (!refreshToken) {
            throw new Error(`No refresh token available for ${provider}`);
        }

        const clientId = this.configManager.getClientId(provider);
        const clientSecret = this.configManager.getClientSecret(provider);

        // Prepare form data for token refresh
        const tokenData = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        });

        // Use Basic Authentication for client credentials
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        logger.info('Refreshing access token', { provider });

        try {
            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': `Basic ${credentials}`
                },
                body: tokenData.toString()
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || `Token refresh failed: ${response.status}`);
            }

            // Update stored tokens
            await this.configManager.saveTokens(provider, {
                accessToken: result.access_token,
                refreshToken: result.refresh_token || refreshToken,
                expiresIn: result.expires_in
            });

            logger.info('Token refreshed successfully', { provider });
            this.emit('tokenRefreshed', { provider });

            return result.access_token;

        } catch (error) {
            logger.error('Token refresh failed', { provider, error: error.message });
            throw error;
        }
    }

    /**
     * Revoke tokens for a provider
     */
    async revokeToken(provider) {
        logger.info('Revoking tokens', { provider });
        
        try {
            await this.configManager.revokeTokens(provider);
            this.emit('tokenRevoked', { provider });
            logger.info('Tokens revoked successfully', { provider });
        } catch (error) {
            logger.error('Failed to revoke tokens', { provider, error: error.message });
            throw error;
        }
    }

    /**
     * Get OAuth service identifier for a provider
     */
    getOAuthServiceIdentifier(provider) {
        // Map provider names to OAuth service identifiers
        const serviceMap = {
            'notion': 'notion',
            'github': 'github',
            'slack': 'slack',
            'google-drive': 'google'
        };
        
        return serviceMap[provider] || provider;
    }

    /**
     * Clean up callback server
     */
    cleanupCallbackServer() {
        if (this.oauthServer) {
            this.oauthServer.close();
            this.oauthServer = null;
            this.oauthPort = null;
            logger.info('OAuth callback server cleaned up');
        }
        
        // Clean up old auth states
        const now = Date.now();
        for (const [state, data] of this.authStates.entries()) {
            if (now - data.timestamp > 600000) { // 10 minutes
                this.authStates.delete(state);
            }
        }
    }

    /**
     * Get OAuth provider configuration
     */
    getProviderConfig(provider) {
        return this.oauthProviders[provider];
    }

    /**
     * Check if provider is supported
     */
    isProviderSupported(provider) {
        return !!this.oauthProviders[provider];
    }

    /**
     * Get list of supported OAuth providers
     */
    getSupportedProviders() {
        const providers = {};
        
        for (const [key, config] of Object.entries(this.oauthProviders)) {
            providers[key] = {
                name: config.name || key,
                description: config.description,
                hasScopes: config.scopes && config.scopes.length > 0,
                scopes: config.scopes,
                documentation: config.documentation
            };
        }
        
        return providers;
    }

    /**
     * Start OAuth flow for a provider
     */
    async authenticate(provider) {
        if (!this.isProviderSupported(provider)) {
            throw new Error(`Unknown OAuth provider: ${provider}`);
        }

        logger.info('Starting OAuth flow', { provider });

        try {
            // Check if we already have a valid token
            const existingToken = await this.getValidToken(provider);
            if (existingToken) {
                logger.info('Using existing valid token', { provider });
                return {
                    accessToken: existingToken,
                    provider,
                    isNewAuth: false
                };
            }

            // Check if we have client credentials
            if (!this.hasClientCredentials(provider)) {
                throw new Error(`No client credentials configured for ${provider}`);
            }

            // Start OAuth flow
            const authResult = await this.startOAuthFlow(provider);
            
            logger.info('OAuth flow completed successfully', { provider });
            this.emit('authenticated', { provider, isNewAuth: true });
            
            return {
                accessToken: authResult.accessToken,
                refreshToken: authResult.refreshToken,
                provider,
                isNewAuth: true
            };

        } catch (error) {
            logger.error('OAuth authentication failed', { provider, error: error.message });
            this.emit('authenticationFailed', { provider, error });
            throw error;
        }
    }

    /**
     * Get authentication status for all providers
     */
    async getAuthenticationStatus() {
        const status = {};
        
        for (const provider of Object.keys(this.oauthProviders)) {
            const hasCredentials = this.hasClientCredentials(provider);
            const hasToken = !!(await this.getValidToken(provider));
            const config = this.getProviderConfig(provider);
            
            status[provider] = {
                hasClientCredentials: hasCredentials,
                isAuthenticated: hasToken,
                canAuthenticate: hasCredentials && !hasToken,
                needsSetup: !hasCredentials,
                name: config?.name || provider,
                description: config?.description
            };
        }
        
        return status;
    }

    /**
     * Get list of supported services
     */
    getSupportedServices() {
        return Object.keys(this.oauthProviders);
    }

    /**
     * Get authorization URL for a service (for testing)
     */
    async getAuthorizationUrl(serviceName) {
        const provider = this.getProviderConfig(serviceName);
        if (!provider) {
            throw new Error(`Unsupported OAuth provider: ${serviceName}`);
        }
        
        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        
        // Build authorization URL
        const params = new URLSearchParams({
            client_id: 'test-client-id', // For testing
            redirect_uri: 'http://localhost:3000/callback',
            response_type: 'code',
            state: state
        });
        
        // Add scopes if configured
        if (provider.scopes && provider.scopes.length > 0) {
            params.append('scope', provider.scopes.join(' '));
        }
        
        const authUrl = `${provider.authUrl}?${params.toString()}`;
        
        return authUrl;
    }

    /**
     * Get OAuth status for all services
     */
    getStatus() {
        const status = {};
        
        for (const provider of Object.keys(this.oauthProviders)) {
            const token = this.tokens.get(provider);
            status[provider] = {
                hasValidToken: !!token && !this.isTokenExpired(token),
                expiresAt: token ? token.expires_at : null
            };
        }
        
        return status;
    }

    /**
     * Check if a valid token exists for a service
     */
    async hasValidToken(serviceName) {
        const token = this.tokens.get(serviceName);
        return !!token && !this.isTokenExpired(token);
    }
}

module.exports = OAuthManager; 