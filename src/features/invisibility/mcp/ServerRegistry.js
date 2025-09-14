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
    },
    paragon: {
        command: 'node',
        args: [(() => {
            const isPackaged = __dirname.includes('.asar');
            if (isPackaged) {
                // In packaged app, use unpacked services directory
                const unpackedPath = __dirname.replace('.asar', '.asar.unpacked');
                return path.join(unpackedPath, '../../../../services/paragon-mcp/dist/index.mjs');
            } else {
                // Development mode
                return path.join(__dirname, '../../../../services/paragon-mcp/dist/index.mjs');
            }
        })()],
        description: 'Paragon MCP server providing access to 130+ SaaS integrations including Gmail, Notion, Slack, and more',
        capabilities: ['get_authenticated_services', 'connect_service', 'disconnect_service'],
        transport: 'stdio',
        authProvider: 'paragon'
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
            
            // PARAGON-ONLY: Skip loading individual OAuth service definitions
            // All OAuth services should be accessed through Paragon integration, not as separate servers
            logger.info('OAuth services registry loaded but service definitions skipped - use Paragon integration instead', {
                totalServices: OAUTH_SERVICES_REGISTRY.metadata.totalServices,
                enabledServices: OAUTH_SERVICES_REGISTRY.metadata.enabledServices,
                reason: 'Individual OAuth services should not be startable as separate servers'
            });
            
            // Load OAuth services for reference but don't add them as startable server definitions
            for (const [serviceKey, service] of Object.entries(OAUTH_SERVICES_REGISTRY.services)) {
                if (service.enabled) {
                    logger.info('OAuth service found but not added as server definition - use Paragon instead', { 
                        service: serviceKey, 
                        name: service.name,
                        provider: service.oauth?.provider,
                        reason: 'All OAuth services should be accessed via Paragon integration'
                    });
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
     * Start a server - PARAGON-ONLY
     * Only Paragon servers can be started directly. All other services should be accessed via Paragon integration.
     */
    async start(name) {
        // PARAGON-ONLY: Block starting of non-Paragon servers
        if (name !== 'paragon') {
            logger.warn('Server start blocked - only Paragon servers can be started directly', {
                serverName: name,
                reason: 'All other services should be accessed via Paragon integration',
                suggestion: 'Use Paragon integration to access this service'
            });
            throw new Error(`Server ${name} cannot be started directly. Use Paragon integration to access this service.`);
        }
        
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
                // For Paragon MCP, use stdio transport (compatible with Node.js 18+)
                transportOptions.transportType = 'stdio';
                
                logger.info('Using stdio transport for Paragon MCP', { 
                    name, 
                    transport: 'stdio',
                    nodeVersion: process.version 
                });
                
                // Note: No need to start HTTP server for stdio transport
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
            
            // Load Paragon environment if not already loaded - handle both dev and packaged app
            const isPackaged = __dirname.includes('.asar');
            let paragonEnvPath;
            
            if (isPackaged) {
                // In packaged app, try multiple possible locations
                const resourcesPath = process.resourcesPath || path.join(__dirname, '../../../../../');
                const unpackedPath = __dirname.replace('.asar', '.asar.unpacked');
                
                // Try multiple locations for .env files
                const possiblePaths = [
                    path.join(resourcesPath, 'services/paragon-mcp/.env'),
                    path.join(resourcesPath, '.env'),
                    path.join(unpackedPath, '../../../../services/paragon-mcp/.env'),
                    path.join(unpackedPath, '../../../.env')
                ];
                
                console.log('[ServerRegistry] Packaged mode - trying .env paths:', possiblePaths);
                
                for (const envPath of possiblePaths) {
                    try {
                        if (require('fs').existsSync(envPath)) {
                            console.log('[ServerRegistry] Found .env at:', envPath);
                            require('dotenv').config({ path: envPath });
                            paragonEnvPath = envPath;
                            break;
                        }
                    } catch (e) {
                        console.log('[ServerRegistry] Could not access:', envPath);
                    }
                }
            } else {
                // Development mode
                paragonEnvPath = path.join(__dirname, '../../../../services/paragon-mcp/.env');
                require('dotenv').config({ path: paragonEnvPath });
            }
            
            // Check if Paragon credentials are available
            const projectId = process.env.PROJECT_ID || process.env.PARAGON_PROJECT_ID;
            const signingKey = process.env.SIGNING_KEY || process.env.PARAGON_SIGNING_KEY;
            
            console.log('[ServerRegistry] Environment variable check:');
            console.log('  PROJECT_ID:', projectId ? 'FOUND' : 'MISSING');
            console.log('  PARAGON_PROJECT_ID:', process.env.PARAGON_PROJECT_ID ? 'FOUND' : 'MISSING');
            console.log('  SIGNING_KEY:', signingKey ? 'FOUND (' + signingKey.length + ' chars)' : 'MISSING');
            console.log('  PARAGON_SIGNING_KEY:', process.env.PARAGON_SIGNING_KEY ? 'FOUND (' + process.env.PARAGON_SIGNING_KEY.length + ' chars)' : 'MISSING');
            
            // If still missing in packaged app, try to get from main app environment
            if ((!projectId || !signingKey) && isPackaged) {
                console.log('[ServerRegistry] Trying hardcoded values for packaged app...');
                
                // In packaged app, use the known values directly
                const fallbackProjectId = '270db720-6ead-460b-ae94-5ea9bec3f1e2';
                const fallbackSigningKey = `-----BEGIN PRIVATE KEY-----
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
/XAUqtc9oZWQQOqkkqnJqpqmm/r4GNU=
-----END PRIVATE KEY-----`;
                
                process.env.PARAGON_PROJECT_ID = fallbackProjectId;
                process.env.PARAGON_SIGNING_KEY = fallbackSigningKey;
                
                console.log('[ServerRegistry] Using hardcoded values for packaged app');
            }
            
            // Re-check after fallback
            const finalProjectId = process.env.PROJECT_ID || process.env.PARAGON_PROJECT_ID;
            const finalSigningKey = process.env.SIGNING_KEY || process.env.PARAGON_SIGNING_KEY;
            
            if (!finalProjectId || !finalSigningKey) {
                logger.error('Paragon credentials missing', { 
                    serverName, 
                    hasProjectId: !!finalProjectId, 
                    hasSigningKey: !!finalSigningKey 
                });
                throw new Error(`Paragon authentication credentials missing - check PROJECT_ID and SIGNING_KEY in services/paragon-mcp/.env`);
            }
            
            // Initialize and test JWT service
            const paragonJwtService = require('./paragonJwtService');
            if (!paragonJwtService.getStatus().initialized) {
                paragonJwtService.initialize({
                    projectId: finalProjectId,
                    signingKey: finalSigningKey
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
                    hasProjectId: !!paragonEnv.parsed.PARAGON_PROJECT_ID,
                    hasSigningKey: !!paragonEnv.parsed.PARAGON_JWT_SECRET
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
            const paragonEnv = require('dotenv').config({ path: paragonEnvPath });
            
            // Add Paragon-specific environment variables directly to server environment
            // Map from the actual .env variable names to what the server expects
            env['PARAGON_PROJECT_ID'] = process.env.PARAGON_PROJECT_ID || paragonEnv.parsed?.PARAGON_PROJECT_ID;
            env['PARAGON_JWT_SECRET'] = process.env.PARAGON_JWT_SECRET || paragonEnv.parsed?.PARAGON_JWT_SECRET;
            env['PARAGON_WEB_URL'] = process.env.PARAGON_WEB_URL || paragonEnv.parsed?.PARAGON_WEB_URL || 'http://localhost:3000';
            env['MCP_SERVER_URL'] = process.env.MCP_SERVER_URL || 'http://localhost:3002';
            env['NODE_ENV'] = process.env.NODE_ENV || 'development';
            env['PORT'] = process.env.PORT || '3002';
            
            logger.info('Added Paragon environment variables', { 
                serverName, 
                hasProjectId: !!env['PARAGON_PROJECT_ID'],
                hasSigningKey: !!env['PARAGON_JWT_SECRET']
            });
        }

        // PARAGON-ONLY AUTHENTICATION: Only add OAuth tokens for non-Paragon services in specific cases
        // All service authentication should go through Paragon, not individual OAuth tokens
        if (config.requiresAuth && config.authProvider) {
            // Skip OAuth token handling for individual services - they should be authenticated via Paragon
            // Only allow Paragon itself to have authentication setup
            if (config.authProvider !== 'paragon') {
                logger.info('Skipping OAuth token setup for non-Paragon service - should be authenticated via Paragon', { 
                    serverName, 
                    authProvider: config.authProvider 
                });
                // Don't add any OAuth tokens - this service should only work through Paragon
                return env;
            }
            
            // If this is specifically a legacy test server that needs OAuth (very rare case)
            // we could handle it here, but for now, skip all non-Paragon OAuth
            logger.info('Non-Paragon service authentication skipped - use Paragon integration instead', {
                serverName,
                authProvider: config.authProvider
            });
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
     * Register an OAuth-only service - DISABLED for Paragon-only authentication
     * All services should be authenticated through Paragon, not as individual OAuth servers
     */
    registerOAuthService(serviceName) {
        logger.warn('OAuth service registration blocked - use Paragon integration instead', { 
            serviceName,
            reason: 'Individual OAuth services should not be registered as authenticated servers'
        });
        
        // DO NOT create virtual server entries for OAuth services
        // All authentication should go through Paragon
        
        // Return null to indicate service was not registered
        return null;
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