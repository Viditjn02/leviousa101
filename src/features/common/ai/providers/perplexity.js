const fetch = require('node-fetch');

class PerplexityProvider {
    static async validateApiKey(key) {
        if (!key || typeof key !== 'string' || !key.startsWith('pplx-')) {
            return { success: false, error: 'Invalid Perplexity API key format.' };
        }

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar-pro',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                })
            });

            if (response.ok || response.status === 400) {
                return { success: true };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { 
                    success: false, 
                    error: errorData.error?.message || `Validation failed with status: ${response.status}` 
                };
            }
        } catch (error) {
            console.error(`[PerplexityProvider] Network error during key validation:`, error);
            return { success: false, error: 'A network error occurred during validation.' };
        }
    }
}

/**
 * Creates a Perplexity LLM instance
 * @param {object} opts - Configuration options
 * @param {string} opts.apiKey - Perplexity API key
 * @param {string} [opts.model='llama-3.1-sonar-small-128k-online'] - Model name
 * @param {number} [opts.temperature=0.2] - Temperature (lower for factual queries)
 * @param {number} [opts.maxTokens=2048] - Max tokens
 * @param {boolean} [opts.includeSource=true] - Include source citations
 * @returns {object} LLM instance
 */
function createLLM({ 
    apiKey, 
    model = 'sonar-pro', // Use correct Perplexity model name for advanced search
    temperature = 0.2,
    maxTokens = 2048,
    includeSource = true,
    ...config 
}) {
    const callApi = async (messages, options = {}) => {
        const requestBody = {
            model: options.model || model,
            messages: messages,
            temperature: options.temperature || temperature,
            max_tokens: options.maxTokens || maxTokens,
            stream: false
        };

        // Add search parameters for all sonar models (they all have search capabilities)
        if (model.includes('sonar')) {
            requestBody.return_citations = true; // Always return citations for web search
            requestBody.search_recency_filter = options.searchRecencyFilter || 'month';
        }

        // Ensure we're using the right model for web search
        if (requestBody.model === 'sonar') {
            requestBody.model = 'sonar-pro';
            console.log('[PerplexityProvider] Using sonar-pro for advanced search capabilities');
        }

        console.log('[PerplexityProvider] Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        // Debug Perplexity API response for citations
        console.log('[PerplexityProvider] Raw API response keys:', Object.keys(result));
        console.log('[PerplexityProvider] Citations in response:', result.citations ? 'Found' : 'Not found');
        if (result.citations) {
            console.log('[PerplexityProvider] Citations data:', JSON.stringify(result.citations, null, 2));
        }
        
        // Extract citations if available - check multiple possible locations
        const citations = result.citations || result.choices?.[0]?.citations || [];
        const content = result.choices[0].message.content;
        
        return {
            content: content.trim(),
            citations: citations,
            raw: result
        };
    };

    return {
        generateContent: async (parts) => {
            const messages = [];
            let systemPrompt = '';
            let userContent = [];
            
            for (const part of parts) {
                if (typeof part === 'string') {
                    if (systemPrompt === '' && part.includes('You are')) {
                        systemPrompt = part;
                    } else {
                        userContent.push({ type: 'text', text: part });
                    }
                } else if (part.inlineData) {
                    // Perplexity doesn't support inline images in the same way
                    console.warn('[Perplexity] Image input not supported, skipping');
                }
            }
            
            // Convert to simple text for Perplexity
            const textContent = userContent.map(c => c.text).join('\n');
            
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            if (textContent) messages.push({ role: 'user', content: textContent });
            
            const result = await callApi(messages);

            return {
                response: {
                    text: () => result.content,
                    citations: () => result.citations
                },
                raw: result.raw
            };
        },
        
        // For compatibility with chat-style interfaces
        chat: async (messages, options = {}) => {
            return await callApi(messages, options);
        },
        
        // Check if query needs web search
        needsWebSearch: (query) => {
            // This is a simple heuristic, can be enhanced
            const webIndicators = [
                'latest', 'recent', 'current', 'today', 'now',
                'news', 'update', 'trend', 'price', 'weather',
                'who is', 'what is happening', 'stock', 'score'
            ];
            
            const lowerQuery = query.toLowerCase();
            return webIndicators.some(indicator => lowerQuery.includes(indicator));
        }
    };
}

/**
 * Creates a Perplexity streaming LLM instance
 * @param {object} opts - Configuration options
 * @param {string} opts.apiKey - Perplexity API key
 * @param {string} [opts.model='llama-3.1-sonar-small-128k-online'] - Model name
 * @param {number} [opts.temperature=0.2] - Temperature
 * @param {number} [opts.maxTokens=2048] - Max tokens
 * @returns {object} Streaming LLM instance
 */
function createStreamingLLM({ 
    apiKey, 
    model = 'sonar',
    temperature = 0.2,
    maxTokens = 2048,
    ...config 
}) {
    return {
        streamChat: async (messages, options = {}) => {
            const requestBody = {
                model: options.model || model,
                messages: messages,
                temperature: options.temperature || temperature,
                max_tokens: options.maxTokens || maxTokens,
                stream: true
            };

            // Add search parameters for online models
            if (model.includes('online')) {
                requestBody.search_domain_filter = options.searchDomainFilter || [];
                requestBody.search_recency_filter = options.searchRecencyFilter || 'month';
                requestBody.return_citations = options.returnCitations !== false;
            }

            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
            }

            return response;
        }
    };
}

/**
 * Perplexity doesn't have native STT, return placeholder
 */
async function createSTT({ apiKey, language = 'en', callbacks = {}, ...config }) {
    console.warn('[Perplexity] STT not supported. Use OpenAI or Deepgram for STT.');
    
    return {
        sendRealtimeInput: async (audioData) => {
            console.warn('[Perplexity] STT sendRealtimeInput called but not implemented');
        },
        close: async () => {
            console.log('[Perplexity] STT session closed');
        }
    };
}

module.exports = {
    PerplexityProvider,
    createSTT,
    createLLM,
    createStreamingLLM
};