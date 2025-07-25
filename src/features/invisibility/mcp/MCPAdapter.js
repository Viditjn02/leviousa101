/**
 * MCP Adapter Layer
 * Provides a clean interface to the official @modelcontextprotocol/sdk
 * This adapter connects to MCP servers as a client and provides
 * a consistent API for the rest of the application
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[MCPAdapter] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class MCPAdapter extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            name: config.name || 'leviousa-mcp-client',
            version: config.version || '1.0.0',
            autoReconnect: config.autoReconnect !== false,
            reconnectInterval: config.reconnectInterval || 5000,
            maxReconnectAttempts: config.maxReconnectAttempts || 5,
            ...config
        };
        
        this.mcpClient = null;
        this.transport = null;
        this.serverProcess = null;
        this.isConnected = false;
        this.status = 'uninitialized';
        this.capabilities = {
            tools: new Map(),
            resources: new Map(),
            prompts: new Map()
        };
        
        // Reconnection state
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.lastConnectionParams = null;
        this.isReconnecting = false;
        
        // Health check state
        this.healthCheckTimer = null;
        this.healthCheckInterval = config.healthCheckInterval || 30000; // 30 seconds
        
        logger.info('MCPAdapter initialized', { config: this.config });
    }

    /**
     * Connect to an MCP server using command and arguments
     * @param {string} command - The command to run the server
     * @param {string[]} args - Arguments for the server command
     * @param {Object} options - Additional options (env, cwd, etc.)
     */
    async connectToServer(command, args = [], options = {}) {
        try {
            logger.info('Connecting to MCP server', { command, args });
            
            // Store connection parameters for reconnection
            this.lastConnectionParams = { command, args, options };
            
            // Create stdio transport with enhanced error handling and process isolation
            this.transport = new StdioClientTransport({
                command,
                args,
                env: options.env,
                cwd: options.cwd,
                stderr: 'pipe', // Always pipe stderr to avoid stdio conflicts
                stdio: ['pipe', 'pipe', 'pipe'] // Explicit stdio configuration for isolation
            });
            
            // Create MCP client
            this.mcpClient = new Client({
                name: this.config.name,
                version: this.config.version
            }, {
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {}
                }
            });
            
            // Set up enhanced error handling before connecting
            this.setupEnhancedErrorHandling();
            
            // Connect the client to the transport
            await this.mcpClient.connect(this.transport);
            
            // Set up transport event handlers for reconnection
            this.setupTransportHandlers();
            
            // Discover server capabilities
            await this.discoverCapabilities();
            
            this.isConnected = true;
            this.status = 'connected';
            this.reconnectAttempts = 0; // Reset on successful connection
            
            // Start health checks
            this.startHealthChecks();
            
            logger.info('Connected to MCP server successfully');
            this.emit('connected');
            
        } catch (error) {
            logger.error('Failed to connect to MCP server', { error: error.message });
            // Ensure cleanup on connection failure
            await this.cleanupFailedConnection();
            throw error;
        }
    }

    /**
     * Connect with retry logic
     * @param {string} command - The command to run the server
     * @param {string[]} args - Arguments for the server command
     * @param {Object} options - Additional options
     * @param {number} maxRetries - Maximum number of connection attempts
     */
    async connectWithRetry(command, args = [], options = {}, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await this.connectToServer(command, args, options);
                return;
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                const delay = Math.pow(2, i) * 1000; // Exponential backoff
                logger.warn(`Connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Discover server capabilities dynamically
     */
    async discoverCapabilities() {
        if (!this.mcpClient) {
            throw new Error('MCP client not connected');
        }
        
        try {
            logger.info('Discovering server capabilities');
            
            // Discover tools
            const toolsResult = await this.mcpClient.listTools();
            if (toolsResult.tools) {
                for (const tool of toolsResult.tools) {
                    this.capabilities.tools.set(tool.name, tool);
                }
                logger.info(`Discovered ${toolsResult.tools.length} tools`);
            }
            
            // Discover resources
            const resourcesResult = await this.mcpClient.listResources();
            if (resourcesResult.resources) {
                for (const resource of resourcesResult.resources) {
                    this.capabilities.resources.set(resource.uri, resource);
                }
                logger.info(`Discovered ${resourcesResult.resources.length} resources`);
            }
            
            // Discover prompts
            const promptsResult = await this.mcpClient.listPrompts();
            if (promptsResult.prompts) {
                for (const prompt of promptsResult.prompts) {
                    this.capabilities.prompts.set(prompt.name, prompt);
                }
                logger.info(`Discovered ${promptsResult.prompts.length} prompts`);
            }
            
            this.emit('capabilitiesDiscovered', {
                tools: Array.from(this.capabilities.tools.values()),
                resources: Array.from(this.capabilities.resources.values()),
                prompts: Array.from(this.capabilities.prompts.values())
            });
            
        } catch (error) {
            logger.error('Failed to discover capabilities', { error: error.message });
            // Don't throw - server might not support all capability types
        }
    }

    /**
     * Call a tool on the MCP server
     * @param {string} toolName - Name of the tool to call
     * @param {Object} args - Arguments to pass to the tool
     */
    async callTool(toolName, args) {
        if (!this.mcpClient || !this.isConnected) {
            throw new Error('MCP client not connected');
        }
        
        try {
            logger.info('Calling tool', { toolName, args });
            
            const result = await this.mcpClient.callTool({
                name: toolName,
                arguments: args
            });
            
            logger.info('Tool call successful', { toolName });
            return result;
            
        } catch (error) {
            logger.error('Tool call failed', { toolName, error: error.message });
            throw error;
        }
    }

    /**
     * Read a resource from the MCP server
     * @param {string} uri - URI of the resource to read
     */
    async readResource(uri) {
        if (!this.mcpClient || !this.isConnected) {
            throw new Error('MCP client not connected');
        }
        
        try {
            logger.info('Reading resource', { uri });
            
            const result = await this.mcpClient.readResource({
                uri: uri
            });
            
            logger.info('Resource read successful', { uri });
            return result;
            
        } catch (error) {
            logger.error('Resource read failed', { uri, error: error.message });
            throw error;
        }
    }

    /**
     * Get a prompt from the MCP server
     * @param {string} promptName - Name of the prompt
     * @param {Object} args - Arguments for the prompt
     */
    async getPrompt(promptName, args) {
        if (!this.mcpClient || !this.isConnected) {
            throw new Error('MCP client not connected');
        }
        
        try {
            logger.info('Getting prompt', { promptName, args });
            
            const result = await this.mcpClient.getPrompt({
                name: promptName,
                arguments: args
            });
            
            logger.info('Prompt retrieved successfully', { promptName });
            return result;
            
        } catch (error) {
            logger.error('Failed to get prompt', { promptName, error: error.message });
            throw error;
        }
    }

    /**
     * Get available tools
     */
    getTools() {
        return Array.from(this.capabilities.tools.values());
    }

    /**
     * Get available resources
     */
    getResources() {
        return Array.from(this.capabilities.resources.values());
    }

    /**
     * Get available prompts
     */
    getPrompts() {
        return Array.from(this.capabilities.prompts.values());
    }

    /**
     * Set up transport event handlers for reconnection
     */
    setupTransportHandlers() {
        if (!this.transport || !this.transport._process) {
            logger.warn('No transport process found for event handler setup');
            return;
        }

        const process = this.transport._process;
        
        logger.info('Setting up transport event handlers for MCP server process', { pid: process.pid });
        
        // Handle process exit
        process.on('exit', (code, signal) => {
            logger.warn('MCP server process exited', { code, signal, pid: process.pid });
            this.handleDisconnection();
        });

        // Handle process errors with enhanced error handling
        process.on('error', (error) => {
            logger.error('MCP server process error', { error: error.message, pid: process.pid });
            this.handleDisconnection();
        });

        // Handle stdio errors with EPIPE protection
        if (process.stdin) {
            process.stdin.on('error', (error) => {
                if (error.code === 'EPIPE' || error.errno === -32) {
                    logger.warn('Stdin EPIPE error (process may have exited)', { pid: process.pid });
                } else {
                    logger.error('Stdin error', { error: error.message, pid: process.pid });
                }
            });
        }
        
        if (process.stdout) {
            process.stdout.on('error', (error) => {
                if (error.code === 'EPIPE' || error.errno === -32) {
                    logger.warn('Stdout EPIPE error (process may have exited)', { pid: process.pid });
                } else {
                    logger.error('Stdout error', { error: error.message, pid: process.pid });
                }
            });
        }
        
        if (process.stderr) {
            process.stderr.on('error', (error) => {
                if (error.code === 'EPIPE' || error.errno === -32) {
                    logger.warn('Stderr EPIPE error (process may have exited)', { pid: process.pid });
                } else {
                    logger.error('Stderr error', { error: error.message, pid: process.pid });
                }
            });
        }
        
        // Handle process disconnect
        process.on('disconnect', () => {
            logger.warn('MCP server process disconnected', { pid: process.pid });
            this.handleDisconnection();
        });
        
        // Handle process close
        process.on('close', (code, signal) => {
            logger.warn('MCP server process closed', { code, signal, pid: process.pid });
            this.handleDisconnection();
        });
    }

    /**
     * Handle unexpected disconnections
     */
    handleDisconnection() {
        if (!this.isConnected || this.isReconnecting) {
            return;
        }

        this.isConnected = false;
        this.status = 'disconnected';
        
        // Stop health checks
        this.stopHealthChecks();
        
        this.emit('disconnected', { unexpected: true });

        // Clear capabilities
        this.capabilities.tools.clear();
        this.capabilities.resources.clear();
        this.capabilities.prompts.clear();

        // Attempt reconnection if enabled
        if (this.config.autoReconnect && 
            this.lastConnectionParams && 
            this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnection();
        }
    }

    /**
     * Schedule a reconnection attempt
     */
    scheduleReconnection() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval;
        
        logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(() => {
            this.attemptReconnection();
        }, delay);
    }

    /**
     * Attempt to reconnect to the server
     */
    async attemptReconnection() {
        if (!this.lastConnectionParams || this.isConnecting || this.isConnected) {
            return;
        }

        this.isReconnecting = true;
        logger.info(`Attempting reconnection (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
        
        try {
            const { command, args, options } = this.lastConnectionParams;
            await this.connectToServer(command, args, options);
            
            logger.info('Reconnection successful');
            this.emit('reconnected');
            this.isReconnecting = false;
        } catch (error) {
            logger.error('Reconnection failed', { error: error.message });
            this.isReconnecting = false;
            
            if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
                this.scheduleReconnection();
            } else {
                logger.error('Max reconnection attempts reached');
                this.emit('reconnectionFailed', { attempts: this.reconnectAttempts });
            }
        }
    }

    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        // Clear any existing health check timer
        this.stopHealthChecks();
        
        if (this.healthCheckInterval <= 0) {
            return; // Health checks disabled
        }
        
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);
        
        logger.info('Health checks started', { interval: this.healthCheckInterval });
    }
    
    /**
     * Stop health checks
     */
    stopHealthChecks() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
            logger.info('Health checks stopped');
        }
    }
    
    /**
     * Perform a health check
     */
    async performHealthCheck() {
        if (!this.isConnected || this.isReconnecting) {
            return;
        }
        
        try {
            // Use the ping method if available, otherwise try listing tools
            if (this.mcpClient && this.mcpClient.ping) {
                await this.mcpClient.ping();
            } else {
                // Fallback: try to list tools as a health check
                await this.mcpClient.listTools();
            }
            
            logger.debug('Health check passed');
        } catch (error) {
            logger.error('Health check failed', { error: error.message });
            
            // Connection seems dead, trigger disconnection handling
            this.handleDisconnection();
        }
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        if (!this.isConnected) {
            logger.warn('Already disconnected');
            return;
        }
        
        try {
            logger.info('Disconnecting from MCP server');
            
            // Stop health checks
            this.stopHealthChecks();
            
            // Cancel any pending reconnection attempts
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            
            // Disable auto-reconnect for intentional disconnections
            const wasAutoReconnect = this.config.autoReconnect;
            this.config.autoReconnect = false;
            
            if (this.mcpClient) {
                await this.mcpClient.close();
            }
            
            this.isConnected = false;
            this.status = 'disconnected';
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            
            // Restore auto-reconnect setting
            this.config.autoReconnect = wasAutoReconnect;
            
            logger.info('Disconnected successfully');
            this.emit('disconnected', { unexpected: false });
            
        } catch (error) {
            logger.error('Error during disconnect', { error: error.message });
            throw error;
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return this.status;
    }

    /**
     * Get detailed status information
     */
    getDetailedStatus() {
        return {
            status: this.status,
            isConnected: this.isConnected,
            clientName: this.config.name,
            clientVersion: this.config.version,
            toolCount: this.capabilities.tools.size,
            resourceCount: this.capabilities.resources.size,
            promptCount: this.capabilities.prompts.size
        };
    }

    /**
     * Check if a tool is available
     * @param {string} toolName - Name of the tool
     */
    hasTool(toolName) {
        return this.capabilities.tools.has(toolName);
    }

    /**
     * Check if a resource is available
     * @param {string} uri - URI of the resource
     */
    hasResource(uri) {
        return this.capabilities.resources.has(uri);
    }

    /**
     * Check if a prompt is available
     * @param {string} promptName - Name of the prompt
     */
    hasPrompt(promptName) {
        return this.capabilities.prompts.has(promptName);
    }

    /**
     * Refresh capabilities from the server
     */
    async refreshCapabilities() {
        if (!this.isConnected) {
            throw new Error('MCP client not connected');
        }
        
        // Clear existing capabilities
        this.capabilities.tools.clear();
        this.capabilities.resources.clear();
        this.capabilities.prompts.clear();
        
        // Re-discover
        await this.discoverCapabilities();
    }

    /**
     * Set up enhanced error handling for process stdio
     */
    setupEnhancedErrorHandling() {
        // Wrap console methods to prevent EPIPE errors
        if (!this._originalConsole) {
            this._originalConsole = {
                log: console.log,
                error: console.error,
                warn: console.warn,
                info: console.info
            };
            
            // Create safe console methods that handle EPIPE gracefully
            const createSafeConsoleMethod = (original) => {
                return (...args) => {
                    try {
                        original.apply(console, args);
                    } catch (error) {
                        if (error.code === 'EPIPE' || error.errno === -32) {
                            // Silently ignore EPIPE errors to prevent crashes
                            // These happen when stdout/stderr is closed unexpectedly
                            return;
                        }
                        // Re-throw other errors
                        throw error;
                    }
                };
            };
            
            console.log = createSafeConsoleMethod(this._originalConsole.log);
            console.error = createSafeConsoleMethod(this._originalConsole.error);
            console.warn = createSafeConsoleMethod(this._originalConsole.warn);
            console.info = createSafeConsoleMethod(this._originalConsole.info);
        }
        
        // Handle uncaught EPIPE errors at process level
        if (!this._epipeHandlerSet) {
            process.on('uncaughtException', (error) => {
                if (error.code === 'EPIPE' || error.errno === -32) {
                    logger.warn('Caught EPIPE error, handling gracefully', { error: error.message });
                    return; // Prevent crash
                }
                // Re-throw other uncaught exceptions
                throw error;
            });
            this._epipeHandlerSet = true;
        }
    }

    /**
     * Clean up failed connection attempt
     */
    async cleanupFailedConnection() {
        try {
            this.isConnected = false;
            this.status = 'error';
            
            if (this.transport && this.transport._process) {
                // Forcefully terminate the process if it's still running
                const process = this.transport._process;
                if (!process.killed) {
                    logger.info('Terminating failed MCP server process');
                    process.kill('SIGTERM');
                    
                    // Force kill after timeout
                    setTimeout(() => {
                        if (!process.killed) {
                            logger.warn('Force killing unresponsive MCP server process');
                            process.kill('SIGKILL');
                        }
                    }, 5000);
                }
            }
            
            if (this.mcpClient) {
                try {
                    await this.mcpClient.close();
                } catch (closeError) {
                    logger.warn('Error closing MCP client during cleanup', { error: closeError.message });
                }
            }
            
            this.transport = null;
            this.mcpClient = null;
            
            // Clear capabilities
            this.capabilities.tools.clear();
            this.capabilities.resources.clear();
            this.capabilities.prompts.clear();
            
            logger.info('Failed connection cleanup completed');
            
        } catch (error) {
            logger.error('Error during connection cleanup', { error: error.message });
        }
    }
}

module.exports = MCPAdapter; 