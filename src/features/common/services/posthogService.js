const { PostHog } = require('posthog-node');
const os = require('os');
const { app } = require('electron');

class PostHogService {
    constructor() {
        this.posthog = null;
        this.userId = null;
        this.isInitialized = false;
        this.sessionId = null;
        this.startTime = Date.now();
        this.eventQueue = [];
        this.systemMetrics = {};
    }

    async initialize() {
        try {
            // Get API key from environment variable or fallback to hardcoded value
            const apiKey = process.env.POSTHOG_API_KEY || 'phc_RorBSQpmhJphA9WtA54unRLwWUo7Ik6CQiMQ84Qsp12';
            
            // Initialize PostHog with comprehensive configuration
            this.posthog = new PostHog(apiKey, {
                host: 'https://app.posthog.com',
                // Enhanced debugging and monitoring
                debug: process.env.NODE_ENV === 'development',
                // Aggressive flushing for maximum data capture
                flushAt: 1, // Flush after every event in development
                flushInterval: 5000, // Flush every 5 seconds
                // Maximum request timeout
                requestTimeout: 10000,
                // Enable feature flags
                enableFeatureFlags: true,
                // Personal API key for advanced features (if available)
                personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
            });

            // Generate unique identifiers
            this.userId = this.generateUserId();
            this.sessionId = this.generateSessionId();
            
            // Collect comprehensive system metrics
            await this.collectSystemMetrics();
            
            this.isInitialized = true;
            
            // Setup comprehensive tracking
            await this.setupComprehensiveTracking();
            
            // Track enhanced app startup
            this.captureEvent('app_started', {
                ...this.systemMetrics,
                session_id: this.sessionId,
                startup_time: Date.now() - this.startTime,
                command_line_args: process.argv,
                working_directory: process.cwd(),
                memory_usage: process.memoryUsage(),
                cpu_usage: process.cpuUsage(),
            });

            console.log('✅ PostHog service initialized with comprehensive tracking');
            
        } catch (error) {
            console.error('❌ PostHog initialization failed:', error);
            // Don't crash the app if PostHog fails
        }
    }

    async collectSystemMetrics() {
        try {
            this.systemMetrics = {
                // === SEGREGATION PROPERTIES ===
                $app_platform: 'electron',
                $app_type: 'desktop_application', 
                $data_source: 'leviousa_electron',
                $application: 'leviousa_desktop',
                
                // Basic system info
                platform: process.platform,
                app_version: app ? app.getVersion() : 'unknown',
                electron_version: process.versions.electron,
                node_version: process.versions.node,
                v8_version: process.versions.v8,
                chrome_version: process.versions.chrome,
                os_version: os.release(),
                os_type: os.type(),
                arch: process.arch,
                
                // Hardware info
                cpu_count: os.cpus().length,
                cpu_model: os.cpus()[0]?.model || 'unknown',
                total_memory: os.totalmem(),
                free_memory: os.freemem(),
                
                // Network info
                hostname: os.hostname(),
                network_interfaces: Object.keys(os.networkInterfaces()),
                
                // User environment
                user_home: os.homedir(),
                temp_dir: os.tmpdir(),
                user_info: os.userInfo(),
                
                // Process info
                pid: process.pid,
                ppid: process.ppid,
                node_env: process.env.NODE_ENV,
                
                // App specific
                app_name: app ? app.getName() : 'unknown',
                app_locale: app ? app.getLocale() : 'unknown',
                app_version_name: app ? app.getVersion() : 'unknown',
                is_packaged: app ? app.isPackaged : false,
                
                // Timestamps
                boot_time: Date.now() - os.uptime() * 1000,
                app_start_time: this.startTime,
            };
        } catch (error) {
            console.error('Failed to collect system metrics:', error);
        }
    }

    async setupComprehensiveTracking() {
        // Track memory usage periodically
        const memoryInterval = setInterval(() => {
            if (this.isInitialized) {
                const memUsage = process.memoryUsage();
                this.captureEvent('memory_usage', {
                    ...memUsage,
                    session_id: this.sessionId,
                    uptime: process.uptime(),
                });
            }
        }, 30000); // Every 30 seconds

        // Track CPU usage periodically
        let lastCpuUsage = process.cpuUsage();
        const cpuInterval = setInterval(() => {
            if (this.isInitialized) {
                const currentCpuUsage = process.cpuUsage(lastCpuUsage);
                this.captureEvent('cpu_usage', {
                    user_cpu_time: currentCpuUsage.user,
                    system_cpu_time: currentCpuUsage.system,
                    session_id: this.sessionId,
                });
                lastCpuUsage = process.cpuUsage();
            }
        }, 60000); // Every minute

        // Track system load average (Unix-like systems)
        let loadInterval = null;
        if (process.platform !== 'win32') {
            loadInterval = setInterval(() => {
                if (this.isInitialized) {
                    const loadAvg = os.loadavg();
                    this.captureEvent('system_load', {
                        load_1min: loadAvg[0],
                        load_5min: loadAvg[1],
                        load_15min: loadAvg[2],
                        session_id: this.sessionId,
                    });
                }
            }, 120000); // Every 2 minutes
        }

        // Track process events
        process.on('warning', (warning) => {
            this.captureEvent('process_warning', {
                warning_name: warning.name,
                warning_message: warning.message,
                warning_stack: warning.stack,
                session_id: this.sessionId,
            });
        });

        // Store intervals for cleanup
        this.intervals = { memoryInterval, cpuInterval };
        if (loadInterval) {
            this.intervals.loadInterval = loadInterval;
        }
    }

    generateUserId() {
        // Generate a consistent user ID based on machine characteristics
        const machineId = os.hostname() + '_' + os.platform() + '_' + os.arch();
        return Buffer.from(machineId).toString('base64').substring(0, 16);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    captureEvent(eventName, properties = {}) {
        if (!this.isInitialized || !this.posthog) {
            console.warn('PostHog not initialized, skipping event:', eventName);
            return;
        }

        try {
            // Enhanced event capture with comprehensive context
            const enhancedProperties = {
                ...properties,
                
                // === ENHANCED SEGREGATION PROPERTIES ===
                $app_platform: 'electron',
                $app_type: 'desktop_application',
                $data_source: 'leviousa_electron',
                $application: 'leviousa_desktop',
                
                // Core identifiers
                session_id: this.sessionId,
                user_id: this.userId,
                timestamp: new Date().toISOString(),
                source: 'electron_app',
                
                // Runtime context
                app_uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                cpu_usage: process.cpuUsage(),
                
                // System context
                platform: process.platform,
                arch: process.arch,
                node_version: process.versions.node,
                electron_version: process.versions.electron,
                app_version: app ? app.getVersion() : 'unknown',
                
                // Performance metrics
                heap_used: process.memoryUsage().heapUsed,
                heap_total: process.memoryUsage().heapTotal,
                external: process.memoryUsage().external,
                
                // Process info
                pid: process.pid,
                argv: process.argv.slice(2), // Exclude node and script path
            };

            this.posthog.capture({
                distinctId: this.userId,
                event: eventName,
                properties: enhancedProperties
            });

            // Also queue events for potential batch processing
            this.eventQueue.push({
                event: eventName,
                properties: enhancedProperties,
                timestamp: Date.now()
            });

            // Keep queue size manageable
            if (this.eventQueue.length > 1000) {
                this.eventQueue = this.eventQueue.slice(-500);
            }

        } catch (error) {
            console.error('Failed to capture PostHog event:', error);
        }
    }

    // Enhanced method to capture feature usage with detailed context
    captureFeatureUsage(featureName, action, context = {}) {
        this.captureEvent('feature_usage', {
            feature_name: featureName,
            action: action,
            feature_context: context,
            usage_timestamp: Date.now(),
        });
    }

    // Method to capture user interactions
    captureUserInteraction(interactionType, target, context = {}) {
        this.captureEvent('user_interaction', {
            interaction_type: interactionType,
            target: target,
            interaction_context: context,
            interaction_timestamp: Date.now(),
        });
    }

    // Method to capture errors with full context
    captureError(error, context = {}) {
        this.captureEvent('error_occurred', {
            error_message: error.message,
            error_stack: error.stack,
            error_name: error.name,
            error_context: context,
            error_timestamp: Date.now(),
        });
    }

    // Method to capture performance metrics
    capturePerformanceMetric(metricName, value, unit = 'ms', context = {}) {
        this.captureEvent('performance_metric', {
            metric_name: metricName,
            metric_value: value,
            metric_unit: unit,
            metric_context: context,
            metric_timestamp: Date.now(),
        });
    }

    identifyUser(userId, properties = {}) {
        if (!this.isInitialized || !this.posthog) {
            console.warn('PostHog not initialized, skipping identify');
            return;
        }

        try {
            this.userId = userId;
            this.posthog.identify({
                distinctId: userId,
                properties: {
                    ...properties,
                    platform: process.platform,
                    app_version: app.getVersion()
                }
            });
        } catch (error) {
            console.error('Failed to identify user in PostHog:', error);
        }
    }

    async shutdown() {
        if (this.posthog) {
            try {
                // Clear all intervals
                if (this.intervals) {
                    Object.values(this.intervals).forEach(interval => {
                        if (interval) clearInterval(interval);
                    });
                }

                // Track comprehensive app shutdown metrics
                this.captureEvent('app_shutdown', {
                    session_duration: Date.now() - this.startTime,
                    total_events_captured: this.eventQueue.length,
                    final_memory_usage: process.memoryUsage(),
                    final_cpu_usage: process.cpuUsage(),
                    uptime_seconds: process.uptime(),
                    shutdown_timestamp: Date.now(),
                    clean_shutdown: true,
                });

                // Flush any remaining events with extended timeout
                await this.posthog.shutdown();
                console.log('✅ PostHog service shutdown successfully with comprehensive metrics');
            } catch (error) {
                console.error('❌ PostHog shutdown failed:', error);
            }
        }
    }

    // Method to get comprehensive analytics summary
    getAnalyticsSummary() {
        return {
            isInitialized: this.isInitialized,
            userId: this.userId,
            sessionId: this.sessionId,
            eventsQueued: this.eventQueue.length,
            sessionDuration: Date.now() - this.startTime,
            systemMetrics: this.systemMetrics,
        };
    }

    // Method to export all captured events (for debugging)
    exportEvents() {
        return {
            events: this.eventQueue,
            summary: this.getAnalyticsSummary(),
            exportTimestamp: Date.now(),
        };
    }
}

module.exports = new PostHogService();
