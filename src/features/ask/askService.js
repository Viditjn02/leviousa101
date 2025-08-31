const { BrowserWindow } = require('electron');
const { createStreamingLLM } = require('../common/ai/factory');
const { ParallelLLMOrchestrator } = require('../common/ai/parallelLLMOrchestrator');
const ConversationalContextService = require('../common/services/conversationalContextService');
const DynamicToolSelectionService = require('../common/services/dynamicToolSelectionService');
// Lazy require helper to avoid circular dependency issues
const getWindowManager = () => require('../../window/windowManager');
const internalBridge = require('../../bridge/internalBridge');

// NEW: Get MCP client for enhanced answer generation
const getMCPClient = () => {
    try {
        if (!global.invisibilityService) {
            console.log('[AskService] MCP: Invisibility service not available');
            return null;
        }
        
        if (!global.invisibilityService.mcpClient) {
            console.log('[AskService] MCP: MCP client not available in invisibility service');
            return null;
        }
        
        if (!global.invisibilityService.mcpClient.isInitialized) {
            console.log('[AskService] MCP: MCP client not yet initialized');
            return null;
        }
        
        console.log('[AskService] MCP: Client available and initialized');
        return global.invisibilityService.mcpClient;
    } catch (error) {
        console.warn('[AskService] MCP: Error accessing MCP client:', error.message);
        return null;
    }
};

const getWindowPool = () => {
    try {
        return getWindowManager().windowPool;
    } catch {
        return null;
    }
};

const sessionRepository = require('../common/repositories/session');
const askRepository = require('./repositories');
const { getSystemPrompt } = require('../common/prompts/promptBuilder');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const { desktopCapturer } = require('electron');
const modelStateService = require('../common/services/modelStateService');

// Try to load sharp, but don't fail if it's not available
let sharp;
try {
    sharp = require('sharp');
    console.log('[AskService] Sharp module loaded successfully');
} catch (error) {
    console.warn('[AskService] Sharp module not available:', error.message);
    console.warn('[AskService] Screenshot functionality will work with reduced image processing capabilities');
    sharp = null;
}
let lastScreenshot = null;

async function captureScreenshot(options = {}) {
    if (process.platform === 'darwin') {
        try {
            const tempPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.jpg`);

            await execFile('screencapture', ['-x', '-t', 'jpg', tempPath]);

            const imageBuffer = await fs.promises.readFile(tempPath);
            await fs.promises.unlink(tempPath);

            if (sharp) {
                try {
                    // Try using sharp for optimal image processing
                    const resizedBuffer = await sharp(imageBuffer)
                        .resize({ height: 384 })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    const base64 = resizedBuffer.toString('base64');
                    const metadata = await sharp(resizedBuffer).metadata();

                    lastScreenshot = {
                        base64,
                        width: metadata.width,
                        height: metadata.height,
                        timestamp: Date.now(),
                    };

                    return { success: true, base64, width: metadata.width, height: metadata.height };
                } catch (sharpError) {
                    console.warn('Sharp module failed, falling back to basic image processing:', sharpError.message);
                }
            }
            
            // Fallback: Return the original image without resizing
            console.log('[AskService] Using fallback image processing (no resize/compression)');
            const base64 = imageBuffer.toString('base64');
            
            lastScreenshot = {
                base64,
                width: null, // We don't have metadata without sharp
                height: null,
                timestamp: Date.now(),
            };

            return { success: true, base64, width: null, height: null };
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return { success: false, error: error.message };
        }
    }

    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: 1920,
                height: 1080,
            },
        });

        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }
        const source = sources[0];
        const buffer = source.thumbnail.toJPEG(70);
        const base64 = buffer.toString('base64');
        const size = source.thumbnail.getSize();

        return {
            success: true,
            base64,
            width: size.width,
            height: size.height,
        };
    } catch (error) {
        console.error('Failed to capture screenshot using desktopCapturer:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * @class
 * @description
 */
class AskService {
    constructor() {
        this.state = {
            isVisible      : false,
            isLoading      : false,
            isStreaming    : false,
            currentQuestion: '',
            currentResponse: '',
            showTextInput  : true,
        };

        this.abortController = null;
        this.conversationSessions = new Map(); // Enhanced conversation session tracking
        this.mcpVerificationDone = false; // Flag to track if MCP verification has been done
        this.parallelOrchestrator = new ParallelLLMOrchestrator(); // Parallel LLM execution
        
        // Initialize advanced conversational context service
        this.contextService = new ConversationalContextService({
            maxMessagesInMemory: 150,
            maxContextLength: 12000,
            summaryThreshold: 60,
            entityRetentionDays: 45
        });
        
        // Dynamic tool selection service (initialized lazily)
        this.dynamicToolService = null;
        
        // MCP verification will be done lazily when first needed
    }

    /**
     * Initialize MCP verification to ensure tools are available (called lazily)
     */
    async initializeMCPVerification() {
        // Only run verification once
        if (this.mcpVerificationDone) {
            return;
        }
        
        try {
            const mcpClient = getMCPClient();
            
            if (mcpClient) {
                // Give MCP client time to initialize
                setTimeout(async () => {
                    try {
                        const debugInfo = mcpClient.getMCPToolsDebugInfo();
                        console.log('[AskService] MCP Tools Available:', debugInfo.totalTools);
                        console.log('[AskService] Connected Services:', debugInfo.connectedServices);
                        
                        if (debugInfo.totalTools > 0) {
                            console.log('[AskService] ✅ MCP tools are available for ask bar');
                        } else {
                            console.log('[AskService] ⚠️ No MCP tools available - service integrations may need setup');
                        }
                    } catch (error) {
                        console.warn('[AskService] Error getting MCP debug info:', error);
                    }
                }, 2000);
                
                this.mcpVerificationDone = true;
            } else {
                console.log('[AskService] ⚠️ MCP client not available yet - will retry when needed');
            }
        } catch (error) {
            console.warn('[AskService] Error during MCP verification:', error);
        }
    }

    _broadcastState() {
        const askWindow = getWindowPool()?.get('ask');
        if (askWindow && !askWindow.isDestroyed()) {
            askWindow.webContents.send('ask:stateUpdate', this.state);
        }
    }

    // NEW: Trigger intelligent title generation for session
    async triggerTitleGeneration(sessionId) {
        try {
            // Don't generate titles immediately - wait for a few exchanges
            const sessionRepository = require('../common/repositories/session');
            const askRepository = require('./repositories');
            
            // Get message count for this session
            const messages = await askRepository.getAllAiMessagesBySessionId(sessionId);
            
            // Generate title after 2-3 message exchanges (4-6 total messages)
            if (messages.length >= 4 && messages.length <= 8) {
                console.log(`[AskService] Triggering title generation for session ${sessionId} (${messages.length} messages)`);
                
                // Generate title in background (don't await to avoid blocking)
                sessionRepository.generateIntelligentTitle(sessionId).catch(error => {
                    console.warn('[AskService] Title generation failed:', error.message);
                });
            }
        } catch (error) {
            console.warn('[AskService] Error in title generation trigger:', error.message);
        }
    }

    async toggleAskButton(inputScreenOnly = false) {
        const askWindow = getWindowPool()?.get('ask');

        let shouldSendScreenOnly = false;
        if (inputScreenOnly && this.state.showTextInput && askWindow && askWindow.isVisible()) {
            shouldSendScreenOnly = true;
            await this.sendMessage('', []);
            return;
        }

        const hasContent = this.state.isLoading || this.state.isStreaming || (this.state.currentResponse && this.state.currentResponse.length > 0);

        if (askWindow && askWindow.isVisible() && hasContent) {
            this.state.showTextInput = !this.state.showTextInput;
            this._broadcastState();
        } else {
            if (askWindow && askWindow.isVisible()) {
                internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });
                this.state.isVisible = false;
            } else {
                console.log('[AskService] Showing hidden Ask window');
                internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
                this.state.isVisible = true;
            }
            if (this.state.isVisible) {
                this.state.showTextInput = true;
                this._broadcastState();
            }
        }
    }

    async closeAskWindow () {
            if (this.abortController) {
                this.abortController.abort('Window closed by user');
                this.abortController = null;
            }
    
            this.state = {
                isVisible      : false,
                isLoading      : false,
                isStreaming    : false,
                currentQuestion: '',
                currentResponse: '',
                showTextInput  : true,
            };
            this._broadcastState();
    
            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });
    
            return { success: true };
        }
    

    /**
     * Enhanced conversation formatting for better context retention
     * @param {string[]} conversationTexts
     * @param {string} questionType - Type of current question to optimize context
     * @returns {string}
     * @private
     */
    _formatConversationForPrompt(conversationTexts, questionType = 'general') {
        if (!conversationTexts || conversationTexts.length === 0) {
            return 'No conversation history available.';
        }

        // For capability questions, include more recent context to understand follow-ups
        const contextLimit = questionType === 'help_conversation' ? 50 : 
                            questionType.includes('mcp') || questionType.includes('capability') ? 40 : 30;
        
        const recentMessages = conversationTexts.slice(-contextLimit);
        
        // Format with roles for better context understanding
        const formattedMessages = [];
        let currentRole = 'user'; // Start with user
        
        recentMessages.forEach((message, index) => {
            if (message && message.trim()) {
                // Alternate between user and assistant for context
                const role = index % 2 === 0 ? 'User' : 'Assistant';
                formattedMessages.push(`${role}: ${message.trim()}`);
            }
        });
        
        const context = formattedMessages.join('\n');
        
        // Add metadata for follow-up questions
        if (questionType === 'help_conversation') {
            return `Previous conversation context (for follow-up):\n${context}`;
        } else if (questionType.includes('mcp') || questionType.includes('capability')) {
            return `Previous questions about capabilities:\n${context}`;
        }
        
        return context;
    }

    /**
     * Enhanced question context with conversation awareness
     * @param {string} userPrompt
     * @param {string[]} conversationHistory
     * @param {string} questionType
     * @returns {object} Enhanced question object
     * @private
     */
    _buildEnhancedQuestion(userPrompt, conversationHistory, questionType) {
        const question = {
            text: userPrompt.trim(),
            type: questionType,
            context: this._formatConversationForPrompt(conversationHistory, questionType),
            confidence: 90,
            timestamp: new Date().toISOString()
        };

        // Add follow-up indicators for conversation continuity
        const lowerPrompt = userPrompt.toLowerCase();
        if (lowerPrompt.match(/\b(follow up|continue|more|previous|again|that|this|also|too)\b/)) {
            question.isFollowUp = true;
            question.needsPreviousContext = true;
        }

        // Add screen reference indicators
        if (lowerPrompt.match(/\b(this|these|that|those|here|on screen|visible|showing|current)\b/)) {
            question.requiresScreenContext = true;
        }

        return question;
    }

    /**
     * Build advanced question object with comprehensive context analysis
     * @param {string} userPrompt - The user's question
     * @param {object} advancedContext - Advanced context from ConversationalContextService
     * @param {string} questionType - Classified question type
     * @param {object} followUpAnalysis - Follow-up analysis results
     * @returns {object} Advanced question object
     * @private
     */
    _buildAdvancedQuestion(userPrompt, advancedContext, questionType, followUpAnalysis) {
        const question = {
            text: userPrompt.trim(),
            type: questionType,
            context: this._formatAdvancedConversationForPrompt(advancedContext),
            confidence: 95, // Higher confidence with advanced analysis
            timestamp: new Date().toISOString(),
            
            // Advanced context indicators
            isFollowUp: followUpAnalysis.isFollowUp,
            followUpConfidence: followUpAnalysis.confidence,
            needsPreviousContext: followUpAnalysis.isFollowUp || followUpAnalysis.entityContinuity?.hasContinuity,
            requiresScreenContext: this._detectScreenReferenceContext(userPrompt, advancedContext),
            
            // Entity and topic continuity
            entityContinuity: followUpAnalysis.entityContinuity,
            topicContinuity: followUpAnalysis.topicContinuity,
            
            // Context metadata
            contextLayers: {
                immediate: advancedContext.conversationFlow?.length || 0,
                entities: advancedContext.activeEntities?.length || 0,
                topics: advancedContext.topicThreads?.length || 0,
                historical: advancedContext.relevantHistory?.length || 0
            }
        };

        return question;
    }

    /**
     * Format advanced conversation context for LLM prompt
     * @param {object} advancedContext - Advanced context from ConversationalContextService
     * @returns {string} Formatted context for LLM
     * @private
     */
    _formatAdvancedConversationForPrompt(advancedContext) {
        const contextParts = [];
        
        // Immediate conversation flow (most recent exchanges)
        if (advancedContext.conversationFlow && advancedContext.conversationFlow.length > 0) {
            contextParts.push("=== Recent Conversation ===");
            advancedContext.conversationFlow.forEach(msg => {
                const followUpIndicator = msg.followUp ? " [FOLLOW-UP]" : "";
                contextParts.push(`${msg.role}: ${msg.content}${followUpIndicator}`);
            });
        }
        
        // Active entities and their context
        if (advancedContext.activeEntities && advancedContext.activeEntities.length > 0) {
            contextParts.push("\n=== Active Entities ===");
            advancedContext.activeEntities.slice(0, 10).forEach(entity => {
                contextParts.push(`${entity.type}: ${entity.value} (mentioned ${entity.frequency}x)`);
            });
        }
        
        // Active topic threads
        if (advancedContext.topicThreads && advancedContext.topicThreads.length > 0) {
            contextParts.push("\n=== Active Topics ===");
            advancedContext.topicThreads.slice(0, 5).forEach(topic => {
                contextParts.push(`${topic.topic}: ${topic.messages.length} messages, relevance: ${Math.round(topic.relevance * 100)}%`);
            });
        }
        
        // Session overview
        if (advancedContext.sessionOverview) {
            contextParts.push(`\n=== Session Overview ===`);
            contextParts.push(advancedContext.sessionOverview);
        }
        
        return contextParts.join('\n');
    }

    /**
     * Detect if screen reference context is needed
     * @param {string} userPrompt - User's question
     * @param {object} advancedContext - Advanced context
     * @returns {boolean} Whether screen context is needed
     * @private
     */
    _detectScreenReferenceContext(userPrompt, advancedContext) {
        const lowerPrompt = userPrompt.toLowerCase();
        
        // Direct screen references
        if (lowerPrompt.match(/\b(this|these|that|those|here|on screen|visible|showing|current)\b/)) {
            return true;
        }
        
        // Context-based screen reference (if previous message mentioned screen elements)
        if (advancedContext.conversationFlow) {
            const recentMessages = advancedContext.conversationFlow.slice(-3);
            return recentMessages.some(msg => 
                msg.content.toLowerCase().includes('screen') ||
                msg.content.toLowerCase().includes('visible') ||
                msg.content.toLowerCase().includes('showing')
            );
        }
        
        return false;
    }

    /**
     * Initialize conversation session with enhanced context tracking
     * @param {string} sessionId - Session identifier
     * @returns {Promise<void>}
     */
    async initializeConversationSession(sessionId) {
        try {
            if (!this.conversationSessions) {
                this.conversationSessions = new Map();
            }

            if (!this.conversationSessions.has(sessionId)) {
                this.conversationSessions.set(sessionId, {
                    id: sessionId,
                    startTime: new Date(),
                    lastActivity: new Date(),
                    messageCount: 0,
                    topics: [],
                    questionTypes: [],
                    mcpCapabilitiesDiscussed: false,
                    followUpContext: null
                });
                console.log(`[AskService] 💬 Initialized conversation session: ${sessionId}`);
            }
        } catch (error) {
            console.warn('[AskService] Failed to initialize conversation session:', error);
        }
    }

    /**
     * Update conversation session with message context
     * @param {string} sessionId - Session identifier  
     * @param {string} userPrompt - User message
     * @param {string} questionType - Classified question type
     * @param {string} response - System response
     */
    updateConversationSession(sessionId, userPrompt, questionType, response) {
        try {
            if (!this.conversationSessions?.has(sessionId)) {
                return;
            }

            const session = this.conversationSessions.get(sessionId);
            session.lastActivity = new Date();
            session.messageCount += 1;
            
            // Track question types for context
            if (!session.questionTypes.includes(questionType)) {
                session.questionTypes.push(questionType);
            }
            
            // Track if MCP capabilities were discussed
            if (questionType.includes('mcp') || questionType.includes('capability') || questionType.includes('notion')) {
                session.mcpCapabilitiesDiscussed = true;
            }
            
            // Extract topics from user message
            const topics = this.extractTopicsFromMessage(userPrompt);
            topics.forEach(topic => {
                if (!session.topics.includes(topic)) {
                    session.topics.push(topic);
                }
            });
            
            // Store follow-up context for capability questions
            if (questionType.includes('mcp') || questionType.includes('capability')) {
                session.followUpContext = {
                    lastCapabilityQuestion: userPrompt,
                    lastCapabilityResponse: response.substring(0, 500), // Store summary
                    timestamp: new Date()
                };
            }

            console.log(`[AskService] 📝 Updated session ${sessionId}: ${session.messageCount} messages, topics: ${session.topics.join(', ')}`);
        } catch (error) {
            console.warn('[AskService] Failed to update conversation session:', error);
        }
    }

    /**
     * Extract topics from user message for context tracking
     * @param {string} message - User message
     * @returns {string[]} Extracted topics
     */
    extractTopicsFromMessage(message) {
        const topics = [];
        const lowerMessage = message.toLowerCase();
        
        // Common topics to track
        const topicKeywords = {
            'notion': ['notion', 'notes', 'workspace', 'database', 'page'],
            'github': ['github', 'repository', 'code', 'commit', 'pull request'],
            'integration': ['connect', 'integration', 'oauth', 'authenticate', 'setup'],
            'capabilities': ['capabilities', 'what can', 'features', 'tools', 'functions'],
            'help': ['help', 'how to', 'guide', 'tutorial', 'getting started']
        };

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                topics.push(topic);
            }
        }

        return topics;
    }

    /**
     * Get conversation context for enhanced responses
     * @param {string} sessionId - Session identifier
     * @returns {object|null} Conversation context
     */
    getConversationContext(sessionId) {
        try {
            if (!this.conversationSessions?.has(sessionId)) {
                return null;
            }

            const session = this.conversationSessions.get(sessionId);
            return {
                hasDiscussedCapabilities: session.mcpCapabilitiesDiscussed,
                topics: session.topics,
                questionTypes: session.questionTypes,
                followUpContext: session.followUpContext,
                messageCount: session.messageCount,
                isOngoing: (Date.now() - session.lastActivity.getTime()) < 300000 // 5 minutes
            };
        } catch (error) {
            console.warn('[AskService] Failed to get conversation context:', error);
            return null;
        }
    }

    /**
     * 
     * @param {string} userPrompt
     * @returns {Promise<{success: boolean, response?: string, error?: string}>}
     */
    async sendMessage(userPrompt, conversationHistoryRaw=[]) {
        internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
        this.state = {
            ...this.state,
            isLoading: true,
            isStreaming: false,
            currentQuestion: userPrompt,
            currentResponse: '',
            showTextInput: false,
        };
        this._broadcastState();

        if (this.abortController) {
            this.abortController.abort('New request received.');
        }
        this.abortController = new AbortController();
        const { signal } = this.abortController;


        let sessionId;
        let responseText = '';

        try {
            console.log(`[AskService] 🤖 Processing message: ${userPrompt.substring(0, 50)}...`);

            // 🔒 Check subscription and usage limits for Auto Answer feature
            const subscriptionService = require('../common/services/subscriptionService');
            const usageTrackingRepository = require('../common/repositories/usageTracking');
            
            console.log('[AskService] 🔍 Checking Auto Answer usage limits...');
            const usageCheck = await subscriptionService.checkUsageAllowed('cmd_l');
            
            if (!usageCheck.allowed) {
                const errorMessage = usageCheck.unlimited ? 
                    'Auto Answer feature is not available.' :
                    `Auto Answer daily limit reached. Used: ${usageCheck.usage}/${usageCheck.limit} minutes. Resets in 24 hours.`;
                    
                console.log('[AskService] 🚫 Usage limit exceeded:', errorMessage);
                
                // Show custom branded upgrade dialog
                const customDialogService = require('../common/services/customDialogService');
                customDialogService.showUpgradeDialog({
                    title: 'Auto Answer Usage Limit Reached',
                    message: errorMessage,
                    detail: 'Upgrade to Pro for unlimited AI-powered auto answers and advanced features.',
                    featureType: 'cmd_l',
                    usage: usageCheck.usage !== undefined ? {
                        used: usageCheck.usage,
                        limit: usageCheck.limit,
                        remaining: usageCheck.remaining
                    } : null
                }).then((result) => {
                    console.log('[AskService] Custom dialog result:', result);
                }).catch((error) => {
                    console.error('[AskService] Custom dialog error:', error);
                });
                
                // Update UI to show limit exceeded
                this.state = {
                    ...this.state,
                    isLoading: false,
                    currentResponse: errorMessage,
                    showTextInput: true,
                };
                this._broadcastState();
                return;
            }
            
            console.log('[AskService] ✅ Usage check passed. Remaining:', usageCheck.remaining || 'unlimited');

            sessionId = await sessionRepository.getOrCreateActive('ask');
            await this.initializeConversationSession(sessionId);
            
            // Add user message to context service FIRST for immediate context tracking
            await this.contextService.addMessage(sessionId, {
                role: 'user',
                content: userPrompt.trim(),
                type: 'text'
            });
            
            await askRepository.addAiMessage({ sessionId, role: 'user', content: userPrompt.trim() });
            console.log(`[AskService] DB: Saved user prompt to session ${sessionId}`);
            
            // Initialize MCP verification lazily when first needed
            await this.initializeMCPVerification();
            
            // NEW: Try MCP enhanced answer generation first
            const mcpClient = getMCPClient();
            if (mcpClient) {
                console.log('[AskService] 🧠 Using MCP enhanced answer generation...');
                try {
                    const screenshotResult = await captureScreenshot({ quality: 'medium' });
                    const screenshotBase64 = screenshotResult.success ? screenshotResult.base64 : null;
                    
                    // Analyze follow-up context using advanced context service
                    const followUpAnalysis = this.contextService.analyzeFollowUp(sessionId, userPrompt);
                    console.log(`[AskService] 📊 Follow-up analysis:`, {
                        isFollowUp: followUpAnalysis.isFollowUp,
                        confidence: followUpAnalysis.confidence,
                        entityContinuity: followUpAnalysis.entityContinuity?.hasContinuity,
                        topicContinuity: followUpAnalysis.topicContinuity?.hasContinuity
                    });
                    
                    // Classify question type for MCP
                    const questionType = await this.classifyQuestionType(userPrompt);
                    console.log(`[AskService] MCP: Classified question as '${questionType}' type`);
                    
                    // Handle email composer requests - ONLY show UI, do not send email
                    if (questionType === 'email_composer_request') {
                        console.log(`[AskService] 📧 Processing email composer request - showing UI only, no direct sending`);
                        try {
                            // Extract email context from user prompt
                            const emailMatch = userPrompt.match(/(?:email|send).*?(?:to|@)\s*([^\s,]+@[^\s,]+)/i);
                            const recipientEmail = emailMatch ? emailMatch[1] : '';
                            
                            // Extract subject if mentioned
                            const subjectMatch = userPrompt.match(/(?:subject|about|re):\s*([^.!?]+)/i);
                            const subject = subjectMatch ? subjectMatch[1].trim() : '';
                            
                            // Generate email body from context
                            let emailBody = '';
                            if (userPrompt.includes('test email')) {
                                emailBody = 'This is a test email sent through Leviousa.';
                            } else if (userPrompt.includes('reminder')) {
                                emailBody = 'This is a reminder as requested.';
                            } else {
                                emailBody = `Hi,\n\nI wanted to reach out to you.\n\nBest regards`;
                            }
                            
                            // Prepare email UI data
                            const emailUIData = {
                                actionId: 'email-send',
                                serverId: 'paragon',
                                tool: 'gmail.send',
                                context: {
                                    recipients: recipientEmail,
                                    subject: subject || 'Message from Leviousa',
                                    body: emailBody,
                                    cc: '',
                                    bcc: ''
                                },
                                resource: {
                                    type: 'email-composer',
                                    uri: 'email://compose'
                                },
                                type: 'inline'
                            };
                            
                            console.log('[AskService] 📧 Emitting email UI resource for composer:', JSON.stringify(emailUIData, null, 2));
                            
                            // Emit the UI resource event to trigger email composer
                            if (global.invisibilityService && global.invisibilityService.mcpUIIntegration) {
                                global.invisibilityService.mcpUIIntegration.emit('ui-resource-ready', emailUIData);
                                console.log('[AskService] ✅ Email composer UI triggered successfully');
                                
                                // Return professional message indicating composer is opening
                                responseText = recipientEmail ? 
                                    `Email composer opened. You can now compose and send your email to ${recipientEmail}.` :
                                    "Email composer opened. You can now compose and send your email.";
                                
                                // Save response and return early - do not continue with any other processing
                                await askRepository.addAiMessage({ sessionId, role: 'assistant', content: responseText });
                                console.log(`[AskService] DB: Saved email composer response to session ${sessionId}`);
                                await this._streamMCPAnswer(responseText, sessionId);
                                return;
                            } else {
                                console.log('[AskService] ⚠️ MCP UI Integration not available for email composer');
                                responseText = "Email composer is not available right now. Please try again.";
                                await askRepository.addAiMessage({ sessionId, role: 'assistant', content: responseText });
                                await this._streamMCPAnswer(responseText, sessionId);
                                return;
                            }
                            
                        } catch (emailError) {
                            console.error('[AskService] Email composer trigger failed:', emailError);
                            responseText = "Sorry, I couldn't open the email composer. Please try again.";
                            await askRepository.addAiMessage({ sessionId, role: 'assistant', content: responseText });
                            await this._streamMCPAnswer(responseText, sessionId);
                            return;
                        }
                    }
                    
                    // Handle dynamic tool requests
                    if (questionType === 'dynamic_tool_request') {
                        console.log(`[AskService] 🔧 Processing dynamic tool request...`);
                        const dynamicResult = await this.handleDynamicToolRequest(userPrompt, sessionId);
                        if (dynamicResult) {
                            console.log(`[AskService] ✅ Dynamic tool execution completed`);
                            responseText = dynamicResult;
                            
                            // Save the dynamic tool response to session
                            await askRepository.addAiMessage({ sessionId, role: 'assistant', content: responseText });
                            console.log(`[AskService] DB: Saved dynamic tool response to session ${sessionId}`);
                            
                            // Send the response to UI using the same streaming method as regular LLM responses
                            await this._streamMCPAnswer(responseText, sessionId);
                            return;
                        }
                    }
                    
                    // Special logging for Notion questions
                    if (questionType === 'notion_data_access') {
                        console.log(`[AskService] 🎯 NOTION DATA ACCESS DETECTED - proceeding with MCP enhanced answer`);
                        console.log(`[AskService] 🎯 Question: "${userPrompt}"`);
                        console.log(`[AskService] 🎯 MCP Client initialized: ${mcpClient.isInitialized}`);
                        console.log(`[AskService] 🎯 Available external tools: ${mcpClient.externalTools?.length || 0}`);
                    }
                    
                    // Get comprehensive context from context service
                    const advancedContext = this.contextService.getContextForLLM(sessionId, {
                        includeEntityDetails: true,
                        includeTopicAnalysis: questionType.includes('linkedin') || questionType.includes('mcp')
                    });
                    
                    console.log(`[AskService] 📊 Advanced context generated:`, {
                        layers: Object.keys(advancedContext).length,
                        entities: advancedContext.activeEntities?.length || 0,
                        topics: advancedContext.topicThreads?.length || 0,
                        followUpDetected: followUpAnalysis.isFollowUp
                    });
                    
                    // Build enhanced question with advanced conversation awareness
                    const questionObj = this._buildAdvancedQuestion(userPrompt, advancedContext, questionType, followUpAnalysis);
                    
                    // Add conversation context from session tracking
                    const conversationContext = this.getConversationContext(sessionId);
                    if (conversationContext) {
                        questionObj.sessionContext = conversationContext;
                    }
                    
                    console.log('[AskService] MCP: Requesting enhanced answer with advanced context...');
                    // Pass the question text and include the enhanced context in the context parameter
                    const enhancedContext = {
                        questionType: questionObj.type,
                        conversationHistory: questionObj.context,
                        isFollowUp: questionObj.isFollowUp,
                        needsPreviousContext: questionObj.needsPreviousContext,
                        requiresScreenContext: questionObj.requiresScreenContext,
                        sessionContext: questionObj.sessionContext,
                        screenshot: screenshotBase64,
                        // NEW: Advanced context from ConversationalContextService
                        advancedContext: advancedContext,
                        followUpAnalysis: followUpAnalysis,
                        entities: advancedContext.activeEntities,
                        topics: advancedContext.topicThreads,
                        conversationLayers: advancedContext.conversationFlow
                    };
                    // PERFORMANCE OPTIMIZATION: Run answer generation and UI analysis in parallel
                    console.log('[AskService] 🚀 Running answer generation and UI analysis in parallel...');
                    
                    const parallelPromises = [
                        // Promise 1: Generate MCP answer
                        mcpClient.getEnhancedAnswer(questionObj.text, enhancedContext),
                        
                        // Promise 2: Analyze for contextual UI actions (can start immediately)
                        (async () => {
                            if (global.invisibilityService && global.invisibilityService.mcpUIIntegration) {
                                console.log('[AskService] 🎨 Starting parallel UI analysis...');
                                
                                const uiContext = {
                                    type: 'conversation',
                                    message: userPrompt,
                                    response: '', // Will be updated later if needed
                                    conversationHistory: conversationHistoryRaw,
                                    hasScreenshot: !!screenshotBase64,
                                    timestamp: new Date().toISOString()
                                };
                                
                                try {
                                    return await global.invisibilityService.mcpUIIntegration.getContextualActions(uiContext);
                                } catch (uiError) {
                                    console.error('[AskService] Parallel UI analysis failed:', uiError);
                                    return null;
                                }
                            }
                            return null;
                        })()
                    ];
                    
                    // Wait for both operations to complete
                    const [mcpResponse, uiResult] = await Promise.all(parallelPromises);
                    
                    if (mcpResponse && mcpResponse.answer) {
                        const mcpAnswer = mcpResponse.answer;
                        console.log(`[AskService] ✅ MCP generated enhanced answer (${mcpAnswer.length} characters)`);
                        
                        // Email requests are now handled at classification level and return early
                        // This section is for other UI opportunities
                        let didUIOverride = false;
                        
                        // Process UI result from parallel operation
                        try {
                            if (uiResult) {
                                console.log('[AskService] 🔍 DEBUG parallel uiResult:', JSON.stringify(uiResult, null, 2));
                                if (uiResult && uiResult.autoTriggered) {
                                    console.log(`[AskService] UI auto-triggered for: ${uiResult.autoTriggeredTypes.join(', ')}`);
                                    
                                    // Modify response for email composer
                                    if (uiResult.autoTriggeredTypes.includes('email.send')) {
                                        console.log('[AskService] 🎯 Email composer triggered - suppressing AI response');
                                        console.log('[AskService] 🔄 Original responseText length:', responseText.length);
                                        // Clean response for email composer - no generic AI text like in Paragon branch
                                        responseText = "";
                                        console.log('[AskService] ✅ Suppressed AI response for clean email UI');
                                        didUIOverride = true;
                                    }
                                } else if (Array.isArray(uiResult) && uiResult.length > 0) {
                                    // Handle backwards compatibility with old array format
                                    console.log('[AskService] ❌ uiResult in legacy array format');
                                    const autoTriggered = uiResult.some(action => action.confidence > 0.8 && action.autoTrigger);
                                    if (autoTriggered) {
                                        didUIOverride = true;
                                    }
                                }
                            }
                        } catch (uiError) {
                            console.warn('[AskService] UI analysis failed, continuing without UI:', uiError);
                        }
                        
                        // Special logging for successful Notion answers
                        if (questionType === 'notion_data_access') {
                            console.log(`[AskService] 🎯 NOTION MCP ANSWER SUCCESS: ${mcpAnswer.substring(0, 200)}...`);
                        }
                        
                        // Only set default answer if UI did not override
                        if (!didUIOverride) {
                            responseText = mcpAnswer;
                        }
                        
                        // Update conversation session with this exchange
                        this.updateConversationSession(sessionId, userPrompt, questionType, responseText);
                        
                        // Only stream the MCP answer if UI did not override
                        if (!didUIOverride) {
                            // Stream the MCP answer to maintain UI consistency
                            await this._streamMCPAnswer(mcpAnswer, sessionId);
                        } else {
                            // UI overrode the response, stream the empty/custom response instead
                            await this._streamMCPAnswer(responseText, sessionId);
                        }
                        return { success: true };
                    } else {
                        console.log('[AskService] MCP: No answer generated, falling back to standard');
                        
                        // Special logging for failed Notion answers
                        if (questionType === 'notion_data_access') {
                            console.log(`[AskService] 🎯 NOTION MCP ANSWER FAILED - no answer generated, checking server status...`);
                            const serverStatus = mcpClient.getServerStatus();
                            const notionServer = serverStatus.servers?.notion;
                            if (notionServer) {
                                console.log(`[AskService] 🎯 Notion server status: authenticated=${notionServer.authenticated}, connected=${notionServer.connected}, tools=${notionServer.tools?.length || 0}`);
                            } else {
                                console.log(`[AskService] 🎯 Notion server not found in server status`);
                            }
                        }
                    }
                } catch (mcpError) {
                    console.warn('[AskService] MCP answer generation failed, falling back to standard:', mcpError.message);
                    console.warn('[AskService] MCP error details:', mcpError);
                    
                    // Special logging for Notion MCP errors
                    if (userPrompt.toLowerCase().includes('notion')) {
                        console.error(`[AskService] 🎯 NOTION MCP ERROR: ${mcpError.message}`);
                        console.error(`[AskService] 🎯 Error stack:`, mcpError.stack);
                    }
                }
            } else {
                console.log('[AskService] 🔄 MCP client not available, using standard answer generation');
                
                // Special warning for Notion questions without MCP
                if (userPrompt.toLowerCase().includes('notion')) {
                    console.warn(`[AskService] 🎯 NOTION QUESTION DETECTED BUT NO MCP CLIENT AVAILABLE`);
                    console.warn(`[AskService] 🎯 Question: "${userPrompt}"`);
                    console.warn(`[AskService] 🎯 This means Notion data cannot be accessed`);
                }
            }
            
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key not configured.');
            }
            console.log(`[AskService] Using model: ${modelInfo.model} for provider: ${modelInfo.provider}`);

            const screenshotResult = await captureScreenshot({ quality: 'medium' });
            const screenshotBase64 = screenshotResult.success ? screenshotResult.base64 : null;

            const questionType = await this.classifyQuestionType(userPrompt);
            const conversationHistory = this._formatConversationForPrompt(conversationHistoryRaw, questionType);

            const systemPrompt = getSystemPrompt('leviousa_analysis', conversationHistory, false);

            const messages = [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `User Request: ${userPrompt.trim()}` },
                    ],
                },
            ];

            if (screenshotBase64) {
                messages[1].content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` },
                });
            }
            
            // PERFORMANCE: Use Ultra-Fast Streaming Service for <100ms responses
            console.log('[AskService] 🚀 Using Ultra-Fast Streaming Service for realtime responses');
            
            try {
                const { getUltraFastStreamingService } = require('../common/services/ultraFastStreamingService');
                const ultraFastStreamer = getUltraFastStreamingService();
                
                // Stream with ultra-fast optimizations
                const response = await ultraFastStreamer.streamResponse(userPrompt.trim(), {
                    provider: modelInfo.provider,
                    model: modelInfo.model,
                    temperature: 0.7,
                    maxTokens: 2048,
                    mode: 'ask'
                });
                
                const askWin = getWindowPool()?.get('ask');

                if (!askWin || askWin.isDestroyed()) {
                    console.error("[AskService] Ask window is not available to send stream to.");
                    response.body.getReader().cancel();
                    return { success: false, error: 'Ask window is not available.' };
                }

                const reader = response.body.getReader();
                signal.addEventListener('abort', () => {
                    console.log(`[AskService] Aborting stream reader. Reason: ${signal.reason}`);
                    reader.cancel(signal.reason).catch(() => { /* 이미 취소된 경우의 오류는 무시 */ });
                });

                await this._processStream(reader, askWin, sessionId, signal);
                return { success: true };

            } catch (orchestratorError) {
                // If parallel orchestrator fails, fall back to standard streaming
                console.log(`[AskService] Parallel orchestrator failed, falling back to standard streaming: ${orchestratorError.message}`);
                
                const fallbackLLM = createStreamingLLM(modelInfo.provider, {
                    apiKey: modelInfo.apiKey,
                    model: modelInfo.model,
                    temperature: 0.7,
                    maxTokens: 2048,
                    usePortkey: modelInfo.provider === 'openai-leviousa',
                    portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
                });

                // Create text-only messages for fallback
                const fallbackMessages = [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: `User Request: ${userPrompt.trim()}` }
                        ]
                    }
                ];

                // Add screenshot if available and not a multimodal error
                if (screenshotBase64 && !this._isMultimodalError(orchestratorError)) {
                    fallbackMessages[1].content.push({
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` }
                    });
                }

                const fallbackResponse = await fallbackLLM.streamChat(fallbackMessages);
                const askWin = getWindowPool()?.get('ask');

                if (!askWin || askWin.isDestroyed()) {
                    console.error("[AskService] Ask window is not available for fallback response.");
                    fallbackResponse.body.getReader().cancel();
                    return { success: false, error: 'Ask window is not available.' };
                }

                const fallbackReader = fallbackResponse.body.getReader();
                signal.addEventListener('abort', () => {
                    console.log(`[AskService] Aborting fallback stream reader. Reason: ${signal.reason}`);
                    fallbackReader.cancel(signal.reason).catch(() => {});
                });

                await this._processStream(fallbackReader, askWin, sessionId, signal);
                return { success: true };
            }

        } catch (error) {
            console.error('[AskService] Error during message processing:', error);
            this.state = {
                ...this.state,
                isLoading: false,
                isStreaming: false,
                showTextInput: true,
            };
            this._broadcastState();

            const askWin = getWindowPool()?.get('ask');
            if (askWin && !askWin.isDestroyed()) {
                const streamError = error.message || 'Unknown error occurred';
                askWin.webContents.send('ask-response-stream-error', { error: streamError });
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * 
     * @param {ReadableStreamDefaultReader} reader
     * @param {BrowserWindow} askWin
     * @param {number} sessionId 
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     * @private
     */
    async _processStream(reader, askWin, sessionId, signal) {
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
            this.state.isLoading = false;
            this.state.isStreaming = true;
            this._broadcastState();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            // 📊 Track Auto Answer usage completion
                            try {
                                const subscriptionService = require('../common/services/subscriptionService');
                                await subscriptionService.trackUsageToWebAPI('cmd_l', 1); // Track 1 minute per use
                                console.log('[AskService] ✅ Auto Answer usage tracked: +1 minute');
                            } catch (trackingError) {
                                console.error('[AskService] ❌ Failed to track usage:', trackingError);
                            }
                            return; 
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                                this.state.currentResponse = fullResponse;
                                this._broadcastState();
                            }
                        } catch (error) {
                        }
                    }
                }
            }
        } catch (streamError) {
            if (signal.aborted) {
                console.log(`[AskService] Stream reading was intentionally cancelled. Reason: ${signal.reason}`);
            } else {
                console.error('[AskService] Error while processing stream:', streamError);
                if (askWin && !askWin.isDestroyed()) {
                    askWin.webContents.send('ask-response-stream-error', { error: streamError.message });
                }
            }
        } finally {
            this.state.isStreaming = false;
            this.state.currentResponse = fullResponse;
            this._broadcastState();
            if (fullResponse) {
                 try {
                    await askRepository.addAiMessage({ sessionId, role: 'assistant', content: fullResponse });
                    console.log(`[AskService] DB: Saved partial or full assistant response to session ${sessionId} after stream ended.`);
                    
                    // Update conversation session with this exchange
                    const questionType = await this.classifyQuestionType(this.state.currentQuestion || '');
                    this.updateConversationSession(sessionId, this.state.currentQuestion || '', questionType, fullResponse);
                    
                    // NEW: Trigger intelligent title generation after assistant response
                    this.triggerTitleGeneration(sessionId);
                } catch(dbError) {
                    console.error("[AskService] DB: Failed to save assistant response after stream ended:", dbError);
                }
            }
        }
    }

    /**
     * 멀티모달 관련 에러인지 판단
     * @private
     */
    _isMultimodalError(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        return (
            errorMessage.includes('vision') ||
            errorMessage.includes('image') ||
            errorMessage.includes('multimodal') ||
            errorMessage.includes('unsupported') ||
            errorMessage.includes('image_url') ||
            errorMessage.includes('400') ||  // Bad Request often for unsupported features
            errorMessage.includes('invalid') ||
            errorMessage.includes('not supported')
        );
    }

    /**
     * Process insight request from speaker intelligence system
     * @param {Object} request - The insight request object
     * @returns {Promise<{text: string, confidence: number}>}
     */
    async processInsightRequest(request) {
        try {
            console.log('[AskService] Processing insight request:', request.type);
            
            if (request.type === 'meeting_insight') {
                const { transcription, context } = request;
                
                // Create a concise prompt for faster insight generation
                const insightPrompt = `Generate a brief insight for this meeting comment:

"${transcription.text}"

Context: ${context.slice(-2).map(msg => msg.text).join('. ')}

Provide one actionable insight (max 15 words):`;

                // Get current model info
                const modelInfo = await modelStateService.getCurrentModelInfo('llm');
                if (!modelInfo || !modelInfo.apiKey) {
                    throw new Error('AI model not configured for insights');
                }

                // Create a simple LLM request (not streaming)
                const { createLLM } = require('../common/ai/factory');
                const llm = createLLM(modelInfo.provider, {
                    apiKey: modelInfo.apiKey,
                    model: modelInfo.model,
                    temperature: 0.1, // Lower temperature for faster, more focused responses
                    maxTokens: 50,    // Much smaller token limit for faster generation
                    usePortkey: modelInfo.provider === 'openai-leviousa',
                    portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
                });

                const response = await llm.chat([
                    { role: 'user', content: insightPrompt }
                ]);

                if (response && response.content && response.content.trim()) {
                    return {
                        text: response.content.trim(),
                        confidence: 0.8,
                        type: 'meeting_insight'
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('[AskService] Error processing insight request:', error);
            return null;
        }
    }

    /**
     * Capture a screenshot of the current screen
     * @param {Object} options - Screenshot options
     * @returns {Promise<{success: boolean, base64?: string, width?: number, height?: number, error?: string}>}
     */
    async captureScreenshot(options = {}) {
        return await captureScreenshot(options);
    }

    /**
     * Enhanced question classification with MCP capability awareness
     * @param {string} userPrompt 
     * @returns {string}
     * @private
     */
    async classifyQuestionType(userPrompt) {
        const lowerPrompt = userPrompt.toLowerCase();
        
        // Enhanced debugging for Notion questions specifically
        const isNotionRelated = lowerPrompt.includes('notion') || 
                               lowerPrompt.match(/\b(pages?|databases?|workspace|content|notes?|documents?)\b.*\b(notion|my workspace)\b/) ||
                               lowerPrompt.match(/\b(what|see|view|show|find|look|check)\b.*\b(in|on|at)\b.*\b(my\s+)?notion\b/);
        
        if (isNotionRelated) {
            console.log(`[AskService] 🔍 NOTION QUESTION DETECTED: "${userPrompt}"`);
            console.log(`[AskService] 🔍 Question contains: ${lowerPrompt.match(/\b(notion|pages?|databases?|workspace|content|notes?|documents?)\b/g)?.join(', ')}`);
        }
        
        // MCP debug and testing questions
        if (lowerPrompt.match(/\b(debug|test|check)\b.*\b(mcp|tools|connections?|integrations?)\b/) ||
            lowerPrompt.match(/\b(mcp|tools)\b.*\b(working|available|status|debug|test)\b/) ||
            lowerPrompt.includes('mcp debug') || lowerPrompt.includes('test mcp') || 
            lowerPrompt.includes('mcp status') || lowerPrompt.includes('check tools')) {
            return 'mcp_debug';
        }
        
        // MCP DATA access questions - these should use MCP tools to access real service data
        // GitHub data access
        if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(repos?|repositories|issues?|pull requests?|commits?|branches?|code)\b.*\b(github|my github|git)\b/) ||
            lowerPrompt.match(/\b(github|my github|git)\b.*\b(repos?|repositories|issues?|pull requests?|commits?|branches?|code)\b/) ||
            lowerPrompt.match(/\b(repos?|repositories|issues?|commits?)\b.*\b(in|from|on)\b.*\b(github|git)\b/) ||
            lowerPrompt.includes('my github') && lowerPrompt.match(/\b(repos?|repositories|issues?|pull requests?|commits?|branches?|code)\b/)) {
            return 'github_data_access';
        }
        
        // Notion data access - ENHANCED DETECTION
        if (lowerPrompt.match(/\b(what|list|show|find|get|access|see|view)\b.*\b(pages?|databases?|workspace|content|notes?|documents?)\b.*\b(notion|my workspace)\b/) ||
            lowerPrompt.match(/\b(notion|my workspace)\b.*\b(pages?|databases?|content|notes?|documents?)\b/) ||
            lowerPrompt.match(/\b(pages?|databases?)\b.*\b(in|from|on)\b.*\b(notion|my workspace)\b/) ||
            lowerPrompt.includes('my notion') && lowerPrompt.match(/\b(pages?|databases?|content|workspace|notes?|documents?)\b/) ||
            lowerPrompt.match(/\b(what|see|view|show|find|look|check)\b.*\b(in|on|at)\b.*\b(my\s+)?notion\b/) ||
            lowerPrompt.match(/\b(my\s+)?notion\b.*\b(data|content|info|information|workspace)\b/) ||
            lowerPrompt.includes('notion workspace') || lowerPrompt.includes('notion data')) {
            
            console.log(`[AskService] ✅ CLASSIFIED AS NOTION_DATA_ACCESS: "${userPrompt}"`);
            return 'notion_data_access';
        }
        
        // Log if Notion-related but not classified as notion_data_access
        if (isNotionRelated) {
            console.log(`[AskService] ⚠️ NOTION QUESTION NOT CLASSIFIED AS notion_data_access, continuing with other checks...`);
        }
        
        // EMAIL COMPOSER REQUESTS - Must be caught BEFORE dynamic tools to prevent direct sending
        if (lowerPrompt.match(/\b(send email|email.*to|compose email|write.*email|email someone|need.*email|want.*send.*email|send.*test.*email)\b/)) {
            console.log(`[AskService] ✅ CLASSIFIED AS EMAIL_COMPOSER_REQUEST: "${userPrompt}"`);
            return 'email_composer_request';
        }

        
        // DYNAMIC TOOL SELECTION - Replace hardcoded patterns
        // Check if this is an actionable request that might need tools
        if (await this.isDynamicToolRequest(userPrompt)) {
            console.log(`[AskService] ✅ CLASSIFIED AS DYNAMIC_TOOL_REQUEST: "${userPrompt}"`);
            return 'dynamic_tool_request';
        }
        
        // MCP capability questions - when user asks about what the system can do
        if (lowerPrompt.match(/\b(what can you do|capabilities|mcp|model context protocol|what do you do|what are you|features|integrations|tools available|what tools|connect to|integration)\b/) ||
            lowerPrompt.includes('can you') && lowerPrompt.match(/\b(notion|github|slack|database|api|file|search|browse)\b/)) {
            return 'mcp_capabilities';
        }
        
        // Service integration setup questions - about connecting or configuring any service
        if (lowerPrompt.match(/\b(notion|github|slack|google|drive|gmail|jira|linear)\b/) && 
            (lowerPrompt.includes('setup') || lowerPrompt.includes('connect') || lowerPrompt.includes('integrate') ||
             lowerPrompt.includes('configure') || lowerPrompt.includes('auth') || lowerPrompt.includes('login'))) {
            return 'service_integration';
        }
        
        // Screen context questions - asking about something visible (ONLY when not asking for data access)
        // FIXED: Exclude calendar/schedule queries from screen context classification
        if (lowerPrompt.match(/\b(this|these|that|those|here|on screen|visible|showing|displayed|see|looking at|current|open)\b/) &&
            !lowerPrompt.match(/\b(what can|capabilities|features|do you|are you|pages?|databases?|content|workspace|notes?|documents?|repos?|files?|messages?|channels?)\b/) &&
            !lowerPrompt.match(/\b(calendar|schedule|event|meeting|appointment|day|week|month|date|time|25th|today|tomorrow|yesterday)\b/)) {
            return 'screen_context';
        }
        
        // System status and configuration questions
        if (lowerPrompt.match(/\b(status|connected|setup|configure|settings|oauth|authentication|logged in|account)\b/)) {
            return 'system_status';
        }
        
        // Conversation and help questions
        if (lowerPrompt.match(/\b(help|how to|tutorial|guide|getting started|follow up|continue|more|previous|again)\b/)) {
            return 'help_conversation';
        }

        // Existing classifications with slight modifications
        // Coding-related keywords
        if (lowerPrompt.match(/\b(code|function|algorithm|debug|error|syntax|programming|javascript|python|java|react|css|html|sql|api|bug|fix)\b/)) {
            return 'coding';
        }
        
        // Interview-related keywords
        if (lowerPrompt.match(/\b(interview|job|career|experience|tell me about|describe your|what would you|how do you handle)\b/)) {
            return 'interview';
        }
        
        // Math-related keywords
        if (lowerPrompt.match(/\b(calculate|solve|equation|formula|math|statistics|probability|derivative|integral)\b/)) {
            return 'math';
        }
        
        // Technical concepts
        if (lowerPrompt.match(/\b(architecture|system|design|database|security|performance|scalability|microservices)\b/)) {
            return 'technical';
        }
        
        return 'general';
    }

    /**
     * Stream MCP answer to maintain UI consistency
     * @param {string} answer - The complete MCP answer
     * @param {number} sessionId - Session ID for saving
     */
    async _streamMCPAnswer(answer, sessionId) {
        const askWin = getWindowPool()?.get('ask');
        if (!askWin || askWin.isDestroyed()) {
            return;
        }

        // Ensure answer is a string
        if (typeof answer !== 'string') {
            console.error('[AskService] _streamMCPAnswer: answer is not a string:', typeof answer, answer);
            answer = String(answer || '');
        }

        this.state.isLoading = false;
        this.state.isStreaming = true;
        this._broadcastState();

        // Simulate streaming by breaking answer into chunks
        const words = answer.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
            currentText += (i > 0 ? ' ' : '') + words[i];
            this.state.currentResponse = currentText;
            this._broadcastState();
            
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        this.state.isStreaming = false;
        this.state.currentResponse = answer;
        this._broadcastState();

        // Save to database
        try {
            await askRepository.addAiMessage({ sessionId, role: 'assistant', content: answer });
            console.log(`[AskService] DB: Saved MCP assistant response to session ${sessionId}`);
            
            // Add AI response to context service for advanced context tracking
            await this.contextService.addMessage(sessionId, {
                role: 'assistant',
                content: answer,
                type: 'text',
                metadata: {
                    source: 'mcp_enhanced',
                    confidence: 0.9
                }
            });
            console.log(`[AskService] 📊 Added AI response to context service`);
            
            this.triggerTitleGeneration(sessionId);
        } catch (dbError) {
            console.error("[AskService] DB: Failed to save MCP assistant response:", dbError);
        }
    }

    /**
     * Initialize dynamic tool selection service
     */
    initializeDynamicToolService() {
        if (this.dynamicToolService) return this.dynamicToolService;
        
        try {
            const mcpClient = getMCPClient();
            if (!mcpClient) {
                console.log('[AskService] Dynamic tool service: MCP client not available');
                return null;
            }

            // Get tool registry from MCP client
            const toolRegistry = mcpClient.toolRegistry;
            if (!toolRegistry) {
                console.log('[AskService] Dynamic tool service: Tool registry not available');
                return null;
            }

            // Get LLM provider - use the one from MCP client that supports chatWithTools
            const llmProvider = mcpClient.llmService;
            if (!llmProvider || typeof llmProvider.chatWithTools !== 'function') {
                console.log('[AskService] Dynamic tool service: LLM provider with chatWithTools not available');
                return null;
            }

            this.dynamicToolService = new DynamicToolSelectionService(toolRegistry, llmProvider);
            console.log('[AskService] ✅ Dynamic tool selection service initialized');
            
            return this.dynamicToolService;
        } catch (error) {
            console.error('[AskService] Failed to initialize dynamic tool service:', error);
            return null;
        }
    }

    /**
     * Check if this is a dynamic tool request using pure LLM intelligence
     */
    async isDynamicToolRequest(userPrompt) {
        try {
            // Initialize dynamic tool service if needed
            const toolService = this.initializeDynamicToolService();
            if (!toolService) {
                console.log('[AskService] Dynamic tool service not available, using fallback patterns');
                return this.isActionableRequestFallback(userPrompt);
            }

            // Get available tool count
            const toolCount = toolService.getAvailableToolCount();
            if (toolCount === 0) {
                console.log('[AskService] No tools available for dynamic selection');
                return false;
            }

            // Let the LLM with conversation context decide intelligently
            // No hardcoded patterns - Claude understands context naturally
            console.log(`[AskService] 🧠 LLM-driven analysis: ${toolCount} tools available for "${userPrompt.substring(0, 80)}..."`);
            console.log(`[AskService] ✅ ROUTING TO DYNAMIC TOOLS: Letting LLM with conversation context decide intelligently`);
            return true;
            
        } catch (error) {
            console.error('[AskService] Error in dynamic tool request analysis:', error);
            return this.isActionableRequestFallback(userPrompt);
        }
    }

    /**
     * Quick heuristic check if request could potentially need tools
     */
    couldNeedTools(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        
        // Action words that typically require tools
        const actionWords = [
            'send', 'create', 'schedule', 'book', 'get', 'find', 'search', 'pull up',
            'show me', 'list', 'access', 'retrieve', 'post', 'publish', 'compose',
            'draft', 'email', 'message', 'meeting', 'event', 'calendar', 'linkedin',
            'delete', 'remove', 'cancel', 'clear', 'update', 'modify', 'change', 'edit'
        ];
        
        // Service/platform keywords
        const serviceWords = [
            'gmail', 'google', 'calendar', 'linkedin', 'calendly', 'notion', 
            'slack', 'github', 'drive', 'email', 'profile'
        ];
        
        // Calendar/schedule related phrases that indicate need for calendar tools
        const calendarPhrases = [
            'my day', 'day look', 'scheduled for', 'appointments on', 'busy on',
            'free on', 'available on', 'booked on', 'events on', 'meetings on',
            'this month', 'next month', 'this week', 'next week', 'today', 'tomorrow',
            '25th', '26th', '27th', '28th', '29th', '30th', '31st'
        ];
        
        const hasCalendarPhrase = calendarPhrases.some(phrase => lowerPrompt.includes(phrase));
        
        const hasActionWord = actionWords.some(word => lowerPrompt.includes(word));
        const hasServiceWord = serviceWords.some(word => lowerPrompt.includes(word));
        
        // Could need tools if it has action words OR mentions specific services OR calendar phrases
        return hasActionWord || hasServiceWord || hasCalendarPhrase;
    }

    /**
     * Fallback pattern matching for when dynamic tool service is unavailable
     */
    isActionableRequestFallback(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        
        // Gmail/Email patterns
        if (lowerPrompt.match(/\b(send|compose|draft|email|gmail)\b/)) {
            return true;
        }
        
        // Calendar patterns - Enhanced to catch more calendar-related queries
        if (lowerPrompt.match(/\b(schedule|book|create|calendar|meeting|event)\b/) ||
            lowerPrompt.match(/\b(my day|day look|scheduled for|appointments|busy|free|available|booked)\b/) ||
            lowerPrompt.match(/\b(this month|next month|this week|next week|today|tomorrow)\b/) ||
            lowerPrompt.match(/\b(25th|26th|27th|28th|29th|30th|31st)\b/) ||
            lowerPrompt.match(/\b(events on|meetings on|what.*on.*\d+)\b/)) {
            return true;
        }
        
        // LinkedIn patterns
        if (lowerPrompt.match(/\b(linkedin|profile|pull\s*up|pullup)\b/)) {
            return true;
        }
        
        return false;
    }

    /**
     * Handle dynamic tool requests using LLM-based selection
     */
    async handleDynamicToolRequest(userPrompt, sessionId) {
        try {
            console.log(`[AskService] 🔧 Handling dynamic tool request: "${userPrompt}"`);
            
            const toolService = this.initializeDynamicToolService();
            if (!toolService) {
                throw new Error('Dynamic tool service not available');
            }

            // Get the current user ID from authService
            const authService = require('../common/services/authService');
            const userId = authService.getCurrentUserId();
            
            // Get conversation history from context service for better continuity
            const conversationContext = this.contextService.getContextForLLM(sessionId, {
                includeRecentMessages: true,
                maxMessages: 10
            });
            
            // Build context with user information AND conversation history
            const context = {
                userId: userId,
                user_id: userId, // Both formats for compatibility
                sessionId: sessionId,
                conversationHistory: conversationContext.immediate || [],
                recentContext: conversationContext
            };

            // Use dynamic tool selection with user context
            const result = await toolService.selectAndExecuteTools(userPrompt, context);
            
            console.log(`[AskService] 🎯 Dynamic tool result:`, {
                toolCalled: result.toolCalled,
                success: !result.error,
                responseLength: result.response?.length || 0
            });

            return result.response;
            
        } catch (error) {
            console.error('[AskService] Dynamic tool request failed:', error);
            return `I encountered an error while processing your request: ${error.message}. Please try again or contact support if the issue persists.`;
        }
    }

}

const askService = new AskService();

module.exports = askService;