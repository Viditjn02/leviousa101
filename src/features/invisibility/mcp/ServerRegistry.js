/**
 * Server Registry
 * Manages MCP server configurations and lifecycle
 * Provides a clean interface for starting, stopping, and monitoring servers
 */

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const winston = require('winston');
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

// Pre-configured server definitions
const SERVER_DEFINITIONS = {
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
    github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        description: 'Repository management, file operations, and GitHub API integration',
        capabilities: ['create_repository', 'search_repositories', 'create_issue', 'get_file', 'push_files'],
        requiresAuth: true,
        authProvider: 'github'
    },
    notion: {
        command: 'npx',
        args: ['-y', '@suekou/mcp-notion-server'],
        description: 'Community Notion MCP server that works with integration tokens',
        capabilities: ['notion_search', 'notion_retrieve_page', 'notion_retrieve_block', 'notion_query_database'],
        requiresAuth: true,
        authProvider: 'notion'
    },
    slack: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-slack'],
        description: 'Slack workspace integration',
        capabilities: ['slack_list_channels', 'slack_post_message', 'slack_reply_to_thread'],
        requiresAuth: true,
        authProvider: 'slack'
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
        
        logger.info('ServerRegistry initialized');
    }

    /**
     * Initialize the registry
     */
    async initialize() {
        try {
            await this.oauthManager.initialize();
            logger.info('ServerRegistry initialized successfully');
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
            ...SERVER_DEFINITIONS[name],
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

            // Create MCP adapter
            const adapter = new MCPAdapter({
                name: `${name}-server`,
                version: '1.0.0',
                transport: 'stdio'
            });

            // Set up adapter event handlers
            this.setupAdapterHandlers(name, adapter);

            // Connect adapter to the server using command and args
            await adapter.connectWithRetry(
                serverState.config.command, 
                serverState.config.args,
                { env, cwd: serverState.config.cwd }
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
     * Ensure authentication for a server
     */
    async ensureAuthentication(serverName, authProvider) {
        logger.info('Checking authentication', { serverName, authProvider });

        const token = await this.oauthManager.getValidToken(authProvider);
        if (!token) {
            logger.info('Authentication required', { serverName, authProvider });
            throw new Error(`Authentication required for ${authProvider}`);
        }

        logger.info('Authentication verified', { serverName, authProvider });
    }

    /**
     * Prepare environment variables for a server
     */
    async prepareEnvironment(serverName, config) {
        const env = { ...process.env };

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
                    'github': 'GITHUB_PERSONAL_ACCESS_TOKEN',
                    'slack': 'SLACK_BOT_TOKEN',
                    'google-drive': 'GOOGLE_OAUTH_TOKEN'
                };
                envVar = tokenEnvMap[config.authProvider];
            }

            if (envVar && token) {
                env[envVar] = token;
                logger.info('Added authentication token to environment', { serverName, envVar: envVar });
            }
        }

        // Add any custom environment variables
        if (config.env) {
            Object.assign(env, config.env);
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
     * Get all available servers
     */
    getAvailableServers() {
        return Object.keys(SERVER_DEFINITIONS);
    }

    /**
     * Get server definition
     */
    getServerDefinition(name) {
        return SERVER_DEFINITIONS[name];
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
     * Get server configuration
     */
    getServerConfig(serverName) {
        return this.servers.get(serverName);
    }
}

module.exports = ServerRegistry; 