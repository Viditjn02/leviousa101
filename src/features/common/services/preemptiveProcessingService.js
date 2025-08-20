/**
 * Preemptive Processing Service
 * Predicts and pre-processes common user actions to achieve sub-100ms response times
 */

const { EventEmitter } = require('events');
const { LRUCache } = require('lru-cache');

class PreemptiveProcessingService extends EventEmitter {
    constructor() {
        super();
        
        // Cache for preemptive predictions
        this.predictionCache = new LRUCache({
            max: 500, // Max 500 cached predictions
            ttl: 1000 * 60 * 5, // 5 minutes TTL
        });
        
        // Common patterns for preemptive processing (FIXED FOR BETTER MATCHING)
        this.commonPatterns = [
            // Greetings - more flexible patterns
            { pattern: /\b(hi|hello|hey)\b/i, response: "Hello! How can I help you?", confidence: 0.9 },
            { pattern: /\bgood morning\b/i, response: "Good morning! What can I do for you?", confidence: 0.9 },
            { pattern: /\bgood afternoon\b/i, response: "Good afternoon! How can I assist you?", confidence: 0.9 },
            
            // Time/Date queries - more flexible
            { pattern: /(what|whats)\s*(time|is it|the time)/i, response: () => `It's ${new Date().toLocaleTimeString()}.`, confidence: 0.8 },
            { pattern: /(what|whats)\s*(date|today|day)/i, response: () => `Today is ${new Date().toLocaleDateString()}.`, confidence: 0.8 },
            
            // PERFORMANCE: LinkedIn queries - provide helpful response immediately
            { pattern: /(pull\s*up|find|search|lookup|get).*linkedin/i, response: (text) => {
                if (!text || typeof text !== 'string') {
                    return "I'll search for LinkedIn profile information using web search to get you the most current details...";
                }
                const personMatch = text.match(/(pull\s*up|find|search|lookup|get)\s+([^f]+?)\s+(from\s+|on\s+)?linkedin/i);
                const person = personMatch ? personMatch[2].trim() : 'that person';
                return `I'll help you find ${person} on LinkedIn. Since LinkedIn requires exact usernames, I can search the web for their LinkedIn profile information instead. Let me get their professional details...`;
            }, confidence: 0.75 },
            { pattern: /linkedin.*(profile|search|find)/i, response: "I'll search for LinkedIn profile information using web search to get you the most current details...", confidence: 0.75 },
            { pattern: /linkedin\s+profile\s+for/i, response: (text) => {
                const personMatch = text.match(/linkedin\s+profile\s+for\s+([^?.!]+)/i);
                const person = personMatch ? personMatch[1].trim() : 'that person';
                return `I'll search for ${person}'s LinkedIn profile using web search to get their professional information...`;
            }, confidence: 0.75 },
            
            // PERFORMANCE: Email queries - instant response  
            { pattern: /(compose|write|send|email|mail)/i, response: "I'll help you with email. What would you like to compose?", confidence: 0.8 },
            
            // Simple confirmations
            { pattern: /^(yes|yeah|yep|sure|ok|okay)\s*$/i, response: "Got it! What would you like me to help you with next?", confidence: 0.7 },
            { pattern: /^(no|nope)\s*$/i, response: "Understood. Is there something else I can help you with?", confidence: 0.7 },
            { pattern: /\b(thanks|thank you)\b/i, response: "You're welcome! Anything else I can help with?", confidence: 0.8 },
            
            // Common questions
            { pattern: /how are you/i, response: "I'm doing well and ready to help! What can I do for you?", confidence: 0.8 },
            { pattern: /what can you do/i, response: "I can help with questions, research, LinkedIn searches, email composition, and more. What would you like to try?", confidence: 0.9 },
        ];
        
        // Typing prediction state
        this.typingPredictions = new Map();
        this.typingTimeouts = new Map();
        
        // Performance metrics
        this.metrics = {
            predictions: 0,
            hits: 0,
            preemptiveResponses: 0,
            avgPredictionTime: 0,
        };
        
        console.log('[PreemptiveProcessing] Service initialized');
    }
    
    /**
     * Predict user intent while typing
     */
    predictWhileTyping(partialText, context = {}) {
        const sessionId = context.sessionId || 'default';
        
        // Clear existing timeout for this session
        if (this.typingTimeouts.has(sessionId)) {
            clearTimeout(this.typingTimeouts.get(sessionId));
        }
        
        // Debounce predictions - only predict after user stops typing for 200ms
        const timeout = setTimeout(() => {
            this._processPrediction(partialText, sessionId, context);
        }, 200);
        
        this.typingTimeouts.set(sessionId, timeout);
    }
    
    /**
     * Internal prediction processing
     */
    _processPrediction(partialText, sessionId, context) {
        if (partialText.length < 3) return; // Too short to predict
        
        const startTime = Date.now();
        this.metrics.predictions++;
        
        try {
            // Check for pattern matches
            const predictions = this._findPatternMatches(partialText);
            
            if (predictions.length > 0) {
                // Cache the best prediction
                const bestPrediction = predictions[0];
                this.predictionCache.set(partialText.toLowerCase(), bestPrediction);
                
                // Store prediction for this session
                this.typingPredictions.set(sessionId, {
                    partialText,
                    prediction: bestPrediction,
                    timestamp: Date.now(),
                });
                
                // Emit prediction event
                this.emit('predictionReady', {
                    sessionId,
                    partialText,
                    prediction: bestPrediction,
                });
                
                const predictionTime = Date.now() - startTime;
                this.metrics.avgPredictionTime = (this.metrics.avgPredictionTime + predictionTime) / 2;
                
                console.log('[PreemptiveProcessing] ✅ Prediction ready', {
                    partialText: partialText.substring(0, 50),
                    confidence: bestPrediction.confidence,
                    predictionTime
                });
            }
            
        } catch (error) {
            console.error('[PreemptiveProcessing] Prediction error:', error);
        }
    }
    
    /**
     * Find pattern matches for partial text
     */
    _findPatternMatches(partialText) {
        const matches = [];
        const lowerText = partialText.toLowerCase();
        
        for (const pattern of this.commonPatterns) {
            // More flexible pattern matching for partial text
            if (pattern.pattern.test(lowerText) || this._isPartialMatch(lowerText, pattern.pattern)) {
                const response = typeof pattern.response === 'function' 
                    ? pattern.response(partialText) 
                    : pattern.response;
                
                matches.push({
                    pattern: pattern.pattern,
                    response,
                    confidence: pattern.confidence,
                    type: 'pattern_match',
                });
            }
        }
        
        // Sort by confidence
        return matches.sort((a, b) => b.confidence - a.confidence);
    }
    
    /**
     * Check if partial text matches a pattern (for better preemptive matching)
     */
    _isPartialMatch(partialText, pattern) {
        // For simple patterns, check if the partial text could lead to a match
        const patternStr = pattern.source.toLowerCase();
        
        // Remove regex special characters for simple string matching
        const cleanPattern = patternStr.replace(/[^a-z\s]/g, '');
        
        // Check if any words from the pattern start with the partial text
        const patternWords = cleanPattern.split(/\s+/);
        const partialWords = partialText.split(/\s+/);
        
        return partialWords.some(partialWord => 
            patternWords.some(patternWord => 
                patternWord.startsWith(partialWord) && partialWord.length >= 2
            )
        );
    }
    
    /**
     * Get preemptive response if available
     */
    getPreemptiveResponse(text, sessionId) {
        const lowerText = text.toLowerCase().trim();
        
        // PERFORMANCE OPTIMIZATION: Check direct pattern matching first (FASTEST path)
        const directMatches = this._findPatternMatches(text);
        if (directMatches.length > 0) {
            const bestMatch = directMatches[0];
                            if (bestMatch.confidence > 0.7) {
                    this.metrics.hits++;
                    this.metrics.preemptiveResponses++;
                    
                    console.log('[PreemptiveProcessing] 🚀 Direct pattern hit!', {
                        text: text.substring(0, 50),
                        confidence: bestMatch.confidence,
                        responseTime: '<10ms'
                    });
                    
                    const finalResponse = typeof bestMatch.response === 'function' ? 
                        bestMatch.response(text) : bestMatch.response;
                    
                    return {
                        answer: finalResponse,
                        confidence: bestMatch.confidence,
                        preemptive: true,
                        responseTime: Date.now(),
                    };
                }
        }
        
        // Check exact cache match
        const cached = this.predictionCache.get(lowerText);
        if (cached && cached.confidence > 0.8) {
            this.metrics.hits++;
            this.metrics.preemptiveResponses++;
            
            console.log('[PreemptiveProcessing] 🚀 Cache hit!', {
                text: text.substring(0, 50),
                confidence: cached.confidence,
                responseTime: '<10ms'
            });
            
            return {
                answer: cached.response,
                confidence: cached.confidence,
                preemptive: true,
                responseTime: Date.now(),
            };
        }
        
        // Check session prediction
        if (sessionId && this.typingPredictions.has(sessionId)) {
            const sessionPrediction = this.typingPredictions.get(sessionId);
            
            // If typed text closely matches prediction text
            if (this._isTextMatch(text, sessionPrediction.partialText)) {
                this.metrics.hits++;
                this.metrics.preemptiveResponses++;
                
                console.log('[PreemptiveProcessing] 🎯 Session prediction hit!', {
                    text: text.substring(0, 50),
                    confidence: sessionPrediction.prediction.confidence
                });
                
                return {
                    answer: sessionPrediction.prediction.response,
                    confidence: sessionPrediction.prediction.confidence,
                    preemptive: true,
                    responseTime: Date.now(),
                };
            }
        }
        
        return null;
    }
    
    /**
     * Check if two texts are similar enough (fuzzy match)
     */
    _isTextMatch(text1, text2) {
        const t1 = text1.toLowerCase().trim();
        const t2 = text2.toLowerCase().trim();
        
        // Exact match
        if (t1 === t2) return true;
        
        // One is substring of other
        if (t1.includes(t2) || t2.includes(t1)) return true;
        
        // Simple Levenshtein distance check for short strings
        if (Math.max(t1.length, t2.length) <= 20) {
            const distance = this._levenshteinDistance(t1, t2);
            const similarity = 1 - (distance / Math.max(t1.length, t2.length));
            return similarity > 0.8;
        }
        
        return false;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    _levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Clear predictions for a session
     */
    clearSession(sessionId) {
        if (this.typingTimeouts.has(sessionId)) {
            clearTimeout(this.typingTimeouts.get(sessionId));
            this.typingTimeouts.delete(sessionId);
        }
        
        this.typingPredictions.delete(sessionId);
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            hitRate: this.metrics.predictions > 0 
                ? (this.metrics.hits / this.metrics.predictions * 100).toFixed(1) + '%'
                : '0%',
            preemptiveRate: this.metrics.predictions > 0
                ? (this.metrics.preemptiveResponses / this.metrics.predictions * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

module.exports = PreemptiveProcessingService;
