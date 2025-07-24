const modelStateService = require('./modelStateService');

class SessionTitleService {
    constructor() {
        this.titleCache = new Map();
        this.isGenerating = new Set();
    }

    /**
     * Generate a meaningful title from conversation content
     * @param {string} sessionId - Session ID for caching
     * @param {Object} options - Options for title generation
     * @param {Array} options.transcripts - Array of transcript objects
     * @param {Array} options.aiMessages - Array of AI message objects
     * @param {string} options.sessionType - Type of session (ask, listen)
     * @returns {Promise<string>} Generated title
     */
    async generateTitle(sessionId, options = {}) {
        // Check cache first
        if (this.titleCache.has(sessionId)) {
            return this.titleCache.get(sessionId);
        }

        // Prevent duplicate generation
        if (this.isGenerating.has(sessionId)) {
            return this.getDefaultTitle(options.sessionType);
        }

        this.isGenerating.add(sessionId);

        try {
            const { transcripts = [], aiMessages = [], sessionType = 'ask' } = options;
            
            // Collect conversation content
            const content = this.extractConversationContent(transcripts, aiMessages, sessionType);
            
            if (!content || content.length < 20) {
                // Not enough content for meaningful title
                return this.getDefaultTitle(sessionType);
            }

            // Generate AI title
            const generatedTitle = await this.generateAITitle(content, sessionType);
            
            if (generatedTitle) {
                this.titleCache.set(sessionId, generatedTitle);
                return generatedTitle;
            }

            return this.getDefaultTitle(sessionType);
        } catch (error) {
            console.error('[SessionTitleService] Error generating title:', error);
            return this.getDefaultTitle(sessionType);
        } finally {
            this.isGenerating.delete(sessionId);
        }
    }

    /**
     * Extract meaningful content from conversation data
     */
    extractConversationContent(transcripts, aiMessages, sessionType) {
        let content = '';

        if (sessionType === 'listen' && transcripts.length > 0) {
            // For listen sessions, use transcript content
            const meaningfulTranscripts = transcripts
                .filter(t => t.text && t.text.length > 10)
                .slice(0, 5); // First 5 meaningful entries
            
            content = meaningfulTranscripts
                .map(t => `${t.speaker}: ${t.text}`)
                .join('\n');
        } else if (sessionType === 'ask' && aiMessages.length > 0) {
            // For ask sessions, use Q&A content
            const userMessages = aiMessages
                .filter(m => m.role === 'user' && m.content && m.content.length > 10)
                .slice(0, 3); // First 3 user messages
            
            content = userMessages
                .map(m => m.content)
                .join('\n');
        }

        // Limit content length to avoid token overflow
        return content.substring(0, 1000);
    }

    /**
     * Generate title using AI
     */
    async generateAITitle(content, sessionType) {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo) {
                throw new Error('No LLM model available for title generation');
            }

            const { createStreamingLLM } = require('../ai/factory');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.3,
                maxTokens: 50,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            const systemPrompt = `Generate a concise, descriptive title for this ${sessionType} session. The title should be:
- 3-8 words maximum
- Descriptive of the main topic or question
- Professional and clear
- No quotes or special characters

Examples:
- "Python Array Sorting Help"
- "Interview Question Practice"
- "React Component Debugging"
- "SQL Query Optimization"
- "Meeting Notes Discussion"`;

            const userPrompt = `Content:\n${content}\n\nGenerate a clear, short title for this conversation:`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') break;
                        
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                            }
                        } catch (parseError) {
                            // Skip malformed JSON
                        }
                    }
                }
            }

            // Clean and validate the generated title
            let title = fullResponse.trim()
                .replace(/^["']|["']$/g, '') // Remove quotes
                .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();

            // Ensure reasonable length
            if (title.length > 50) {
                title = title.substring(0, 47) + '...';
            }

            // Validate title quality
            if (title.length >= 5 && title.split(' ').length >= 2) {
                return title;
            }

            return null;
        } catch (error) {
            console.error('[SessionTitleService] AI title generation failed:', error);
            return null;
        }
    }

    /**
     * Get default title based on session type
     */
    getDefaultTitle(sessionType) {
        const date = new Date();
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        switch (sessionType) {
            case 'listen':
                return `Listen Session - ${timeStr}`;
            case 'ask':
                return `Q&A Session - ${timeStr}`;
            default:
                return `Session - ${timeStr}`;
        }
    }

    /**
     * Update title for an existing session
     */
    async updateSessionTitle(sessionId, sessionData) {
        try {
            const sessionRepository = require('../repositories/session');
            
            // Generate new title
            const newTitle = await this.generateTitle(sessionId, sessionData);
            
            // Update in database
            await sessionRepository.updateTitle(sessionId, newTitle);
            
            console.log(`[SessionTitleService] Updated title for session ${sessionId}: "${newTitle}"`);
            return newTitle;
        } catch (error) {
            console.error('[SessionTitleService] Error updating session title:', error);
            return null;
        }
    }

    /**
     * Clear cache for a session
     */
    clearCache(sessionId) {
        this.titleCache.delete(sessionId);
    }

    /**
     * Clear entire cache
     */
    clearAllCache() {
        this.titleCache.clear();
    }
}

// Create singleton instance
const sessionTitleService = new SessionTitleService();

module.exports = sessionTitleService; 