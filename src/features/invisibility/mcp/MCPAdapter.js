/**
 * MCP Adapter Layer
 * Provides a clean interface to the official @modelcontextprotocol/sdk
 * This adapter abstracts the SDK implementation details and provides
 * a consistent API for the rest of the application
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { EventEmitter } = require('events');
const { z } = require('zod');
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
            name: config.name || 'leviousa-mcp',
            version: config.version || '1.0.0',
            ...config
        };
        
        this.mcpServer = null;
        this.transport = null;
        this.isConnected = false;
        this.tools = new Map();
        this.resources = new Map();
        this.prompts = new Map();
        
        logger.info('MCPAdapter initialized', { config: this.config });
    }

    /**
     * Initialize the MCP server
     */
    async initialize() {
        try {
            logger.info('Initializing MCP server');
            
            // Create the MCP server instance
            this.mcpServer = new McpServer({
                name: this.config.name,
                version: this.config.version
            });
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Initialize transport
            await this.initializeTransport();
            
            logger.info('MCP server initialized successfully');
            this.emit('initialized');
            
        } catch (error) {
            logger.error('Failed to initialize MCP server', { error: error.message });
            throw error;
        }
    }

    /**
     * Initialize the transport layer
     */
    async initializeTransport() {
        const transportType = this.config.transport || 'stdio';
        
        switch (transportType) {
            case 'stdio':
                this.transport = new StdioServerTransport();
                logger.info('Using stdio transport');
                break;
            default:
                throw new Error(`Unsupported transport type: ${transportType}`);
        }
    }

    /**
     * Connect to the transport
     */
    async connect() {
        if (!this.mcpServer || !this.transport) {
            throw new Error('MCP server not initialized');
        }
        
        try {
            logger.info('Connecting to transport');
            await this.mcpServer.connect(this.transport);
            this.isConnected = true;
            logger.info('Connected successfully');
            this.emit('connected');
        } catch (error) {
            logger.error('Failed to connect', { error: error.message });
            throw error;
        }
    }

    /**
     * Disconnect from the transport
     */
    async disconnect() {
        if (!this.isConnected) {
            logger.warn('Already disconnected');
            return;
        }
        
        try {
            logger.info('Disconnecting from transport');
            // The SDK handles cleanup internally
            this.isConnected = false;
            logger.info('Disconnected successfully');
            this.emit('disconnected');
        } catch (error) {
            logger.error('Error during disconnect', { error: error.message });
            throw error;
        }
    }

    /**
     * Register a tool with the MCP server
     */
    registerTool(name, config, handler) {
        if (!this.mcpServer) {
            throw new Error('MCP server not initialized');
        }
        
        try {
            logger.info('Registering tool', { name, config });
            
            const tool = this.mcpServer.registerTool(
                name,
                {
                    title: config.title || name,
                    description: config.description,
                    inputSchema: config.inputSchema
                },
                handler
            );
            
            this.tools.set(name, { config, handler, tool });
            logger.info('Tool registered successfully', { name });
            this.emit('toolRegistered', { name, config });
            
            return tool;
        } catch (error) {
            logger.error('Failed to register tool', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Register a resource with the MCP server
     */
    registerResource(name, uri, config, handler) {
        if (!this.mcpServer) {
            throw new Error('MCP server not initialized');
        }
        
        try {
            logger.info('Registering resource', { name, uri, config });
            
            const resource = this.mcpServer.registerResource(
                name,
                uri,
                {
                    title: config.title || name,
                    description: config.description,
                    mimeType: config.mimeType
                },
                handler
            );
            
            this.resources.set(name, { uri, config, handler, resource });
            logger.info('Resource registered successfully', { name });
            this.emit('resourceRegistered', { name, uri, config });
            
            return resource;
        } catch (error) {
            logger.error('Failed to register resource', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Register a prompt with the MCP server
     */
    registerPrompt(name, config, handler) {
        if (!this.mcpServer) {
            throw new Error('MCP server not initialized');
        }
        
        try {
            logger.info('Registering prompt', { name, config });
            
            const prompt = this.mcpServer.registerPrompt(
                name,
                {
                    title: config.title || name,
                    description: config.description,
                    argsSchema: config.argsSchema
                },
                handler
            );
            
            this.prompts.set(name, { config, handler, prompt });
            logger.info('Prompt registered successfully', { name });
            this.emit('promptRegistered', { name, config });
            
            return prompt;
        } catch (error) {
            logger.error('Failed to register prompt', { name, error: error.message });
            throw error;
        }
    }

    /**
     * Get registered tools
     */
    getTools() {
        return Array.from(this.tools.entries()).map(([name, tool]) => ({
            name,
            ...tool.config
        }));
    }

    /**
     * Get registered resources
     */
    getResources() {
        return Array.from(this.resources.entries()).map(([name, resource]) => ({
            name,
            uri: resource.uri,
            ...resource.config
        }));
    }

    /**
     * Get registered prompts
     */
    getPrompts() {
        return Array.from(this.prompts.entries()).map(([name, prompt]) => ({
            name,
            ...prompt.config
        }));
    }

    /**
     * Set up event handlers for the MCP server
     */
    setupEventHandlers() {
        // The SDK handles most events internally
        // We can add custom event handling here if needed
        logger.info('Event handlers set up');
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            serverName: this.config.name,
            serverVersion: this.config.version,
            toolCount: this.tools.size,
            resourceCount: this.resources.size,
            promptCount: this.prompts.size
        };
    }
}

module.exports = MCPAdapter; 