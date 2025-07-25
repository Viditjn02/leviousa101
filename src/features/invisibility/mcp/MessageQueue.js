/**
 * Message Queue
 * Handles message queuing, ordering, and delivery for MCP communications
 * Replaces manual buffer management with a robust queue system
 */

const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[MessageQueue] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Message priority levels
const MessagePriority = {
    HIGH: 1,
    NORMAL: 2,
    LOW: 3
};

// Message types
const MessageType = {
    REQUEST: 'request',
    RESPONSE: 'response',
    NOTIFICATION: 'notification',
    ERROR: 'error'
};

class Message {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.type = data.type || MessageType.REQUEST;
        this.priority = data.priority || MessagePriority.NORMAL;
        this.payload = data.payload;
        this.timestamp = Date.now();
        this.retries = 0;
        this.maxRetries = data.maxRetries || 3;
        this.timeout = data.timeout || 30000; // 30 seconds
        this.callback = data.callback;
        this.deferred = data.deferred;
    }

    generateId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isExpired() {
        return Date.now() - this.timestamp > this.timeout;
    }

    canRetry() {
        return this.retries < this.maxRetries;
    }

    incrementRetries() {
        this.retries++;
        this.timestamp = Date.now(); // Reset timestamp for retry
    }
}

class MessageQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            maxQueueSize: options.maxQueueSize || 1000,
            processingConcurrency: options.processingConcurrency || 5,
            retryDelay: options.retryDelay || 1000,
            deadLetterQueueEnabled: options.deadLetterQueueEnabled !== false,
            persistenceEnabled: options.persistenceEnabled || false,
            ...options
        };

        // Main message queue
        this.queue = [];
        
        // Dead letter queue for failed messages
        this.deadLetterQueue = [];
        
        // In-flight messages (being processed)
        this.inFlight = new Map();
        
        // Response handlers for request-response pattern
        this.responseHandlers = new Map();
        
        // Track processing state
        this.activeProcessors = 0;
        
        // Statistics
        this.stats = {
            enqueued: 0,
            processed: 0,
            failed: 0,
            retried: 0,
            deadLettered: 0
        };

        // Start processing
        this.isProcessing = false;
        
        logger.info('MessageQueue initialized', { options: this.options });
    }

    /**
     * Enqueue a message
     */
    async enqueue(messageData) {
        if (this.queue.length >= this.options.maxQueueSize) {
            const error = new Error('Queue is full');
            error.code = 'QUEUE_FULL';
            logger.error('Failed to enqueue message - queue full', { 
                queueSize: this.queue.length,
                maxSize: this.options.maxQueueSize
            });
            throw error;
        }

        const message = new Message(messageData);
        
        // Insert based on priority
        const insertIndex = this.findInsertIndex(message.priority);
        this.queue.splice(insertIndex, 0, message);
        
        this.stats.enqueued++;
        
        logger.debug('Message enqueued', {
            id: message.id,
            type: message.type,
            priority: message.priority,
            queueLength: this.queue.length
        });
        
        this.emit('enqueued', { message, queueLength: this.queue.length });
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.startProcessing();
        }
        
        return message.id;
    }

    /**
     * Send a request and wait for response
     */
    async request(payload, options = {}) {
        return new Promise((resolve, reject) => {
            const messageId = this.generateRequestId();
            
            // Set up response handler
            this.responseHandlers.set(messageId, {
                resolve,
                reject,
                timeout: setTimeout(() => {
                    this.responseHandlers.delete(messageId);
                    reject(new Error('Request timeout'));
                }, options.timeout || 30000)
            });
            
            // Enqueue the request
            this.enqueue({
                id: messageId,
                type: MessageType.REQUEST,
                priority: options.priority || MessagePriority.NORMAL,
                payload: {
                    ...payload,
                    id: messageId
                },
                callback: (error, response) => {
                    const handler = this.responseHandlers.get(messageId);
                    if (handler) {
                        clearTimeout(handler.timeout);
                        this.responseHandlers.delete(messageId);
                        
                        if (error) {
                            handler.reject(error);
                        } else {
                            handler.resolve(response);
                        }
                    }
                }
            }).catch(reject);
        });
    }

    /**
     * Process a response message
     */
    processResponse(responseData) {
        const requestId = responseData.id;
        const handler = this.responseHandlers.get(requestId);
        
        if (handler) {
            clearTimeout(handler.timeout);
            this.responseHandlers.delete(requestId);
            
            if (responseData.error) {
                handler.reject(new Error(responseData.error.message || 'Unknown error'));
            } else {
                handler.resolve(responseData.result);
            }
        } else {
            logger.warn('Received response for unknown request', { requestId });
        }
    }

    /**
     * Find insertion index based on priority
     */
    findInsertIndex(priority) {
        for (let i = 0; i < this.queue.length; i++) {
            if (this.queue[i].priority > priority) {
                return i;
            }
        }
        return this.queue.length;
    }

    /**
     * Start processing messages
     */
    startProcessing() {
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        logger.info('Started message processing');
        
        this.processNext();
    }

    /**
     * Stop processing messages
     */
    stopProcessing() {
        this.isProcessing = false;
        logger.info('Stopped message processing');
    }

    /**
     * Process next message in queue
     */
    async processNext() {
        if (!this.isProcessing || this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        // Get next message
        const message = this.queue.shift();
        
        // Check if message is expired
        if (message.isExpired()) {
            logger.warn('Message expired', { id: message.id });
            this.handleExpiredMessage(message);
            this.processNext();
            return;
        }
        
        // Check concurrency limit
        if (this.activeProcessors >= this.options.processingConcurrency) {
            // Put message back and wait
            this.queue.unshift(message);
            setTimeout(() => this.processNext(), 10);
            return;
        }
        
        // Process the message
        this.activeProcessors++;
        this.processMessage(message)
            .finally(() => {
                this.activeProcessors--;
                // Continue processing
                setImmediate(() => this.processNext());
            })
            .catch(error => {
                logger.error('Error processing message', { error: error.message });
            });
    }

    /**
     * Process a single message
     */
    async processMessage(message) {
        logger.debug('Processing message', { 
            id: message.id, 
            type: message.type 
        });
        
        this.inFlight.set(message.id, message);
        
        try {
            // Emit for external processors
            const processed = await this.emitAndWait('process', message);
            
            if (!processed && message.callback) {
                // Use internal callback if no external processor
                await message.callback(null, message.payload);
            }
            
            this.stats.processed++;
            this.inFlight.delete(message.id);
            
            logger.debug('Message processed successfully', { id: message.id });
            this.emit('processed', { message });
            
        } catch (error) {
            logger.error('Failed to process message', { 
                id: message.id, 
                error: error.message 
            });
            
            this.inFlight.delete(message.id);
            await this.handleFailedMessage(message, error);
        }
    }

    /**
     * Handle failed message
     */
    async handleFailedMessage(message, error) {
        this.stats.failed++;
        
        if (message.canRetry()) {
            // Retry the message
            message.incrementRetries();
            this.stats.retried++;
            
            logger.info('Retrying message', { 
                id: message.id, 
                retries: message.retries,
                maxRetries: message.maxRetries
            });
            
            // Re-enqueue with delay
            setTimeout(() => {
                this.queue.unshift(message); // Add to front for retry
                this.emit('retry', { message, error });
                
                if (!this.isProcessing) {
                    this.startProcessing();
                }
            }, this.options.retryDelay);
            
        } else if (this.options.deadLetterQueueEnabled) {
            // Move to dead letter queue
            this.deadLetterQueue.push({
                message,
                error: error.message,
                failedAt: Date.now()
            });
            
            this.stats.deadLettered++;
            
            logger.warn('Message moved to dead letter queue', { 
                id: message.id,
                error: error.message
            });
            
            this.emit('deadLettered', { message, error });
            
            // Call error callback if exists
            if (message.callback) {
                message.callback(error);
            }
        }
    }

    /**
     * Handle expired message
     */
    handleExpiredMessage(message) {
        const error = new Error('Message expired');
        error.code = 'MESSAGE_EXPIRED';
        
        if (message.callback) {
            message.callback(error);
        }
        
        this.emit('expired', { message });
        
        // Move to dead letter queue if enabled
        if (this.options.deadLetterQueueEnabled) {
            this.deadLetterQueue.push({
                message,
                error: 'Expired',
                failedAt: Date.now()
            });
            this.stats.deadLettered++;
        }
    }

    /**
     * Emit event and wait for handler
     */
    async emitAndWait(event, data) {
        const listeners = this.listeners(event);
        if (listeners.length === 0) {
            return false;
        }
        
        for (const listener of listeners) {
            await listener(data);
        }
        
        return true;
    }

    /**
     * Clear the queue
     */
    clear() {
        const clearedCount = this.queue.length;
        this.queue = [];
        logger.info('Queue cleared', { clearedCount });
        this.emit('cleared', { clearedCount });
    }

    /**
     * Get queue statistics
     */
    getStatistics() {
        return {
            queueLength: this.queue.length,
            inFlightCount: this.inFlight.size,
            deadLetterCount: this.deadLetterQueue.length,
            responseHandlersCount: this.responseHandlers.size,
            stats: { ...this.stats },
            isProcessing: this.isProcessing
        };
    }

    /**
     * Get queue health status
     */
    getHealthStatus() {
        const stats = this.getStatistics();
        const queueUtilization = (this.queue.length / this.options.maxQueueSize) * 100;
        
        return {
            healthy: queueUtilization < 80 && this.isProcessing,
            queueUtilization: queueUtilization.toFixed(2) + '%',
            processingRate: this.stats.processed > 0 
                ? (this.stats.processed / (this.stats.processed + this.stats.failed) * 100).toFixed(2) + '%'
                : '0%',
            ...stats
        };
    }

    /**
     * Process dead letter queue
     */
    async processDeadLetterQueue(handler) {
        const messages = [...this.deadLetterQueue];
        this.deadLetterQueue = [];
        
        logger.info('Processing dead letter queue', { count: messages.length });
        
        for (const item of messages) {
            try {
                await handler(item.message, item.error);
            } catch (error) {
                logger.error('Error processing dead letter message', {
                    id: item.message.id,
                    error: error.message
                });
            }
        }
    }

    /**
     * Generate request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Destroy the queue
     */
    destroy() {
        this.stopProcessing();
        
        // Clear all timeouts
        for (const handler of this.responseHandlers.values()) {
            clearTimeout(handler.timeout);
        }
        
        this.queue = [];
        this.deadLetterQueue = [];
        this.inFlight.clear();
        this.responseHandlers.clear();
        
        logger.info('MessageQueue destroyed');
        this.emit('destroyed');
    }
}

module.exports = {
    MessageQueue,
    MessagePriority,
    MessageType
}; 