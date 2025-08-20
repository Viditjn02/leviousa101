/**
 * Advanced Conversational Context Service
 * Implements modern LLM context handling techniques for superior conversation continuity
 * 
 * Features:
 * - Stateful Memory Management
 * - Named Entity Recognition 
 * - Multi-turn Conversation Handling
 * - Context Layering Strategies
 * - Recursive Summarization
 * - Conversation History Tracking
 */

const EventEmitter = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class ConversationalContextService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.config = {
            maxMessagesInMemory: options.maxMessagesInMemory || 100,
            maxContextLength: options.maxContextLength || 8000, // tokens
            summaryThreshold: options.summaryThreshold || 50, // messages
            entityRetentionDays: options.entityRetentionDays || 30,
            contextLayers: {
                immediate: 10,    // Last 10 messages
                recent: 30,       // Last 30 messages  
                session: 50,      // Session context
                historical: 20    // Summarized historical context
            },
            ...options
        };
        
        // Context storage
        this.sessions = new Map(); // sessionId -> SessionContext
        this.globalEntities = new Map(); // entity -> EntityInfo
        this.topicThreads = new Map(); // topicId -> ThreadInfo
        
        logger.info('ConversationalContextService initialized', { config: this.config });
    }

    /**
     * Create or get a session context
     * @param {string} sessionId - Unique session identifier
     * @returns {SessionContext} Session context object
     */
    getOrCreateSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            const sessionContext = new SessionContext(sessionId, this.config);
            this.sessions.set(sessionId, sessionContext);
            logger.info('Created new session context', { sessionId });
        }
        return this.sessions.get(sessionId);
    }

    /**
     * Add a message to the conversation context
     * @param {string} sessionId - Session identifier
     * @param {Object} message - Message object
     * @returns {Promise<void>}
     */
    async addMessage(sessionId, message) {
        try {
            // Input validation
            if (!sessionId) {
                sessionId = 'default_session_' + Date.now();
                logger.warn('No sessionId provided, using default', { sessionId });
            }
            
            if (!message) {
                logger.warn('Empty message provided, skipping');
                return;
            }
            
            // Ensure message has required properties
            const sanitizedMessage = {
                role: message.role || 'user',
                content: typeof message.content === 'string' ? message.content : String(message.content || ''),
                type: message.type || 'text',
                metadata: message.metadata || {}
            };
            
            // Skip empty content messages
            if (!sanitizedMessage.content.trim()) {
                logger.debug('Empty content message, adding minimal placeholder');
                sanitizedMessage.content = '[empty message]';
            }
            
            const session = this.getOrCreateSession(sessionId);
            
            // Enhance message with metadata
            const enhancedMessage = await this._enhanceMessage(sanitizedMessage, session);
            
            // Add to session
            session.addMessage(enhancedMessage);
            
            // Extract and update entities
            const entities = this._extractEntities(enhancedMessage);
            this._updateEntities(sessionId, entities);
            
            // Update topic threads
            const topics = this._extractTopics(enhancedMessage);
            this._updateTopics(sessionId, topics);
            
            // Check if summarization is needed
            if (session.needsSummarization(this.config.summaryThreshold)) {
                await this._performRecursiveSummarization(session);
            }
            
            logger.debug('Added enhanced message to context', { 
                sessionId, 
                messageId: enhancedMessage.id,
                entities: entities.length,
                topics: topics.length
            });
        } catch (error) {
            logger.error('Error adding message to context', {
                sessionId,
                error: error.message,
                messagePreview: message ? JSON.stringify(message).substring(0, 100) : 'null'
            });
            // Don't throw - gracefully handle the error
        }
    }

    /**
     * Get comprehensive context for LLM
     * @param {string} sessionId - Session identifier
     * @param {Object} options - Context retrieval options
     * @returns {Object} Layered context object
     */
    getContextForLLM(sessionId, options = {}) {
        const session = this.getOrCreateSession(sessionId);
        const context = session.generateLayeredContext(this.config.contextLayers);
        
        // Add global entities relevant to this session
        context.relevantEntities = this._getRelevantEntities(session);
        
        // Add active topic threads
        context.activeTopics = this._getActiveTopics(session);
        
        // Format for LLM consumption
        const formattedContext = this._formatContextForLLM(context, options);
        
        logger.debug('Generated context for LLM', { 
            sessionId, 
            contextLayers: Object.keys(context),
            entitiesCount: context.relevantEntities.length,
            topicsCount: context.activeTopics.length
        });
        
        return formattedContext;
    }

    /**
     * Detect if current message is a follow-up
     * @param {string} sessionId - Session identifier
     * @param {string} message - Current message
     * @returns {Object} Follow-up analysis
     */
    analyzeFollowUp(sessionId, message) {
        const session = this.getOrCreateSession(sessionId);
        const analysis = session.analyzeFollowUp(message);
        
        // Enhance with entity and topic context
        analysis.entityContinuity = this._analyzeEntityContinuity(session, message);
        analysis.topicContinuity = this._analyzeTopicContinuity(session, message);
        
        return analysis;
    }

    /**
     * Enhance message with contextual metadata
     * @private
     */
    async _enhanceMessage(message, session) {
        const enhanced = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            content: message.content,
            role: message.role,
            type: message.type || 'text',
            metadata: {
                tokenCount: this._estimateTokens(message.content),
                confidence: message.confidence || 1.0,
                followUpScore: 0,
                contextReferences: [],
                ...message.metadata
            }
        };
        
        // Analyze for follow-up patterns
        enhanced.metadata.followUpScore = session.calculateFollowUpScore(enhanced.content);
        
        return enhanced;
    }

    /**
     * Extract named entities from message
     * @private
     */
    _extractEntities(message) {
        const entities = [];
        const content = message.content.toLowerCase();
        
        // Simple pattern-based NER (can be enhanced with ML models)
        const patterns = {
            person: /\b[A-Z][a-z]+(?: [A-Z][a-z]+)+\b/g,
            date: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi,
            location: /\b(?:in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
            organization: /\b(?:Apple|Google|Microsoft|LinkedIn|GitHub|OpenAI|Anthropic)\b/gi,
            technology: /\b(?:React|Node\.js|JavaScript|Python|API|database|server|website|app)\b/gi,
            linkedin_username: /\b[a-z0-9._-]{3,50}\b/g // For our LinkedIn context fix
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = message.content.match(pattern) || [];
            matches.forEach(match => {
                entities.push({
                    type,
                    value: match.trim(),
                    confidence: this._calculateEntityConfidence(type, match),
                    messageId: message.id,
                    timestamp: message.timestamp
                });
            });
        }
        
        return entities;
    }

    /**
     * Extract topics from message
     * @private
     */
    _extractTopics(message) {
        const topics = [];
        const content = message.content.toLowerCase();
        
        // Topic classification patterns
        const topicPatterns = {
            linkedin: /\b(?:linkedin|profile|connection|professional)\b/gi,
            coding: /\b(?:code|programming|develop|function|bug|debug|git)\b/gi,
            email: /\b(?:email|gmail|send|message|inbox)\b/gi,
            calendar: /\b(?:calendar|meeting|appointment|schedule|event)\b/gi,
            documents: /\b(?:document|file|pdf|word|excel|sheet)\b/gi,
            authentication: /\b(?:login|auth|token|password|oauth|sign)\b/gi,
            performance: /\b(?:slow|fast|optimize|performance|speed|response time)\b/gi,
            error: /\b(?:error|bug|issue|problem|fail|broken)\b/gi
        };
        
        for (const [topic, pattern] of Object.entries(topicPatterns)) {
            if (pattern.test(content)) {
                topics.push({
                    name: topic,
                    relevance: this._calculateTopicRelevance(topic, content),
                    messageId: message.id,
                    timestamp: message.timestamp
                });
            }
        }
        
        return topics;
    }

    /**
     * Update entity tracking
     * @private
     */
    _updateEntities(sessionId, entities) {
        entities.forEach(entity => {
            const key = `${entity.type}:${entity.value}`;
            
            if (!this.globalEntities.has(key)) {
                this.globalEntities.set(key, {
                    ...entity,
                    sessions: [sessionId],
                    frequency: 1,
                    lastSeen: entity.timestamp,
                    contexts: []
                });
            } else {
                const existing = this.globalEntities.get(key);
                existing.frequency += 1;
                existing.lastSeen = entity.timestamp;
                if (!existing.sessions.includes(sessionId)) {
                    existing.sessions.push(sessionId);
                }
            }
        });
    }

    /**
     * Update topic threads
     * @private
     */
    _updateTopics(sessionId, topics) {
        topics.forEach(topic => {
            const key = `${sessionId}:${topic.name}`;
            
            if (!this.topicThreads.has(key)) {
                this.topicThreads.set(key, {
                    sessionId,
                    topic: topic.name,
                    messages: [topic.messageId],
                    relevance: topic.relevance,
                    startTime: topic.timestamp,
                    lastActivity: topic.timestamp,
                    status: 'active'
                });
            } else {
                const thread = this.topicThreads.get(key);
                thread.messages.push(topic.messageId);
                thread.relevance = Math.max(thread.relevance, topic.relevance);
                thread.lastActivity = topic.timestamp;
            }
        });
    }

    /**
     * Perform recursive summarization
     * @private
     */
    async _performRecursiveSummarization(session) {
        try {
            const oldMessages = session.getOldestMessages(15); // Reduced requirement
            if (oldMessages.length < 5) return; // Reduced threshold for testing
            
            const summary = await this._generateSummary(oldMessages, session);
            session.addSummary(summary);
            session.archiveOldMessages(oldMessages);
            
            logger.info('Performed recursive summarization', { 
                sessionId: session.id,
                messagesArchived: oldMessages.length,
                summaryLength: summary.summary?.length || 0
            });
        } catch (error) {
            logger.error('Failed to perform recursive summarization', { 
                sessionId: session.id,
                error: error.message
            });
        }
    }

    /**
     * Generate summary of message sequence
     * @private
     */
    async _generateSummary(messages, session) {
        // Simple extractive summarization - can be enhanced with LLM
        const keyMessages = messages.filter(msg => 
            msg.metadata?.followUpScore > 0.3 || // Lowered threshold
            msg.metadata?.tokenCount > 30 ||     // Lowered threshold
            msg.content.length > 20              // Include longer messages
        );
        
        // If no key messages found, take last few messages
        if (keyMessages.length === 0) {
            keyMessages.push(...messages.slice(-3));
        }
        
        const entities = messages.flatMap(msg => 
            this._extractEntities(msg)
        );
        
        const topics = messages.flatMap(msg => 
            this._extractTopics(msg)
        );
        
        return {
            id: `summary_${Date.now()}`,
            timestamp: new Date().toISOString(),
            messageCount: messages.length,
            keyMessages: keyMessages.slice(-5), // Last 5 key messages
            entities: entities,
            topics: topics,
            timeRange: {
                start: messages[0]?.timestamp || new Date().toISOString(),
                end: messages[messages.length - 1]?.timestamp || new Date().toISOString()
            },
            summary: `Conversation summary: ${messages.length} messages about ${topics.map(t => t.name).join(', ') || 'various topics'}`
        };
    }

    /**
     * Format context for LLM consumption
     * @private
     */
    _formatContextForLLM(context, options = {}) {
        const formatted = {
            conversationFlow: this._formatConversationFlow(context.immediate),
            recentContext: this._formatRecentContext(context.recent),
            sessionOverview: this._formatSessionOverview(context.session),
            relevantHistory: this._formatHistoricalContext(context.historical),
            
            // Enhanced context
            activeEntities: context.relevantEntities,
            topicThreads: context.activeTopics,
            
            // Meta information
            metadata: {
                sessionId: context.sessionId,
                totalMessages: context.messageCount,
                contextLayers: Object.keys(context).length,
                lastActivity: context.lastActivity
            }
        };
        
        // Apply formatting options
        if (options.includeEntityDetails) {
            formatted.entityDetails = this._formatEntityDetails(context.relevantEntities);
        }
        
        if (options.includeTopicAnalysis) {
            formatted.topicAnalysis = this._formatTopicAnalysis(context.activeTopics);
        }
        
        return formatted;
    }

    /**
     * Format conversation flow for immediate context
     * @private
     */
    _formatConversationFlow(messages) {
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            followUp: msg.metadata.followUpScore > 0.3
        })).slice(-10); // Last 10 messages
    }

    /**
     * Calculate entity confidence
     * @private
     */
    _calculateEntityConfidence(type, match) {
        const confidenceMap = {
            person: match.split(' ').length > 1 ? 0.8 : 0.5,
            date: 0.9,
            location: 0.7,
            organization: 0.9,
            technology: 0.8,
            linkedin_username: match.length > 3 && match.length < 30 ? 0.7 : 0.4
        };
        
        return confidenceMap[type] || 0.5;
    }

    /**
     * Calculate topic relevance
     * @private
     */
    _calculateTopicRelevance(topic, content) {
        const words = content.split(' ');
        const topicWords = content.match(new RegExp(`\\b${topic}\\b`, 'gi')) || [];
        
        // Base relevance from direct mentions
        let relevance = Math.min(topicWords.length / words.length * 10, 1.0);
        
        // Add relevance for related terms
        const topicRelatedTerms = {
            coding: ['function', 'program', 'develop', 'code', 'debug', 'script'],
            email: ['gmail', 'send', 'inbox', 'message', 'mail'],
            linkedin: ['profile', 'connection', 'professional', 'network'],
            calendar: ['meeting', 'schedule', 'appointment', 'event', 'time'],
            authentication: ['login', 'password', 'token', 'sign', 'auth'],
            performance: ['fast', 'slow', 'optimize', 'speed', 'response'],
            error: ['problem', 'issue', 'fail', 'broken', 'debug']
        };
        
        if (topicRelatedTerms[topic]) {
            const relatedMatches = topicRelatedTerms[topic].filter(term => 
                content.toLowerCase().includes(term)
            ).length;
            
            relevance += (relatedMatches / words.length) * 5;
        }
        
        return Math.min(relevance, 1.0);
    }

    /**
     * Estimate token count (approximate)
     * @private
     */
    _estimateTokens(text) {
        return Math.ceil(text.length / 4); // Rough estimate: 4 chars per token
    }

    /**
     * Get relevant entities for session
     * @private
     */
    _getRelevantEntities(session) {
        const sessionEntities = [];
        
        this.globalEntities.forEach((entity, key) => {
            if (entity.sessions.includes(session.id) && entity.frequency > 1) {
                sessionEntities.push(entity);
            }
        });
        
        // Sort by relevance (frequency + recency)
        return sessionEntities.sort((a, b) => {
            const aScore = a.frequency * 0.7 + (Date.now() - new Date(a.lastSeen)) / 1000000 * 0.3;
            const bScore = b.frequency * 0.7 + (Date.now() - new Date(b.lastSeen)) / 1000000 * 0.3;
            return bScore - aScore;
        }).slice(0, 20);
    }

    /**
     * Get active topics for session
     * @private
     */
    _getActiveTopics(session) {
        const activeTopics = [];
        
        this.topicThreads.forEach((thread, key) => {
            if (thread.sessionId === session.id && thread.status === 'active') {
                // Consider topic active if mentioned in last hour
                const lastActivity = new Date(thread.lastActivity);
                const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                
                if (lastActivity > hourAgo || thread.messages.length > 3) {
                    activeTopics.push(thread);
                }
            }
        });
        
        return activeTopics.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
    }

    /**
     * Additional helper methods for context analysis
     */
    _analyzeEntityContinuity(session, message) {
        const messageEntities = this._extractEntities({ content: message });
        const sessionEntities = this._getRelevantEntities(session);
        
        const continuingEntities = messageEntities.filter(msgEntity =>
            sessionEntities.some(sesEntity => 
                sesEntity.type === msgEntity.type && 
                sesEntity.value === msgEntity.value
            )
        );
        
        return {
            hasContinuity: continuingEntities.length > 0,
            continuingEntities: continuingEntities,
            newEntities: messageEntities.filter(msgEntity =>
                !continuingEntities.includes(msgEntity)
            )
        };
    }

    _analyzeTopicContinuity(session, message) {
        const messageTopics = this._extractTopics({ content: message });
        const activeTopics = this._getActiveTopics(session);
        
        const continuingTopics = messageTopics.filter(msgTopic =>
            activeTopics.some(activeTopic => activeTopic.topic === msgTopic.name)
        );
        
        return {
            hasContinuity: continuingTopics.length > 0,
            continuingTopics: continuingTopics,
            newTopics: messageTopics.filter(msgTopic =>
                !continuingTopics.some(ct => ct.name === msgTopic.name)
            )
        };
    }

    // Format helpers for LLM context
    _formatRecentContext(messages) {
        return messages.slice(-30).map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }

    _formatSessionOverview(messages) {
        const summary = {
            totalMessages: messages.length,
            timespan: messages.length > 0 ? {
                start: messages[0].timestamp,
                end: messages[messages.length - 1].timestamp
            } : null,
            averageMessageLength: messages.reduce((acc, msg) => acc + msg.content.length, 0) / messages.length
        };
        
        return `Session: ${summary.totalMessages} messages, avg length: ${Math.round(summary.averageMessageLength)} chars`;
    }

    _formatHistoricalContext(summaries) {
        return summaries.map(summary => 
            `Summary (${summary.messageCount} msgs): Key entities: ${summary.entities.map(e => e.value).join(', ')}`
        ).join('\n');
    }

    _formatEntityDetails(entities) {
        return entities.map(entity => ({
            type: entity.type,
            value: entity.value,
            confidence: entity.confidence,
            frequency: entity.frequency
        }));
    }

    _formatTopicAnalysis(topics) {
        return topics.map(topic => ({
            name: topic.topic,
            relevance: topic.relevance,
            messageCount: topic.messages.length,
            status: topic.status
        }));
    }

    /**
     * Format context for LLM consumption
     * @param {Object} context - Raw context object
     * @param {Object} options - Formatting options
     * @returns {Object} Formatted context suitable for LLM
     */
    _formatContextForLLM(context, options = {}) {
        const formatted = {
            sessionId: context.sessionId,
            messageCount: context.messageCount,
            lastActivity: context.lastActivity
        };
        
        // Add immediate context (most recent messages) if requested
        if (options.includeRecentMessages || options.includeImmediateContext) {
            formatted.immediate = context.immediate || [];
        }
        
        // Add recent context if requested
        if (options.includeRecentContext) {
            formatted.recent = context.recent || [];
        }
        
        // Add session context if requested
        if (options.includeSessionContext) {
            formatted.session = context.session || [];
        }
        
        // Add historical summaries if requested
        if (options.includeHistoricalContext) {
            formatted.historical = context.historical || [];
        }
        
        // Add entities and topics
        if (context.relevantEntities) {
            formatted.relevantEntities = context.relevantEntities;
        }
        
        if (context.activeTopics) {
            formatted.activeTopics = context.activeTopics;
        }
        
        return formatted;
    }
}

/**
 * Session Context Class
 * Manages context for individual conversation sessions
 */
class SessionContext {
    constructor(sessionId, config) {
        this.id = sessionId;
        this.config = config;
        this.messages = [];
        this.summaries = [];
        this.entities = new Map();
        this.topics = new Map();
        this.metadata = {
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            messageCount: 0,
            followUpSequences: 0
        };
    }

    addMessage(message) {
        this.messages.push(message);
        this.metadata.messageCount += 1;
        this.metadata.lastActivity = message.timestamp;
        
        // Track follow-up sequences
        if (message.metadata.followUpScore > 0.5) {
            this.metadata.followUpSequences += 1;
        }
        
        // Maintain memory limit
        if (this.messages.length > this.config.maxMessagesInMemory) {
            this.messages.shift();
        }
    }

    addSummary(summary) {
        this.summaries.push(summary);
        // Keep only recent summaries
        if (this.summaries.length > 10) {
            this.summaries.shift();
        }
    }

    archiveOldMessages(messages) {
        messages.forEach(msg => {
            const index = this.messages.findIndex(m => m.id === msg.id);
            if (index !== -1) {
                this.messages.splice(index, 1);
            }
        });
    }

    getOldestMessages(count) {
        return this.messages.slice(0, count);
    }

    needsSummarization(threshold) {
        return this.messages.length >= threshold; // Remove the modulo check for more frequent summarization
    }

    calculateFollowUpScore(content) {
        const followUpIndicators = [
            /\b(that|this|it|they|them)\b/gi,
            /\b(also|too|additionally|furthermore)\b/gi,
            /\b(more|another|other|else)\b/gi,
            /\b(continue|keep|still|yet)\b/gi,
            /\b(what about|how about|what if)\b/gi,
            /^(and|but|so|then|now)\b/gi,
            /\b(how do|how to|what about)\b/gi,
            /\b(sounds?|interesting|cool)\b/gi
        ];
        
        let score = 0;
        followUpIndicators.forEach(pattern => {
            if (pattern.test(content)) score += 0.3; // Increased from 0.2
        });
        
        // Boost score for short messages (likely follow-ups)
        if (content.length < 50) score += 0.4; // Increased from 0.3
        
        // Boost score for questions starting with common follow-up words
        if (/^(how|what|why|when|where|which)\b/gi.test(content)) {
            score += 0.3;
        }
        
        return Math.min(score, 1.0);
    }

    analyzeFollowUp(message) {
        const followUpScore = this.calculateFollowUpScore(message);
        const recentMessages = this.messages.slice(-5);
        
        return {
            isFollowUp: followUpScore > 0.3, // Lowered threshold for better detection
            confidence: followUpScore,
            recentContext: recentMessages,
            contextualCues: this._extractContextualCues(message, recentMessages)
        };
    }

    _extractContextualCues(message, recentMessages) {
        const cues = [];
        
        // Pronoun references
        if (/\b(that|this|it|they|them)\b/gi.test(message)) {
            cues.push({ type: 'pronoun_reference', confidence: 0.8 });
        }
        
        // Additive phrases
        if (/\b(also|too|additionally)\b/gi.test(message)) {
            cues.push({ type: 'additive_continuation', confidence: 0.9 });
        }
        
        // Question continuation
        if (/\b(what about|how about|what if)\b/gi.test(message)) {
            cues.push({ type: 'question_continuation', confidence: 0.85 });
        }
        
        return cues;
    }

    generateLayeredContext(layers) {
        return {
            sessionId: this.id,
            messageCount: this.messages.length,
            lastActivity: this.metadata.lastActivity,
            immediate: this.messages.slice(-layers.immediate),
            recent: this.messages.slice(-layers.recent),
            session: this.messages.slice(-layers.session),
            historical: this.summaries.slice(-layers.historical)
        };
    }
}

module.exports = ConversationalContextService;
