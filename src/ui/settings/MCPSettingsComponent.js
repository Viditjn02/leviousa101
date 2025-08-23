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
            grid-template-columns: 1fr;
            gap: 4px;
            margin-bottom: 16px;
        }

        .service-card {
            width: 100%;
            box-sizing: border-box;
            background: transparent;
            border: none;
            border-radius: 0;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.2s ease;
            min-height: 44px;
        }

        .service-card:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .service-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .service-logo {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            padding: 2px;
            flex-shrink: 0;
        }

        .service-logo svg {
            width: 12px;
            height: 12px;
            display: block;
            margin: auto;
        }

        /* Added logo image styling */
        .service-logo__img {
            width: 12px;
            height: 12px;
            object-fit: contain;
            filter: brightness(0) invert(1);
            display: block;
            margin: auto;
        }

        .service-logo__emoji {
            display: none;
            font-size: 12px;
        }

        .service-details h4 {
            color: var(--text-primary, #ffffff);
            margin: 0 0 2px 0;
            font-size: 0.8em;
            font-weight: 500;
        }

        .service-status {
            font-size: 0.7em;
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
            padding: 8px 12px;
            background: transparent;
            border: none;
            border-radius: 0;
            transition: all 0.2s ease;
        }

        .service-card:hover {
            background: rgba(255, 255, 255, 0.05);
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

    // Refresh status when component becomes visible (e.g. invisible overlay)
    connectedCallback() {
        super.connectedCallback();
        console.log('[MCPSettings] Component connected, refreshing status...');
        // Small delay to ensure component is fully initialized
        setTimeout(() => {
            this.forceRefreshStatus();
        }, 100);
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
                await this.loadServiceStatus();
                
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
            this.loadServiceStatus(); // Also refresh Paragon service authentication status
            if (data.success) {
                this.showSuccess('Connected successfully!');
                // Remove from connecting state - clear all since we don't know which service completed
                this.connectingServices.clear();
                // Force a full reload to get the latest status
                setTimeout(async () => {
                    await this.loadServerStatus();
                    await this.loadServiceStatus(); // Ensure Paragon status is refreshed after delay too
                    this.requestUpdate();
                }, 500); // Small delay to ensure backend state is updated
            }
        });
    }

    // Force refresh authentication status (useful for invisible overlay)
    async forceRefreshStatus() {
        console.log('[MCPSettings] 🔄 Force refreshing authentication status...');
        try {
            await this.loadServiceStatus();
            this.requestUpdate();
            console.log('[MCPSettings] ✅ Force refresh completed');
        } catch (error) {
            console.error('[MCPSettings] ❌ Force refresh failed:', error);
        }
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
            await this.loadServiceStatus();
            
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
                await this.loadServiceStatus();
                
                // Check if the service is now authenticated using multiple methods
                const service = this.supportedServices[serviceKey];
                const isConnected = this.isServiceConnected(serviceKey);
                const paragonConnected = this.paragonServiceStatus?.[serviceKey]?.authenticated === true;
                
                console.log(`[MCPSettings] 🔍 Authentication check for ${serviceKey}:`);
                console.log(`  - service.status: ${service?.status}`);
                console.log(`  - isServiceConnected(): ${isConnected}`);
                console.log(`  - paragonServiceStatus: ${paragonConnected}`);
                
                if (isConnected || paragonConnected || (service && service.status === 'connected')) {
                    console.log(`[MCPSettings] ✅ ${serviceKey} authentication completed successfully!`);
                    
                    // Clear polling
                    clearInterval(pollInterval);
                    this.authPollingIntervals.delete(serviceKey);
                    
                    // Remove from connecting state
                    this.connectingServices.delete(serviceKey);
                    this.connectingTimeouts.delete(serviceKey);
                    
                    // Show success message
                    this.showSuccess(`${service?.name || serviceKey} connected successfully!`);
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
    async loadServiceStatus() {
        try {
            console.log('[MCPSettings] 🔄 Starting loadServiceStatus...');
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
            
            console.log('[MCPSettings] ✅ loadServiceStatus completed');
            
        } catch (error) {
            console.error('[MCPSettings] ❌ Error in loadServiceStatus:', error);
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
                    await this.loadServiceStatus();
                    
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

    normalizeServiceName(serviceName) {
        // Handle different naming conventions between registry and our SVG definitions
        const nameMap = {
            'googleCalendar': 'google-calendar',
            'google_calendar': 'google-calendar', 
            'googlecalendar': 'google-calendar',
            'Google Calendar': 'google-calendar',
            'googleDrive': 'google-drive',
            'google_drive': 'google-drive',
            'googledrive': 'google-drive',
            'Google Drive': 'google-drive',
            'googleDocs': 'google-docs',
            'google_docs': 'google-docs',
            'googledocs': 'google-docs',
            'Google Docs': 'google-docs',
            'googleSheets': 'google-sheets',
            'google_sheets': 'google-sheets',
            'googlesheets': 'google-sheets',
            'Google Sheets': 'google-sheets',
            'googleTasks': 'google-tasks',
            'google_tasks': 'google-tasks',
            'googletasks': 'google-tasks',
            'Google Tasks': 'google-tasks',
            'Calendly': 'calendly',
            'Gmail': 'gmail',
            'GitHub': 'github',
            'Github': 'github',
            'Notion': 'notion',
            'Slack': 'slack',
            'Discord': 'discord',
            'LinkedIn': 'linkedin',
            'Dropbox': 'dropbox',
            'Salesforce': 'salesforce',
            'Trello': 'trello',
            'Microsoft': 'microsoft',
            'Paragon': 'paragon'
        };
        
        return nameMap[serviceName] || serviceName.toLowerCase().replace(/\s+/g, '-');
    }

    getServiceLogo(serviceName) {
        // Handle different naming conventions
        const normalizedName = this.normalizeServiceName(serviceName);
        console.log(`[MCPSettings] getServiceLogo called with: "${serviceName}", normalized to: "${normalizedName}"`);
        
        const logos = {
            'google': `<svg viewBox="0 0 24 24"><path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
            'google-drive': `<svg viewBox="0 0 24 24"><path fill="white" d="M6.4 5.7h13.2L24 12.8L16.8 24H7.2L0 12.8L6.4 5.7z"/><path fill="white" d="M6.4 5.7L0 12.8L7.2 24L16.8 24L24 12.8L19.6 5.7H6.4z"/><path fill="white" d="M6.4 5.7L0 12.8L7.2 24L13.6 16.2L6.4 5.7z"/><path fill="white" d="M19.6 5.7L24 12.8L16.8 24L10.4 16.2L19.6 5.7z"/></svg>`,
            'google-docs': `<svg viewBox="0 0 24 24"><path fill="white" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>`,
            'google-sheets': `<svg viewBox="0 0 24 24"><path fill="white" d="M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19M19,5H5V19H19V5M14,17V15.5H9.5V17H14M14,13.5V12H9.5V13.5H14M14,10V8.5H9.5V10H14Z"/></svg>`,
            'google-calendar': `<svg viewBox="0 0 24 24"><path fill="white" d="M6 1v2.5h2V1zm10 0v2.5h2V1zM3 5v16h18V5zm16 2v2H5V7zM5 11h4v4H5zm6 0h4v4h-4zm6 0h2v4h-2zM5 17h4v2H5zm6 0h4v2h-4zm6 0h2v2h-2z"/></svg>`,
            'google-tasks': `<svg viewBox="0 0 24 24"><path fill="white" d="M19,3H14.82C14.25,1.44 12.53,0.64 11,1.2C10.14,1.5 9.5,2.16 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V9H7V7M7,11H17V13H7V11M7,15H13V17H7V15Z"/></svg>`,
            'gmail': `<svg viewBox="0 0 24 24"><path fill="white" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/><path fill="white" d="M0 5.457C0 3.434 2.309 2.28 3.927 3.493L5.455 4.64 12 9.548V16.64L6.545 11.73V3.273H1.636C.732 3.273 0 4.005 0 4.909V5.457z"/><path fill="white" d="M12 9.548L18.545 4.64l1.528-1.145C21.69 2.28 24 3.434 24 5.457V4.909c0-.904-.732-1.636-1.636-1.636H17.455V11.73L12 16.64V9.548z"/></svg>`,
            'github': `<svg viewBox="0 0 24 24"><path fill="white" d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
            'notion': `<svg viewBox="0 0 24 24"><path fill="white" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/></svg>`,
            'slack': `<svg viewBox="0 0 24 24"><path fill="white" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"/><path fill="white" d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/><path fill="white" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"/><path fill="white" d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/><path fill="white" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z"/><path fill="white" d="M17.688 8.834a2.528 2.528 0 0 1-2.523-2.521 2.527 2.527 0 0 1 2.523-2.521A2.527 2.527 0 0 1 20.21 6.313v6.312a2.528 2.528 0 0 1-2.522 2.523 2.528 2.528 0 0 1-2.523-2.523V8.834z"/><path fill="white" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521z"/><path fill="white" d="M15.165 17.688a2.527 2.527 0 0 1-2.521-2.523 2.527 2.527 0 0 1 2.521-2.521h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>`,
            'discord': `<svg viewBox="0 0 24 24"><path fill="white" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
            'linkedin': `<svg viewBox="0 0 24 24"><path fill="white" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
            'dropbox': `<svg viewBox="0 0 24 24"><path fill="white" d="M6 2L12 6L6 10L0 6L6 2ZM18 2L24 6L18 10L12 6L18 2ZM0 14L6 10L12 14L6 18L0 14ZM12 14L18 10L24 14L18 18L12 14ZM6 22L12 18L18 22L12 26L6 22Z"/></svg>`,
            'salesforce': `<svg viewBox="0 0 24 24"><path fill="white" d="M8.5 10.5C8.5 9.12 9.62 8 11 8s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5S8.5 11.88 8.5 10.5zM16 8c.83 0 1.5.67 1.5 1.5S16.83 11 16 11s-1.5-.67-1.5-1.5S15.17 8 16 8zM8.5 16c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5S8.5 17.38 8.5 16z"/></svg>`,
            'trello': `<svg viewBox="0 0 24 24"><path fill="white" d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v12.36zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V5.82c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v6.36z"/></svg>`,
            'microsoft': `<svg viewBox="0 0 24 24"><path fill="white" d="M0 0h11.377v11.372H0V0z"/><path fill="white" d="M12.623 0H24v11.372H12.623V0z"/><path fill="white" d="M0 12.623h11.377V24H0V12.623z"/><path fill="white" d="M12.623 12.623H24V24H12.623V12.623z"/></svg>`,
            'calendly': `<svg viewBox="0 0 24 24"><path fill="white" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 7.432a7.572 7.572 0 11-11.136 0 .855.855 0 111.568.72 5.862 5.862 0 108.568.72.855.855 0 011.568-.72z"/></svg>`,
            'paragon': `<svg viewBox="0 0 24 24"><path fill="white" d="M12 2L2 7v10l10 5 10-5V7l-10-5zM12 4.236L19.528 8 12 11.764 4.472 8 12 4.236zM4 9.764L11 13.236v7.528L4 17.236V9.764zm16 0v7.472L13 20.764v-7.528L20 9.764z"/></svg>`
        };
        return logos[normalizedName] || logos[serviceName] || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="white"/></svg>`;
    }

    getServiceBrandColor(serviceName) {
        const colors = {
            'calendly': '#006BFF',
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
        
        // ALWAYS use inline SVG logos first, ignore external URLs to avoid broken images
        console.log(`[MCPSettings] Rendering service: "${serviceName}", icon URL: "${icon}"`);
        const inlineLogo = this.getServiceLogo(serviceName);
        console.log(`[MCPSettings] Inline logo for "${serviceName}":`, inlineLogo.substring(0, 50) + '...');
        
        // Always prefer inline SVG over external URLs
        const logo = inlineLogo;
        const brandColor = this.getServiceBrandColor(serviceName);
        
        const isConnected = status === 'connected' || status === 'authenticated';
        const isConnecting = status === 'connecting';
        const needsAuth = status === 'needs_auth';

        return html`
            <div class="service-card" title="${description}">
                <div class="service-info">
                    <div class="service-logo" style="background-color: ${brandColor}20; color: ${brandColor};">
                        <div .innerHTML=${logo}></div>
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
            await this.loadServiceStatus();
            
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
                        <p>Loading integrations...</p>
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
                        <span style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;">
                            <svg role="img" viewBox="0 0 24 24" width="16" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.85 0a4.16 4.16 0 0 0-2.95 1.217L1.456 10.66a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l9.442-9.442a2.49 2.49 0 0 1 3.541 0 2.49 2.49 0 0 1 0 3.541L8.59 12.97l-.1.1a.835.835 0 0 0 0 1.18.835.835 0 0 0 1.18 0l.1-.098 7.03-7.034a2.49 2.49 0 0 1 3.542 0l.049.05a2.49 2.49 0 0 1 0 3.54l-8.54 8.54a1.96 1.96 0 0 0 0 2.755l1.753 1.753a.835.835 0 0 0 1.18 0 .835.835 0 0 0 0-1.18l-1.753-1.753a.266.266 0 0 1 0-.394l8.54-8.54a4.185 4.185 0 0 0 0-5.9l-.05-.05a4.16 4.16 0 0 0-2.95-1.218c-.2 0-.401.02-.6.048a4.17 4.17 0 0 0-1.17-3.552A4.16 4.16 0 0 0 13.85 0m0 3.333a.84.84 0 0 0-.59.245L6.275 10.56a4.186 4.186 0 0 0 0 5.902 4.186 4.186 0 0 0 5.902 0L19.16 9.48a.835.835 0 0 0 0-1.18.835.835 0 0 0-1.18 0l-6.985 6.984a2.49 2.49 0 0 1-3.54 0 2.49 2.49 0 0 1 0-3.54l6.983-6.985a.835.835 0 0 0 0-1.18.84.84 0 0 0-.59-.245"/>
                            </svg>
                        </span>
                        <span>Integrations</span>
                    </div>
                    <div>
                        <span class="expand-icon ${this.isExpanded ? 'expanded' : ''}">▶</span>
                    </div>
                </div>

                <div class="content ${this.isExpanded ? 'expanded' : ''}">
                    ${this.renderIntegrationsSection()}
                </div>
            </div>
        `;
    }

    renderIntegrationsSection() {
        // Load available services dynamically
        let availableServices;
        
        try {
            // Try to use available services utility if available
            if (typeof window !== 'undefined' && window.ParagonServices) {
                availableServices = window.ParagonServices.getAvailableServices();
                console.log('[MCPSettings] Loaded available services:', Object.keys(availableServices));
            } else {
                // Fallback to configuration parsing
                const limitToIntegrations = this.getLimitToIntegrations();
                console.log('[MCPSettings] limitToIntegrations config:', limitToIntegrations);
                availableServices = this.createServicesFromConfig(limitToIntegrations);
                console.log('[MCPSettings] Loaded services from config:', Object.keys(availableServices));
            }
        } catch (error) {
            console.error('Error loading services, using defaults:', error);
            availableServices = this.getDefaultServices();
            console.log('[MCPSettings] Using default services:', Object.keys(availableServices));
        }
        
        // Google Calendar service name now matches backend (googleCalendar camelCase)

        // Bypass server connection check to always render service toggles
        return html`
            <div class="more-services" style="margin-bottom: 20px;">
                <summary>Available Integrations</summary>
                
                <div class="services-grid">
                    ${Object.entries(availableServices).map(([serviceKey, service]) => 
                        this.renderServiceCard(serviceKey, service)
                    )}
                </div>
            </div>
        `;
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

            // Core services only for invisible overlay
            return 'gmail,googleCalendar,calendly,linkedin,notion';
        } catch (error) {
            console.warn('Error getting LIMIT_TO_INTEGRATIONS config:', error);
            return 'gmail,googleCalendar,calendly,linkedin,notion';
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
            calendly: {
                name: 'Calendly',
                description: 'Manage scheduling and calendar bookings',
                icon: '🗓️',
                capabilities: ['calendly_events', 'calendly_scheduling'],
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
            // Removed duplicate googlecalendar alias - using googleCalendar (camelCase) to match backend
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

    getDefaultServices() {
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
                    'googleCalendar': {  // Fixed: Use camelCase to match backend
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