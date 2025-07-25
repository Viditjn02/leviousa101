class MCPSettings {
    constructor() {
        this.isLoading = false;
        this.servers = {};
        this.availableTools = {};
        
        this.initializeEventListeners();
        this.loadServerStatus();
    }

    initializeEventListeners() {
        // Listen for MCP server updates
        if (window.electronAPI && window.electronAPI.on) {
            window.electronAPI.on('mcp:servers-updated', (status) => {
                console.log('[MCPSettings] Servers updated:', status);
                this.updateServerStatus(status);
            });
        }

        // Add click handlers for buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.mcp-start-server')) {
                const serverName = e.target.dataset.server;
                this.startServer(serverName);
            } else if (e.target.matches('.mcp-stop-server')) {
                const serverName = e.target.dataset.server;
                this.stopServer(serverName);
            } else if (e.target.matches('.mcp-test-connection')) {
                const serverName = e.target.dataset.server;
                this.testConnection(serverName);
            } else if (e.target.matches('.mcp-refresh-status')) {
                this.loadServerStatus();
            } else if (e.target.matches('.mcp-test-tool')) {
                const toolName = e.target.dataset.tool;
                this.testTool(toolName);
            }
        });
    }

    async loadServerStatus() {
        try {
            this.isLoading = true;
            this.updateUI();

            const response = await window.electronAPI.invoke('mcp:getServerStatus');
            if (response.success) {
                this.servers = response.status;
                console.log('[MCPSettings] Server status loaded:', this.servers);
            } else {
                console.error('[MCPSettings] Failed to load server status:', response.error);
                this.showError('Failed to load server status: ' + response.error);
            }

            // Load available tools
            const toolsResponse = await window.electronAPI.invoke('mcp:getAllAvailableTools');
            if (toolsResponse.success) {
                this.availableTools = toolsResponse.tools;
                console.log('[MCPSettings] Available tools loaded:', this.availableTools);
            }

        } catch (error) {
            console.error('[MCPSettings] Error loading server status:', error);
            this.showError('Error loading server status');
        } finally {
            this.isLoading = false;
            this.updateUI();
        }
    }

    updateServerStatus(status) {
        this.servers = status;
        this.updateUI();
    }

    async startServer(serverName) {
        try {
            console.log(`[MCPSettings] Starting server: ${serverName}`);
            this.showLoading(`Starting ${serverName} server...`);

            const response = await window.electronAPI.invoke('mcp:startServer', serverName);
            if (response.success) {
                this.showSuccess(`${serverName} server started successfully`);
                // Status will be updated via event
            } else {
                this.showError(`Failed to start ${serverName}: ${response.error}`);
            }
        } catch (error) {
            console.error(`[MCPSettings] Error starting server ${serverName}:`, error);
            this.showError(`Error starting ${serverName}`);
        }
    }

    async stopServer(serverName) {
        try {
            console.log(`[MCPSettings] Stopping server: ${serverName}`);
            this.showLoading(`Stopping ${serverName} server...`);

            const response = await window.electronAPI.invoke('mcp:stopServer', serverName);
            if (response.success) {
                this.showSuccess(`${serverName} server stopped successfully`);
                // Status will be updated via event
            } else {
                this.showError(`Failed to stop ${serverName}: ${response.error}`);
            }
        } catch (error) {
            console.error(`[MCPSettings] Error stopping server ${serverName}:`, error);
            this.showError(`Error stopping ${serverName}`);
        }
    }

    async testConnection(serverName) {
        try {
            console.log(`[MCPSettings] Testing connection to: ${serverName}`);
            this.showLoading(`Testing ${serverName} connection...`);

            const response = await window.electronAPI.invoke('mcp:testConnection', serverName);
            if (response.success) {
                this.showSuccess(`${serverName} connection test successful`);
                if (response.result) {
                    console.log(`[MCPSettings] Test result:`, response.result);
                }
            } else {
                this.showError(`${serverName} connection test failed: ${response.error}`);
            }
        } catch (error) {
            console.error(`[MCPSettings] Error testing connection to ${serverName}:`, error);
            this.showError(`Error testing ${serverName} connection`);
        }
    }

    async testTool(toolName) {
        try {
            console.log(`[MCPSettings] Testing tool: ${toolName}`);
            this.showLoading(`Testing ${toolName} tool...`);

            // Use appropriate test arguments based on tool
            let testArgs = {};
            if (toolName === 'get_current_time') {
                testArgs = {};
            } else if (toolName === 'store_memory') {
                testArgs = { content: 'Test memory entry from MCP settings', tags: ['test'] };
            } else if (toolName === 'fetch_url') {
                testArgs = { url: 'https://httpbin.org/json' };
            }

            const response = await window.electronAPI.invoke('mcp:callTool', toolName, testArgs);
            if (response.success) {
                this.showSuccess(`${toolName} tool test successful`);
                console.log(`[MCPSettings] Tool result:`, response.result);
                
                // Show result in UI if it's meaningful
                if (response.result && response.result.content) {
                    this.showToolResult(toolName, response.result.content);
                }
            } else {
                this.showError(`${toolName} tool test failed: ${response.error}`);
            }
        } catch (error) {
            console.error(`[MCPSettings] Error testing tool ${toolName}:`, error);
            this.showError(`Error testing ${toolName} tool`);
        }
    }

    updateUI() {
        const container = document.getElementById('mcp-settings-container');
        if (!container) return;

        container.innerHTML = this.generateHTML();
    }

    generateHTML() {
        if (this.isLoading) {
            return `
                <div class="mcp-loading">
                    <div class="spinner"></div>
                    <p>Loading MCP server status...</p>
                </div>
            `;
        }

        const runningServers = this.servers.running || [];
        const availableServers = this.servers.available || [];
        const totalTools = this.servers.totalTools || 0;

        return `
            <div class="mcp-settings">
                <div class="mcp-header">
                    <h3>🔌 MCP Server Connections</h3>
                    <button class="mcp-refresh-status btn-secondary">
                        <span class="icon">🔄</span> Refresh Status
                    </button>
                </div>

                <div class="mcp-overview">
                    <div class="stat-card">
                        <span class="stat-number">${runningServers.length}</span>
                        <span class="stat-label">Running Servers</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${totalTools}</span>
                        <span class="stat-label">Available Tools</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${availableServers.length}</span>
                        <span class="stat-label">Total Servers</span>
                    </div>
                </div>

                <div class="mcp-servers">
                    <h4>Available MCP Servers</h4>
                    <div class="server-grid">
                        ${availableServers.map(server => this.generateServerCard(server)).join('')}
                    </div>
                </div>

                ${this.generateToolsSection()}
                
                <div class="mcp-status-log" id="mcp-status-log"></div>
            </div>
        `;
    }

    generateServerCard(server) {
        const runningServer = this.servers.running?.find(rs => rs.name === server.name);
        const isRunning = !!runningServer;
        const isConnected = runningServer?.info?.connected || false;

        return `
            <div class="server-card ${isRunning ? 'running' : ''} ${isConnected ? 'connected' : ''}">
                <div class="server-header">
                    <h5>${server.name}</h5>
                    <div class="server-status">
                        <span class="status-dot ${isRunning ? 'running' : 'stopped'}"></span>
                        <span class="status-text">${isRunning ? (isConnected ? 'Connected' : 'Starting') : 'Stopped'}</span>
                    </div>
                </div>
                
                <p class="server-description">${server.description}</p>
                
                <div class="server-tools">
                    <small><strong>Tools:</strong> ${server.tools?.join(', ') || 'Loading...'}</small>
                </div>

                <div class="server-actions">
                    ${isRunning ? `
                        <button class="mcp-stop-server btn-danger" data-server="${server.name}">
                            <span class="icon">⏹️</span> Stop
                        </button>
                        ${isConnected ? `
                            <button class="mcp-test-connection btn-secondary" data-server="${server.name}">
                                <span class="icon">🔍</span> Test
                            </button>
                        ` : ''}
                    ` : `
                        <button class="mcp-start-server btn-primary" data-server="${server.name}">
                            <span class="icon">▶️</span> Start
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    generateToolsSection() {
        if (!this.availableTools || this.availableTools.total === 0) {
            return '<div class="no-tools"><p>No tools available. Start some MCP servers to see available tools.</p></div>';
        }

        const externalTools = this.availableTools.external || [];
        const researchTools = this.availableTools.research || [];

        return `
            <div class="mcp-tools">
                <h4>Available Tools (${this.availableTools.total})</h4>
                
                ${externalTools.length > 0 ? `
                    <div class="tool-category">
                        <h5>External Tools (${externalTools.length})</h5>
                        <div class="tool-grid">
                            ${externalTools.map(tool => this.generateToolCard(tool)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${researchTools.length > 0 ? `
                    <div class="tool-category">
                        <h5>Research Tools (${researchTools.length})</h5>
                        <div class="tool-grid">
                            ${researchTools.map(tool => this.generateToolCard(tool, true)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateToolCard(tool, isResearch = false) {
        return `
            <div class="tool-card ${isResearch ? 'research' : 'external'}">
                <div class="tool-header">
                    <h6>${tool.name}</h6>
                    ${!isResearch ? `<span class="tool-server">${tool.serverName}</span>` : ''}
                </div>
                
                <p class="tool-description">${tool.description || 'No description available'}</p>
                
                <div class="tool-actions">
                    <button class="mcp-test-tool btn-secondary" data-tool="${tool.name}">
                        <span class="icon">🧪</span> Test
                    </button>
                </div>
            </div>
        `;
    }

    showLoading(message) {
        this.updateStatusLog('loading', message);
    }

    showSuccess(message) {
        this.updateStatusLog('success', message);
    }

    showError(message) {
        this.updateStatusLog('error', message);
    }

    showToolResult(toolName, result) {
        const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : result;
        this.updateStatusLog('info', `${toolName} result: ${resultStr}`);
    }

    updateStatusLog(type, message) {
        const log = document.getElementById('mcp-status-log');
        if (!log) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <span class="message">${message}</span>
        `;

        log.appendChild(logEntry);
        log.scrollTop = log.scrollHeight;

        // Keep only last 10 entries
        while (log.children.length > 10) {
            log.removeChild(log.firstChild);
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('mcp-settings-container')) {
            window.mcpSettings = new MCPSettings();
        }
    });
} else {
    if (document.getElementById('mcp-settings-container')) {
        window.mcpSettings = new MCPSettings();
    }
} 