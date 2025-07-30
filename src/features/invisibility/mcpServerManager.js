const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path'); // Added for path.join

class MCPServerManager extends EventEmitter {
    constructor() {
        super();
        this.servers = new Map();
        this.serverConfigs = new Map();
        this.requestCounter = 0;
        this.pendingRequests = new Map();
        
        // Pre-configured server definitions
        this.availableServers = {
            everything: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-everything'],
                description: 'Reference test server with multiple tools and features',
                tools: ['echo', 'add', 'get_tiny_image', 'print_env']
            },
            filesystem: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
                description: 'Secure file operations with configurable access controls',
                tools: ['read_file', 'write_file', 'create_directory', 'list_directory', 'move_file', 'search_files']
            },
            time_docker: {
                command: 'docker',
                args: ['run', '-i', '--rm', 'mcp/time'],
                description: 'Time and timezone conversion capabilities (Docker)',
                tools: ['get_current_time', 'convert_time'],
                requiresDocker: true
            },
            fetch_docker: {
                command: 'docker',
                args: ['run', '-i', '--rm', 'mcp/fetch'],
                description: 'Web content fetching and conversion (Docker)',
                tools: ['fetch_url'],
                requiresDocker: true
            },
            github: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                description: 'Repository management, file operations, and GitHub API integration',
                tools: ['create_repository', 'search_repositories', 'create_issue', 'get_file', 'push_files'],
                envVars: ['GITHUB_PERSONAL_ACCESS_TOKEN']
            },
            sqlite: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-sqlite'],
                description: 'Database interaction and business intelligence capabilities',
                tools: ['list_tables', 'describe_table', 'query', 'execute']
            },
            notion: {
                command: 'npx',
                args: ['-y', '@suekou/mcp-notion-server'],
                description: 'Community Notion MCP server that works with integration tokens',
                tools: ['notion_search', 'notion_retrieve_page', 'notion_retrieve_block', 'notion_query_database', 'notion_retrieve_database', 'notion_create_database_item'],
                envVars: ['NOTION_API_TOKEN'],
                requiresAuth: true,
                authType: 'integration'
            },
            google: {
                command: 'uvx',
                args: ['workspace-mcp', '--tools', 'gmail', 'drive', 'calendar', 'docs', 'sheets', 'tasks', '--transport', 'stdio'],
                description: 'Google Workspace integration with comprehensive tools for Gmail, Drive, Calendar, Docs, Sheets, and Tasks',
                tools: ['send_gmail_message', 'list_gmail_messages', 'search_gmail_messages', 'list_drive_files', 'create_calendar_event', 'list_calendar_events'],
                envVars: ['GOOGLE_ACCESS_TOKEN', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
                requiresAuth: true,
                authType: 'oauth'
            },
            paragon: {
                command: '/Users/viditjain/.nvm/versions/node/v22.17.1/bin/node',
                args: [path.join(__dirname, '../../../services/paragon-mcp/dist/index.mjs')],
                description: 'Paragon MCP server providing access to 130+ SaaS integrations including Gmail, Notion, Slack, and more',
                tools: [], // Will be dynamically populated from Paragon
                envVars: ['PARAGON_PROJECT_ID', 'PARAGON_SIGNING_KEY'],
                requiresAuth: true,
                authType: 'jwt',
                transport: 'stdio' // Paragon MCP uses stdio transport when run as a process
            }
        };

        console.log('[MCPServerManager] Initialized with', Object.keys(this.availableServers).length, 'available servers');
    }

    async startServer(serverName, config = {}) {
        if (this.servers.has(serverName)) {
            console.log(`[MCPServerManager] Server ${serverName} already running`);
            return this.servers.get(serverName);
        }

        const serverConfig = this.availableServers[serverName];
        if (!serverConfig) {
            throw new Error(`Unknown server: ${serverName}`);
        }

        try {
            console.log(`[MCPServerManager] Starting ${serverName} server...`);
            
            // Special handling for Paragon server
            if (serverName === 'paragon') {
                // Load Paragon environment configuration
                const paragonEnvPath = path.join(__dirname, '../../../services/paragon-mcp/.env');
                try {
                    const dotenv = require('dotenv');
                    const paragonEnv = dotenv.config({ path: paragonEnvPath });
                    
                    if (paragonEnv.error) {
                        console.warn('[MCPServerManager] Could not load Paragon .env file:', paragonEnv.error.message);
                    } else {
                        // Merge Paragon environment variables AND map them to expected names
                        Object.assign(process.env, paragonEnv.parsed);
                        
                        // Map PROJECT_ID to PARAGON_PROJECT_ID for consistency
                        if (paragonEnv.parsed.PROJECT_ID) {
                            process.env.PARAGON_PROJECT_ID = paragonEnv.parsed.PROJECT_ID;
                        }
                        if (paragonEnv.parsed.SIGNING_KEY) {
                            process.env.PARAGON_SIGNING_KEY = paragonEnv.parsed.SIGNING_KEY;
                        }
                        
                        console.log('[MCPServerManager] ✅ Loaded Paragon configuration from .env file');
                        console.log('[MCPServerManager] 🔑 PROJECT_ID:', paragonEnv.parsed.PROJECT_ID);
                        console.log('[MCPServerManager] 🔐 SIGNING_KEY:', paragonEnv.parsed.SIGNING_KEY ? 'Present' : 'Missing');
                    }
                } catch (error) {
                    console.warn('[MCPServerManager] Error loading Paragon .env:', error.message);
                }

                // Initialize JWT service if not already done
                const paragonJwtService = require('./paragonJwtService');
                if (!paragonJwtService.getStatus().initialized) {
                    paragonJwtService.initialize({
                        projectId: process.env.PARAGON_PROJECT_ID || process.env.PROJECT_ID,
                        signingKey: process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY,
                        signingKeyPath: process.env.PARAGON_SIGNING_KEY_PATH
                    });
                    
                    if (paragonJwtService.getStatus().initialized) {
                        console.log('[MCPServerManager] ✅ Paragon JWT service initialized successfully');
                    } else {
                        console.warn('[MCPServerManager] ❌ Failed to initialize Paragon JWT service');
                    }
                }
            }
            
            // Prepare command arguments with any custom config
            let args = [...serverConfig.args];
            if (config.args) {
                args.push(...config.args);
            }

            // Set up environment variables
            const env = { ...process.env };
            
            // Add Paragon-specific environment variables
            if (serverName === 'paragon') {
                env.NODE_ENV = env.NODE_ENV || 'development';
                            env.PORT = env.PORT || '3002';
            env.MCP_SERVER_URL = env.MCP_SERVER_URL || 'http://localhost:3002';
            }
            
            if (serverConfig.envVars) {
                serverConfig.envVars.forEach(envVar => {
                    if (config.env && config.env[envVar]) {
                        env[envVar] = config.env[envVar];
                    } else if (!env[envVar]) {
                        console.warn(`[MCPServerManager] Missing environment variable ${envVar} for ${serverName}`);
                    }
                });
            }
            
            // Apply any additional environment variables from config
            if (config.env) {
                Object.assign(env, config.env);
            }

            // Spawn the MCP server process
            const serverProcess = spawn(serverConfig.command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: env
            });

            // Set up server state
            const serverState = {
                name: serverName,
                process: serverProcess,
                config: serverConfig,
                tools: [],
                resources: [],
                prompts: [],
                connected: false,
                buffer: '',
                initializationPromise: null
            };

            this.servers.set(serverName, serverState);
            this.serverConfigs.set(serverName, config);

            // Set up process event handlers
            this.setupServerHandlers(serverState);

            // Initialize the MCP connection
            serverState.initializationPromise = this.initializeServer(serverState);
            await serverState.initializationPromise;

            console.log(`[MCPServerManager] ✅ ${serverName} server started successfully`);
            this.emit('serverStarted', serverName, serverState);
            
            return serverState;
        } catch (error) {
            console.error(`[MCPServerManager] Failed to start ${serverName}:`, error);
            this.servers.delete(serverName);
            throw error;
        }
    }

    setupServerHandlers(serverState) {
        const { name, process: serverProcess } = serverState;

        // Handle stdout data (MCP messages)
        serverProcess.stdout.on('data', (data) => {
            this.handleServerData(serverState, data);
        });

        // Handle stderr (errors and logs)
        serverProcess.stderr.on('data', (data) => {
            console.error(`[MCPServerManager] ${name} stderr:`, data.toString());
        });

        // Handle process exit
        serverProcess.on('close', (code) => {
            console.log(`[MCPServerManager] ${name} process exited with code ${code}`);
            this.servers.delete(name);
            this.emit('serverStopped', name, code);
        });

        // Handle process errors
        serverProcess.on('error', (error) => {
            console.error(`[MCPServerManager] ${name} process error:`, error);
            this.servers.delete(name);
            this.emit('serverError', name, error);
        });
    }

    handleServerData(serverState, data) {
        // Accumulate data in buffer since JSON-RPC messages might be split
        serverState.buffer += data.toString();
        
        // Process complete JSON-RPC messages
        const lines = serverState.buffer.split('\n');
        serverState.buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    this.handleServerMessage(serverState, message);
                } catch (error) {
                    console.error(`[MCPServerManager] Invalid JSON from ${serverState.name}:`, line);
                }
            }
        }
    }

    handleServerMessage(serverState, message) {
        // Handle different types of MCP messages
        if (message.id && this.pendingRequests.has(message.id)) {
            // This is a response to a request we made
            const pendingRequest = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            
            if (message.error) {
                pendingRequest.reject(new Error(message.error.message || 'Server error'));
            } else {
                pendingRequest.resolve(message.result);
            }
        } else if (message.method) {
            // This is a notification or request from the server
            this.handleServerNotification(serverState, message);
        }
    }

    handleServerNotification(serverState, message) {
        switch (message.method) {
            case 'notifications/initialized':
                serverState.connected = true;
                console.log(`[MCPServerManager] ${serverState.name} initialized`);
                break;
            case 'notifications/progress':
                console.log(`[MCPServerManager] ${serverState.name} progress:`, message.params);
                break;
            case 'notifications/message':
                // Filter out verbose test messages from the 'everything' server
                if (serverState.name === 'everything') {
                    const messageData = message.params;
                    
                    // Only log error and critical messages, skip test messages
                    if (messageData && typeof messageData === 'object') {
                        const messageText = messageData.message || messageData.text || JSON.stringify(messageData);
                        const level = messageData.level || messageData.type || 'info';
                        
                        // Skip known test messages
                        if (messageText.includes('-level message') || 
                            messageText === 'Emergency-level message' ||
                            messageText === 'Error-level message' ||
                            messageText === 'Warning-level message' ||
                            messageText === 'Info-level message' ||
                            messageText === 'Debug-level message') {
                            // These are just test messages from the everything server, skip them
                            return;
                        }
                        
                        // Only log actual important messages
                        if (level === 'error' || level === 'emergency' || level === 'critical') {
                            if (!messageText.includes('-level message')) {
                                console.log(`[MCPServerManager] ${serverState.name} ${level}:`, messageText);
                            }
                        }
                    }
                } else {
                    // For other servers, log all messages normally
                    console.log(`[MCPServerManager] ${serverState.name} message:`, message.params);
                }
                break;
            case 'notifications/resources/updated':
                console.log(`[MCPServerManager] ${serverState.name} resources updated`);
                break;
            case 'notifications/tools/updated':
                console.log(`[MCPServerManager] ${serverState.name} tools updated`);
                break;
            default:
                // Only log unknown notifications if they're not from the everything server's test spam
                if (serverState.name !== 'everything' || !message.method.includes('test')) {
                    console.log(`[MCPServerManager] ${serverState.name} notification:`, message.method, message.params);
                }
        }
    }

    async initializeServer(serverState) {
        try {
            // Send initialization request
            const initResponse = await this.sendRequest(serverState, 'initialize', {
                protocolVersion: '2024-11-05',
                capabilities: {
                    experimental: {},
                    sampling: {}
                },
                clientInfo: {
                    name: 'leviousa-mcp-client',
                    version: '1.0.0'
                }
            });

            // Store server capabilities
            serverState.capabilities = initResponse.capabilities || {};

            // Send initialized notification
            await this.sendNotification(serverState, 'notifications/initialized');

            // List available tools
            if (serverState.capabilities.tools) {
                const toolsResponse = await this.sendRequest(serverState, 'tools/list');
                serverState.tools = toolsResponse.tools || [];
                console.log(`[MCPServerManager] ${serverState.name} tools:`, serverState.tools.map(t => t.name));
            }

            // List available resources
            if (serverState.capabilities.resources) {
                const resourcesResponse = await this.sendRequest(serverState, 'resources/list');
                serverState.resources = resourcesResponse.resources || [];
                console.log(`[MCPServerManager] ${serverState.name} resources:`, serverState.resources.map(r => r.uri));
            }

            // List available prompts
            if (serverState.capabilities.prompts) {
                const promptsResponse = await this.sendRequest(serverState, 'prompts/list');
                serverState.prompts = promptsResponse.prompts || [];
                console.log(`[MCPServerManager] ${serverState.name} prompts:`, serverState.prompts.map(p => p.name));
            }

            // Mark server as connected after successful initialization
            serverState.connected = true;
            console.log(`[MCPServerManager] ${serverState.name} fully initialized and connected`);

            return serverState;
        } catch (error) {
            console.error(`[MCPServerManager] Failed to initialize ${serverState.name}:`, error);
            throw error;
        }
    }

    async sendRequest(serverState, method, params = {}) {
        return new Promise((resolve, reject) => {
            const requestId = ++this.requestCounter;
            
            const message = {
                jsonrpc: '2.0',
                id: requestId,
                method: method,
                params: params
            };

            // Store pending request
            this.pendingRequests.set(requestId, { resolve, reject });

            // Send message to server
            const messageStr = JSON.stringify(message) + '\n';
            serverState.process.stdin.write(messageStr);

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`Request timeout for ${method}`));
                }
            }, 30000); // 30 second timeout
        });
    }

    async sendNotification(serverState, method, params = {}) {
        const message = {
            jsonrpc: '2.0',
            method: method,
            params: params
        };

        const messageStr = JSON.stringify(message) + '\n';
        serverState.process.stdin.write(messageStr);
    }

    async callTool(serverName, toolName, arguments_) {
        const serverState = this.servers.get(serverName);
        if (!serverState) {
            throw new Error(`Server ${serverName} not running`);
        }

        if (!serverState.connected) {
            throw new Error(`Server ${serverName} not connected`);
        }

        // Find the tool
        const tool = serverState.tools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found on server ${serverName}`);
        }

        try {
            console.log(`[MCPServerManager] Calling tool ${toolName} on ${serverName}...`);
            
            const response = await this.sendRequest(serverState, 'tools/call', {
                name: toolName,
                arguments: arguments_
            });

            console.log(`[MCPServerManager] Tool ${toolName} completed successfully`);
            return response;
        } catch (error) {
            console.error(`[MCPServerManager] Tool ${toolName} failed:`, error);
            throw error;
        }
    }

    async getResource(serverName, uri) {
        const serverState = this.servers.get(serverName);
        if (!serverState) {
            throw new Error(`Server ${serverName} not running`);
        }

        try {
            const response = await this.sendRequest(serverState, 'resources/read', { uri });
            return response;
        } catch (error) {
            console.error(`[MCPServerManager] Failed to get resource ${uri}:`, error);
            throw error;
        }
    }

    async stopServer(serverName) {
        const serverState = this.servers.get(serverName);
        if (!serverState) {
            console.log(`[MCPServerManager] Server ${serverName} not running`);
            return;
        }

        try {
            console.log(`[MCPServerManager] Stopping ${serverName} server...`);
            
            // Send shutdown notification if connected
            if (serverState.connected) {
                await this.sendNotification(serverState, 'notifications/shutdown');
            }

            // Kill the process
            serverState.process.kill('SIGTERM');
            
            // Remove from our tracking
            this.servers.delete(serverName);
            this.serverConfigs.delete(serverName);
            
            console.log(`[MCPServerManager] ✅ ${serverName} server stopped`);
        } catch (error) {
            console.error(`[MCPServerManager] Error stopping ${serverName}:`, error);
            // Force kill if graceful shutdown fails
            serverState.process.kill('SIGKILL');
            this.servers.delete(serverName);
        }
    }

    async stopAllServers() {
        const serverNames = Array.from(this.servers.keys());
        await Promise.all(serverNames.map(name => this.stopServer(name)));
    }

    getRunningServers() {
        return Array.from(this.servers.keys());
    }

    getServerInfo(serverName) {
        const serverState = this.servers.get(serverName);
        if (!serverState) {
            return null;
        }

        return {
            name: serverName,
            connected: serverState.connected,
            tools: serverState.tools,
            resources: serverState.resources,
            prompts: serverState.prompts,
            capabilities: serverState.capabilities
        };
    }

    getAllAvailableServers() {
        return Object.keys(this.availableServers).map(name => ({
            name,
            ...this.availableServers[name]
        }));
    }

    // Get all available tools across all running servers
    getAllAvailableTools() {
        const tools = [];
        for (const [serverName, serverState] of this.servers) {
            if (serverState.connected && serverState.tools) {
                serverState.tools.forEach(tool => {
                    tools.push({
                        ...tool,
                        serverName,
                        fullName: `${serverName}.${tool.name}`
                    });
                });
            }
        }
        return tools;
    }

    // Auto-determine which server to use for a tool call
    async autoCallTool(toolName, arguments_) {
        // First try exact match
        for (const [serverName, serverState] of this.servers) {
            if (serverState.connected && serverState.tools) {
                const tool = serverState.tools.find(t => t.name === toolName);
                if (tool) {
                    return await this.callTool(serverName, toolName, arguments_);
                }
            }
        }

        // If no exact match, throw error with suggestions
        const availableTools = this.getAllAvailableTools();
        const suggestions = availableTools.filter(t => 
            t.name.includes(toolName) || toolName.includes(t.name)
        ).map(t => t.fullName);

        throw new Error(`Tool '${toolName}' not found. Available tools: ${availableTools.map(t => t.fullName).join(', ')}${suggestions.length ? `. Did you mean: ${suggestions.join(', ')}?` : ''}`);
    }
}

module.exports = MCPServerManager; 