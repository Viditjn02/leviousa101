/**
 * LLM Cache Service
 * Advanced caching with semantic similarity, compression, and tiered storage
 */

const { LRUCache } = require('lru-cache');
const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class LLMCacheService {
    constructor(options = {}) {
        const {
            maxMemoryItems = 1000,
            maxDiskItems = 10000,
            ttl = 1000 * 60 * 30, // 30 minutes default
            cacheDir = path.join(process.cwd(), '.llm-cache'),
            compressionThreshold = 1024, // Compress responses > 1KB
            similarityThreshold = 0.85,
        } = options;
        
        // In-memory cache (L1)
        this.memoryCache = new LRUCache({
            max: maxMemoryItems,
            ttl,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
            dispose: (value, key) => {
                // Move to disk cache when evicted from memory
                this.moveToDisk(key, value).catch(console.error);
            },
        });
        
        // Disk cache metadata (L2)
        this.diskCacheIndex = new Map();
        this.maxDiskItems = maxDiskItems;
        this.cacheDir = cacheDir;
        this.compressionThreshold = compressionThreshold;
        
        // Semantic similarity index
        this.semanticIndex = new Map();
        this.similarityThreshold = similarityThreshold;
        
        // Statistics
        this.stats = {
            memoryHits: 0,
            diskHits: 0,
            misses: 0,
            semanticMatches: 0,
            compressionSaves: 0,
            totalSaved: 0,
            totalRequests: 0,
        };
        
        // Initialize disk cache
        this.initializeDiskCache().catch(console.error);
    }
    
    /**
     * Initialize disk cache directory
     */
    async initializeDiskCache() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            
            // Load existing disk cache index
            const indexPath = path.join(this.cacheDir, 'index.json');
            try {
                const indexData = await fs.readFile(indexPath, 'utf8');
                const index = JSON.parse(indexData);
                this.diskCacheIndex = new Map(index);
            } catch (e) {
                // Index doesn't exist yet
            }
        } catch (error) {
            console.error('[LLMCache] Failed to initialize disk cache:', error);
        }
    }
    
    /**
     * Get cached response
     */
    async get(prompt, options = {}) {
        this.stats.totalRequests++;
        
        const key = this.generateKey(prompt, options);
        
        // Check L1 (memory cache)
        const memoryResult = this.memoryCache.get(key);
        if (memoryResult) {
            this.stats.memoryHits++;
            return this.decompress(memoryResult);
        }
        
        // Check L2 (disk cache)
        const diskResult = await this.getFromDisk(key);
        if (diskResult) {
            this.stats.diskHits++;
            // Promote to memory cache
            this.memoryCache.set(key, diskResult);
            return this.decompress(diskResult);
        }
        
        // Check semantic similarity
        if (options.useSemantic !== false) {
            const semanticResult = await this.findSimilar(prompt, options);
            if (semanticResult) {
                this.stats.semanticMatches++;
                return semanticResult;
            }
        }
        
        this.stats.misses++;
        return null;
    }
    
    /**
     * Set cached response
     */
    async set(prompt, response, options = {}) {
        const key = this.generateKey(prompt, options);
        
        // Compress if needed
        const compressed = await this.compress(response);
        
        // Store in memory cache
        this.memoryCache.set(key, compressed);
        
        // Update semantic index
        this.updateSemanticIndex(key, prompt, response);
        
        // Track statistics
        if (compressed.compressed) {
            this.stats.compressionSaves++;
            this.stats.totalSaved += compressed.originalSize - compressed.size;
        }
        
        // Persist index periodically
        if (this.stats.totalRequests % 100 === 0) {
            this.persistIndex().catch(console.error);
        }
        
        return key;
    }
    
    /**
     * Generate cache key
     */
    generateKey(prompt, options = {}) {
        const keyData = {
            prompt,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
        };
        
        const hash = crypto
            .createHash('sha256')
            .update(JSON.stringify(keyData))
            .digest('hex');
        
        return hash.substring(0, 16);
    }
    
    /**
     * Compress response if beneficial
     */
    async compress(response) {
        const original = Buffer.from(JSON.stringify(response));
        
        if (original.length < this.compressionThreshold) {
            return {
                data: response,
                compressed: false,
                size: original.length,
                originalSize: original.length,
            };
        }
        
        try {
            const compressed = await gzip(original, { level: 6 });
            
            // Only use compression if it saves space
            if (compressed.length < original.length * 0.9) {
                return {
                    data: compressed.toString('base64'),
                    compressed: true,
                    size: compressed.length,
                    originalSize: original.length,
                };
            }
        } catch (error) {
            console.error('[LLMCache] Compression failed:', error);
        }
        
        return {
            data: response,
            compressed: false,
            size: original.length,
            originalSize: original.length,
        };
    }
    
    /**
     * Decompress response if needed
     */
    async decompress(cached) {
        if (!cached.compressed) {
            return cached.data;
        }
        
        try {
            const buffer = Buffer.from(cached.data, 'base64');
            const decompressed = await gunzip(buffer);
            return JSON.parse(decompressed.toString());
        } catch (error) {
            console.error('[LLMCache] Decompression failed:', error);
            return null;
        }
    }
    
    /**
     * Get from disk cache
     */
    async getFromDisk(key) {
        if (!this.diskCacheIndex.has(key)) {
            return null;
        }
        
        const metadata = this.diskCacheIndex.get(key);
        const filePath = path.join(this.cacheDir, `${key}.cache`);
        
        try {
            // Check if file is expired
            if (metadata.expiry && Date.now() > metadata.expiry) {
                await this.removeFromDisk(key);
                return null;
            }
            
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is corrupted
            this.diskCacheIndex.delete(key);
            return null;
        }
    }
    
    /**
     * Move to disk cache when evicted from memory
     */
    async moveToDisk(key, value) {
        // Check disk cache size limit
        if (this.diskCacheIndex.size >= this.maxDiskItems) {
            // Remove oldest entries
            const toRemove = Math.floor(this.maxDiskItems * 0.1); // Remove 10%
            const entries = Array.from(this.diskCacheIndex.entries())
                .sort((a, b) => a[1].created - b[1].created)
                .slice(0, toRemove);
            
            for (const [oldKey] of entries) {
                await this.removeFromDisk(oldKey);
            }
        }
        
        const filePath = path.join(this.cacheDir, `${key}.cache`);
        
        try {
            await fs.writeFile(filePath, JSON.stringify(value));
            
            this.diskCacheIndex.set(key, {
                created: Date.now(),
                expiry: Date.now() + (1000 * 60 * 60 * 24), // 24 hours
                size: JSON.stringify(value).length,
            });
        } catch (error) {
            console.error('[LLMCache] Failed to write to disk:', error);
        }
    }
    
    /**
     * Remove from disk cache
     */
    async removeFromDisk(key) {
        const filePath = path.join(this.cacheDir, `${key}.cache`);
        
        try {
            await fs.unlink(filePath);
        } catch (error) {
            // File doesn't exist
        }
        
        this.diskCacheIndex.delete(key);
    }
    
    /**
     * Update semantic index for similarity search
     */
    updateSemanticIndex(key, prompt, response) {
        // Extract features for semantic matching
        const features = this.extractFeatures(prompt);
        
        this.semanticIndex.set(key, {
            prompt,
            features,
            response,
            created: Date.now(),
        });
        
        // Limit semantic index size
        if (this.semanticIndex.size > 5000) {
            // Remove oldest entries
            const entries = Array.from(this.semanticIndex.entries())
                .sort((a, b) => a[1].created - b[1].created);
            
            for (let i = 0; i < 1000; i++) {
                this.semanticIndex.delete(entries[i][0]);
            }
        }
    }
    
    /**
     * Extract features for semantic similarity
     */
    extractFeatures(text) {
        // Simple feature extraction - in production use embeddings
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2);
        
        // Extract n-grams
        const bigrams = [];
        for (let i = 0; i < words.length - 1; i++) {
            bigrams.push(`${words[i]}_${words[i + 1]}`);
        }
        
        return {
            words: new Set(words),
            bigrams: new Set(bigrams),
            length: text.length,
        };
    }
    
    /**
     * Find semantically similar cached response
     */
    async findSimilar(prompt, options = {}) {
        const features = this.extractFeatures(prompt);
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [key, entry] of this.semanticIndex.entries()) {
            const score = this.calculateSimilarity(features, entry.features);
            
            if (score > bestScore && score >= this.similarityThreshold) {
                bestScore = score;
                bestMatch = entry;
            }
        }
        
        if (bestMatch) {
            // Log similarity match for monitoring
            console.log(`[LLMCache] Semantic match found (score: ${bestScore.toFixed(2)})`);
            return bestMatch.response;
        }
        
        return null;
    }
    
    /**
     * Calculate similarity between two feature sets
     */
    calculateSimilarity(features1, features2) {
        // Jaccard similarity for words
        const wordIntersection = new Set(
            [...features1.words].filter(x => features2.words.has(x))
        );
        const wordUnion = new Set([...features1.words, ...features2.words]);
        const wordSimilarity = wordIntersection.size / wordUnion.size;
        
        // Jaccard similarity for bigrams
        const bigramIntersection = new Set(
            [...features1.bigrams].filter(x => features2.bigrams.has(x))
        );
        const bigramUnion = new Set([...features1.bigrams, ...features2.bigrams]);
        const bigramSimilarity = bigramUnion.size > 0 
            ? bigramIntersection.size / bigramUnion.size 
            : 0;
        
        // Length similarity
        const lengthSimilarity = 1 - Math.abs(features1.length - features2.length) / 
            Math.max(features1.length, features2.length);
        
        // Weighted combination
        return (wordSimilarity * 0.5) + (bigramSimilarity * 0.3) + (lengthSimilarity * 0.2);
    }
    
    /**
     * Persist disk cache index
     */
    async persistIndex() {
        const indexPath = path.join(this.cacheDir, 'index.json');
        
        try {
            const index = Array.from(this.diskCacheIndex.entries());
            await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
        } catch (error) {
            console.error('[LLMCache] Failed to persist index:', error);
        }
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        const totalHits = this.stats.memoryHits + this.stats.diskHits + this.stats.semanticMatches;
        const hitRate = this.stats.totalRequests > 0 
            ? totalHits / this.stats.totalRequests 
            : 0;
        
        return {
            ...this.stats,
            hitRate,
            memoryCacheSize: this.memoryCache.size,
            diskCacheSize: this.diskCacheIndex.size,
            semanticIndexSize: this.semanticIndex.size,
            compressionRatio: this.stats.compressionSaves > 0
                ? this.stats.totalSaved / this.stats.compressionSaves
                : 0,
        };
    }
    
    /**
     * Clear all caches
     */
    async clear() {
        this.memoryCache.clear();
        this.semanticIndex.clear();
        
        // Clear disk cache
        for (const key of this.diskCacheIndex.keys()) {
            await this.removeFromDisk(key);
        }
        
        // Reset stats
        this.stats = {
            memoryHits: 0,
            diskHits: 0,
            misses: 0,
            semanticMatches: 0,
            compressionSaves: 0,
            totalSaved: 0,
            totalRequests: 0,
        };
    }
    
    /**
     * Preload frequently used prompts
     */
    async preload(prompts, generateFn) {
        const results = [];
        
        for (const prompt of prompts) {
            const cached = await this.get(prompt);
            
            if (!cached) {
                try {
                    const response = await generateFn(prompt);
                    await this.set(prompt, response);
                    results.push({ prompt, status: 'generated' });
                } catch (error) {
                    results.push({ prompt, status: 'error', error: error.message });
                }
            } else {
                results.push({ prompt, status: 'cached' });
            }
        }
        
        return results;
    }
}

// Singleton instance
let instance = null;

function getLLMCacheService(options) {
    if (!instance) {
        instance = new LLMCacheService(options);
    }
    return instance;
}

module.exports = {
    LLMCacheService,
    getLLMCacheService,
};