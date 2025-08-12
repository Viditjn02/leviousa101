/**
 * Connection Pool
 * Manages a pool of MCP server connections for efficient reuse
 * Implements connection health checks and automatic cleanup
 */

const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[ConnectionPool] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Connection states
const ConnectionState = {
    IDLE: 'idle',
    BUSY: 'busy',
    CLOSING: 'closing',
    CLOSED: 'closed',
    ERROR: 'error'
};

class Connection {
    constructor(id, serverName, adapter) {
        this.id = id;
        this.serverName = serverName;
        this.adapter = adapter;
        this.state = ConnectionState.IDLE;
        this.createdAt = Date.now();
        this.lastUsedAt = Date.now();
        this.useCount = 0;
        this.errors = 0;
    }

    markBusy() {
        this.state = ConnectionState.BUSY;
        this.lastUsedAt = Date.now();
        this.useCount++;
    }

    markIdle() {
        this.state = ConnectionState.IDLE;
        this.lastUsedAt = Date.now();
    }

    markError() {
        this.state = ConnectionState.ERROR;
        this.errors++;
    }

    isHealthy() {
        return this.state !== ConnectionState.ERROR && 
               this.state !== ConnectionState.CLOSED &&
               this.errors < 3; // Allow up to 2 errors before marking unhealthy
    }

    getAge() {
        return Date.now() - this.createdAt;
    }

    getIdleTime() {
        return Date.now() - this.lastUsedAt;
    }
}

class ConnectionPool extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            maxConnections: options.maxConnections || 10,
            maxConnectionAge: options.maxConnectionAge || 3600000, // 1 hour
            maxIdleTime: options.maxIdleTime || 300000, // 5 minutes
            connectionTimeout: options.connectionTimeout || 30000, // 30 seconds
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            serverRegistry: options.serverRegistry, // Accept ServerRegistry instance
            ...options
        };

        this.connections = new Map(); // connectionId -> Connection
        this.serverPools = new Map(); // serverName -> Set of connectionIds
        this.waitingRequests = new Map(); // serverName -> Queue of waiting requests
        this.connectionIdCounter = 0;
        
        // Start health check interval
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.options.healthCheckInterval);

        logger.info('ConnectionPool initialized', { options: this.options });
    }

    /**
     * Get a connection for a server
     */
    async getConnection(serverName) {
        logger.info('Requesting connection', { serverName });

        // Try to find an idle connection
        const idleConnection = this.findIdleConnection(serverName);
        if (idleConnection) {
            idleConnection.markBusy();
            logger.info('Reusing idle connection', { 
                serverName, 
                connectionId: idleConnection.id,
                useCount: idleConnection.useCount 
            });
            this.emit('connectionAcquired', { serverName, connectionId: idleConnection.id });
            return idleConnection;
        }

        // Check if we can create a new connection
        if (this.connections.size < this.options.maxConnections) {
            return await this.createConnection(serverName);
        }

        // Wait for a connection to become available
        logger.info('Pool at capacity, waiting for available connection', { 
            serverName,
            currentConnections: this.connections.size
        });
        
        return await this.waitForConnection(serverName);
    }

    /**
     * Release a connection back to the pool
     */
    async releaseConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            logger.warn('Attempted to release unknown connection', { connectionId });
            return;
        }

        logger.info('Releasing connection', { 
            connectionId,
            serverName: connection.serverName,
            useCount: connection.useCount
        });

        // Check if connection should be closed
        if (!connection.isHealthy() || 
            connection.getAge() > this.options.maxConnectionAge) {
            await this.closeConnection(connectionId);
            return;
        }

        // Mark as idle
        connection.markIdle();
        this.emit('connectionReleased', { 
            serverName: connection.serverName, 
            connectionId 
        });

        // Process any waiting requests
        this.processWaitingRequests(connection.serverName);
    }

    /**
     * Find an idle connection for a server
     */
    findIdleConnection(serverName) {
        const serverConnectionIds = this.serverPools.get(serverName);
        if (!serverConnectionIds) {
            return null;
        }

        for (const connectionId of serverConnectionIds) {
            const connection = this.connections.get(connectionId);
            if (connection && 
                connection.state === ConnectionState.IDLE && 
                connection.isHealthy()) {
                return connection;
            }
        }

        return null;
    }

    /**
     * Create a new connection
     */
    async createConnection(serverName) {
        const connectionId = `conn_${++this.connectionIdCounter}`;
        
        logger.info('Creating new connection', { serverName, connectionId });

        try {
            // Get server registry instance
            const serverRegistry = this.options.serverRegistry;
            if (!serverRegistry) {
                throw new Error('ServerRegistry not provided to ConnectionPool');
            }
            
            // Get server configuration
            const serverConfig = serverRegistry.getServerConfig(serverName);
            if (!serverConfig || !serverConfig.config) {
                throw new Error(`Server ${serverName} not found in registry`);
            }
            
            const { command, args, env } = serverConfig.config;
            if (!command) {
                throw new Error(`Server ${serverName} configuration missing command`);
            }
            
            // Create a new adapter for this connection
            const MCPAdapter = require('./MCPAdapter');
            const adapter = new MCPAdapter({
                name: `${serverName}-pool-${connectionId}`,
                version: '1.0.0'
            });

            // Connect with proper command and args
            await adapter.connectToServer(command, args || [], { env });

            // Create connection object
            const connection = new Connection(connectionId, serverName, adapter);
            connection.markBusy();

            // Store connection
            this.connections.set(connectionId, connection);
            
            // Track server association
            if (!this.serverPools.has(serverName)) {
                this.serverPools.set(serverName, new Set());
            }
            this.serverPools.get(serverName).add(connectionId);

            logger.info('Connection created successfully', { serverName, connectionId });
            this.emit('connectionCreated', { serverName, connectionId });

            return connection;

        } catch (error) {
            logger.error('Failed to create connection', { 
                serverName, 
                connectionId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Wait for a connection to become available
     */
    async waitForConnection(serverName) {
        return new Promise((resolve, reject) => {
            // Create waiting request
            const request = {
                resolve,
                reject,
                timestamp: Date.now(),
                serverName
            };

            // Add to waiting queue
            if (!this.waitingRequests.has(serverName)) {
                this.waitingRequests.set(serverName, []);
            }
            this.waitingRequests.get(serverName).push(request);

            // Set timeout
            setTimeout(() => {
                const queue = this.waitingRequests.get(serverName);
                if (queue) {
                    const index = queue.indexOf(request);
                    if (index !== -1) {
                        queue.splice(index, 1);
                        reject(new Error('Connection request timeout'));
                    }
                }
            }, this.options.connectionTimeout);
        });
    }

    /**
     * Process waiting requests for a server
     */
    processWaitingRequests(serverName) {
        const queue = this.waitingRequests.get(serverName);
        if (!queue || queue.length === 0) {
            return;
        }

        const connection = this.findIdleConnection(serverName);
        if (!connection) {
            return;
        }

        const request = queue.shift();
        if (request) {
            connection.markBusy();
            request.resolve(connection);
            logger.info('Fulfilled waiting request', { serverName, connectionId: connection.id });
        }
    }

    /**
     * Close a specific connection
     */
    async closeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return;
        }

        logger.info('Closing connection', { 
            connectionId, 
            serverName: connection.serverName 
        });

        connection.state = ConnectionState.CLOSING;

        try {
            // Disconnect the adapter
            if (connection.adapter) {
                await connection.adapter.disconnect();
            }

            // Remove from pools
            this.connections.delete(connectionId);
            const serverPool = this.serverPools.get(connection.serverName);
            if (serverPool) {
                serverPool.delete(connectionId);
                if (serverPool.size === 0) {
                    this.serverPools.delete(connection.serverName);
                }
            }

            connection.state = ConnectionState.CLOSED;
            logger.info('Connection closed', { connectionId });
            this.emit('connectionClosed', { 
                serverName: connection.serverName, 
                connectionId 
            });

        } catch (error) {
            logger.error('Error closing connection', { 
                connectionId, 
                error: error.message 
            });
        }
    }

    /**
     * Close all connections
     */
    async closeAll() {
        logger.info('Closing all connections', { 
            count: this.connections.size 
        });

        // Clear health check timer
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        // Close all connections
        const closePromises = [];
        for (const connectionId of this.connections.keys()) {
            closePromises.push(this.closeConnection(connectionId));
        }

        await Promise.all(closePromises);

        // Clear waiting requests
        for (const queue of this.waitingRequests.values()) {
            for (const request of queue) {
                request.reject(new Error('Connection pool closing'));
            }
        }
        this.waitingRequests.clear();

        logger.info('All connections closed');
        this.emit('poolClosed');
    }

    /**
     * Perform health check on all connections
     */
    async performHealthCheck() {
        logger.debug('Performing health check');

        const unhealthyConnections = [];
        const idleConnections = [];

        for (const [connectionId, connection] of this.connections) {
            // Check health
            if (!connection.isHealthy()) {
                unhealthyConnections.push(connectionId);
                continue;
            }

            // Check idle timeout
            if (connection.state === ConnectionState.IDLE && 
                connection.getIdleTime() > this.options.maxIdleTime) {
                idleConnections.push(connectionId);
            }

            // Check age
            if (connection.getAge() > this.options.maxConnectionAge) {
                idleConnections.push(connectionId);
            }
        }

        // Close unhealthy connections
        for (const connectionId of unhealthyConnections) {
            logger.info('Closing unhealthy connection', { connectionId });
            await this.closeConnection(connectionId);
        }

        // Close idle connections
        for (const connectionId of idleConnections) {
            logger.info('Closing idle connection', { connectionId });
            await this.closeConnection(connectionId);
        }

        this.emit('healthCheckCompleted', {
            total: this.connections.size,
            unhealthy: unhealthyConnections.length,
            idle: idleConnections.length
        });
    }

    /**
     * Get pool statistics
     */
    getStatistics() {
        const stats = {
            totalConnections: this.connections.size,
            maxConnections: this.options.maxConnections,
            connectionsByServer: {},
            connectionStates: {
                idle: 0,
                busy: 0,
                error: 0
            },
            waitingRequests: 0
        };

        // Count connections by server
        for (const [serverName, connectionIds] of this.serverPools) {
            stats.connectionsByServer[serverName] = connectionIds.size;
        }

        // Count connection states
        for (const connection of this.connections.values()) {
            if (connection.state === ConnectionState.IDLE) {
                stats.connectionStates.idle++;
            } else if (connection.state === ConnectionState.BUSY) {
                stats.connectionStates.busy++;
            } else if (connection.state === ConnectionState.ERROR) {
                stats.connectionStates.error++;
            }
        }

        // Count waiting requests
        for (const queue of this.waitingRequests.values()) {
            stats.waitingRequests += queue.length;
        }

        return stats;
    }
}

module.exports = ConnectionPool; 