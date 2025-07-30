/**
 * Tool Registry
 * Manages tools across multiple MCP servers
 * Provides a unified interface for tool discovery and invocation
 */

const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[ToolRegistry] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class ToolRegistry extends EventEmitter {
    constructor(serverRegistry) {
        super();
        this.serverRegistry = serverRegistry;
        this.tools = new Map(); // fullName -> ToolInfo
        this.serverTools = new Map(); // serverName -> Set of tool names
        
        // Set up event handlers
        this.setupEventHandlers();
        
        logger.info('ToolRegistry initialized');
    }

    /**
     * Set up event handlers for server registry
     */
    setupEventHandlers() {
        if (!this.serverRegistry) {
            return;
        }

        // Listen for tool registration events
        this.serverRegistry.on('toolRegistered', ({ serverName, toolName, config }) => {
            this.registerServerTool(serverName, toolName, config);
        });

        // Listen for server start events
        this.serverRegistry.on('serverStarted', ({ name: serverName }) => {
            this.refreshServerTools(serverName);
        });

        // Listen for server stop events
        this.serverRegistry.on('serverStopped', ({ name: serverName }) => {
            this.removeServerTools(serverName);
        });
    }

    /**
     * Register a tool from a server
     */
    registerServerTool(serverName, toolName, config) {
        const fullName = this.getFullToolName(serverName, toolName);
        
        const toolInfo = {
            name: toolName,
            serverName,
            fullName,
            title: config.title || toolName,
            description: config.description,
            inputSchema: config.inputSchema,
            registeredAt: new Date(),
            // UI capability information
            supportsUI: config.supportsUI || false,
            uiCapabilities: config.uiCapabilities || [],
            responseType: config.responseType || 'text',
            uiResourceType: config.uiResourceType || null
        };

        // Store in main registry
        this.tools.set(fullName, toolInfo);

        // Track server association
        if (!this.serverTools.has(serverName)) {
            this.serverTools.set(serverName, new Set());
        }
        this.serverTools.get(serverName).add(toolName);

        logger.info('Tool registered', { 
            fullName, 
            serverName, 
            toolName,
            supportsUI: toolInfo.supportsUI,
            uiCapabilities: toolInfo.uiCapabilities
        });
        this.emit('toolRegistered', toolInfo);
    }

    /**
     * Remove all tools from a server
     */
    removeServerTools(serverName) {
        const serverToolSet = this.serverTools.get(serverName);
        if (!serverToolSet) {
            return;
        }

        // Remove each tool
        for (const toolName of serverToolSet) {
            const fullName = this.getFullToolName(serverName, toolName);
            this.tools.delete(fullName);
            logger.info('Tool removed', { fullName });
            this.emit('toolRemoved', { fullName, serverName, toolName });
        }

        // Remove server entry
        this.serverTools.delete(serverName);
        logger.info('All tools removed for server', { serverName });
    }

    /**
     * Refresh tools from a server
     */
    async refreshServerTools(serverName) {
        try {
            const tools = this.serverRegistry.getServerTools(serverName);
            
            // Clear existing tools for this server
            this.removeServerTools(serverName);
            
            // Register new tools
            for (const tool of tools) {
                this.registerServerTool(serverName, tool.name, tool);
            }
            
            logger.info('Server tools refreshed', { serverName, count: tools.length });
        } catch (error) {
            logger.error('Failed to refresh server tools', { serverName, error: error.message });
        }
    }

    /**
     * Invoke a tool
     */
    async invokeTool(fullName, args) {
        const toolInfo = this.tools.get(fullName);
        if (!toolInfo) {
            throw new Error(`Tool not found: ${fullName}`);
        }

        logger.info('Invoking tool', { fullName, args });

        try {
            // Get the server adapter
            const serverState = this.serverRegistry.servers.get(toolInfo.serverName);
            if (!serverState || !serverState.adapter) {
                throw new Error(`Server not running: ${toolInfo.serverName}`);
            }

            // The actual tool invocation would go through the MCP protocol
            // For now, we'll need to implement this based on the SDK's client capabilities
            // This is a placeholder - in reality we'd need to handle the MCP protocol communication
            
            const result = await this.invokeToolThroughMCP(
                serverState.adapter,
                toolInfo.name,
                args
            );

            logger.info('Tool invocation successful', { fullName, result });
            this.emit('toolInvoked', { fullName, args, result });
            
            return result;

        } catch (error) {
            logger.error('Tool invocation failed', { fullName, error: error.message });
            this.emit('toolInvocationFailed', { fullName, args, error });
            throw error;
        }
    }

    /**
     * Invoke tool through MCP protocol
     * This is a placeholder - actual implementation would use MCP client
     */
    async invokeToolThroughMCP(adapter, toolName, args) {
        // Use the MCP client's callTool method
        if (!adapter || !adapter.callTool) {
            throw new Error('MCP adapter not properly initialized or missing callTool method');
        }
        
        try {
            const result = await adapter.callTool(toolName, args);
            return result;
        } catch (error) {
            logger.error('MCP tool invocation failed', { toolName, error: error.message });
            throw error;
        }
    }

    /**
     * List all available tools
     */
    listTools() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.fullName,
            serverName: tool.serverName,
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema
        }));
    }

    /**
     * List tools for a specific server
     */
    listServerTools(serverName) {
        const serverToolSet = this.serverTools.get(serverName);
        if (!serverToolSet) {
            return [];
        }

        return Array.from(serverToolSet).map(toolName => {
            const fullName = this.getFullToolName(serverName, toolName);
            return this.tools.get(fullName);
        }).filter(Boolean);
    }

    /**
     * Get tool information
     */
    getTool(fullName) {
        return this.tools.get(fullName);
    }

    /**
     * Search tools by name or description
     */
    searchTools(query) {
        const lowerQuery = query.toLowerCase();
        const results = [];

        for (const tool of this.tools.values()) {
            if (tool.name.toLowerCase().includes(lowerQuery) ||
                tool.fullName.toLowerCase().includes(lowerQuery) ||
                (tool.description && tool.description.toLowerCase().includes(lowerQuery))) {
                results.push(tool);
            }
        }

        return results;
    }

    /**
     * Get all tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }

    /**
     * Get full tool name (serverName.toolName)
     */
    getFullToolName(serverName, toolName) {
        return `${serverName}.${toolName}`;
    }

    /**
     * Parse full tool name into components
     */
    parseFullToolName(fullName) {
        const parts = fullName.split('.');
        if (parts.length < 2) {
            throw new Error(`Invalid tool name format: ${fullName}`);
        }
        
        const serverName = parts[0];
        const toolName = parts.slice(1).join('.');
        
        return { serverName, toolName };
    }

    /**
     * Get tool count
     */
    getToolCount() {
        return this.tools.size;
    }

    /**
     * Get server count
     */
    getServerCount() {
        return this.serverTools.size;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const stats = {
            totalTools: this.tools.size,
            totalServers: this.serverTools.size,
            toolsByServer: {}
        };

        for (const [serverName, toolSet] of this.serverTools) {
            stats.toolsByServer[serverName] = toolSet.size;
        }

        return stats;
    }

    /**
     * Clear all tools
     */
    clear() {
        this.tools.clear();
        this.serverTools.clear();
        logger.info('Tool registry cleared');
        this.emit('cleared');
    }

    /**
     * Register a tool manually (for testing)
     */
    registerTool(serverName, tool) {
        const toolName = tool.name;
        const toolWithServer = {
            ...tool,
            serverName
        };
        
        this.tools.set(toolName, toolWithServer);
        
        if (!this.serverTools.has(serverName)) {
            this.serverTools.set(serverName, new Set());
        }
        this.serverTools.get(serverName).add(toolName);
        
        logger.info('Tool registered manually', { serverName, toolName });
        this.emit('toolRegistered', { serverName, toolName, tool: toolWithServer });
    }

    /**
     * Remove tools for a server
     */
    removeServerTools(serverName) {
        const tools = this.serverTools.get(serverName);
        if (tools) {
            for (const toolName of tools) {
                this.tools.delete(toolName);
            }
            this.serverTools.delete(serverName);
            logger.info('Removed tools for server', { serverName, count: tools.size });
        }
    }

    /**
     * Get tools that support UI responses
     * @returns {Array} Array of UI-capable tools
     */
    getUICapableTools() {
        const uiTools = [];
        
        for (const [fullName, toolInfo] of this.tools) {
            if (toolInfo.supportsUI) {
                uiTools.push(toolInfo);
            }
        }
        
        return uiTools;
    }

    /**
     * Get tools by UI capability
     * @param {string} capability - The UI capability to filter by
     * @returns {Array} Array of tools with the specified capability
     */
    getToolsByUICapability(capability) {
        const tools = [];
        
        for (const [fullName, toolInfo] of this.tools) {
            if (toolInfo.uiCapabilities && toolInfo.uiCapabilities.includes(capability)) {
                tools.push(toolInfo);
            }
        }
        
        return tools;
    }

    /**
     * Check if a tool supports UI responses
     * @param {string} fullName - The full tool name
     * @returns {boolean} Whether the tool supports UI
     */
    toolSupportsUI(fullName) {
        const toolInfo = this.tools.get(fullName);
        return toolInfo ? toolInfo.supportsUI : false;
    }

    /**
     * Get UI capabilities for a tool
     * @param {string} fullName - The full tool name
     * @returns {Array} Array of UI capabilities
     */
    getToolUICapabilities(fullName) {
        const toolInfo = this.tools.get(fullName);
        return toolInfo ? (toolInfo.uiCapabilities || []) : [];
    }

    /**
     * Register UI capability for a tool
     * @param {string} fullName - The full tool name
     * @param {string} capability - The UI capability to add
     */
    registerUICapability(fullName, capability) {
        const toolInfo = this.tools.get(fullName);
        if (toolInfo) {
            if (!toolInfo.uiCapabilities) {
                toolInfo.uiCapabilities = [];
            }
            if (!toolInfo.uiCapabilities.includes(capability)) {
                toolInfo.uiCapabilities.push(capability);
                toolInfo.supportsUI = true;
                logger.info('UI capability registered', { fullName, capability });
                this.emit('uiCapabilityAdded', { fullName, capability });
            }
        }
    }

    /**
     * Get UI capabilities for a tool
     * @param {string} toolName - Full tool name
     * @returns {Array} Array of UI capabilities
     */
    getToolUICapabilities(toolName) {
        const tool = this.tools.get(toolName);
        return tool ? (tool.uiCapabilities || []) : [];
    }
    
    /**
     * Check if a tool supports UI responses
     * @param {string} toolName - Full tool name
     * @returns {boolean} True if tool supports UI
     */
    toolSupportsUI(toolName) {
        const tool = this.tools.get(toolName);
        return tool ? (tool.supportsUI || false) : false;
    }
    
    /**
     * Get status of the tool registry
     */
    getStatus() {
        return this.getStatistics();
    }
}

module.exports = ToolRegistry; 