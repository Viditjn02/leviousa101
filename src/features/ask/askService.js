const { BrowserWindow } = require('electron');
const { createStreamingLLM } = require('../common/ai/factory');
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

            sessionId = await sessionRepository.getOrCreateActive('ask');
            await this.initializeConversationSession(sessionId);
            
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
                    
                    // Classify question type for MCP
                    const questionType = this.classifyQuestionType(userPrompt);
                    console.log(`[AskService] MCP: Classified question as '${questionType}' type`);
                    
                    // Special logging for Notion questions
                    if (questionType === 'notion_data_access') {
                        console.log(`[AskService] 🎯 NOTION DATA ACCESS DETECTED - proceeding with MCP enhanced answer`);
                        console.log(`[AskService] 🎯 Question: "${userPrompt}"`);
                        console.log(`[AskService] 🎯 MCP Client initialized: ${mcpClient.isInitialized}`);
                        console.log(`[AskService] 🎯 Available external tools: ${mcpClient.externalTools?.length || 0}`);
                    }
                    
                    // Build enhanced question with conversation awareness
                    const questionObj = this._buildEnhancedQuestion(userPrompt, conversationHistoryRaw, questionType);
                    
                    // Add conversation context from session tracking
                    const conversationContext = this.getConversationContext(sessionId);
                    if (conversationContext) {
                        questionObj.sessionContext = conversationContext;
                    }
                    
                    console.log('[AskService] MCP: Requesting enhanced answer...');
                    // Pass the question text and include the enhanced context in the context parameter
                    const enhancedContext = {
                        questionType: questionObj.type,
                        conversationHistory: questionObj.context,
                        isFollowUp: questionObj.isFollowUp,
                        needsPreviousContext: questionObj.needsPreviousContext,
                        requiresScreenContext: questionObj.requiresScreenContext,
                        sessionContext: questionObj.sessionContext,
                        screenshot: screenshotBase64
                    };
                    const mcpResponse = await mcpClient.getEnhancedAnswer(questionObj.text, enhancedContext);
                    if (mcpResponse && mcpResponse.answer) {
                        const mcpAnswer = mcpResponse.answer;
                        console.log(`[AskService] ✅ MCP generated enhanced answer (${mcpAnswer.length} characters)`);
                        
                        // Analyze conversation for contextual UI opportunities
                        try {
                            if (global.invisibilityService && global.invisibilityService.mcpUIIntegration) {
                                console.log('[AskService] 🎨 Analyzing conversation for contextual UI triggers...');
                                
                                const uiContext = {
                                    type: 'conversation',
                                    message: userPrompt,
                                    response: mcpAnswer,
                                    conversationHistory: conversationHistoryRaw,
                                    hasScreenshot: !!screenshotBase64,
                                    timestamp: new Date().toISOString()
                                };
                                
                                // This will auto-trigger UI if high-confidence intent is detected
                                await global.invisibilityService.mcpUIIntegration.getContextualActions(uiContext);
                            }
                        } catch (uiError) {
                            console.warn('[AskService] UI analysis failed, continuing without UI:', uiError);
                        }
                        
                        // Special logging for successful Notion answers
                        if (questionType === 'notion_data_access') {
                            console.log(`[AskService] 🎯 NOTION MCP ANSWER SUCCESS: ${mcpAnswer.substring(0, 200)}...`);
                        }
                        
                        responseText = mcpAnswer;
                        
                        // Update conversation session with this exchange
                        this.updateConversationSession(sessionId, userPrompt, questionType, responseText);
                        
                        // Stream the MCP answer to maintain UI consistency
                        await this._streamMCPAnswer(mcpAnswer, sessionId);
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

            const questionType = this.classifyQuestionType(userPrompt);
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
            
            const streamingLLM = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: 2048,
                            usePortkey: modelInfo.provider === 'openai-leviousa',
            portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            try {
                const response = await streamingLLM.streamChat(messages);
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

            } catch (multimodalError) {
                // 멀티모달 요청이 실패했고 스크린샷이 포함되어 있다면 텍스트만으로 재시도
                if (screenshotBase64 && this._isMultimodalError(multimodalError)) {
                    console.log(`[AskService] Multimodal request failed, retrying with text-only: ${multimodalError.message}`);
                    
                    // 텍스트만으로 메시지 재구성
                    const textOnlyMessages = [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: `User Request: ${userPrompt.trim()}`
                        }
                    ];

                    const fallbackResponse = await streamingLLM.streamChat(textOnlyMessages);
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
                } else {
                    // 다른 종류의 에러이거나 스크린샷이 없었다면 그대로 throw
                    throw multimodalError;
                }
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
                    const questionType = this.classifyQuestionType(this.state.currentQuestion || '');
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
    classifyQuestionType(userPrompt) {
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
        
        // Slack data access
        if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(messages?|channels?|conversations?|users?|workspaces?)\b.*\b(slack|my slack)\b/) ||
            lowerPrompt.match(/\b(slack|my slack)\b.*\b(messages?|channels?|conversations?|users?|workspaces?)\b/) ||
            lowerPrompt.match(/\b(messages?|channels?)\b.*\b(in|from|on)\b.*\b(slack)\b/) ||
            lowerPrompt.includes('my slack') && lowerPrompt.match(/\b(messages?|channels?|conversations?|users?)\b/)) {
            return 'slack_data_access';
        }
        
        // Google Drive/Gmail data access
        if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(files?|docs?|emails?|drive|gmail|calendar)\b.*\b(google|my google|drive|gmail)\b/) ||
            lowerPrompt.match(/\b(google|my google|drive|gmail)\b.*\b(files?|docs?|emails?|calendar|documents?)\b/) ||
            lowerPrompt.match(/\b(files?|docs?|emails?)\b.*\b(in|from|on)\b.*\b(google|drive|gmail)\b/) ||
            lowerPrompt.includes('my google') && lowerPrompt.match(/\b(files?|docs?|emails?|drive|calendar)\b/)) {
            return 'google_data_access';
        }
        
        // Generic MCP service data access - catch-all for any connected service
        if (lowerPrompt.match(/\b(what|list|show|find|get|access)\b.*\b(my|from|in)\b.*\b(data|content|files?|information)\b/) ||
            lowerPrompt.match(/\b(what)\b.*\b(services?|integrations?|connections?)\b.*\b(do I have|are connected|can you access)\b/) ||
            lowerPrompt.match(/\b(access|connect to|use)\b.*\b(my|the)\b.*\b(account|workspace|data|service)\b/)) {
            return 'mcp_data_access';
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
        if (lowerPrompt.match(/\b(this|these|that|those|here|on screen|visible|showing|displayed|see|looking at|current|open)\b/) &&
            !lowerPrompt.match(/\b(what can|capabilities|features|do you|are you|pages?|databases?|content|workspace|notes?|documents?|repos?|files?|messages?|channels?)\b/)) {
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
            this.triggerTitleGeneration(sessionId);
        } catch (dbError) {
            console.error("[AskService] DB: Failed to save MCP assistant response:", dbError);
        }
    }

}

const askService = new AskService();

module.exports = askService;