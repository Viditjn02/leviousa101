const { createLLM, createStreamingLLM } = require('./factory');

/**
 * Intelligent decision-making for when to use web-enabled LLMs
 */
class WebSearchDetector {
    constructor() {
        // Patterns that indicate real-time information needs
        this.timeIndicators = [
            'latest', 'recent', 'current', 'today', 'now', 'this year',
            'yesterday', 'last week', 'last month', 'updated', 'new',
            'pullup', 'pull up', 'find', 'show me', 'get me' // CRITICAL: These trigger web search
        ];
        
        // Topics that typically need current information
        this.realTimeTopics = [
            'news', 'weather', 'stock', 'price', 'market', 'trending',
            'score', 'result', 'election', 'covid', 'breaking',
            'articles', 'story', 'report', 'announcement', 'update' // CRITICAL: 'articles' triggers web search
        ];
        
        // Question types that often need web search
        this.questionPatterns = [
            /what is happening/i,
            /who won/i,
            /what happened/i,
            /current status/i,
            /how much does .* cost/i,
            /where can i find/i,
            /what is the price of/i
        ];
    }

    /**
     * Analyzes if a query needs real-time web information
     * @param {string} query - The user's query
     * @returns {Object} Decision result with confidence score
     */
    analyze(query) {
        const lowerQuery = query.toLowerCase();
        let score = 0;
        let reasons = [];

        // Check for time indicators
        const timeMatches = this.timeIndicators.filter(indicator => 
            lowerQuery.includes(indicator)
        );
        if (timeMatches.length > 0) {
            score += timeMatches.length * 0.3;
            reasons.push(`Time indicators: ${timeMatches.join(', ')}`);
        }

        // Check for real-time topics
        const topicMatches = this.realTimeTopics.filter(topic => 
            lowerQuery.includes(topic)
        );
        if (topicMatches.length > 0) {
            score += topicMatches.length * 0.25;
            reasons.push(`Real-time topics: ${topicMatches.join(', ')}`);
        }

        // Check question patterns
        const patternMatches = this.questionPatterns.filter(pattern => 
            pattern.test(query)
        );
        if (patternMatches.length > 0) {
            score += patternMatches.length * 0.4;
            reasons.push(`Question patterns matched: ${patternMatches.length}`);
        }

        // Additional heuristics
        if (lowerQuery.includes('?') && (lowerQuery.includes('when') || lowerQuery.includes('what'))) {
            score += 0.2;
            reasons.push('Interrogative question detected');
        }

        // Penalize for clearly knowledge-based queries
        const knowledgeIndicators = ['explain', 'theory', 'concept', 'definition', 'history'];
        const knowledgeMatches = knowledgeIndicators.filter(indicator => 
            lowerQuery.includes(indicator)
        );
        if (knowledgeMatches.length > 0) {
            score -= knowledgeMatches.length * 0.15;
            reasons.push(`Knowledge-based indicators: ${knowledgeMatches.join(', ')}`);
        }

        const needsWebSearch = score > 0.3;
        
        return {
            needsWebSearch,
            confidence: Math.min(Math.max(score, 0), 1),
            reasons,
            score
        };
    }
}

/**
 * Intelligent response merger that combines responses from different LLMs
 */
class ResponseMerger {
    constructor() {
        this.webSearchDetector = new WebSearchDetector();
    }

    /**
     * Merges responses from standard and web-enabled LLMs
     * @param {Object} standardResponse - Response from standard LLM
     * @param {Object} webResponse - Response from web-enabled LLM (Perplexity)
     * @param {string} originalQuery - The original user query
     * @returns {Object} Merged response
     */
    merge(standardResponse, webResponse, originalQuery) {
        const webAnalysis = this.webSearchDetector.analyze(originalQuery);
        
        // If web search was not needed, prefer standard response
        if (!webAnalysis.needsWebSearch) {
            return this._createMergedResponse(
                standardResponse.content,
                webResponse.content,
                webResponse.citations || [],
                'standard',
                'Query primarily needs knowledge-based response'
            );
        }

        // If web search was needed, prefer web response but enhance with standard
        return this._createMergedResponse(
            webResponse.content,
            standardResponse.content,
            webResponse.citations || [],
            'web',
            `Real-time information needed (confidence: ${(webAnalysis.confidence * 100).toFixed(1)}%)`
        );
    }

    /**
     * Creates a merged response object
     * @private
     */
    _createMergedResponse(primaryContent, secondaryContent, citations, primarySource, reason) {
        // Simple merger - can be enhanced with more sophisticated logic
        let mergedContent = primaryContent;
        
        // Add citations if available with enhanced processing
        if (citations && citations.length > 0) {
            mergedContent += '\n\n**Sources:**\n';
            
            citations.forEach((citation, index) => {
                // Handle different citation formats from Perplexity
                let title, url;
                
                if (typeof citation === 'string') {
                    // Citation is just a URL string
                    url = citation;
                    title = this._extractTitleFromUrl(url);
                } else if (citation && typeof citation === 'object') {
                    // Citation is an object with title/url properties
                    url = citation.url || citation;
                    title = citation.title || this._extractTitleFromUrl(url);
                } else {
                    // Fallback for unexpected format
                    url = String(citation);
                    title = this._extractTitleFromUrl(url);
                }
                
                // Filter out invalid URLs
                if (!url || url === 'undefined' || url === 'null' || !url.startsWith('http')) {
                    console.warn(`[ParallelLLM] Skipping invalid citation:`, citation);
                    return;
                }
                
                // Use plain text format (HTML links don't render properly in the UI)
                mergedContent += `${index + 1}. ${title}\n   📂 ${url}\n\n`;
            });
            
            // Add user instruction for opening links
            mergedContent += '*📋 Copy any URL above and paste in your browser (🌐 globe icon) to read the full article.*';
        }

        // Add note about sources
        if (primarySource === 'web') {
            mergedContent += '\n\n*This response includes real-time information from web sources.*';
        }

        return {
            content: mergedContent,
            primarySource,
            reason,
            citations,
            hasWebInfo: primarySource === 'web' || citations.length > 0
        };
    }
    
    /**
     * Extract meaningful title from URL path
     * @private
     */
    _extractTitleFromUrl(url) {
        try {
            if (!url || typeof url !== 'string') return 'Article';
            
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            
            // Extract meaningful parts from the path
            const pathParts = urlObj.pathname.split('/').filter(part => 
                part && part.length > 3 && !part.match(/^\d+$/)
            );
            
            if (pathParts.length > 0) {
                // Take the last meaningful part of the path
                const lastPart = pathParts[pathParts.length - 1];
                // Convert hyphens/underscores to spaces and capitalize
                const title = lastPart
                    .replace(/[-_]/g, ' ')
                    .replace(/\.(html|php|aspx?)$/i, '')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                
                return `${title} - ${domain}`;
            }
            
            // Fallback to domain name
            return `Article from ${domain}`;
        } catch (error) {
            console.warn('[ParallelLLM] Error extracting title from URL:', error);
            return 'Article';
        }
    }
}

/**
 * Orchestrates parallel execution of multiple LLMs for optimal responses
 */
class ParallelLLMOrchestrator {
    constructor() {
        this.webSearchDetector = new WebSearchDetector();
        this.responseMerger = new ResponseMerger();
    }

    /**
     * Executes query on multiple LLMs in parallel and returns the best response
     * @param {string} query - User's query
     * @param {Object} config - Configuration options
     * @returns {Promise<Object>} Best response from parallel execution
     */
    async execute(query, config = {}) {
        const {
            standardProvider = 'anthropic',
            webProvider = 'perplexity',
            standardModel = 'claude-3-5-sonnet-20241022',
            webModel = 'sonar',
            temperature = 0.7,
            maxTokens = 2048,
            forceParallel = false
        } = config;

        // Analyze if web search is needed
        const webAnalysis = this.webSearchDetector.analyze(query);
        
        console.log(`[ParallelLLM] Web search analysis:`, {
            needed: webAnalysis.needsWebSearch,
            confidence: webAnalysis.confidence,
            reasons: webAnalysis.reasons
        });

        // If web search is clearly not needed and not forced, use only standard LLM
        if (!webAnalysis.needsWebSearch && !forceParallel && webAnalysis.confidence < 0.1) {
            console.log('[ParallelLLM] Using standard LLM only');
            return await this._executeStandardOnly(query, {
                provider: standardProvider,
                model: standardModel,
                temperature,
                maxTokens
            });
        }

        // Execute both LLMs in parallel
        console.log('[ParallelLLM] Executing parallel LLM requests');
        
        const [standardResult, webResult] = await Promise.allSettled([
            this._executeStandard(query, {
                provider: standardProvider,
                model: standardModel,
                temperature,
                maxTokens
            }).catch(error => {
                console.error(`[ParallelLLM] Standard LLM error:`, error.message);
                throw error;
            }),
            this._executeWeb(query, {
                provider: webProvider,
                model: webModel,
                temperature,
                maxTokens
            }).catch(error => {
                console.error(`[ParallelLLM] Web LLM error:`, error.message);
                throw error;
            })
        ]);

        // Handle results and merge
        const standardResponse = standardResult.status === 'fulfilled' ? standardResult.value : null;
        const webResponse = webResult.status === 'fulfilled' ? webResult.value : null;

        if (!standardResponse && !webResponse) {
            throw new Error('Both LLM requests failed');
        }

        if (!standardResponse) {
            console.warn('[ParallelLLM] Standard LLM failed, using web LLM only');
            return {
                ...webResponse,
                source: 'web-only',
                error: 'Standard LLM failed'
            };
        }

        if (!webResponse) {
            console.warn('[ParallelLLM] Web LLM failed, using standard LLM only');
            return {
                ...standardResponse,
                source: 'standard-only',
                error: 'Web LLM failed'
            };
        }

        // Merge responses intelligently
        const mergedResponse = this.responseMerger.merge(
            standardResponse,
            webResponse,
            query
        );

        return {
            content: mergedResponse.content,
            primarySource: mergedResponse.primarySource,
            reason: mergedResponse.reason,
            citations: mergedResponse.citations,
            hasWebInfo: mergedResponse.hasWebInfo,
            source: 'merged',
            webAnalysis,
            standardResponse: standardResponse.content,
            webResponse: webResponse.content
        };
    }

    /**
     * Executes streaming query on the most appropriate LLM
     * @param {string} query - User's query
     * @param {Object} config - Configuration options
     * @returns {Promise<ReadableStream>} Streaming response
     */
    async executeStreaming(query, config = {}) {
        const webAnalysis = this.webSearchDetector.analyze(query);
        
        // Choose the most appropriate provider for streaming
        const useWeb = webAnalysis.needsWebSearch && webAnalysis.confidence > 0.3;
        
        const provider = useWeb ? (config.webProvider || 'perplexity') : (config.standardProvider || 'anthropic');
        const model = useWeb ? (config.webModel || 'sonar') : (config.standardModel || 'claude-3-5-sonnet-20241022');
        
        console.log(`[ParallelLLM] Streaming with ${provider} (web needed: ${useWeb})`);
        
        try {
            const streamingLLM = createStreamingLLM(provider, {
                apiKey: this._getApiKey(provider),
                model,
                temperature: config.temperature || 0.7,
                maxTokens: config.maxTokens || 2048
            });

            const messages = [{ role: 'user', content: query }];
            return await streamingLLM.streamChat(messages);
            
        } catch (error) {
            console.error(`[ParallelLLM] Streaming failed with ${provider}:`, error);
            
            // Fallback to the other provider
            const fallbackProvider = useWeb ? (config.standardProvider || 'anthropic') : (config.webProvider || 'perplexity');
            const fallbackModel = useWeb ? (config.standardModel || 'claude-3-5-sonnet-20241022') : (config.webModel || 'sonar');
            
            console.log(`[ParallelLLM] Falling back to ${fallbackProvider}`);
            
            const fallbackLLM = createStreamingLLM(fallbackProvider, {
                apiKey: this._getApiKey(fallbackProvider),
                model: fallbackModel,
                temperature: config.temperature || 0.7,
                maxTokens: config.maxTokens || 2048
            });

            return await fallbackLLM.streamChat(messages);
        }
    }

    async _executeStandardOnly(query, config) {
        const llm = createLLM(config.provider, {
            apiKey: this._getApiKey(config.provider),
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens
        });

        const result = await llm.chat([{ role: 'user', content: query }]);
        return {
            content: result.content,
            source: 'standard-only',
            provider: config.provider,
            model: config.model
        };
    }

    async _executeStandard(query, config) {
        const llm = createLLM(config.provider, {
            apiKey: this._getApiKey(config.provider),
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens
        });

        const result = await llm.chat([{ role: 'user', content: query }]);
        return {
            content: result.content,
            provider: config.provider,
            model: config.model
        };
    }

    async _executeWeb(query, config) {
        const llm = createLLM(config.provider, {
            apiKey: this._getApiKey(config.provider),
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens
        });

        const result = await llm.chat([{ role: 'user', content: query }]);
        return {
            content: result.content,
            citations: result.citations || [],
            provider: config.provider,
            model: config.model
        };
    }

    _getApiKey(provider) {
        const envKey = `${provider.toUpperCase()}_API_KEY`;
        return process.env[envKey];
    }
}

module.exports = {
    ParallelLLMOrchestrator,
    WebSearchDetector,
    ResponseMerger
};