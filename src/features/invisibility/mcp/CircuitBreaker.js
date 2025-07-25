/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by monitoring operation failures and temporarily
 * blocking operations when a threshold is exceeded
 */

const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[CircuitBreaker] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Circuit states
const CircuitState = {
    CLOSED: 'closed',      // Normal operation
    OPEN: 'open',          // Blocking operations
    HALF_OPEN: 'half-open' // Testing if service recovered
};

class CircuitBreaker extends EventEmitter {
    constructor(name, options = {}) {
        super();
        
        this.name = name;
        this.options = {
            failureThreshold: options.failureThreshold || 5,       // Failures before opening
            successThreshold: options.successThreshold || 2,       // Successes to close from half-open
            timeout: options.timeout || 60000,                     // Time to wait before half-open (1 minute)
            resetTimeout: options.resetTimeout || 120000,          // Time to reset failure count (2 minutes)
            volumeThreshold: options.volumeThreshold || 10,        // Min requests before opening
            errorThresholdPercentage: options.errorThresholdPercentage || 50, // Error percentage to open
            ...options
        };

        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.requests = 0;
        this.lastFailureTime = null;
        this.nextAttempt = null;
        this.stateChangeTime = Date.now();
        
        // Metrics for percentage-based thresholds
        this.metrics = {
            totalRequests: 0,
            failedRequests: 0,
            successfulRequests: 0,
            windowStart: Date.now()
        };

        // Rolling window for metrics (5 minutes)
        this.metricsWindow = options.metricsWindow || 300000;
        
        logger.info('CircuitBreaker initialized', { name, options: this.options });
    }

    /**
     * Execute an operation through the circuit breaker
     */
    async execute(operation) {
        // Check if circuit allows execution
        if (!this.canExecute()) {
            const error = new Error(`Circuit breaker is ${this.state} for ${this.name}`);
            error.code = 'CIRCUIT_BREAKER_OPEN';
            error.circuitState = this.state;
            logger.warn('Request rejected by circuit breaker', { 
                name: this.name, 
                state: this.state 
            });
            this.emit('rejected', { name: this.name, state: this.state });
            throw error;
        }

        // Update metrics
        this.requests++;
        this.updateMetrics();

        try {
            // Execute the operation
            const result = await operation();
            
            // Record success
            this.onSuccess();
            
            return result;
        } catch (error) {
            // Record failure
            this.onFailure(error);
            
            // Re-throw the error
            throw error;
        }
    }

    /**
     * Check if operation can be executed
     */
    canExecute() {
        if (this.state === CircuitState.CLOSED) {
            return true;
        }

        if (this.state === CircuitState.OPEN) {
            // Check if we should transition to half-open
            if (Date.now() >= this.nextAttempt) {
                this.transitionTo(CircuitState.HALF_OPEN);
                return true;
            }
            return false;
        }

        // Half-open state - allow limited requests
        return true;
    }

    /**
     * Handle successful operation
     */
    onSuccess() {
        this.successes++;
        this.metrics.successfulRequests++;
        this.metrics.totalRequests++;

        logger.debug('Operation succeeded', { 
            name: this.name, 
            state: this.state,
            successes: this.successes 
        });

        if (this.state === CircuitState.HALF_OPEN) {
            if (this.successes >= this.options.successThreshold) {
                // Circuit has recovered
                this.transitionTo(CircuitState.CLOSED);
            }
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count after successful operations
            if (this.failures > 0 && 
                this.lastFailureTime && 
                Date.now() - this.lastFailureTime > this.options.resetTimeout) {
                this.failures = 0;
                logger.info('Reset failure count after timeout', { name: this.name });
            }
        }

        this.emit('success', { 
            name: this.name, 
            state: this.state,
            metrics: this.getMetrics() 
        });
    }

    /**
     * Handle failed operation
     */
    onFailure(error) {
        this.failures++;
        this.lastFailureTime = Date.now();
        this.metrics.failedRequests++;
        this.metrics.totalRequests++;

        logger.warn('Operation failed', { 
            name: this.name, 
            state: this.state,
            failures: this.failures,
            error: error.message 
        });

        if (this.state === CircuitState.HALF_OPEN) {
            // Failure in half-open state reopens the circuit
            this.transitionTo(CircuitState.OPEN);
        } else if (this.state === CircuitState.CLOSED) {
            // Check if we should open the circuit
            if (this.shouldOpen()) {
                this.transitionTo(CircuitState.OPEN);
            }
        }

        this.emit('failure', { 
            name: this.name, 
            state: this.state,
            error: error.message,
            metrics: this.getMetrics() 
        });
    }

    /**
     * Check if circuit should open
     */
    shouldOpen() {
        // Check absolute failure threshold
        if (this.failures >= this.options.failureThreshold) {
            return true;
        }

        // Check percentage-based threshold
        const metrics = this.getMetrics();
        if (metrics.totalRequests >= this.options.volumeThreshold) {
            const errorPercentage = (metrics.failedRequests / metrics.totalRequests) * 100;
            if (errorPercentage >= this.options.errorThresholdPercentage) {
                logger.info('Opening circuit due to error percentage', {
                    name: this.name,
                    errorPercentage,
                    threshold: this.options.errorThresholdPercentage
                });
                return true;
            }
        }

        return false;
    }

    /**
     * Transition to a new state
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        this.stateChangeTime = Date.now();

        logger.info('Circuit breaker state transition', {
            name: this.name,
            from: oldState,
            to: newState
        });

        switch (newState) {
            case CircuitState.OPEN:
                this.nextAttempt = Date.now() + this.options.timeout;
                this.successes = 0;
                break;
                
            case CircuitState.HALF_OPEN:
                this.failures = 0;
                this.successes = 0;
                break;
                
            case CircuitState.CLOSED:
                this.failures = 0;
                this.successes = 0;
                this.nextAttempt = null;
                break;
        }

        this.emit('stateChange', {
            name: this.name,
            from: oldState,
            to: newState,
            timestamp: this.stateChangeTime
        });
    }

    /**
     * Update rolling window metrics
     */
    updateMetrics() {
        const now = Date.now();
        
        // Reset metrics if window has passed
        if (now - this.metrics.windowStart > this.metricsWindow) {
            this.metrics = {
                totalRequests: 0,
                failedRequests: 0,
                successfulRequests: 0,
                windowStart: now
            };
        }
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        const errorRate = this.metrics.totalRequests > 0 
            ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100 
            : 0;

        return {
            state: this.state,
            totalRequests: this.metrics.totalRequests,
            failedRequests: this.metrics.failedRequests,
            successfulRequests: this.metrics.successfulRequests,
            errorRate: errorRate.toFixed(2) + '%',
            failures: this.failures,
            successes: this.successes,
            stateChangeTime: this.stateChangeTime,
            nextAttempt: this.nextAttempt
        };
    }

    /**
     * Force open the circuit
     */
    forceOpen() {
        logger.warn('Forcing circuit breaker open', { name: this.name });
        this.transitionTo(CircuitState.OPEN);
    }

    /**
     * Force close the circuit
     */
    forceClose() {
        logger.warn('Forcing circuit breaker closed', { name: this.name });
        this.transitionTo(CircuitState.CLOSED);
    }

    /**
     * Reset the circuit breaker
     */
    reset() {
        logger.info('Resetting circuit breaker', { name: this.name });
        this.transitionTo(CircuitState.CLOSED);
        this.failures = 0;
        this.successes = 0;
        this.requests = 0;
        this.lastFailureTime = null;
        this.metrics = {
            totalRequests: 0,
            failedRequests: 0,
            successfulRequests: 0,
            windowStart: Date.now()
        };
    }

    /**
     * Get circuit breaker status
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            metrics: this.getMetrics(),
            options: this.options,
            isOpen: this.state === CircuitState.OPEN,
            isHalfOpen: this.state === CircuitState.HALF_OPEN,
            isClosed: this.state === CircuitState.CLOSED
        };
    }
}

// Circuit Breaker Manager for managing multiple breakers
class CircuitBreakerManager {
    constructor() {
        this.breakers = new Map();
        logger.info('CircuitBreakerManager initialized');
    }

    /**
     * Get or create a circuit breaker
     */
    getBreaker(name, options) {
        if (!this.breakers.has(name)) {
            const breaker = new CircuitBreaker(name, options);
            this.breakers.set(name, breaker);
            logger.info('Created new circuit breaker', { name });
        }
        return this.breakers.get(name);
    }

    /**
     * Execute operation through a named circuit breaker
     */
    async execute(name, operation, options) {
        const breaker = this.getBreaker(name, options);
        return await breaker.execute(operation);
    }

    /**
     * Get all circuit breaker statuses
     */
    getAllStatuses() {
        const statuses = {};
        for (const [name, breaker] of this.breakers) {
            statuses[name] = breaker.getStatus();
        }
        return statuses;
    }

    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
        logger.info('Reset all circuit breakers');
    }

    /**
     * Remove a circuit breaker
     */
    removeBreaker(name) {
        if (this.breakers.has(name)) {
            this.breakers.delete(name);
            logger.info('Removed circuit breaker', { name });
        }
    }
}

module.exports = {
    CircuitBreaker,
    CircuitBreakerManager,
    CircuitState
}; 