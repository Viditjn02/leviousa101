/**
 * Server Registry
 * Manages MCP server configurations and lifecycle
 * Provides a clean interface for starting, stopping, and monitoring servers
 */

const { EventEmitter } = require('events');
const { spawn, execSync } = require('child_process');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;
const MCPAdapter = require('./MCPAdapter');
const OAuthManager = require('../auth/OAuthManager');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[ServerRegistry] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Server status enum
const ServerStatus = {
    STOPPED: 'stopped',
    STARTING: 'starting',
    RUNNING: 'running',
    STOPPING: 'stopping',
    ERROR: 'error'
};

// Load OAuth services registry
let OAUTH_SERVICES_REGISTRY = null;

// Keep legacy server definitions for non-OAuth servers
const LEGACY_SERVER_DEFINITIONS = {
    everything: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-everything'],
        description: 'Reference test server with multiple tools and features',
        capabilities: ['echo', 'add', 'get_tiny_image', 'print_env']
    },
    filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        description: 'Secure file operations with configurable access controls',
        capabilities: ['read_file', 'write_file', 'create_directory', 'list_directory', 'move_file', 'search_files']
    },
    sqlite: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite'],
        description: 'Database interaction and business intelligence capabilities',
        capabilities: ['list_tables', 'describe_table', 'query', 'execute']
    }
};

class ServerRegistry extends EventEmitter {
    constructor() {
        super();
        this.servers = new Map(); // serverName -> ServerState
        this.oauthManager = new OAuthManager();
        this.serverDefinitions = { ...LEGACY_SERVER_DEFINITIONS };
        
        logger.info('ServerRegistry initialized');
    }

    /**
     * Load OAuth services registry
     */
    async loadOAuthServicesRegistry() {
        try {
            const registryPath = path.join(__dirname, '../../..', 'config', 'oauth-services-registry.json');
            const registryContent = await fs.readFile(registryPath, 'utf-8');
            OAUTH_SERVICES_REGISTRY = JSON.parse(registryContent);
            
            // Convert OAuth services to server definitions
            for (const [serviceKey, service] of Object.entries(OAUTH_SERVICES_REGISTRY.services)) {
                if (service.enabled) {
                    logger.info('Loading OAuth service', { service: serviceKey, name: service.name, enabled: service.enabled });
                    
                    // Only add as server definition if it has serverConfig
                    if (service.serverConfig && (service.serverConfig.command || service.serverConfig.executable)) {
                        this.serverDefinitions[serviceKey] = {
                            command: service.serverConfig.command,
                            args: service.serverConfig.args,
                            description: service.description,
                            capabilities: service.capabilities,
                            requiresAuth: true,
                            authProvider: service.oauth.provider,
                            tokenEnvVar: service.serverConfig.envMapping ? 
                                Object.values(service.serverConfig.envMapping)[0] : null,
                            oauthConfig: service.oauth,
                            priority: service.priority,
                            icon: service.icon,
                            documentation: service.documentation,
                            requiresDocker: service.serverConfig.requiresDocker || false,
                            requiresManualSetup: service.serverConfig.requiresManualSetup || false
                        };
                        logger.info('Added OAuth service to server definitions', { 
                            service: serviceKey, 
                            command: service.serverConfig.command,
                            args: service.serverConfig.args,
                            enabled: service.enabled,
                            hasServerConfig: !!service.serverConfig
                        });
                    } else {
                        logger.warn('OAuth service missing serverConfig', {
                            service: serviceKey,
                            hasServerConfig: !!service.serverConfig,
                            hasCommand: !!(service.serverConfig && service.serverConfig.command)
                        });
                    }
                }
            }
            
            logger.info('OAuth services registry loaded successfully', {
                totalServices: OAUTH_SERVICES_REGISTRY.metadata.totalServices,
                enabledServices: OAUTH_SERVICES_REGISTRY.metadata.enabledServices
            });
            
        } catch (error) {
            logger.error('Failed to load OAuth services registry', { error: error.message });
            // Continue with legacy definitions only
        }
    }

    /**
     * Initialize the registry
     */
    async initialize() {
        let registryLoaded = false;
        
        try {
            // Try to load OAuth services registry first
            await this.loadOAuthServicesRegistry();
            registryLoaded = true;
        } catch (error) {
            logger.warn('Failed to load OAuth services registry, continuing with legacy servers only', { 
                error: error.message 
            });
            // Ensure legacy servers are available even if registry fails
            Object.assign(this.serverDefinitions, LEGACY_SERVER_DEFINITIONS);
        }
        
        try {
            // Initialize OAuth manager
            await this.oauthManager.initialize();
            
            logger.info('ServerRegistry initialized successfully', {
                totalServers: Object.keys(this.serverDefinitions).length,
                oauthServers: Object.keys(this.serverDefinitions).filter(key => 
                    this.serverDefinitions[key].requiresAuth
                ).length,
                registryLoaded
            });
        } catch (error) {
            logger.error('Failed to initialize ServerRegistry', { error: error.message });
            throw error;
        }
    }

    /**
     * Register a server configuration
     */
    async register(name, config) {
        if (this.servers.has(name)) {
            throw new Error(`Server ${name} is already registered`);
        }

        const serverConfig = {
            ...this.serverDefinitions[name],
            ...config,
            name
        };

        const serverState = {
            name,
            config: serverConfig,
            status: ServerStatus.STOPPED,
            adapter: null,
            error: null,
            startTime: null,
            tools: [],
            resources: [],
            prompts: []
        };

        this.servers.set(name, serverState);
        logger.info('Server registered', { name, config: serverConfig });
        this.emit('serverRegistered', { name, config: serverConfig });
    }

    /**
     * Start a server
     */
    async start(name) {
        const serverState = this.servers.get(name);
        if (!serverState) {
            throw new Error(`Server ${name} not found`);
        }

        if (serverState.status === ServerStatus.RUNNING) {
            logger.warn('Server already running', { name });
            return;
        }

        if (serverState.status === ServerStatus.STARTING) {
            logger.warn('Server already starting', { name });
            return;
        }

        try {
            logger.info('Starting server', { name });
            serverState.status = ServerStatus.STARTING;
            serverState.error = null;
            this.emit('serverStarting', { name });

            // Check authentication if required
            if (serverState.config.requiresAuth) {
                await this.ensureAuthentication(name, serverState.config.authProvider);
            }

            // Prepare environment
            const env = await this.prepareEnvironment(name, serverState.config);

            // Determine transport type and options
            let transportOptions = { env, cwd: serverState.config.cwd };
            
            if (name === 'paragon' || serverState.config.authProvider === 'paragon') {
                // For Paragon MCP, use SSE transport
                transportOptions.transportType = 'sse';
                transportOptions.sseUrl = 'http://localhost:3001/sse';
                
                // Add user information for JWT generation
                // In production, this should come from authenticated user context
                transportOptions.userId = 'default-user';
                
                logger.info('Using SSE transport for Paragon MCP', { 
                    name, 
                    url: transportOptions.sseUrl,
                    userId: transportOptions.userId 
                });
                
                // Start the Paragon HTTP server first
                await this.startParagonServer(serverState.config, env);
            }

            // Create MCP adapter
            const adapter = new MCPAdapter({
                name: `${name}-server`,
                version: '1.0.0',
                transport: transportOptions.transportType || 'stdio'
            });

            // Set up adapter event handlers
            this.setupAdapterHandlers(name, adapter);

            // Connect adapter to the server using appropriate transport
            await adapter.connectWithRetry(
                serverState.config.command, 
                serverState.config.args,
                transportOptions
            );

            // Update server state
            serverState.adapter = adapter;
            serverState.status = ServerStatus.RUNNING;
            serverState.startTime = new Date();

            // Get capabilities from the adapter
            serverState.tools = adapter.getTools();
            serverState.resources = adapter.getResources();
            serverState.prompts = adapter.getPrompts();

            logger.info('Server started successfully', { name });
            this.emit('serverStarted', { name });

        } catch (error) {
            logger.error('Failed to start server', { name, error: error.message });
            serverState.status = ServerStatus.ERROR;
            serverState.error = error.message;
            this.emit('serverError', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Stop a server
     */
    async stop(name) {
        const serverState = this.servers.get(name);
        if (!serverState) {
            throw new Error(`Server ${name} not found`);
        }

        if (serverState.status === ServerStatus.STOPPED) {
            logger.warn('Server already stopped', { name });
            return;
        }

        if (serverState.status === ServerStatus.STOPPING) {
            logger.warn('Server already stopping', { name });
            return;
        }

        try {
            logger.info('Stopping server', { name });
            serverState.status = ServerStatus.STOPPING;
            this.emit('serverStopping', { name });

            // Disconnect adapter
            if (serverState.adapter) {
                await serverState.adapter.disconnect();
            }

            // Terminate Paragon subprocess if it exists
            if (name === 'paragon' && this.paragonProcess && !this.paragonProcess.killed) {
                logger.info('Terminating Paragon server subprocess', { name });
                this.paragonProcess.kill('SIGTERM');
                
                // Force kill after timeout if process doesn't respond
                setTimeout(() => {
                    if (this.paragonProcess && !this.paragonProcess.killed) {
                        logger.warn('Force killing unresponsive Paragon server subprocess', { name });
                        this.paragonProcess.kill('SIGKILL');
                    }
                }, 3000);
                
                // Clear the process reference
                this.paragonProcess = null;
            }

            // Update server state
            serverState.adapter = null;
            serverState.status = ServerStatus.STOPPED;
            serverState.startTime = null;
            serverState.tools = [];
            serverState.resources = [];
            serverState.prompts = [];

            logger.info('Server stopped successfully', { name });
            this.emit('serverStopped', { name });

        } catch (error) {
            logger.error('Failed to stop server', { name, error: error.message });
            serverState.status = ServerStatus.ERROR;
            serverState.error = error.message;
            this.emit('serverError', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Get server status
     */
    getStatus(name) {
        const serverState = this.servers.get(name);
        if (!serverState) {
            return null;
        }

        return {
            name: serverState.name,
            status: serverState.status,
            error: serverState.error,
            startTime: serverState.startTime,
            uptime: serverState.startTime ? Date.now() - serverState.startTime : null,
            tools: serverState.tools.length,
            resources: serverState.resources.length,
            prompts: serverState.prompts.length,
            capabilities: serverState.config.capabilities || []
        };
    }

    /**
     * Get all server statuses
     */
    getAllStatuses() {
        const statuses = {};
        for (const [name, serverState] of this.servers) {
            statuses[name] = this.getStatus(name);
        }
        return statuses;
    }

    /**
     * Get active servers (running)
     */
    getActiveServers() {
        return Array.from(this.servers.values()).filter(serverState => serverState.status === ServerStatus.RUNNING);
    }
    
    /**
     * Ensure authentication for a server
     */
    async ensureAuthentication(serverName, authProvider) {
        logger.info('Checking authentication', { serverName, authProvider });

        // Handle Paragon JWT authentication separately
        if (authProvider === 'paragon') {
            logger.info('Using JWT authentication for Paragon', { serverName });
            
            // Load Paragon environment if not already loaded
            const paragonEnvPath = path.join(__dirname, '../../../../services/paragon-mcp/.env');
            require('dotenv').config({ path: paragonEnvPath });
            
            // Check if Paragon credentials are available
            const projectId = process.env.PROJECT_ID || process.env.PARAGON_PROJECT_ID;
            const signingKey = process.env.SIGNING_KEY || process.env.PARAGON_SIGNING_KEY;
            
            if (!projectId || !signingKey) {
                logger.error('Paragon credentials missing', { 
                    serverName, 
                    hasProjectId: !!projectId, 
                    hasSigningKey: !!signingKey 
                });
                throw new Error(`Paragon authentication credentials missing - check PROJECT_ID and SIGNING_KEY in services/paragon-mcp/.env`);
            }
            
            // Initialize and test JWT service
            const paragonJwtService = require('./paragonJwtService');
            if (!paragonJwtService.getStatus().initialized) {
                paragonJwtService.initialize({
                    projectId: projectId,
                    signingKey: signingKey
                });
            }
            
            const status = paragonJwtService.getStatus();
            if (!status.initialized) {
                logger.error('Paragon JWT service initialization failed', { serverName, status });
                throw new Error(`Paragon JWT service initialization failed`);
            }
            
            logger.info('Paragon JWT authentication verified', { 
                serverName, 
                projectId: status.projectId,
                hasSigningKey: status.hasSigningKey 
            });
            return;
        }

        // Handle OAuth authentication for other services
        const token = await this.oauthManager.getValidToken(authProvider);
        if (!token) {
            logger.info('Authentication required', { serverName, authProvider });
            throw new Error(`Authentication required for ${authProvider}`);
        }

        logger.info('Authentication verified', { serverName, authProvider });
    }

    /**
     * Start Paragon HTTP server in background
     */
    async startParagonServer(config, env) {
        logger.info('Starting Paragon HTTP server...');
        
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            // Load Paragon .env file and merge with environment
            const paragonEnvPath = path.join(__dirname, '../../../../services/paragon-mcp/.env');
            const dotenv = require('dotenv');
            const paragonEnv = dotenv.config({ path: paragonEnvPath });
            
            let processEnv = { ...process.env, ...env };
            
            // Merge Paragon environment variables if loaded successfully
            if (!paragonEnv.error && paragonEnv.parsed) {
                processEnv = { ...processEnv, ...paragonEnv.parsed };
                logger.info('Loaded Paragon .env file for process', { 
                    hasProjectId: !!paragonEnv.parsed.PROJECT_ID,
                    hasSigningKey: !!paragonEnv.parsed.SIGNING_KEY
                });
            } else {
                logger.warn('Failed to load Paragon .env file', { error: paragonEnv.error?.message });
            }
            
            // Kill any process listening on the port to prevent EADDRINUSE
            const port = processEnv.PORT || '3001';
            try {
                execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: 'ignore' });
                logger.info(`Killed any process on port ${port}`);
            } catch (err) {
                logger.warn(`No process to kill on port ${port}: ${err.message}`);
            }
            // Start the Paragon server process with correct working directory
            const paragonCwd = path.join(__dirname, '../../../../services/paragon-mcp');
            const serverProcess = spawn(config.command, config.args, {
                env: processEnv,
                cwd: paragonCwd,
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let serverStarted = false;
            
            // Listen for stdout to know when server is ready
            serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                logger.info('Paragon server output:', output.trim());
                
                // Check if server is ready - handle both regular server and mcp-proxy messages
                if (output.includes('Server is running') || output.includes('listening on') || output.includes('starting server on port')) {
                    if (!serverStarted) {
                        serverStarted = true;
                        logger.info('Paragon HTTP server started successfully');
                        resolve(serverProcess);
                    }
                }
            });
            
            // Handle stderr
            serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                logger.error('Paragon server stderr:', error.trim());
                // If we get an error during startup, reject immediately
                if (!serverStarted && error.trim()) {
                    reject(new Error(`Paragon server stderr: ${error.trim()}`));
                }
            });
            
            // Handle process exit
            serverProcess.on('exit', (code, signal) => {
                logger.warn('Paragon server process exited', { code, signal });
            });
            
            // Handle process error
            serverProcess.on('error', (error) => {
                logger.error('Failed to start Paragon server process', { error: error.message });
                if (!serverStarted) {
                    reject(error);
                }
            });
            
            // Store process reference for cleanup
            this.paragonProcess = serverProcess;
            
            // Timeout after 10 seconds if server doesn't start
            setTimeout(() => {
                if (!serverStarted) {
                    logger.error('Paragon server startup timeout');
                    reject(new Error('Paragon server startup timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Prepare environment variables for a server
     */
    async prepareEnvironment(serverName, config) {
        const env = { ...process.env };

        // Special handling for Paragon - ensure environment variables are loaded
        if (config.authProvider === 'paragon') {
            const paragonEnvPath = path.join(__dirname, '../../../../services/paragon-mcp/.env');
            require('dotenv').config({ path: paragonEnvPath });
            
            // Add Paragon-specific environment variables directly to server environment
            env['PROJECT_ID'] = process.env.PROJECT_ID;
            env['SIGNING_KEY'] = process.env.SIGNING_KEY;
            env['MCP_SERVER_URL'] = process.env.MCP_SERVER_URL || 'http://localhost:3002';
            env['NODE_ENV'] = process.env.NODE_ENV || 'development';
            env['PORT'] = process.env.PORT || '3002';
            
            logger.info('Added Paragon environment variables', { 
                serverName, 
                hasProjectId: !!env['PROJECT_ID'],
                hasSigningKey: !!env['SIGNING_KEY']
            });
        }

        // Add authentication tokens if required
        if (config.requiresAuth && config.authProvider) {
            const token = await this.oauthManager.getValidToken(config.authProvider);
            
            // Check if server config specifies a custom environment variable name
            let envVar;
            if (config.tokenEnvVar) {
                // Use server-specific environment variable name
                envVar = config.tokenEnvVar;
            } else {
                // Fall back to default mapping
                const tokenEnvMap = {
                    'notion': 'NOTION_API_TOKEN',
                    'google': 'GOOGLE_OAUTH_CLIENT_ID'
                };
                envVar = tokenEnvMap[config.authProvider];
            }
            
            if (envVar && token) {
                // Handle different token formats for different services
                if (envVar === 'GOOGLE_OAUTH_CLIENT_ID') {
                    // For workspace-mcp-http, we need OAuth client credentials from environment
                    // The server expects GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET
                    // We'll provide the token as access token for now, but this should be configured properly
                    env[envVar] = token && token.access_token ? token.access_token : token;
                } else if (envVar === 'NOTION_API_TOKEN') {
                    // For Notion, we need the raw token string
                    env[envVar] = token && token.access_token ? token.access_token : token;
                } else {
                    // Generic handling for other services
                    env[envVar] = token && token.access_token ? token.access_token : token;
                }
                logger.info('Added authentication token to environment', { serverName, envVar: envVar });
            }

            // Add Google OAuth client credentials if needed for workspace-mcp-http
            if (config.authProvider === 'google') {
                // Load OAuth client credentials from oauth manager's config
                const clientId = this.oauthManager.configManager.getCredential('google_client_id');
                const clientSecret = this.oauthManager.configManager.getCredential('google_client_secret');
                
                if (clientId) {
                    env['GOOGLE_OAUTH_CLIENT_ID'] = clientId;
                    logger.info('Added Google OAuth client ID to environment', { serverName });
                }
                if (clientSecret) {
                    env['GOOGLE_OAUTH_CLIENT_SECRET'] = clientSecret;
                    logger.info('Added Google OAuth client secret to environment', { serverName });
                }
                
                // Also add access and refresh tokens
                if (token) {
                    const tokens = typeof token === 'string' ? JSON.parse(token) : token;
                    if (tokens.access_token) {
                        env['GOOGLE_ACCESS_TOKEN'] = tokens.access_token;
                        logger.info('Added Google access token to environment', { serverName });
                    }
                    if (tokens.refresh_token) {
                        env['GOOGLE_REFRESH_TOKEN'] = tokens.refresh_token;
                        logger.info('Added Google refresh token to environment', { serverName });
                    }
                }
                
                // Enable insecure transport for development
                env['OAUTHLIB_INSECURE_TRANSPORT'] = '1';
            }
        }

        return env;
    }

    /**
     * Set up adapter event handlers
     */
    setupAdapterHandlers(serverName, adapter) {
        adapter.on('toolRegistered', ({ name, config }) => {
            const serverState = this.servers.get(serverName);
            if (serverState) {
                serverState.tools.push({ name, ...config });
                this.emit('toolRegistered', { serverName, toolName: name, config });
            }
        });

        adapter.on('resourceRegistered', ({ name, uri, config }) => {
            const serverState = this.servers.get(serverName);
            if (serverState) {
                serverState.resources.push({ name, uri, ...config });
                this.emit('resourceRegistered', { serverName, resourceName: name, uri, config });
            }
        });

        adapter.on('promptRegistered', ({ name, config }) => {
            const serverState = this.servers.get(serverName);
            if (serverState) {
                serverState.prompts.push({ name, ...config });
                this.emit('promptRegistered', { serverName, promptName: name, config });
            }
        });

        adapter.on('error', (error) => {
            logger.error('Adapter error', { serverName, error: error.message });
            this.emit('serverError', { serverName, error: error.message });
        });
    }

    /**
     * Get tools for a server
     */
    getServerTools(serverName) {
        const serverState = this.servers.get(serverName);
        if (!serverState || !serverState.adapter) {
            return [];
        }
        return serverState.adapter.getTools();
    }

    /**
     * Get resources for a server
     */
    getServerResources(serverName) {
        const serverState = this.servers.get(serverName);
        if (!serverState || !serverState.adapter) {
            return [];
        }
        return serverState.adapter.getResources();
    }

    /**
     * Get prompts for a server
     */
    getServerPrompts(serverName) {
        const serverState = this.servers.get(serverName);
        if (!serverState || !serverState.adapter) {
            return [];
        }
        return serverState.adapter.getPrompts();
    }

    /**
     * Get available servers with metadata
     */
    getAvailableServersWithMetadata() {
        const servers = {};
        
        for (const [key, definition] of Object.entries(this.serverDefinitions)) {
            servers[key] = {
                name: definition.name || key,
                description: definition.description,
                requiresAuth: definition.requiresAuth || false,
                authProvider: definition.authProvider,
                capabilities: definition.capabilities || [],
                priority: definition.priority || 999,
                icon: definition.icon,
                documentation: definition.documentation,
                requiresDocker: definition.requiresDocker || false,
                requiresManualSetup: definition.requiresManualSetup || false
            };
        }
        
        // Sort by priority
        return Object.fromEntries(
            Object.entries(servers).sort(([,a], [,b]) => a.priority - b.priority)
        );
    }

    /**
     * Get OAuth services registry metadata
     */
    getOAuthServicesMetadata() {
        return OAUTH_SERVICES_REGISTRY ? OAUTH_SERVICES_REGISTRY.metadata : null;
    }

    /**
     * Check if a server is OAuth-based
     */
    isOAuthServer(serverName) {
        const definition = this.serverDefinitions[serverName];
        return definition && definition.requiresAuth && definition.authProvider;
    }

    /**
     * Get OAuth configuration for a server
     */
    getOAuthConfig(serverName) {
        const definition = this.serverDefinitions[serverName];
        if (!definition || !definition.oauthConfig) {
            return null;
        }
        return definition.oauthConfig;
    }

    /**
     * Get all available servers
     */
    getAvailableServers() {
        return Object.keys(this.serverDefinitions);
    }

    /**
     * Get server definition
     */
    getServerDefinition(name) {
        return this.serverDefinitions[name];
    }

    /**
     * Check if server is registered
     */
    hasServer(name) {
        return this.servers.has(name);
    }

    /**
     * Add a new server configuration
     */
    async addServer(config) {
        const serverConfig = {
            name: config.name,
            command: config.command,
            args: config.args || [],
            env: config.env || {},
            type: config.type || 'custom',
            requiresAuth: config.requiresAuth || false,
            status: 'stopped',
            tools: [],
            resources: [],
            prompts: []
        };
        
        this.servers.set(config.name, serverConfig);
        logger.info('Server added', { name: config.name });
        this.emit('serverAdded', { serverName: config.name, config: serverConfig });
        
        return serverConfig;
    }

    /**
     * Remove a server configuration
     */
    async removeServer(serverName) {
        if (this.servers.has(serverName)) {
            // Stop server if running
            const serverState = this.servers.get(serverName);
            if (serverState && serverState.adapter) { // Changed from serverState.process to serverState.adapter
                await this.stop(serverName);
            }
            
            this.servers.delete(serverName);
            logger.info('Server removed', { serverName });
            this.emit('serverRemoved', { serverName });
        }
    }

    /**
     * Get server status
     */
    getServerStatus(serverName) {
        const server = this.servers.get(serverName);
        return server ? server.status : 'stopped';
    }

    /**
     * Get all configured servers
     */
    getConfiguredServers() {
        return Array.from(this.servers.values());
    }

    /**
     * Check if server exists
     */
    hasServer(serverName) {
        return this.servers.has(serverName);
    }

    /**
     * Get server configuration by name
     */
    getServerConfig(serverName) {
        // First check runtime server state (for running servers)
        const runtimeServer = this.servers.get(serverName);
        if (runtimeServer) {
            return runtimeServer;
        }
        
        // Check OAuth services registry for configuration
        if (OAUTH_SERVICES_REGISTRY?.services?.[serverName]) {
            const service = OAUTH_SERVICES_REGISTRY.services[serverName];
            
            // If it has a serverConfig, transform it to the expected format
            if (service.serverConfig && (service.serverConfig.command || service.serverConfig.executable)) {
                return {
                    name: serverName,
                    command: service.serverConfig.command,
                    args: service.serverConfig.args || [],
                    env: service.serverConfig.env || {},
                    envMapping: service.serverConfig.envMapping || {},
                    requiresAuth: !!service.oauth,
                    type: service.oauth?.provider || 'unknown',
                    description: service.description || '',
                    capabilities: service.capabilities || []
                };
            }
        }
        
        // Check legacy definitions
        if (LEGACY_SERVER_DEFINITIONS[serverName]) {
            return LEGACY_SERVER_DEFINITIONS[serverName];
        }
        
        return null;
    }

    /**
     * Check if a server has configuration available
     */
    hasServerConfiguration(serverName) {
        // Check if it's in the OAuth services registry AND has a serverConfig section
        if (OAUTH_SERVICES_REGISTRY?.services?.[serverName]) {
            const service = OAUTH_SERVICES_REGISTRY.services[serverName];
            // Only return true if it has an actual server configuration, not just OAuth
            return !!(service.serverConfig && (service.serverConfig.command || service.serverConfig.executable));
        }
        
        // Check if it's in legacy definitions
        if (LEGACY_SERVER_DEFINITIONS[serverName]) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Register an OAuth-only service (no actual server to start, just mark as authenticated)
     */
    registerOAuthService(serviceName) {
        logger.info('Registering OAuth-only service', { serviceName });
        
        // Create a virtual server entry for OAuth services
        const serverState = {
            name: serviceName,
            status: ServerStatus.RUNNING,
            type: 'oauth',
            authenticated: true,
            startTime: Date.now(),
            tools: [],
            resources: [],
            prompts: [],
            capabilities: {
                oauth: true,
                authenticated: true
            }
        };
        
        this.servers.set(serviceName, serverState);
        
        // Emit server started event
        this.emit('serverStarted', {
            serverName: serviceName,
            status: ServerStatus.RUNNING,
            type: 'oauth'
        });
        
        logger.info('OAuth service registered successfully', { serviceName });
        return serverState;
    }

    /**
     * Shutdown all running servers and cleanup processes
     */
    async shutdown() {
        logger.info('Shutting down all servers...');
        
        // Kill Paragon process if it exists
        if (this.paragonProcess && !this.paragonProcess.killed) {
            logger.info('Terminating Paragon server process');
            try {
                this.paragonProcess.kill('SIGTERM');
                
                // Give it 5 seconds to gracefully shutdown, then force kill
                setTimeout(() => {
                    if (!this.paragonProcess.killed) {
                        logger.warn('Force killing Paragon server process');
                        this.paragonProcess.kill('SIGKILL');
                    }
                }, 5000);
            } catch (error) {
                logger.error('Error killing Paragon process', { error: error.message });
            }
        }
        
        // Stop all running servers
        const runningServers = Array.from(this.servers.entries())
            .filter(([_, state]) => state.status === ServerStatus.RUNNING);
            
        for (const [serverName, _] of runningServers) {
            try {
                await this.stopServer(serverName);
            } catch (error) {
                logger.error('Error stopping server during shutdown', { serverName, error: error.message });
            }
        }
        
        logger.info('Server registry shutdown complete');
    }

    /**
     * Stop a specific server
     */
    async stopServer(serverName) {
        const serverState = this.servers.get(serverName);
        if (!serverState) {
            logger.warn('Cannot stop server - not found', { serverName });
            return;
        }
        
        if (serverState.status !== ServerStatus.RUNNING) {
            logger.warn('Cannot stop server - not running', { serverName, status: serverState.status });
            return;
        }
        
        logger.info('Stopping server', { serverName });
        serverState.status = ServerStatus.STOPPING;
        
        // For Paragon, kill the process
        if (serverName === 'paragon' && this.paragonProcess && !this.paragonProcess.killed) {
            try {
                this.paragonProcess.kill('SIGTERM');
            } catch (error) {
                logger.error('Error stopping Paragon server', { error: error.message });
            }
        }
        
        // Update server state
        serverState.status = ServerStatus.STOPPED;
        serverState.stopTime = Date.now();
        
        // Emit server stopped event
        this.emit('serverStopped', { serverName });
        
        logger.info('Server stopped', { serverName });
    }
}

module.exports = ServerRegistry; 