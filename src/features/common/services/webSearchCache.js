/**
 * Web Search Cache Service
 * Provides caching for web search results to improve performance
 * and reduce API calls for similar queries
 */

class WebSearchCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000; // PERFORMANCE: Increased to 1000 entries
        this.ttl = options.ttl || 60 * 60 * 1000; // PERFORMANCE: 1 hour TTL (was 5 min)
        this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute cleanup
        
        // PERFORMANCE: Add aggressive prefetching cache
        this.prefetchCache = new Map();
        this.commonQueries = new Set([
            'elon musk', 'tesla news', 'openai news', 'tech news today',
            'stock market', 'crypto news', 'ai developments', 'startup news'
        ]);
        
        // Start periodic cleanup and prefetching
        this.startCleanup();
        this.startPrefetching();
    }

    /**
     * Generate cache key from search parameters
     */
    generateKey(query, searchType = 'general', context = '') {
        const normalizedQuery = query.toLowerCase().trim();
        return `${normalizedQuery}|${searchType}|${context}`.substring(0, 200);
    }

    /**
     * Check if a cache entry is expired
     */
    isExpired(entry) {
        return Date.now() - entry.timestamp > this.ttl;
    }

    /**
     * Get cached result if available and not expired
     */
    get(query, searchType, context) {
        const key = this.generateKey(query, searchType, context);
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }
        
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return null;
        }
        
        // Update access time for LRU
        entry.lastAccess = Date.now();
        return entry.result;
    }

    /**
     * Cache a search result with aggressive optimization
     */
    set(query, searchType, context, result) {
        // Don't cache if result is null or empty
        if (!result) {
            return;
        }
        
        const key = this.generateKey(query, searchType, context);
        
        // Enforce cache size limit
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        const entry = {
            result,
            timestamp: Date.now(),
            lastAccess: Date.now(),
            query,
            searchType,
            context,
            // PERFORMANCE: Add hit count for popularity tracking
            hitCount: 0,
            compressed: JSON.stringify(result).length > 2000 // Mark for compression if large
        };
        
        this.cache.set(key, entry);
        
        // PERFORMANCE: Also cache variations of the query for better hit rate
        this.cacheVariations(query, searchType, context, result);
        
        console.log(`[WebSearchCache] 🚀 Cached result for: ${query} (${this.cache.size}/${this.maxSize})`);
    }

    /**
     * Evict the oldest entry based on last access time
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Start periodic cleanup of expired entries
     */
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }
    
    /**
     * PERFORMANCE: Start prefetching common queries
     */
    startPrefetching() {
        // Prefetch common queries every 30 minutes
        setInterval(async () => {
            console.log('[WebSearchCache] 🚀 Starting prefetch of common queries...');
            for (const query of this.commonQueries) {
                if (!this.get(query, 'general', '')) {
                    // Queue for background prefetching (don't block)
                    setTimeout(() => this.prefetchQuery(query), Math.random() * 10000);
                }
            }
        }, 30 * 60 * 1000); // Every 30 minutes
    }
    
    /**
     * PERFORMANCE: Cache variations of queries for better hit rate
     */
    cacheVariations(originalQuery, searchType, context, result) {
        const variations = [
            originalQuery.toLowerCase(),
            originalQuery.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
            originalQuery.split(' ').slice(0, 2).join(' '), // First 2 words
        ];
        
        variations.forEach(variation => {
            if (variation !== originalQuery && variation.length > 2) {
                const varKey = this.generateKey(variation, searchType, context);
                if (!this.cache.has(varKey)) {
                    this.cache.set(varKey, {
                        query: variation,
                        searchType,
                        context,
                        result,
                        timestamp: Date.now(),
                        lastAccess: Date.now(),
                        hitCount: 0,
                        isVariation: true
                    });
                }
            }
        });
    }
    
    /**
     * PERFORMANCE: Background prefetch of query
     */
    async prefetchQuery(query) {
        try {
            // This would need to be implemented to call the actual web search
            // For now, just mark as prefetched
            console.log(`[WebSearchCache] 📡 Would prefetch: ${query}`);
        } catch (error) {
            console.warn('[WebSearchCache] Prefetch failed:', error.message);
        }
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        const expired = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                expired.push(key);
            }
        }
        
        expired.forEach(key => this.cache.delete(key));
        
        if (expired.length > 0) {
            console.log(`[WebSearchCache] Cleaned up ${expired.length} expired entries`);
        }
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let expired = 0;
        
        for (const entry of this.cache.values()) {
            if (now - entry.timestamp > this.ttl) {
                expired++;
            }
        }
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            expired,
            active: this.cache.size - expired,
            ttl: this.ttl,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage of cache
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            totalSize += key.length * 2; // String characters are 2 bytes
            totalSize += JSON.stringify(entry.result).length * 2;
            totalSize += 64; // Estimated overhead for object structure
        }
        
        return totalSize;
    }

    /**
     * Check if two queries are similar enough to share cache
     */
    areSimilarQueries(query1, query2, threshold = 0.8) {
        const words1 = query1.toLowerCase().split(/\s+/);
        const words2 = query2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        const totalUniqueWords = new Set([...words1, ...words2]).size;
        
        const similarity = (commonWords.length * 2) / (words1.length + words2.length);
        return similarity >= threshold;
    }

    /**
     * Find similar cached queries
     */
    findSimilarCached(query, searchType, context) {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.searchType === searchType && 
                entry.context === context && 
                !this.isExpired(entry) &&
                this.areSimilarQueries(query, entry.query)) {
                
                // Update access time
                entry.lastAccess = Date.now();
                return entry.result;
            }
        }
        return null;
    }

    /**
     * Destroy the cache and cleanup timers
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
    }
}

// Singleton instance for global use
let globalWebSearchCache = null;

/**
 * Get or create the global web search cache instance
 */
function getWebSearchCache(options = {}) {
    if (!globalWebSearchCache) {
        globalWebSearchCache = new WebSearchCache(options);
    }
    return globalWebSearchCache;
}

module.exports = { WebSearchCache, getWebSearchCache };
