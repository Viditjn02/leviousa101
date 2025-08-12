/**
 * MCP Metrics
 * Comprehensive monitoring and metrics collection for MCP operations
 * Tracks performance, errors, and system health
 */

const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[MCPMetrics] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Metric types
const MetricType = {
    COUNTER: 'counter',
    GAUGE: 'gauge',
    HISTOGRAM: 'histogram',
    TIMER: 'timer'
};

// Time bucket for histograms (in milliseconds)
const TimeBuckets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

class Metric {
    constructor(name, type, labels = {}) {
        this.name = name;
        this.type = type;
        this.labels = labels;
        this.value = 0;
        this.samples = [];
        this.startTime = Date.now();
        this.lastUpdated = Date.now();
    }

    increment(value = 1) {
        if (this.type !== MetricType.COUNTER) {
            throw new Error(`Cannot increment non-counter metric: ${this.name}`);
        }
        this.value += value;
        this.lastUpdated = Date.now();
    }

    set(value) {
        if (this.type !== MetricType.GAUGE) {
            throw new Error(`Cannot set value on non-gauge metric: ${this.name}`);
        }
        this.value = value;
        this.lastUpdated = Date.now();
    }

    observe(value) {
        if (this.type !== MetricType.HISTOGRAM && this.type !== MetricType.TIMER) {
            throw new Error(`Cannot observe non-histogram/timer metric: ${this.name}`);
        }
        this.samples.push({
            value,
            timestamp: Date.now()
        });
        this.lastUpdated = Date.now();
        
        // Keep only last 1000 samples to prevent memory growth
        if (this.samples.length > 1000) {
            this.samples = this.samples.slice(-1000);
        }
    }

    getStatistics() {
        if (this.type === MetricType.COUNTER || this.type === MetricType.GAUGE) {
            return {
                value: this.value,
                lastUpdated: this.lastUpdated
            };
        }

        if (this.samples.length === 0) {
            return {
                count: 0,
                min: 0,
                max: 0,
                mean: 0,
                median: 0,
                p95: 0,
                p99: 0,
                buckets: {}
            };
        }

        const values = this.samples.map(s => s.value).sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const median = values[Math.floor(values.length / 2)];
        const p95 = values[Math.floor(values.length * 0.95)];
        const p99 = values[Math.floor(values.length * 0.99)];

        // Calculate histogram buckets
        const buckets = {};
        for (const bucket of TimeBuckets) {
            buckets[bucket] = values.filter(v => v <= bucket).length;
        }

        return {
            count: values.length,
            min: values[0],
            max: values[values.length - 1],
            mean: mean.toFixed(2),
            median: median.toFixed(2),
            p95: p95.toFixed(2),
            p99: p99.toFixed(2),
            buckets,
            lastUpdated: this.lastUpdated
        };
    }
}

class Timer {
    constructor(metric) {
        this.metric = metric;
        this.startTime = Date.now();
    }

    end() {
        const duration = Date.now() - this.startTime;
        this.metric.observe(duration);
        return duration;
    }
}

class MCPMetrics extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.startTime = Date.now();
        
        // Initialize core metrics
        this.initializeCoreMetrics();
        
        // Start periodic reporting
        this.reportingInterval = setInterval(() => {
            this.reportMetrics();
        }, 60000); // Report every minute
        
        logger.info('MCPMetrics initialized');
    }

    /**
     * Initialize core MCP metrics
     */
    initializeCoreMetrics() {
        // Connection metrics
        this.registerCounter('mcp_connections_total', 'Total number of MCP connections');
        this.registerGauge('mcp_connections_active', 'Number of active MCP connections');
        this.registerCounter('mcp_connections_failed', 'Number of failed MCP connections');
        
        // Server metrics
        this.registerGauge('mcp_servers_active', 'Number of active MCP servers');
        this.registerCounter('mcp_server_starts_total', 'Total number of server starts');
        this.registerCounter('mcp_server_stops_total', 'Total number of server stops');
        this.registerCounter('mcp_server_errors_total', 'Total number of server errors');
        
        // Tool metrics
        this.registerCounter('mcp_tool_invocations_total', 'Total number of tool invocations');
        this.registerCounter('mcp_tool_failures_total', 'Total number of tool failures');
        this.registerHistogram('mcp_tool_duration_ms', 'Tool invocation duration in milliseconds');
        
        // Message metrics
        this.registerCounter('mcp_messages_sent_total', 'Total number of messages sent');
        this.registerCounter('mcp_messages_received_total', 'Total number of messages received');
        this.registerCounter('mcp_messages_failed_total', 'Total number of message failures');
        this.registerGauge('mcp_message_queue_size', 'Current message queue size');
        
        // OAuth metrics
        this.registerCounter('mcp_oauth_attempts_total', 'Total OAuth authentication attempts');
        this.registerCounter('mcp_oauth_success_total', 'Successful OAuth authentications');
        this.registerCounter('mcp_oauth_failures_total', 'Failed OAuth authentications');
        
        // Circuit breaker metrics
        this.registerGauge('mcp_circuit_breakers_open', 'Number of open circuit breakers');
        this.registerCounter('mcp_circuit_breaker_trips_total', 'Total circuit breaker trips');
        
        // Performance metrics
        this.registerHistogram('mcp_request_duration_ms', 'Request duration in milliseconds');
        this.registerHistogram('mcp_response_time_ms', 'Response time in milliseconds');
        
        // System metrics
        this.registerGauge('mcp_memory_usage_bytes', 'Memory usage in bytes');
        this.registerGauge('mcp_uptime_seconds', 'System uptime in seconds');
    }

    /**
     * Register a counter metric
     */
    registerCounter(name, help, labels = {}) {
        const metric = new Metric(name, MetricType.COUNTER, labels);
        this.metrics.set(name, metric);
        logger.debug('Registered counter', { name, help });
        return metric;
    }

    /**
     * Register a gauge metric
     */
    registerGauge(name, help, labels = {}) {
        const metric = new Metric(name, MetricType.GAUGE, labels);
        this.metrics.set(name, metric);
        logger.debug('Registered gauge', { name, help });
        return metric;
    }

    /**
     * Register a histogram metric
     */
    registerHistogram(name, help, labels = {}) {
        const metric = new Metric(name, MetricType.HISTOGRAM, labels);
        this.metrics.set(name, metric);
        logger.debug('Registered histogram', { name, help });
        return metric;
    }

    /**
     * Increment a counter
     */
    incrementCounter(name, value = 1, labels = {}) {
        const metric = this.getOrCreateMetric(name, MetricType.COUNTER, labels);
        metric.increment(value);
        this.emit('counterIncremented', { name, value, labels });
    }

    /**
     * Set a gauge value
     */
    setGauge(name, value, labels = {}) {
        const metric = this.getOrCreateMetric(name, MetricType.GAUGE, labels);
        metric.set(value);
        this.emit('gaugeSet', { name, value, labels });
    }

    /**
     * Observe a histogram value
     */
    observeHistogram(name, value, labels = {}) {
        const metric = this.getOrCreateMetric(name, MetricType.HISTOGRAM, labels);
        metric.observe(value);
        this.emit('histogramObserved', { name, value, labels });
    }

    /**
     * Start a timer
     */
    startTimer(name, labels = {}) {
        const metric = this.getOrCreateMetric(name, MetricType.TIMER, labels);
        return new Timer(metric);
    }

    /**
     * Get or create a metric
     */
    getOrCreateMetric(name, type, labels = {}) {
        const key = this.getMetricKey(name, labels);
        
        if (!this.metrics.has(key)) {
            const metric = new Metric(name, type, labels);
            this.metrics.set(key, metric);
        }
        
        return this.metrics.get(key);
    }

    /**
     * Get metric key with labels
     */
    getMetricKey(name, labels = {}) {
        if (Object.keys(labels).length === 0) {
            return name;
        }
        
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
            
        return `${name}{${labelStr}}`;
    }

    /**
     * Record a connection event
     */
    recordConnection(event, serverName) {
        switch (event) {
            case 'created':
                this.incrementCounter('mcp_connections_total', 1, { server: serverName });
                this.incrementCounter('mcp_connections_active');
                break;
            case 'closed':
                this.incrementCounter('mcp_connections_active', -1);
                break;
            case 'failed':
                this.incrementCounter('mcp_connections_failed', 1, { server: serverName });
                break;
        }
    }

    /**
     * Record a server event
     */
    recordServerEvent(event, serverName) {
        switch (event) {
            case 'started':
                this.incrementCounter('mcp_server_starts_total', 1, { server: serverName });
                const currentActive = this.getOrCreateMetric('mcp_servers_active', MetricType.GAUGE)?.value || 0;
                this.setGauge('mcp_servers_active', currentActive + 1);
                break;
            case 'stopped':
                this.incrementCounter('mcp_server_stops_total', 1, { server: serverName });
                const currentActiveStop = this.getOrCreateMetric('mcp_servers_active', MetricType.GAUGE)?.value || 0;
                this.setGauge('mcp_servers_active', Math.max(0, currentActiveStop - 1));
                break;
            case 'error':
                this.incrementCounter('mcp_server_errors_total', 1, { server: serverName });
                break;
        }
    }

    /**
     * Record a tool invocation
     */
    recordToolInvocation(toolName, duration, success) {
        this.incrementCounter('mcp_tool_invocations_total', 1, { tool: toolName });
        
        if (!success) {
            this.incrementCounter('mcp_tool_failures_total', 1, { tool: toolName });
        }
        
        if (duration !== undefined) {
            this.observeHistogram('mcp_tool_duration_ms', duration, { tool: toolName });
        }
    }

    /**
     * Update system metrics
     */
    updateSystemMetrics() {
        // Memory usage
        const memoryUsage = process.memoryUsage();
        this.setGauge('mcp_memory_usage_bytes', memoryUsage.heapUsed, { type: 'heap' });
        this.setGauge('mcp_memory_usage_bytes', memoryUsage.rss, { type: 'rss' });
        
        // Uptime
        const uptime = (Date.now() - this.startTime) / 1000;
        this.setGauge('mcp_uptime_seconds', uptime);
    }

    /**
     * Get all metrics
     */
    getAllMetrics() {
        const metrics = {};
        
        for (const [key, metric] of this.metrics) {
            metrics[key] = {
                name: metric.name,
                type: metric.type,
                labels: metric.labels,
                ...metric.getStatistics()
            };
        }
        
        return metrics;
    }

    /**
     * Get metrics summary
     */
    getMetricsSummary() {
        this.updateSystemMetrics();
        
        const allMetrics = this.getAllMetrics();
        const summary = {
            uptime: allMetrics['mcp_uptime_seconds']?.value || 0,
            connections: {
                total: allMetrics['mcp_connections_total']?.value || 0,
                active: allMetrics['mcp_connections_active']?.value || 0,
                failed: allMetrics['mcp_connections_failed']?.value || 0
            },
            servers: {
                active: allMetrics['mcp_servers_active']?.value || 0,
                starts: allMetrics['mcp_server_starts_total']?.value || 0,
                stops: allMetrics['mcp_server_stops_total']?.value || 0,
                errors: allMetrics['mcp_server_errors_total']?.value || 0
            },
            tools: {
                invocations: allMetrics['mcp_tool_invocations_total']?.value || 0,
                failures: allMetrics['mcp_tool_failures_total']?.value || 0,
                avgDuration: allMetrics['mcp_tool_duration_ms']?.mean || 0
            },
            messages: {
                sent: allMetrics['mcp_messages_sent_total']?.value || 0,
                received: allMetrics['mcp_messages_received_total']?.value || 0,
                failed: allMetrics['mcp_messages_failed_total']?.value || 0,
                queueSize: allMetrics['mcp_message_queue_size']?.value || 0
            },
            memory: {
                heap: allMetrics['mcp_memory_usage_bytes{type="heap"}']?.value || 0,
                rss: allMetrics['mcp_memory_usage_bytes{type="rss"}']?.value || 0
            }
        };
        
        return summary;
    }

    /**
     * Report metrics periodically
     */
    reportMetrics() {
        const summary = this.getMetricsSummary();
        logger.info('Metrics report', summary);
        this.emit('metricsReported', summary);
    }

    /**
     * Export metrics in Prometheus format
     */
    exportPrometheus() {
        const lines = [];
        
        for (const [key, metric] of this.metrics) {
            const stats = metric.getStatistics();
            
            if (metric.type === MetricType.COUNTER || metric.type === MetricType.GAUGE) {
                lines.push(`# TYPE ${metric.name} ${metric.type}`);
                lines.push(`${key} ${stats.value}`);
            } else if (metric.type === MetricType.HISTOGRAM || metric.type === MetricType.TIMER) {
                lines.push(`# TYPE ${metric.name} histogram`);
                lines.push(`${key}_count ${stats.count}`);
                lines.push(`${key}_sum ${stats.mean * stats.count}`);
                
                // Add bucket lines
                for (const [bucket, count] of Object.entries(stats.buckets)) {
                    lines.push(`${key}_bucket{le="${bucket}"} ${count}`);
                }
                lines.push(`${key}_bucket{le="+Inf"} ${stats.count}`);
            }
        }
        
        return lines.join('\n');
    }

    /**
     * Reset all metrics
     */
    reset() {
        for (const metric of this.metrics.values()) {
            metric.value = 0;
            metric.samples = [];
        }
        logger.info('All metrics reset');
        this.emit('metricsReset');
    }

    /**
     * Destroy metrics collector
     */
    destroy() {
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
            this.reportingInterval = null;
        }
        
        this.metrics.clear();
        logger.info('MCPMetrics destroyed');
        this.emit('destroyed');
    }
}

// Singleton instance
let instance = null;

// Add static getInstance method
MCPMetrics.getInstance = function() {
    if (!instance) {
        instance = new MCPMetrics();
    }
    return instance;
};

module.exports = MCPMetrics; 