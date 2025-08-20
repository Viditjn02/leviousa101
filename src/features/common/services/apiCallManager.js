/**
 * API Call Manager with Exponential Backoff and Rate Limiting
 * Optimizes API response times and handles rate limits gracefully
 */

class APICallManager {
    constructor(options = {}) {
        this.options = {
            // Exponential backoff settings
            initialDelay: options.initialDelay || 1000, // 1 second
            maxDelay: options.maxDelay || 30000, // 30 seconds  
            backoffMultiplier: options.backoffMultiplier || 2,
            maxRetries: options.maxRetries || 3,
            
            // Rate limiting settings
            maxConcurrentRequests: options.maxConcurrentRequests || 5,
            requestsPerSecond: options.requestsPerSecond || 10,
            
            // Request timeout settings
            requestTimeout: options.requestTimeout || 10000, // 10 seconds
            
            // Circuit breaker settings
            circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: options.circuitBreakerTimeout || 60000, // 1 minute
            
            ...options
        };
        
        // State tracking
        this.activeRequests = 0;
        this.requestQueue = [];
        this.requestTimes = [];
        this.failedRequests = 0;
        this.circuitBreakerOpen = false;
        this.circuitBreakerOpenTime = null;
        
        // Request batching
        this.pendingBatches = new Map();
        this.batchDelay = options.batchDelay || 100; // 100ms delay for batching
        
        console.log('[APICallManager] Initialized with options:', this.options);
    }

    /**
     * Make an API call with exponential backoff and rate limiting
     */
    async makeAPICall(url, options = {}, metadata = {}) {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen()) {
            throw new Error('Circuit breaker is open - API calls temporarily disabled');
        }
        
        // Apply rate limiting
        await this.waitForRateLimit();
        
        // Track request timing
        const startTime = Date.now();
        this.activeRequests++;
        
        try {
            const result = await this.executeWithRetry(url, options, metadata);
            
            // Success - reset circuit breaker state
            this.failedRequests = 0;
            this.recordRequestTime(Date.now() - startTime);
            
            return result;
            
        } catch (error) {
            this.failedRequests++;
            
            // Open circuit breaker if too many failures
            if (this.failedRequests >= this.options.circuitBreakerThreshold) {
                this.openCircuitBreaker();
            }
            
            throw error;
        } finally {
            this.activeRequests--;
        }
    }

    /**
     * Execute API call with exponential backoff retry
     */
    async executeWithRetry(url, options, metadata, attempt = 1) {
        try {
            console.log(`[APICallManager] Making API call (attempt ${attempt}):`, {
                url: typeof url === 'string' ? url : 'fetch_request',
                metadata
            });
            
            // Add timeout to request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.requestTimeout);
            
            const requestOptions = {
                ...options,
                signal: controller.signal
            };
            
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            
            // Handle rate limit responses
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateBackoffDelay(attempt);
                
                console.log(`[APICallManager] Rate limited, retrying after ${delay}ms`);
                throw new RateLimitError(`Rate limited - retry after ${delay}ms`, delay);
            }
            
            // Handle other HTTP errors
            if (!response.ok) {
                throw new HTTPError(`HTTP ${response.status}: ${response.statusText}`, response.status);
            }
            
            return response;
            
        } catch (error) {
            if (attempt >= this.options.maxRetries) {
                console.error(`[APICallManager] Final attempt failed:`, error.message);
                throw error;
            }
            
            // Determine delay based on error type
            let delay;
            if (error instanceof RateLimitError) {
                delay = error.retryDelay;
            } else if (error.name === 'AbortError') {
                delay = this.calculateBackoffDelay(attempt);
                console.log(`[APICallManager] Request timeout, retrying after ${delay}ms`);
            } else {
                delay = this.calculateBackoffDelay(attempt);
                console.log(`[APICallManager] Error occurred, retrying after ${delay}ms:`, error.message);
            }
            
            await this.sleep(delay);
            return this.executeWithRetry(url, options, metadata, attempt + 1);
        }
    }

    /**
     * Calculate exponential backoff delay
     */
    calculateBackoffDelay(attempt) {
        const delay = this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        
        return Math.min(delay + jitter, this.options.maxDelay);
    }

    /**
     * Wait for rate limit compliance
     */
    async waitForRateLimit() {
        // Clean up old request times (older than 1 second)
        const now = Date.now();
        this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
        
        // Wait if too many concurrent requests
        while (this.activeRequests >= this.options.maxConcurrentRequests) {
            await this.sleep(50);
        }
        
        // Wait if too many requests per second
        if (this.requestTimes.length >= this.options.requestsPerSecond) {
            const oldestRequestTime = this.requestTimes[0];
            const waitTime = 1000 - (now - oldestRequestTime);
            
            if (waitTime > 0) {
                console.log(`[APICallManager] Rate limiting: waiting ${waitTime}ms`);
                await this.sleep(waitTime);
            }
        }
        
        this.requestTimes.push(now);
    }

    /**
     * Check if circuit breaker is open
     */
    isCircuitBreakerOpen() {
        if (!this.circuitBreakerOpen) return false;
        
        // Check if circuit breaker should be closed
        if (Date.now() - this.circuitBreakerOpenTime > this.options.circuitBreakerTimeout) {
            console.log('[APICallManager] Circuit breaker timeout elapsed - closing circuit breaker');
            this.circuitBreakerOpen = false;
            this.circuitBreakerOpenTime = null;
            this.failedRequests = 0;
            return false;
        }
        
        return true;
    }

    /**
     * Open circuit breaker
     */
    openCircuitBreaker() {
        console.log(`[APICallManager] Opening circuit breaker after ${this.failedRequests} failures`);
        this.circuitBreakerOpen = true;
        this.circuitBreakerOpenTime = Date.now();
    }

    /**
     * Record successful request time for monitoring
     */
    recordRequestTime(duration) {
        // Keep only recent request times for performance monitoring
        if (!this.performanceMetrics) {
            this.performanceMetrics = [];
        }
        
        this.performanceMetrics.push({
            timestamp: Date.now(),
            duration
        });
        
        // Keep only last 100 metrics
        if (this.performanceMetrics.length > 100) {
            this.performanceMetrics = this.performanceMetrics.slice(-100);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        if (!this.performanceMetrics || this.performanceMetrics.length === 0) {
            return null;
        }
        
        const durations = this.performanceMetrics.map(m => m.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        return {
            totalRequests: this.performanceMetrics.length,
            avgResponseTime: Math.round(avgDuration),
            minResponseTime: minDuration,
            maxResponseTime: maxDuration,
            activeRequests: this.activeRequests,
            circuitBreakerOpen: this.circuitBreakerOpen,
            failedRequests: this.failedRequests
        };
    }

    /**
     * Batch similar requests together
     */
    async batchRequest(batchKey, requestFn) {
        if (this.pendingBatches.has(batchKey)) {
            // Wait for existing batch
            return await this.pendingBatches.get(batchKey);
        }
        
        // Create new batch
        const batchPromise = this.createBatch(batchKey, requestFn);
        this.pendingBatches.set(batchKey, batchPromise);
        
        return await batchPromise;
    }

    /**
     * Create and execute a batch request
     */
    async createBatch(batchKey, requestFn) {
        try {
            // Wait for batch delay to collect similar requests
            await this.sleep(this.batchDelay);
            
            // Execute the batch
            const result = await requestFn();
            
            return result;
            
        } finally {
            // Remove batch from pending
            this.pendingBatches.delete(batchKey);
        }
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            activeRequests: this.activeRequests,
            queuedRequests: this.requestQueue.length,
            circuitBreakerOpen: this.circuitBreakerOpen,
            failedRequests: this.failedRequests,
            requestsPerSecondCurrent: this.requestTimes.length,
            performanceStats: this.getPerformanceStats()
        };
    }

    /**
     * Reset state (useful for testing)
     */
    reset() {
        this.activeRequests = 0;
        this.requestQueue = [];
        this.requestTimes = [];
        this.failedRequests = 0;
        this.circuitBreakerOpen = false;
        this.circuitBreakerOpenTime = null;
        this.pendingBatches.clear();
        this.performanceMetrics = [];
    }
}

// Custom error classes
class RateLimitError extends Error {
    constructor(message, retryDelay) {
        super(message);
        this.name = 'RateLimitError';
        this.retryDelay = retryDelay;
    }
}

class HTTPError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'HTTPError';
        this.status = status;
    }
}

// Export singleton instance
let instance = null;

function getAPICallManager(options = {}) {
    if (!instance) {
        instance = new APICallManager(options);
    }
    return instance;
}

module.exports = {
    APICallManager,
    RateLimitError,
    HTTPError,
    getAPICallManager
};
