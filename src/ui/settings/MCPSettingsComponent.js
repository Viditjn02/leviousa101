import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import { unsafeSVG } from 'lit-html/directives/unsafe-svg.js';

export class MCPSettingsComponent extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
            max-width: 480px;
            box-sizing: border-box;
            margin: 0 auto;
        }
        .mcp-settings {
            padding: 16px;
            /* Inner padding; host controls width */
        }

        .mcp-header {
            margin-bottom: 20px;
            text-align: center;
        }

        .mcp-header h3 {
            color: var(--text-primary, #ffffff);
            margin-bottom: 10px;
            font-size: 1.3em;
        }

        .mcp-header p {
            color: var(--text-secondary, #a0a0a0);
            font-size: 0.9em;
        }

        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-bottom: 16px;
        }

        .service-card {
            width: 100%;
            box-sizing: border-box;
            background: var(--background-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.2s ease;
            min-height: 56px;
        }

        .service-card:hover {
            border-color: var(--accent-color, #4a90e2);
            transform: translateY(-1px);
        }

        .service-info {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }

        .service-logo {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            padding: 4px;
        }

        .service-logo svg {
            width: 16px;
            height: 16px;
        }

        /* Added logo image styling */
        .service-logo__img {
            width: 16px;
            height: 16px;
            object-fit: contain;
        }

        .service-logo__emoji {
            display: none;
            font-size: 16px;
        }

        .service-details h4 {
            color: var(--text-primary, #ffffff);
            margin: 0 0 2px 0;
            font-size: 0.9em;
            font-weight: 600;
        }

        .service-status {
            font-size: 0.75em;
            opacity: 0.7;
        }

        .service-status.connected {
            color: #28a745;
        }

        .service-status.authenticated {
            color: #17a2b8;
        }

        .service-status.connecting {
            color: #ffc107;
        }

        .service-status.needs_auth {
            color: #3498db;
            font-weight: 500;
        }

        .service-status.disconnected {
            color: #6c757d;
        }

        /* Toggle Switch Styles */
        .toggle-switch {
            position: relative;
            width: 44px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #333;
            transition: 0.3s;
            border-radius: 24px;
            border: 1px solid #555;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: #aaa;
            transition: 0.3s;
            border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
            background-color: #4CAF50;
            border-color: #4CAF50;
        }

        .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(18px);
            background-color: white;
        }

        .toggle-switch input:disabled + .toggle-slider {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .toggle-switch.connecting .toggle-slider {
            background-color: #ffc107;
            border-color: #ffc107;
        }

        .toggle-switch.connecting .toggle-slider:before {
            animation: pulse 1.5s infinite;
        }

        .toggle-switch.needs-auth .toggle-slider {
            background-color: #3498db20;
            border: 1px solid #3498db;
        }

        .toggle-switch.needs-auth .toggle-slider:before {
            background-color: #3498db;
        }

        .toggle-switch.needs-auth:hover .toggle-slider {
            background-color: #3498db40;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        /* Paragon Services Grid Layout */
        .services-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin-top: 16px;
        }

        .service-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: var(--background-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            transition: all 0.2s ease;
        }

        .service-card:hover {
            background: var(--background-hover, #353535);
            border-color: var(--accent-color, #4a90e2);
        }

        .service-card.needs-auth {
            border-color: #3498db;
            background: rgba(52, 152, 219, 0.1);
        }

        /* More Services Section */
        .more-services {
            margin-bottom: 20px;
        }

        .more-services summary {
            font-size: 1.1em;
            font-weight: 600;
            color: var(--text-primary, #ffffff);
            margin-bottom: 8px;
            cursor: default;
            padding: 0;
            list-style: none;
        }

        .more-services summary::-webkit-details-marker {
            display: none;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: var(--text-secondary, #a0a0a0);
        }

        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 2px solid #333;
            border-top: 2px solid var(--accent-color, #4a90e2);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 0.9em;
        }

        .message.success {
            background: rgba(40, 167, 69, 0.2);
            border: 1px solid #28a745;
            color: #28a745;
        }

        .message.error {
            background: rgba(220, 53, 69, 0.2);
            border: 1px solid #dc3545;
            color: #dc3545;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: var(--background-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
            margin-bottom: 16px;
        }

        .header:hover {
            background: var(--background-hover, #353535);
        }

        .title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            color: var(--text-primary, #ffffff);
        }

        .expand-icon {
            color: var(--text-secondary, #a0a0a0);
            transition: transform 0.2s;
            font-size: 0.8em;
        }

        .expand-icon.expanded {
            transform: rotate(90deg);
        }

        .content {
            max-height: 0;
            opacity: 0;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .content.expanded {
            max-height: none;
            opacity: 1;
            overflow: visible;
        }

        .stats-summary {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            font-size: 0.85em;
        }

        .stat-item {
            color: var(--text-secondary, #a0a0a0);
        }

        .stat-value {
            color: var(--text-primary, #ffffff);
            font-weight: 600;
        }

        .refresh-btn {
            background: var(--background-secondary, #3a3a3a);
            border: 1px solid var(--border-color, #555);
            color: var(--text-primary, #ffffff);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75em;
            transition: background-color 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
            background: var(--background-hover, #4a4a4a);
        }

        .refresh-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .stuck-btn {
            background: var(--warning-color, #ff9800) !important;
            border-color: var(--warning-color, #ff9800) !important;
            margin-left: 4px;
        }

        .stuck-btn:hover:not(:disabled) {
            background: var(--warning-color-hover, #f57c00) !important;
        }
        
        .more-services {
            margin-top: 20px;
            background: var(--background-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            padding: 16px;
        }
        
        .more-services summary {
            cursor: pointer;
            font-weight: 600;
            color: var(--text-primary, #ffffff);
            margin-bottom: 12px;
            user-select: none;
        }
        
        .more-services[open] summary {
            margin-bottom: 16px;
        }
        
        .service-card.coming-soon {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .service-card.coming-soon .toggle-switch {
            cursor: not-allowed;
        }
        
        .coming-soon-badge {
            background: var(--accent-color, #4a90e2);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.7em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .add-custom-btn {
            width: 100%;
            margin-top: 16px;
            padding: 12px;
            background: var(--background-secondary, #2a2a2a);
            border: 2px dashed var(--border-color, #555);
            border-radius: 8px;
            color: var(--text-primary, #ffffff);
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 600;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .add-custom-btn:hover {
            background: var(--background-hover, #353535);
            border-color: var(--accent-color, #4a90e2);
            transform: translateY(-1px);
        }
    `;

    static properties = {
        isLoading: { type: Boolean },
        isExpanded: { type: Boolean },
        servers: { type: Object },
        availableTools: { type: Array },
        supportedServices: { type: Object },
        disabledServices: { type: Object },
        authenticationStatus: { type: Object },
        errorMessage: { type: String },
        successMessage: { type: String },
        connectingServices: { type: Set },
        connectingTimeouts: { type: Map }
    };

    constructor() {
        super();
        this.isLoading = true;
        this.isExpanded = false;
        this.servers = {};
        this.availableTools = [];
        this.supportedServices = {};
        this.disabledServices = {}; // Initialize disabledServices
        this.authenticationStatus = {
            pendingAuthentications: [],
            configurationIssues: [],
            hasValidConfig: false
        };
        this.errorMessage = '';
        this.successMessage = '';
        this.connectingServices = new Set();
        this.connectingTimeouts = new Map(); // Track when services started connecting
        this.authPollingIntervals = new Map(); // Track polling intervals for auth completion
        this._iconSvgs = {}; // Cache for dynamically loaded brand SVGs
        
        // Load the ParagonServices utility for dynamic service configuration
        this.loadParagonServicesUtility();
        
        this.loadServerStatus();
        this.loadSupportedServices();
        
        // Load authentication status on startup with retry mechanism
        this.initializeParagonStatus();
        this.setupEventListeners();
        
        // Set up periodic cleanup of stuck connecting states
        this.setupPeriodicCleanup();
    }

    // Initialize Paragon status with retry mechanism for timing issues
    async initializeParagonStatus() {
        console.log('[MCPSettings] 🚀 Initializing Paragon status with retry mechanism...');
        
        let retryCount = 0;
        const maxRetries = 5;
        const retryDelay = 1000; // 1 second
        
        const tryLoadStatus = async () => {
            try {
                console.log(`[MCPSettings] 🔄 Attempt ${retryCount + 1}/${maxRetries} to load Paragon status...`);
                await this.loadParagonServiceStatus();
                
                // Check if we actually got authentication data
                const hasAuthData = Object.keys(this.paragonServiceStatus || {}).length > 0;
                console.log(`[MCPSettings] 📊 Paragon status loaded, hasAuthData: ${hasAuthData}`);
                
                if (hasAuthData) {
                    console.log('[MCPSettings] ✅ Successfully loaded Paragon authentication status on startup');
                    console.log('[MCPSettings] 🔄 Forcing comprehensive UI update...');
                    
                    // Force multiple UI updates to ensure the change is reflected
                    this.requestUpdate();
                    
                    // Also trigger a delayed update in case the first one doesn't work
                    setTimeout(() => {
                        console.log('[MCPSettings] 🔄 Secondary UI update after successful auth load...');
                        this.requestUpdate();
                        this.performUpdate();
                    }, 100);
                    
                    return true;
                } else if (retryCount < maxRetries - 1) {
                    console.log(`[MCPSettings] ⏳ No auth data yet, retrying in ${retryDelay}ms...`);
                    retryCount++;
                    setTimeout(tryLoadStatus, retryDelay);
                } else {
                    console.log('[MCPSettings] ⚠️ Max retries reached, proceeding without initial auth status');
                }
            } catch (error) {
                console.error(`[MCPSettings] ❌ Error loading Paragon status on attempt ${retryCount + 1}:`, error);
                if (retryCount < maxRetries - 1) {
                    retryCount++;
                    setTimeout(tryLoadStatus, retryDelay);
                } else {
                    console.log('[MCPSettings] ❌ Max retries reached, failed to load initial auth status');
                }
            }
        };
        
        // Start the first attempt immediately
        tryLoadStatus();
    }

    async loadParagonServicesUtility() {
        try {
            // Load the ParagonServices utility script
            if (!window.ParagonServices) {
                const script = document.createElement('script');
                script.src = '../utils/paragonServices.js';
                script.onload = () => {
                    console.log('ParagonServices utility loaded successfully');
                    this.requestUpdate(); // Trigger re-render with dynamic services
                };
                script.onerror = (error) => {
                    console.warn('Failed to load ParagonServices utility:', error);
                };
                document.head.appendChild(script);
            }
        } catch (error) {
            console.warn('Error loading ParagonServices utility:', error);
        }
    }

    setupEventListeners() {
        window.api?.mcp?.onServersUpdated((event, data) => {
            console.log('[MCPSettings] Servers updated event received:', data);
            this.loadServerStatus();
        });

        window.api?.mcp?.onAuthStatusUpdated((event, data) => {
            console.log('[MCPSettings] Auth status updated event received:', data);
            this.loadAuthenticationStatus();
            this.loadParagonServiceStatus(); // Also refresh Paragon service authentication status
            if (data.success) {
                this.showSuccess('Connected successfully!');
                // Remove from connecting state - clear all since we don't know which service completed
                this.connectingServices.clear();
                // Force a full reload to get the latest status
                setTimeout(async () => {
                    await this.loadServerStatus();
                    await this.loadParagonServiceStatus(); // Ensure Paragon status is refreshed after delay too
                    this.requestUpdate();
                }, 500); // Small delay to ensure backend state is updated
            }
        });
    }

    async loadServerStatus() {
        try {
            this.isLoading = true;
            const result = await window.api?.mcp?.getServerStatus();
            
            if (result?.error) {
                this.errorMessage = result.error;
                return;
            }

            // Handle the backend response structure properly
            const serverData = result?.servers || {};
            
            // If the response has the new structure with 'running' array, transform it
            if (result?.running && Array.isArray(result.running)) {
                this.servers = {};
                result.running.forEach(server => {
                    if (server.name && server.info) {
                        this.servers[server.name] = {
                            connected: server.info.connected || false,
                            tools: server.info.tools || [],
                            resources: server.info.resources || [],
                            prompts: server.info.prompts || [],
                            capabilities: server.info.capabilities || {}
                        };
                    }
                });
                
                // Add remote services from the servers property
                if (result.servers) {
                    Object.assign(this.servers, result.servers);
                }
            } else {
                // Use the direct servers property (new format)
                this.servers = serverData;
            }
            
            this.availableTools = result?.tools || [];
            this.authenticationStatus = result?.authentication || {
                pendingAuthentications: [],
                configurationIssues: [],
                hasValidConfig: false
            };
            
            // Debug logging to understand the state
            console.log('[MCPSettings] Loaded server status:', {
                rawResponse: result,
                transformedServers: this.servers,
                authenticationStatus: this.authenticationStatus,
                availableTools: Array.isArray(this.availableTools) ? this.availableTools.length : this.availableTools
            });
            
        } catch (error) {
            this.errorMessage = error.message;
            console.error('[MCPSettings] Error loading server status:', error);
        } finally {
            this.isLoading = false;
            this.requestUpdate();
        }
    }

    async loadSupportedServices() {
        try {
            console.log('[MCPSettings] 🔍 Starting loadSupportedServices...');
            console.log('[MCPSettings] 🔍 API available:', !!window.api);
            console.log('[MCPSettings] 🔍 MCP API available:', !!window.api?.mcp);
            console.log('[MCPSettings] 🔍 getRegistryServices available:', !!window.api?.mcp?.getRegistryServices);
            
            // Load services from the registry
            const registry = await window.api?.mcp?.getRegistryServices();
            console.log('[MCPSettings] 📡 Registry response:', registry);
            console.log('[MCPSettings] 📡 Registry has services:', !!(registry && registry.services));
            
            if (registry && registry.services) {
                // Separate enabled and disabled services
                const allServices = Object.entries(registry.services)
                    .filter(([key, service]) => {
                        // If unified Google service is present, hide individual Google provider entries
                        if (registry.services['google'] && service.oauth && service.oauth.provider === 'google' && key !== 'google') {
                            return false;
                        }
                        return true;
                    });
                console.log('[MCPSettings] 📊 All services from registry:', allServices.length);
                console.log('[MCPSettings] 📊 Service keys:', allServices.map(([key]) => key));
                
                // Exclude all disabled integrations except Paragon (as we decided to use Paragon instead)
                const excludedServices = [
                    'slack', 'discord', 'github', 'linkedin', 'notion',
                    'google', 'google-drive', 'google-docs', 'gmail', 
                    'google-calendar', 'google-sheets', 'google-tasks'
                ];
                const enabledServicesList = allServices.filter(([key]) => !excludedServices.includes(key));
                
                console.log('[MCPSettings] 📊 Enabled services after filtering:', enabledServicesList.length);
                console.log('[MCPSettings] 📊 Enabled service keys:', enabledServicesList.map(([key]) => key));

                this.supportedServices = {};
                
                enabledServicesList.forEach(([key, service]) => {
                    this.supportedServices[key] = {
                        ...service,
                        id: key,
                        displayName: service.name || this.formatDisplayName(key),
                        isEnabled: service.enabled || false,
                        status: 'disconnected', // Will be updated by server status
                        authProvider: service.authProvider || service.oauth?.provider
                    };
                });
                
                console.log('[MCPSettings] 📊 Final supportedServices:', Object.keys(this.supportedServices));
                console.log('[MCPSettings] 📊 supportedServices data:', this.supportedServices);
            }
            
            // Load Paragon service status - individual service authentication status
            await this.loadParagonServiceStatus();
            
        } catch (error) {
            console.error('[MCPSettings] ❌ Error loading supported services:', error);
            this.errorMessage = 'Failed to load supported services: ' + error.message;
        }
    }

    // Add polling mechanism to detect authentication completion
    startAuthenticationPolling(serviceKey, userId) {
        console.log(`[MCPSettings] 🔄 Starting authentication polling for ${serviceKey} with user ID: ${userId}`);
        
        // Store polling info
        if (!this.authPollingIntervals) {
            this.authPollingIntervals = new Map();
        }
        
        // Clear any existing polling for this service
        if (this.authPollingIntervals.has(serviceKey)) {
            clearInterval(this.authPollingIntervals.get(serviceKey));
        }
        
        // Start polling every 3 seconds
        const pollInterval = setInterval(async () => {
            try {
                console.log(`[MCPSettings] 🔍 Polling authentication status for ${serviceKey}...`);
                
                // Refresh both server status and Paragon status
                await this.loadServerStatus();
                await this.loadParagonServiceStatus();
                
                // Check if the service is now authenticated
                const service = this.supportedServices[serviceKey];
                if (service && service.status === 'connected') {
                    console.log(`[MCPSettings] ✅ ${serviceKey} authentication completed successfully!`);
                    
                    // Clear polling
                    clearInterval(pollInterval);
                    this.authPollingIntervals.delete(serviceKey);
                    
                    // Remove from connecting state
                    this.connectingServices.delete(serviceKey);
                    this.connectingTimeouts.delete(serviceKey);
                    
                    // Show success message
                    this.showSuccess(`${service.name || serviceKey} connected successfully!`);
                    this.requestUpdate();
                    
                    return;
                }
                
                console.log(`[MCPSettings] ⏳ ${serviceKey} still not authenticated, continuing polling...`);
                
            } catch (error) {
                console.error(`[MCPSettings] ❌ Error during authentication polling for ${serviceKey}:`, error);
            }
        }, 3000); // Poll every 3 seconds
        
        // Store the interval for cleanup
        this.authPollingIntervals.set(serviceKey, pollInterval);
        
        // Stop polling after 90 seconds (timeout)
        setTimeout(() => {
            if (this.authPollingIntervals.has(serviceKey)) {
                console.log(`[MCPSettings] ⏰ Authentication polling timeout for ${serviceKey}`);
                clearInterval(pollInterval);
                this.authPollingIntervals.delete(serviceKey);
                
                if (this.connectingServices.has(serviceKey)) {
                    this.connectingServices.delete(serviceKey);
                    this.connectingTimeouts.delete(serviceKey);
                    this.showError(`Authentication timeout for ${serviceKey}. Please try again.`);
                    this.requestUpdate();
                }
            }
        }, 90000); // 90 second timeout
    }
    
    // New method to load Paragon individual service authentication status
    async loadParagonServiceStatus() {
        try {
            console.log('[MCPSettings] 🔄 Starting loadParagonServiceStatus...');
            console.log('[MCPSettings] 🔍 Current supportedServices keys:', Object.keys(this.supportedServices || {}));
            
            const paragonResult = await window.api?.mcp?.getParagonServiceStatus();
            console.log('[MCPSettings] 🚀 Raw Paragon service status result:', paragonResult);
            
            // Extract services from the backend response structure { success: true, services: {...} }
            const paragonServices = paragonResult?.services || {};
            console.log('[MCPSettings] 🚀 Extracted Paragon services:', paragonServices);
            console.log('[MCPSettings] 🔍 Paragon services keys:', Object.keys(paragonServices));
            
            // Store the Paragon service status for authentication checking
            this.paragonServiceStatus = paragonServices;
            console.log('[MCPSettings] 💾 Stored paragonServiceStatus:', this.paragonServiceStatus);
            
            // Update our service status based on Paragon authentication
            if (paragonServices && typeof paragonServices === 'object') {
                const updatedServices = [];
                Object.entries(paragonServices).forEach(([serviceKey, status]) => {
                    console.log(`[MCPSettings] 🔍 Processing service ${serviceKey}:`, status);
                    console.log(`[MCPSettings] 🔍 Checking if ${serviceKey} exists in supportedServices:`, !!this.supportedServices[serviceKey]);
                    
                    if (this.supportedServices[serviceKey]) {
                        const oldStatus = this.supportedServices[serviceKey].status;
                        const newStatus = status.authenticated ? 'connected' : 'needs_auth';
                        
                        this.supportedServices[serviceKey].status = newStatus;
                        this.supportedServices[serviceKey].toolsCount = status.toolsCount || 0;
                        
                        console.log(`[MCPSettings] ✅ Updated ${serviceKey}: ${oldStatus} -> ${newStatus} (tools: ${status.toolsCount || 0})`);
                        updatedServices.push({ service: serviceKey, oldStatus, newStatus, authenticated: status.authenticated });
                    } else {
                        console.log(`[MCPSettings] ⚠️ Service ${serviceKey} not found in supportedServices`);
                        console.log(`[MCPSettings] 🔍 Available supportedServices:`, Object.keys(this.supportedServices || {}));
                    }
                });
                
                console.log('[MCPSettings] 📊 Summary of updated services:', updatedServices);
            } else {
                console.log('[MCPSettings] ⚠️ No valid paragonServices object received');
            }
            
            // Force UI update with comprehensive refresh
            console.log('[MCPSettings] 🔄 Triggering comprehensive UI update...');
            this.requestUpdate();
            
            // Also force property update to ensure LitElement re-renders
            this.paragonServiceStatus = { ...this.paragonServiceStatus };
            
            // Trigger another update after a brief delay to ensure it takes effect
            setTimeout(() => {
                console.log('[MCPSettings] 🔄 Secondary UI refresh after Paragon status load...');
                this.requestUpdate();
                this.performUpdate();
            }, 50);
            
            console.log('[MCPSettings] ✅ loadParagonServiceStatus completed');
            
        } catch (error) {
            console.error('[MCPSettings] ❌ Error in loadParagonServiceStatus:', error);
            console.error('[MCPSettings] ❌ Error stack:', error.stack);
            this.paragonServiceStatus = {};
            throw error; // Re-throw so retry mechanism can catch it
        }
    }

    async loadAuthenticationStatus() {
        try {
            const status = await window.api?.mcp?.getAuthenticationStatus();
            this.authenticationStatus = status || {
                pendingAuthentications: [],
                configurationIssues: [],
                hasValidConfig: false
            };
            this.requestUpdate();
        } catch (error) {
            console.error('Failed to load authentication status:', error);
        }
    }

    async toggleService(serviceName) {
        const isConnected = this.isServiceConnected(serviceName);
        
        if (isConnected) {
            // Disconnect service
            await this.disconnectService(serviceName);
        } else {
            // Connect service
            await this.connectService(serviceName);
        }
    }

    async connectService(serviceName) {
        try {
            this.connectingServices.add(serviceName);
            this.connectingTimeouts.set(serviceName, Date.now()); // Track when connection started
            this.clearMessages();
            this.requestUpdate();
            
            console.log(`[MCPSettings] Connecting to ${serviceName}...`);
            
            // For Paragon integrations, use Electron BrowserWindow (not external browser)
            const paragonServices = ['gmail', 'notion', 'slack', 'salesforce', 'hubspot', 'googledrive', 'dropbox', 'outlook'];
            if (paragonServices.includes(serviceName)) {
                // Get the current user ID from auth service
                const currentUser = await window.api.common.getCurrentUser();
                const userId = currentUser?.uid || 'default-user';
                
                console.log(`[MCPSettings] 🔑 Using user ID for ${serviceName}: ${userId}`);
                
                try {
                    // Use Electron BrowserWindow (not external browser) to maintain window.api access
                    console.log(`[MCPSettings] 🌐 Opening Electron BrowserWindow for ${serviceName} authentication`);
                    
                    // Use the existing Paragon authentication method that creates a BrowserWindow
                    const result = await window.api.mcp.paragon.authenticate(serviceName);
                    
                    if (result.success) {
                        this.showSuccess(`${serviceName} authentication window opened`);
                        // Track authentication with polling
                        this.startAuthenticationPolling(serviceName, userId);
                    } else {
                        throw new Error(result.error || 'Failed to open authentication window');
                    }
                } catch (browserError) {
                    console.error(`[MCPSettings] Failed to open Electron BrowserWindow:`, browserError);
                    this.showError(`Failed to open ${serviceName} authentication: ${browserError.message}`);
                    this.connectingServices.delete(serviceName);
                    this.requestUpdate();
                }
                
                return; // Skip the popup flow
            }
            
            const result = await window.api.mcp.setupExternalService(serviceName, 'oauth');
            console.log(`[MCPSettings] Setup result for ${serviceName}:`, result);
            
            if (result.requiresAuth) {
                // Service needs authentication - open auth URL
                if (result.authUrl) {
                    console.log(`[MCPSettings] Opening auth URL for ${serviceName}:`, result.authUrl);
                    await this.openAuthUrl(result.authUrl, result.provider, result.service);
                    // Note: Don't remove from connecting here - wait for auth completion
                } else {
                    this.showError(`${serviceName} requires authentication but no auth URL provided`);
                    this.connectingServices.delete(serviceName);
                    this.connectingTimeouts.delete(serviceName);
                }
            } else if (result.success) {
                this.showSuccess(`${serviceName} connected successfully!`);
                this.connectingServices.delete(serviceName);
                this.connectingTimeouts.delete(serviceName);
                // Reload server status to get the latest state
                await this.loadServerStatus();
            } else {
                this.showError(`Failed to connect ${serviceName}: ${result.error}`);
                this.connectingServices.delete(serviceName);
                this.connectingTimeouts.delete(serviceName);
            }
            
        } catch (error) {
            console.error(`[MCPSettings] Error connecting ${serviceName}:`, error);
            this.showError(`Error connecting ${serviceName}: ${error.message}`);
            this.connectingServices.delete(serviceName);
            this.connectingTimeouts.delete(serviceName);
        }
        
        this.requestUpdate();
    }

    async disconnectService(serviceName) {
        try {
            this.clearMessages();
            
            const result = await window.api?.mcp?.removeServer(serviceName);
            
            if (result.success) {
                this.showSuccess(`${serviceName} disconnected successfully`);
                await this.loadServerStatus();
            } else {
                this.showError(result.error || 'Failed to disconnect service');
            }
        } catch (error) {
            this.showError(error.message);
        }
    }

    async openAuthUrl(authUrl, provider, service) {
        try {
            console.log(`[MCPSettings] Opening OAuth window for ${provider}:${service}`);
            
            // SOLUTION: Detect known Paragon services by service name and use Electron BrowserWindow
            const paragonServices = ['gmail', 'notion', 'slack', 'salesforce', 'hubspot', 'googledrive', 'dropbox', 'outlook'];
            
            if (paragonServices.includes(service)) {
                console.log(`[MCPSettings] 🌐 Detected Paragon service ${service}, opening Electron BrowserWindow`);
                
                // Get the current user ID from auth service
                const currentUser = await window.api.common.getCurrentUser();
                const userId = currentUser?.uid || 'default-user';
                
                // Use Electron BrowserWindow (not external browser)
                try {
                    const result = await window.api.mcp.paragon.authenticate(service);
                    
                    if (result.success) {
                        console.log(`[MCPSettings] ✅ Opened ${service} authentication in Electron BrowserWindow`);
                        console.log(`[MCPSettings] 🔑 Using user ID: ${userId}`);
                        
                        // Show success message to user
                        this.showSuccess(`${service} authentication window opened`);
                        
                        // Start polling for authentication completion
                        this.startAuthenticationPolling(service, userId);
                        
                        return; // Skip the normal OAuth window flow
                    } else {
                        throw new Error(result.error || 'Failed to open authentication window');
                    }
                } catch (browserError) {
                    console.error(`[MCPSettings] Failed to open BrowserWindow, falling back to OAuth window:`, browserError);
                    // Fall through to normal OAuth window if browser fails
                }
            }
            
            const result = await window.api.mcp.openOAuthWindow(authUrl, provider, service);
            
            if (result.success) {
                console.log(`[MCPSettings] OAuth window opened successfully`);
                // Keep service in connecting state until OAuth completes
                
                // Set up a periodic check for authentication completion via Paragon
                // This is a fallback in case the auth status event doesn't fire
                const checkInterval = setInterval(async () => {
                    console.log(`[MCPSettings] Checking Paragon authentication status for ${service}...`);
                    await this.loadParagonServiceStatus();
                    
                    // Check if service is now authenticated via Paragon
                    const isAuthenticated = this.isServiceAuthenticated(service);
                    
                    if (isAuthenticated) {
                        console.log(`[MCPSettings] Paragon authentication completed for ${service}`);
                        this.connectingServices.delete(service);
                        this.requestUpdate();
                        clearInterval(checkInterval);
                    }
                }, 2000);
                
                // Clear the interval after 60 seconds to avoid infinite checking
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (this.connectingServices.has(service)) {
                        console.log(`[MCPSettings] Authentication timeout for ${service}`);
                        this.connectingServices.delete(service);
                        this.requestUpdate();
                    }
                }, 60000);
                
            } else {
                throw new Error(result.error || 'Failed to open OAuth window');
            }
            
        } catch (error) {
            console.error(`[MCPSettings] Failed to open auth URL:`, error);
            this.showError(`Failed to open authentication: ${error.message}`);
            this.connectingServices.delete(service);
            this.requestUpdate();
        }
    }

    isServiceConnected(serviceName) {
        // NEW: Check connection status via Paragon only
        // This replaces the old MCP server-based connection checking
        const hasCredentials = this.isServiceAuthenticated(serviceName);
        
        console.log(`[MCPSettings] Service ${serviceName} Paragon authentication status: ${hasCredentials}`);
        
        // For Paragon integrations, authenticated = connected
        return hasCredentials;
    }

    isServiceAuthenticated(serviceName) {
        // NEW: Check authentication status via Paragon only
        // This replaces the old MCP server-based authentication checking
        try {
            console.log(`[MCPSettings] 🔍 Checking authentication for service: "${serviceName}"`);
            console.log(`[MCPSettings] 🔍 Available paragonServiceStatus keys:`, Object.keys(this.paragonServiceStatus || {}));
            console.log(`[MCPSettings] 🔍 Full paragonServiceStatus:`, this.paragonServiceStatus);
            
            // Check if we have Paragon service status cached
            if (this.paragonServiceStatus && this.paragonServiceStatus[serviceName]) {
                const isAuthenticated = this.paragonServiceStatus[serviceName].authenticated === true;
                console.log(`[MCPSettings] ✅ Paragon authentication check for ${serviceName}: ${isAuthenticated}`);
                console.log(`[MCPSettings] 🔍 Service data:`, this.paragonServiceStatus[serviceName]);
                return isAuthenticated;
            }
            
            // If no Paragon status available, service is not authenticated
            console.log(`[MCPSettings] ❌ No Paragon status found for "${serviceName}", checking available keys...`);
            console.log(`[MCPSettings] 🔍 Available service keys: [${Object.keys(this.paragonServiceStatus || {}).join(', ')}]`);
            console.log(`[MCPSettings] 🔍 Requested service: "${serviceName}"`);
            
            // Check if it's a case sensitivity or naming issue
            const availableKeys = Object.keys(this.paragonServiceStatus || {});
            const lowerServiceName = serviceName.toLowerCase();
            const matchingKey = availableKeys.find(key => key.toLowerCase() === lowerServiceName);
            
            if (matchingKey) {
                console.log(`[MCPSettings] 🔄 Found case-insensitive match: "${serviceName}" -> "${matchingKey}"`);
                const isAuthenticated = this.paragonServiceStatus[matchingKey].authenticated === true;
                console.log(`[MCPSettings] ✅ Using case-insensitive match, authenticated: ${isAuthenticated}`);
                return isAuthenticated;
            }
            
            return false;
            
        } catch (error) {
            console.error(`[MCPSettings] ❌ Error checking Paragon authentication for ${serviceName}:`, error);
            console.error(`[MCPSettings] ❌ Error stack:`, error.stack);
            return false;
        }
    }

    isServiceConnecting(serviceName) {
        // NEW: Only check our internal connecting state (no old MCP auth status)
        return this.connectingServices.has(serviceName);
    }

    getServiceStatus(serviceName) {
        // NEW: Get service status via Paragon only
        // This replaces the old MCP server-based status checking
        const isConnecting = this.isServiceConnecting(serviceName);
        const hasCredentials = this.isServiceAuthenticated(serviceName);
        
        if (isConnecting) {
            return 'connecting';
        } else if (hasCredentials) {
            return 'connected'; // For Paragon, authenticated = connected
        } else {
            return 'disconnected';
        }
    }

    getServiceStatusText(status) {
        switch (status) {
            case 'connected': return 'Connected';
            case 'authenticated': return 'Authenticated';
            case 'connecting': return 'Connecting...';
            case 'needs_auth': return 'Click to Authenticate';
            case 'disconnected': return 'Not connected';
            default: return 'Unknown';
        }
    }

    getServiceLogo(serviceName) {
        const logos = {
            'google-drive': `<svg viewBox="0 0 24 24"><path fill="#4285f4" d="M6.4 5.7h13.2L24 12.8L16.8 24H7.2L0 12.8L6.4 5.7z"/><path fill="#34a853" d="M6.4 5.7L0 12.8L7.2 24L16.8 24L24 12.8L19.6 5.7H6.4z"/><path fill="#ea4335" d="M6.4 5.7L0 12.8L7.2 24L13.6 16.2L6.4 5.7z"/><path fill="#fbbc04" d="M19.6 5.7L24 12.8L16.8 24L10.4 16.2L19.6 5.7z"/></svg>`,
            'github': `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
            'notion': `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/></svg>`,
            'slack': `<svg viewBox="0 0 24 24"><path fill="#e01e5a" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"/><path fill="#36c5f0" d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/><path fill="#2eb67d" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"/><path fill="#ecb22e" d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/><path fill="#e01e5a" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"/><path fill="#36c5f0" d="M17.688 8.834a2.528 2.528 0 0 1-2.523-2.521 2.527 2.527 0 0 1 2.523-2.521A2.527 2.527 0 0 1 20.21 6.313v6.312a2.528 2.528 0 0 1-2.522 2.523 2.528 2.528 0 0 1-2.523-2.523V8.834z"/><path fill="#2eb67d" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521z"/><path fill="#ecb22e" d="M15.165 17.688a2.527 2.527 0 0 1-2.521-2.523 2.526 2.526 a="0 0 1 2.521-2.521h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>`,
            'discord': `<svg viewBox="0 0 71 55"><path fill="currentColor" d="M104.4 104.8c-5.7 0-10.2 5-10.2 11.2 0..."/><path fill="currentColor" d="M189.5 20h-134C37.3 20 30 27.5 30 37.5v165c0 10 7.3 17.5 25.5 17.5h113..."/></svg>`,
            'linkedin': `<svg viewBox="0 0 448 512"><path fill="currentColor" d="M100.28 448H7.4V148.9h92.88zm-46.44-341C24.6 107 0 82..."/></svg>`
        };
        return logos[serviceName] || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>`;
    }

    getServiceBrandColor(serviceName) {
        const colors = {
            'google-drive': '#4285f4',
            'github': '#24292e', 
            'notion': '#000000',
            'slack': '#4a154b',
            'discord': '#7289da',
            'linkedin': '#0077b5'
        };
        return colors[serviceName] || '#6366f1';
    }

    getServiceDisplayName(serviceName) {
        const names = {
            'google-drive': 'Google Drive',
            'github': 'GitHub',
            'notion': 'Notion',
            'slack': 'Slack'
        };
        return names[serviceName] || serviceName;
    }

    formatDisplayName(serviceName) {
        if (serviceName.includes('google-')) {
            return 'Google ' + serviceName.split('-')[1].charAt(0).toUpperCase() + serviceName.split('-')[1].slice(1);
        }
        return serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    }

    renderServiceCard(serviceName, service) {
        const status = this.getServiceStatus(serviceName);
        const statusText = this.getServiceStatusText(status);
        
        // Use data from registry if available, fallback to helper methods
        const displayName = service?.name || this.getServiceDisplayName(serviceName);
        const description = service?.description || '';
        const icon = service?.icon;
        
        // If no icon from registry, use the existing logo method
        const logo = icon ? 
            html`<img src="${icon}" alt="${displayName}" style="width: 16px; height: 16px;" />` : 
            this.getServiceLogo(serviceName);
        const brandColor = this.getServiceBrandColor(serviceName);
        
        const isConnected = status === 'connected' || status === 'authenticated';
        const isConnecting = status === 'connecting';
        const needsAuth = status === 'needs_auth';

        return html`
            <div class="service-card" title="${description}">
                <div class="service-info">
                    <div class="service-logo" style="background-color: ${brandColor}20; color: ${brandColor};">
                        ${icon ? logo : html`<div .innerHTML=${logo}></div>`}
                    </div>
                    <div class="service-details">
                        <h4>${displayName}</h4>
                        <div class="service-status ${status}">${statusText}</div>
                    </div>
                </div>
                
                <label class="toggle-switch ${isConnecting ? 'connecting' : ''} ${needsAuth ? 'needs-auth' : ''}">
                    <input 
                        type="checkbox" 
                        .checked=${isConnected}
                        .disabled=${isConnecting}
                        @change=${() => this.toggleService(serviceName)}
                    />
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    }

    showError(message) {
        this.errorMessage = message;
        this.successMessage = '';
        this.requestUpdate();
        setTimeout(() => { 
            this.errorMessage = ''; 
            this.requestUpdate();
        }, 5000);
    }

    showSuccess(message) {
        this.successMessage = message;
        this.errorMessage = '';
        this.requestUpdate();
        setTimeout(() => { 
            this.successMessage = ''; 
            this.requestUpdate();
        }, 3000);
    }

    clearMessages() {
        this.errorMessage = '';
        this.successMessage = '';
    }

    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.requestUpdate();
    }

    getConnectedCount() {
        // Count services that are connected or authenticated
        let count = 0;
        for (const serviceName in this.supportedServices) {
            if (this.isServiceConnected(serviceName)) {
                count++;
            }
        }
        return count;
    }

    getTotalServicesCount() {
        // Total number of available services (only enabled ones)
        return Object.keys(this.supportedServices).length;
    }

    async refreshStatus() {
        console.log('[MCPSettings] Manual refresh requested');
        
        // Clear any stuck connecting states
        const stuckServices = Array.from(this.connectingServices);
        if (stuckServices.length > 0) {
            console.log('[MCPSettings] Clearing stuck connecting services:', stuckServices);
        }
        this.connectingServices.clear(); 
        
        try {
            this.isLoading = true;
            this.requestUpdate();
            
            await this.loadServerStatus();
            await this.loadSupportedServices();
            await this.loadAuthenticationStatus();
            await this.loadParagonServiceStatus();
            
            this.successMessage = 'Status refreshed successfully';
            this.errorMessage = '';
            this.showSuccess('Status refreshed');
            
        } catch (error) {
            console.error('[MCPSettings] ❌ Error refreshing status:', error);
            this.errorMessage = 'Failed to refresh status: ' + error.message;
            this.successMessage = '';
        } finally {
            this.isLoading = false;
            this.requestUpdate();
        }
    }

    async clearStuckServices() {
        const stuckServices = Array.from(this.connectingServices);
        console.log('[MCPSettings] Manually clearing stuck services:', stuckServices);
        
        this.connectingServices.clear();
        this.connectingTimeouts.clear();
        
        // Reload status to see if any services are actually authenticated
        await this.loadServerStatus();
        
        this.showSuccess(`Cleared ${stuckServices.length} stuck connecting service(s)`);
        this.requestUpdate();
    }

    setupPeriodicCleanup() {
        // Check for stuck connecting services every 10 seconds
        setInterval(() => {
            const now = Date.now();
            const stuckServices = [];
            
            for (const [serviceName, startTime] of this.connectingTimeouts.entries()) {
                // If a service has been connecting for more than 2 minutes, consider it stuck
                if (now - startTime > 120000) { // 2 minutes
                    stuckServices.push(serviceName);
                }
            }
            
            if (stuckServices.length > 0) {
                console.log(`[MCPSettings] Found stuck connecting services: ${stuckServices.join(', ')}`);
                
                for (const serviceName of stuckServices) {
                    // Check if it's actually authenticated now
                    const isAuthenticated = this.isServiceAuthenticated(serviceName);
                    if (isAuthenticated) {
                        console.log(`[MCPSettings] Service ${serviceName} is authenticated, clearing stuck connecting state`);
                        this.connectingServices.delete(serviceName);
                        this.connectingTimeouts.delete(serviceName);
                        // Also clear any polling intervals
                        if (this.authPollingIntervals.has(serviceName)) {
                            clearInterval(this.authPollingIntervals.get(serviceName));
                            this.authPollingIntervals.delete(serviceName);
                        }
                    } else {
                        // If not authenticated after 2 minutes, give up
                        console.log(`[MCPSettings] Service ${serviceName} connection timed out`);
                        this.connectingServices.delete(serviceName);
                        this.connectingTimeouts.delete(serviceName);
                        // Also clear any polling intervals
                        if (this.authPollingIntervals.has(serviceName)) {
                            clearInterval(this.authPollingIntervals.get(serviceName));
                            this.authPollingIntervals.delete(serviceName);
                        }
                        this.showError(`Connection to ${serviceName} timed out. Please try again.`);
                    }
                }
                
                this.requestUpdate();
            }
        }, 10000); // Check every 10 seconds
    }

    render() {
        if (this.isLoading) {
            return html`
                <div class="mcp-settings">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading MCP services...</p>
                    </div>
                </div>
            `;
        }

        const runningCount = Object.values(this.servers).filter(s => s.connected).length;
        const totalTools = Object.values(this.servers).reduce((sum, server) => sum + (server.tools?.length || 0), 0);

        return html`
            <div class="mcp-settings">
                ${this.errorMessage ? html`<div class="message error">${this.errorMessage}</div>` : ''}
                ${this.successMessage ? html`<div class="message success">${this.successMessage}</div>` : ''}
                
                <div class="header" @click="${this.toggleExpanded}">
                    <div class="title">
                        <span>🔌</span>
                        <span>MCP Server Connections</span>
                    </div>
                    <div>
                        <span class="refresh-btn" @click="${this.handleRefreshClick}">🔄</span>
                        <span class="expand-icon ${this.isExpanded ? 'expanded' : ''}">▶</span>
                    </div>
                </div>

                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-value">${runningCount}</span> running
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${totalTools}</span> tools
                    </div>
                </div>

                <div class="content ${this.isExpanded ? 'expanded' : ''}">
                    ${this.renderParagonServicesSection()}
                    ${this.renderAddCustomButton()}
                </div>
            </div>
        `;
    }

    renderParagonServicesSection() {
        // Load available services dynamically from LIMIT_TO_INTEGRATIONS configuration
        // This replaces hardcoded service definitions with environment-based configuration
        let paragonServices;
        
        try {
            // Try to use the ParagonServices utility if available
            if (typeof window !== 'undefined' && window.ParagonServices) {
                paragonServices = window.ParagonServices.getAvailableServices();
                console.log('Loaded services from ParagonServices utility:', Object.keys(paragonServices));
            } else {
                // Fallback to manual environment variable parsing
                const limitToIntegrations = this.getLimitToIntegrations();
                paragonServices = this.createServicesFromConfig(limitToIntegrations);
                console.log('Loaded services from environment config:', Object.keys(paragonServices));
            }
        } catch (error) {
            console.error('Error loading dynamic Paragon services, falling back to defaults:', error);
            paragonServices = this.getDefaultParagonServices();
        }

        // Bypass server connection check to always render service toggles
        return html`
            <div class="more-services" style="margin-bottom: 20px;">
                <summary>🚀 Paragon Services (Configured Integrations)</summary>
                <p style="color: var(--text-secondary, #a0a0a0); font-size: 0.9em; margin: 12px 0;">
                    Authenticate individual services to access their tools and capabilities through Paragon.
                </p>
                
                <div class="services-grid">
                    ${Object.entries(paragonServices).map(([serviceKey, service]) => 
                        this.renderParagonServiceCard(serviceKey, service)
                    )}
                </div>
                
                <div style="margin-top: 16px; padding: 12px; background: var(--background-secondary, #2a2a2a); border-radius: 6px; border: 1px solid var(--border-color, #333);">
                    <p style="margin: 0; font-size: 0.85em; color: var(--text-secondary, #a0a0a0);">
                        💡 <strong>Configured Services:</strong> These are the services enabled in your Paragon configuration. 
                        <a href="https://docs.useparagon.com" target="_blank" style="color: var(--accent-color, #4a90e2);">Learn more about Paragon</a>
                    </p>
                </div>
            </div>
        `;
    }

    renderParagonServiceCard(serviceKey, service) {
        // const isConnecting = this.connectingServices.has(serviceKey);
        const isConnecting = this.isServiceConnecting(serviceKey);
        // Determine enabled/auth state from dynamic paragonServiceStatus
        const isEnabled = !!(this.paragonServiceStatus && this.paragonServiceStatus[serviceKey] && this.paragonServiceStatus[serviceKey].authenticated);
        const needsAuth = !isEnabled && !isConnecting;
        
        return html`
            <div class="service-card ${needsAuth ? 'needs-auth' : ''}">
                <div class="service-info">
                    <div class="service-logo">
                        <!-- Attempt to load brand logo from Simple Icons CDN, fallback to emoji -->
                        <img
                            src="https://cdn.jsdelivr.net/npm/simple-icons@v8/icons/${serviceKey.toLowerCase()}.svg"
                            class="service-logo__img"
                            alt="${service.name} logo"
                            @error="${(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}"
                        />
                        <span class="service-logo__emoji">${service.icon}</span>
                    </div>
                    <div class="service-details">
                        <h4>${service.name}</h4>
                        <div class="service-status ${service.status}">
                            ${isConnecting ? 'Connecting...' : 
                              isEnabled ? 'Connected' :
                              needsAuth ? 'Needs Authentication' : 'Disconnected'}
                        </div>
                    </div>
                </div>
                
                <label class="toggle-switch ${isConnecting ? 'connecting' : ''} ${needsAuth ? 'needs-auth' : ''}">
                    <input 
                        type="checkbox" 
                        .checked="${isEnabled}"
                        .disabled="${isConnecting}"
                        @change="${(e) => this.handleParagonServiceToggle(serviceKey, service, e.target.checked)}"
                    />
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    }

    async handleParagonServiceToggle(serviceKey, service, isChecked) {
        if (isChecked) {
            await this.connectParagonService(serviceKey, service);
        } else {
            await this.disconnectParagonService(serviceKey, service);
        }
    }

    async connectParagonService(serviceKey, service) {
        try {
            this.connectingServices.add(serviceKey);
            this.connectingTimeouts.set(serviceKey, Date.now());
            this.requestUpdate();

            console.log(`[MCPSettings] 🚀 Connecting Paragon service: ${serviceKey}`);

            // Get the current user ID from auth service
            const currentUser = await window.api.common.getCurrentUser();
            const userId = currentUser?.uid || 'default-user';
            
            // Use Electron BrowserWindow for authentication
            console.log(`[MCPSettings] 🌐 Opening Electron BrowserWindow for ${serviceKey} authentication`);
            console.log(`[MCPSettings] 🔑 Using user ID: ${userId}`);
            
            const result = await window.api.mcp.paragon.authenticate(serviceKey);
            if (result.success) {
                this.showSuccess(`${service.name} authentication window opened`);
            } else {
                throw new Error(result.error || 'Failed to open authentication window');
            }
            
            // Start polling for authentication completion with the same user ID
            this.startAuthenticationPolling(serviceKey, userId);
            
            // Note: Don't remove from connecting here - polling will handle completion
            return;

        } catch (error) {
            console.error(`[MCPSettings] ❌ Error connecting ${serviceKey}:`, error);
            this.errorMessage = `Failed to connect ${service.name}: ${error.message}`;
            this.successMessage = '';
            
            // If authentication was cancelled or failed, uncheck the toggle
            if (this.supportedServices[serviceKey]) {
                this.supportedServices[serviceKey].status = 'needs_auth';
            }
            
            this.connectingServices.delete(serviceKey);
            this.connectingTimeouts.delete(serviceKey);
            this.requestUpdate();
        }
    }

    async disconnectParagonService(serviceKey, service) {
        try {
            console.log(`[MCPSettings] 🔌 Disconnecting Paragon service: ${serviceKey}`);

            const result = await window.api?.mcp?.disconnectParagonService(serviceKey);

            if (result?.success) {
                this.successMessage = `${service.name} disconnected successfully.`;
                this.errorMessage = '';
                
                // Update service status
                if (this.supportedServices[serviceKey]) {
                    this.supportedServices[serviceKey].status = 'needs_auth';
                    this.supportedServices[serviceKey].toolsCount = 0;
                }
                
                // Refresh server status
                await this.loadServerStatus();
                await this.loadParagonServiceStatus();
                
            } else {
                throw new Error(result?.error || 'Disconnection failed');
            }

        } catch (error) {
            console.error(`[MCPSettings] ❌ Error disconnecting ${serviceKey}:`, error);
            this.errorMessage = `Failed to disconnect ${service.name}: ${error.message}`;
            this.successMessage = '';
        }
    }

    async handleRefreshClick(e) {
        e.stopPropagation(); // Prevent header toggle
        await this.refreshStatus();
    }

    renderServicesGrid() {
        return html`
            <div class="services-grid">
                ${(() => {
                    console.log('[MCPSettings] 🎨 Rendering apps:', Object.keys(this.supportedServices));
                    return Object.entries(this.supportedServices).map(([key, service]) => {
                        console.log(`[MCPSettings] 🎨 Rendering app: ${key} - ${service.name}`);
                        return this.renderServiceCard(key, service);
                    });
                })()}
            </div>
        `;
    }

    renderMoreServices() {
        return html`
            <button class="add-custom-btn" @click=${this.showAddCustomAppDialog}>
                <span style="font-size: 1.2em;">+</span>
                <span>Add Custom App</span>
            </button>
        `;
    }

    renderAddCustomButton() {
        return html`
            <button class="add-custom-btn" @click=${this.showAddCustomAppDialog}>
                <span style="font-size: 1.2em;">+</span>
                <span>Add Custom App</span>
            </button>
        `;
    }

    async showAddCustomAppDialog() {
        // For now, show a simple alert with instructions
        // In a full implementation, this would open a modal dialog
        const message = `Add Your Own App Integration:

Connect any app or service that supports automation protocols.

You'll need:
• App or service name
• Connection details from the app's developer settings
• Authentication information (if required)

This feature is coming soon! Contact support for help adding custom integrations.`;
        
        alert(message);
        
        // TODO: Future dialog will collect:
        // - App name and description
        // - Connection method (OAuth, API key, etc.)
        // - Required permissions
        // - Configuration settings
    }

    // Helper methods for dynamic service loading

    getLimitToIntegrations() {
        // Try to get LIMIT_TO_INTEGRATIONS from environment or config
        // In browser environment, this would come from a runtime config or API
        try {
            // Check if it's available on window (set by runtime config)
            if (typeof window !== 'undefined' && window.PARAGON_LIMIT_TO_INTEGRATIONS) {
                return window.PARAGON_LIMIT_TO_INTEGRATIONS;
            }

            // Fallback to default services (matching integrations page)
            return 'gmail,outlook,slack,salesforce,hubspot,notion,googlecalendar,linkedin,googledrive,dropbox,onedrive';
        } catch (error) {
            console.warn('Error getting LIMIT_TO_INTEGRATIONS config:', error);
            return 'gmail,outlook,slack,salesforce,hubspot,notion,googlecalendar,linkedin,googledrive,dropbox,onedrive';
        }
    }

    createServicesFromConfig(limitToIntegrationsString) {
        const services = {};
        
        // Parse the comma-separated string
        const serviceIds = limitToIntegrationsString
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Service definitions
        const serviceDefinitions = {
            gmail: {
                name: 'Gmail',
                description: 'Send and search emails, access messages',
                icon: '📧',
                capabilities: ['gmail_send', 'gmail_search'],
            },
            googleCalendar: {
                name: 'Google Calendar',
                description: 'Manage events and schedules',
                icon: '📅',
                capabilities: ['calendar_events'],
            },
            googleDrive: {
                name: 'Google Drive',
                description: 'Access files, folders, and documents',
                icon: '📁',
                capabilities: ['drive_files'],
            },
            googleDocs: {
                name: 'Google Docs',
                description: 'Create and edit documents',
                icon: '📄',
                capabilities: ['docs_read', 'docs_write'],
            },
            googleSheets: {
                name: 'Google Sheets',
                description: 'Create and edit spreadsheets',
                icon: '📊',
                capabilities: ['sheets_read', 'sheets_write'],
            },
            googleTasks: {
                name: 'Google Tasks',
                description: 'Manage tasks and to-do lists',
                icon: '✅',
                capabilities: ['tasks_read', 'tasks_write'],
            },
            notion: {
                name: 'Notion',
                description: 'Access pages, databases, and content',
                icon: '📝',
                capabilities: ['notion_pages'],
            },
            linkedin: {
                name: 'LinkedIn',
                description: 'Access professional network and posts',
                icon: '💼',
                capabilities: ['linkedin_posts', 'linkedin_connections'],
            },
            slack: {
                name: 'Slack',
                description: 'Send messages and manage channels',
                icon: '💬',
                capabilities: ['slack_send', 'slack_channels'],
            },
            hubspot: {
                name: 'HubSpot',
                description: 'Manage contacts, deals, and CRM data',
                icon: '🚀',
                capabilities: ['hubspot_contacts', 'hubspot_deals'],
            },
            salesforce: {
                name: 'Salesforce',
                description: 'Access CRM data and manage leads',
                icon: '☁️',
                capabilities: ['salesforce_leads', 'salesforce_accounts'],
            },
            trello: {
                name: 'Trello',
                description: 'Manage boards, cards, and projects',
                icon: '📋',
                capabilities: ['trello_boards', 'trello_cards'],
            },
            github: {
                name: 'GitHub',
                description: 'Manage repositories, issues, and pull requests',
                icon: '🐙',
                capabilities: ['github_repos', 'github_issues'],
            },
            figma: {
                name: 'Figma',
                description: 'Access design files and projects',
                icon: '🎨',
                capabilities: ['figma_files', 'figma_projects'],
            },
            zoom: {
                name: 'Zoom',
                description: 'Schedule and manage meetings',
                icon: '📹',
                capabilities: ['zoom_meetings', 'zoom_recordings'],
            },
            outlook: {
                name: 'Microsoft Outlook',
                description: 'Send and receive emails, manage calendar',
                icon: '📨',
                capabilities: ['outlook_send', 'outlook_calendar'],
            },
            dropbox: {
                name: 'Dropbox',
                description: 'Store and share files in the cloud',
                icon: '📦',
                capabilities: ['dropbox_files', 'dropbox_folders'],
            },
            onedrive: {
                name: 'OneDrive',
                description: 'Microsoft cloud storage and file sharing',
                icon: '☁️',
                capabilities: ['onedrive_files', 'onedrive_folders'],
            },
            // Aliases for naming consistency with integrations page
            googlecalendar: {
                name: 'Google Calendar',
                description: 'Manage events and schedules',
                icon: '📅',
                capabilities: ['calendar_events'],
            },
            googledrive: {
                name: 'Google Drive',
                description: 'Access files, folders, and documents',
                icon: '📁',
                capabilities: ['drive_files'],
            },
        };

        // Build services object with configured services only
        serviceIds.forEach(serviceId => {
            const definition = serviceDefinitions[serviceId];
            if (definition) {
                services[serviceId] = {
                    ...definition,
                    status: 'needs_auth',
                };
            } else {
                console.warn(`Unknown service in LIMIT_TO_INTEGRATIONS: ${serviceId}`);
            }
        });

        return services;
    }

    getDefaultParagonServices() {
        // Fallback to default services matching the integrations page
        return {
            'gmail': {
                name: 'Gmail',
                description: 'Send and search emails, access messages',
                icon: '📧',
                capabilities: ['gmail_send', 'gmail_search'],
                status: 'needs_auth'
            },
            'outlook': {
                name: 'Microsoft Outlook',
                description: 'Send and receive emails, manage calendar',
                icon: '📨',
                capabilities: ['outlook_send', 'outlook_calendar'],
                status: 'needs_auth'
            },
            'slack': {
                name: 'Slack',
                description: 'Send messages and manage channels',
                icon: '💬',
                capabilities: ['slack_send', 'slack_channels'],
                status: 'needs_auth'
            },
            'salesforce': {
                name: 'Salesforce',
                description: 'Access CRM data and manage leads',
                icon: '☁️',
                capabilities: ['salesforce_leads', 'salesforce_accounts'],
                status: 'needs_auth'
            },
            'hubspot': {
                name: 'HubSpot',
                description: 'Manage contacts, deals, and CRM data',
                icon: '🚀',
                capabilities: ['hubspot_contacts', 'hubspot_deals'],
                status: 'needs_auth'
            },
            'notion': {
                name: 'Notion',
                description: 'Access pages, databases, and content',
                icon: '📝',
                capabilities: ['notion_pages'],
                status: 'needs_auth'
            },
            'googlecalendar': {
                name: 'Google Calendar',
                description: 'Manage events and schedules',
                icon: '📅',
                capabilities: ['calendar_events'],
                status: 'needs_auth'
            },
            'linkedin': {
                name: 'LinkedIn',
                description: 'Access professional network and posts',
                icon: '💼',
                capabilities: ['linkedin_posts', 'linkedin_connections'],
                status: 'needs_auth'
            },
            'googledrive': {
                name: 'Google Drive',
                description: 'Access files, folders, and documents',
                icon: '📁',
                capabilities: ['drive_files'],
                status: 'needs_auth'
            },
            'dropbox': {
                name: 'Dropbox',
                description: 'Store and share files in the cloud',
                icon: '📦',
                capabilities: ['dropbox_files', 'dropbox_folders'],
                status: 'needs_auth'
            },
            'onedrive': {
                name: 'OneDrive',
                description: 'Microsoft cloud storage and file sharing',
                icon: '☁️',
                capabilities: ['onedrive_files', 'onedrive_folders'],
                status: 'needs_auth'
            }
        };
    }
}

customElements.define('mcp-settings', MCPSettingsComponent);