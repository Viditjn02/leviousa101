const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;

class VoiceAgentService extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.isActive = false;
        this.isListening = false;
        this.isConversing = false;
        this.isProcessingCommand = false;
        this.isInErrorLoop = false;
        this.isSpeaking = false; // NEW: Track TTS state
        this.lastTTSText = ''; // NEW: Track what we just said
        this.lastTTSTime = 0; // NEW: When we finished speaking
        this.ttsCooldownPeriod = 2000; // NEW: 2 seconds after TTS before listening for wake word
        
        // Sub-services
        this.wakeWordDetector = null;
        this.conversationManager = null;
        this.screenAnalyzer = null;
        this.actionExecutor = null;
        this.ttsService = null;
        
        // Configuration
        this.config = {
            wakeWord: 'hey leviousa',
            enabled: true,
            voiceResponseEnabled: true,
            screenAnalysisEnabled: true,
            actionExecutionEnabled: true,
            confidenceThreshold: 0.8,
            conversationTimeout: 15000, // 15 seconds - shorter to prevent loops
            maxConversationTurns: 3, // Limit turns to prevent endless loops
            autoScreenshots: true,
            advancedUIDetection: true,
            maxFeedbackDetections: 2, // End conversation after 2 feedback detections (reduced from 3)
            feedbackSimilarityThreshold: 0.4, // NEW: Similarity threshold for feedback detection (lowered from 0.7)
            echoPrevention: true // NEW: Enable echo prevention
        };
        
        // State tracking
        this.currentConversation = null;
        this.lastScreenshot = null;
        this.lastUIAnalysis = null;
        this.conversationHistory = [];
        this.feedbackCount = 0;
        this.recentTTSOutputs = []; // NEW: Track recent TTS outputs for feedback detection
        this.lastScreenCaptureTime = 0; // NEW: Track last screen capture time for caching
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[VoiceAgent] Already initialized');
            return { success: true };
        }

        try {
            console.log('[VoiceAgent] Initializing voice agent service...');
            
            // Initialize sub-services
            await this.initializeSubServices();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('[VoiceAgent] ✅ Voice agent service initialized successfully');
            
            this.emit('service-initialized');
            return { success: true };
            
        } catch (error) {
            console.error('[VoiceAgent] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async initializeSubServices() {
        // Import and initialize sub-services
        const WakeWordDetector = require('./wakeWordDetector');
        const ConversationManager = require('./conversationManager');
        const AdvancedScreenAnalyzer = require('./advancedScreenAnalyzer');
        const ActionExecutor = require('./actionExecutor');
        const TTSService = require('./ttsService');
        
        this.wakeWordDetector = new WakeWordDetector(this); // NEW: Pass reference for state checking
        this.conversationManager = new ConversationManager(this); // NEW: Pass reference for state checking
        this.screenAnalyzer = new AdvancedScreenAnalyzer();
        this.actionExecutor = new ActionExecutor();
        this.ttsService = new TTSService();
        
        // Initialize all sub-services (individually to handle failures gracefully)
        const services = [
            { name: 'wakeWordDetector', service: this.wakeWordDetector },
            { name: 'conversationManager', service: this.conversationManager },
            { name: 'screenAnalyzer', service: this.screenAnalyzer },
            { name: 'actionExecutor', service: this.actionExecutor },
            { name: 'ttsService', service: this.ttsService }
        ];
        
        const initResults = {};
        
        for (const { name, service } of services) {
            try {
                await service.initialize();
                initResults[name] = { success: true };
                console.log(`[VoiceAgent] ✅ ${name} initialized successfully`);
            } catch (error) {
                initResults[name] = { success: false, error: error.message };
                console.error(`[VoiceAgent] ❌ ${name} failed to initialize:`, error.message);
                // Continue with other services instead of failing completely
            }
        }
        
        // Check which core services are available
        const coreServicesAvailable = initResults.ttsService.success && initResults.actionExecutor.success;
        const sttServicesAvailable = initResults.wakeWordDetector.success && initResults.conversationManager.success;
        const visionServicesAvailable = initResults.screenAnalyzer.success;
        
        console.log('[VoiceAgent] Initialization summary:', {
            coreServices: coreServicesAvailable ? '✅' : '❌',
            sttServices: sttServicesAvailable ? '✅' : '❌', 
            visionServices: visionServicesAvailable ? '✅' : '❌',
            results: initResults
        });
        
        if (!coreServicesAvailable) {
            throw new Error('Core services (TTS and ActionExecutor) failed to initialize');
        }
        
        console.log('[VoiceAgent] Sub-services initialized (core functionality available)');
    }

    setupEventListeners() {
        // Wake word detection
        this.wakeWordDetector.on('wake-word-detected', async (data) => {
            console.log('[VoiceAgent] 🎤 Wake word detected:', data);
            
            // NEW: Check if we should ignore due to TTS state or feedback detection
            if (this.shouldIgnoreWakeWord(data)) {
                console.log('[VoiceAgent] 🔇 Ignoring wake word - agent is speaking or feedback detected');
                return;
            }
            
            await this.handleWakeWordDetected(data);
        });
        
        // Conversation events
        this.conversationManager.on('speech-recognized', async (text) => {
            console.log('[VoiceAgent] 💬 Speech recognized:', text);
            
            // NEW: Check for feedback loops
            if (this.detectFeedbackLoop(text)) {
                console.log('[VoiceAgent] 🔄 Detected feedback loop, ignoring:', text);
                this.feedbackCount++;
                
                if (this.feedbackCount >= this.config.maxFeedbackDetections) {
                    console.log('[VoiceAgent] 🛑 Too many feedback detections, ending conversation');
                    this.endConversation();
                }
                return;
            }
            
            await this.handleUserSpeech(text);
        });
        
        this.conversationManager.on('conversation-timeout', () => {
            console.log('[VoiceAgent] ⏰ Conversation timeout');
            this.endConversation();
        });
        
        // Screen analysis events
        this.screenAnalyzer.on('ui-analysis-complete', (analysis) => {
            this.lastUIAnalysis = analysis;
            this.emit('ui-analysis-updated', analysis);
        });
        
        // Action execution events
        this.actionExecutor.on('action-completed', (result) => {
            console.log('[VoiceAgent] ✅ Action completed:', result);
            this.emit('action-completed', result);
        });
        
        this.actionExecutor.on('action-failed', (error) => {
            console.error('[VoiceAgent] ❌ Action failed:', error);
            this.emit('action-failed', error);
        });
        
        // NEW: TTS events to track speaking state
        this.ttsService.on('speech-started', (data) => {
            console.log('[VoiceAgent] 🗣️ TTS started:', data);
            this.isSpeaking = true;
            this.lastTTSText = data.text || '';
            
            // Immediately add to recent outputs when speech starts
            this.addToRecentTTSOutputs(data.text);
        });
        
        this.ttsService.on('speech-completed', (data) => {
            console.log('[VoiceAgent] ✅ TTS completed:', data);
            this.isSpeaking = false;
            this.lastTTSTime = Date.now();
            
            // Add to recent TTS outputs for feedback detection (redundant but safe)
            this.addToRecentTTSOutputs(data.text);
        });
        
        this.ttsService.on('speech-failed', (data) => {
            console.log('[VoiceAgent] ❌ TTS failed:', data);
            this.isSpeaking = false;
            this.lastTTSTime = Date.now();
        });
    }

    async enableVoiceAgent() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            this.isActive = true;
            this.config.enabled = true;
            
            // Start wake word detection
            await this.wakeWordDetector.startListening();
            this.isListening = true;
            
            console.log('[VoiceAgent] 🟢 Voice agent enabled and listening for "Hey Leviousa"');
            this.emit('voice-agent-enabled');
            
            return { success: true };
        } catch (error) {
            console.error('[VoiceAgent] Failed to enable voice agent:', error);
            return { success: false, error: error.message };
        }
    }

    async disableVoiceAgent() {
        try {
            this.isActive = false;
            this.config.enabled = false;
            
            // Stop all active processes
            if (this.isListening) {
                await this.wakeWordDetector.stopListening();
                this.isListening = false;
            }
            
            if (this.isConversing) {
                await this.endConversation();
            }
            
            console.log('[VoiceAgent] 🔴 Voice agent disabled');
            this.emit('voice-agent-disabled');
            
            return { success: true };
        } catch (error) {
            console.error('[VoiceAgent] Failed to disable voice agent:', error);
            return { success: false, error: error.message };
        }
    }

    // NEW: Check if we should ignore wake word detection
    shouldIgnoreWakeWord(data) {
        if (!this.config.echoPrevention) return false;
        
        // Ignore if currently speaking
        if (this.isSpeaking) {
            console.log('[VoiceAgent] 🔇 Ignoring wake word - currently speaking');
            return true;
        }
        
        // Ignore if within cooldown period after TTS
        const timeSinceLastTTS = Date.now() - this.lastTTSTime;
        if (timeSinceLastTTS < this.ttsCooldownPeriod) {
            console.log('[VoiceAgent] 🔇 Ignoring wake word - within TTS cooldown period');
            return true;
        }
        
        // Check if the transcription is similar to recent TTS output
        if (this.detectFeedbackLoop(data.transcription)) {
            console.log('[VoiceAgent] 🔇 Ignoring wake word - detected feedback from TTS');
            return true;
        }
        
        return false;
    }
    
    // NEW: Detect feedback loops by comparing with recent TTS outputs
    detectFeedbackLoop(text) {
        if (!text || !this.config.echoPrevention) return false;
        
        const normalizedInput = this.normalizeTextForComparison(text);
        console.log('[VoiceAgent] 🔍 Checking feedback for:', normalizedInput);
        console.log('[VoiceAgent] 🔍 Recent TTS outputs:', this.recentTTSOutputs.map(o => o.normalized));
        
        // Check against recent TTS outputs
        for (const recentOutput of this.recentTTSOutputs) {
            const similarity = this.calculateTextSimilarity(normalizedInput, recentOutput.normalized);
            console.log('[VoiceAgent] 🔍 Similarity check:', {
                input: normalizedInput,
                recentOutput: recentOutput.normalized,
                similarity: similarity,
                threshold: this.config.feedbackSimilarityThreshold
            });
            
            if (similarity >= this.config.feedbackSimilarityThreshold) {
                console.log('[VoiceAgent] 🔄 Detected feedback:', {
                    input: text,
                    recentOutput: recentOutput.original,
                    similarity: similarity
                });
                return true;
            }
        }
        
        // Check for repeated words (common in feedback loops)
        const words = normalizedInput.split(/\s+/);
        const repeatedWords = this.findRepeatedWords(words);
        if (repeatedWords.length > 0) {
            console.log('[VoiceAgent] 🔄 Detected repeated words feedback:', repeatedWords);
            return true;
        }
        
        // NEW: Check for TTS-like phrases that indicate echo
        const ttsIndicators = [
            'typed',
            'detected questions',
            'answers automatically',
            'answers as automated',
            'type the answers'
        ];
        
        for (const indicator of ttsIndicators) {
            if (normalizedInput.includes(indicator)) {
                console.log('[VoiceAgent] 🔄 Detected TTS phrase feedback:', indicator);
                return true;
            }
        }
        
        return false;
    }
    
    // NEW: Add TTS output to recent outputs list for feedback detection
    addToRecentTTSOutputs(text) {
        if (!text) return;
        
        const normalized = this.normalizeTextForComparison(text);
        this.recentTTSOutputs.push({
            original: text,
            normalized: normalized,
            timestamp: Date.now()
        });
        
        // Keep only recent outputs (last 10 seconds)
        const cutoffTime = Date.now() - 10000;
        this.recentTTSOutputs = this.recentTTSOutputs.filter(output => output.timestamp > cutoffTime);
        
        // Limit to 5 most recent outputs
        if (this.recentTTSOutputs.length > 5) {
            this.recentTTSOutputs = this.recentTTSOutputs.slice(-5);
        }
    }
    
    // NEW: Normalize text for similarity comparison
    normalizeTextForComparison(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
    
    // NEW: Calculate text similarity (simple word overlap)
    calculateTextSimilarity(text1, text2) {
        const words1 = new Set(text1.split(/\s+/));
        const words2 = new Set(text2.split(/\s+/));
        
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    
    // NEW: Find repeated words in text
    findRepeatedWords(words) {
        const repeated = [];
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i] === words[i + 1] && words[i].length > 2) {
                repeated.push(words[i]);
            }
        }
        return repeated;
    }

    async handleWakeWordDetected(data) {
        if (!this.isActive || this.isConversing) return;
        
        try {
            console.log('[VoiceAgent] 🎯 Starting voice conversation...');
            
            // OPTIMIZATION: Start screen capture in parallel with conversation setup
            const screenCapturePromise = this.config.autoScreenshots ? 
                this.captureAndAnalyzeScreen() : Promise.resolve();
            
            // Start conversation immediately (don't wait for screen analysis)
            await this.startConversation();
            
            // Check if wake word included a command
            if (data.transcription && this.detectInvisibilityCommand(data.transcription)) {
                // Skip greeting, process command directly
                console.log('[VoiceAgent] 🎯 Invisibility command detected in wake phrase, processing directly');
                
                // Wait for screen capture to complete before processing invisibility command
                await screenCapturePromise;
                await this.handleUserSpeech(data.transcription);
                return;
            } else if (data.transcription && this.detectScreenDescriptionRequest(data.transcription)) {
                // Screen description request - wait for analysis and describe screen
                console.log('[VoiceAgent] 🔍 Screen description request detected, analyzing screen...');
                
                // Wait for screen capture to complete
                const screenAnalysis = await screenCapturePromise;
                
                // Generate description of what's on screen
                await this.describeScreen(screenAnalysis);
                return;
            } else {
                // Give audio feedback - shorter to reduce feedback risk
                if (this.config.voiceResponseEnabled) {
                    await this.ttsService.speak("Yes?");
                }
                
                // Continue with screen capture in background
                screenCapturePromise.catch(error => 
                    console.warn('[VoiceAgent] Background screen capture failed:', error)
                );
            }
            
            this.emit('conversation-started');
            
        } catch (error) {
            console.error('[VoiceAgent] Error handling wake word:', error);
        }
    }

    // NEW: Fast pattern detection for invisibility commands and screen description
    detectInvisibilityCommand(text) {
        const lowerText = text.toLowerCase();
        return (
            lowerText.includes('answer') && (
                lowerText.includes('question') || 
                lowerText.includes('screen') ||
                lowerText.includes('help')
            )
        ) || 
        lowerText.includes('solve') ||
        lowerText.includes('detect question');
    }

    // NEW: Detect screen description requests
    detectScreenDescriptionRequest(text) {
        const lowerText = text.toLowerCase();
        return (
            (lowerText.includes('what') || lowerText.includes('describe')) && 
            (lowerText.includes('see') || lowerText.includes('on') || lowerText.includes('screen'))
        ) ||
        lowerText.includes('what do you see') ||
        lowerText.includes('what\'s on') ||
        lowerText.includes('describe screen') ||
        lowerText.includes('tell me what');
    }

    async startConversation() {
        this.isConversing = true;
        this.feedbackCount = 0; // Reset feedback counter for new conversation
        this.currentConversation = {
            id: Date.now(),
            startTime: new Date(),
            turns: [],
            screenContext: this.lastUIAnalysis
        };
        
        // Start listening for user speech
        await this.conversationManager.startConversation();
        
        console.log('[VoiceAgent] 💬 Conversation started');
    }

    async handleUserSpeech(speechText) {
        if (!this.isConversing || this.isProcessingCommand) return;
        
        try {
            this.isProcessingCommand = true;
            
            // NEW: First check - if we're currently speaking, ignore completely
            if (this.isSpeaking) {
                console.log('[VoiceAgent] 🔇 Ignoring speech - currently speaking:', speechText);
                return;
            }
            
            // NEW: Second check - cooldown period after TTS
            const timeSinceLastTTS = Date.now() - this.lastTTSTime;
            if (this.lastTTSTime && timeSinceLastTTS < this.ttsCooldownPeriod) {
                console.log('[VoiceAgent] 🔇 Ignoring speech - within cooldown period:', speechText);
                return;
            }
            
            // Filter out very short or repetitive speech
            if (speechText.trim().length < 3) {
                console.log('[VoiceAgent] Ignoring very short speech:', speechText);
                return;
            }
            
            // NEW: Enhanced feedback detection
            if (this.detectFeedbackLoop(speechText)) {
                this.feedbackCount++;
                console.log(`[VoiceAgent] 🔄 Enhanced feedback detected #${this.feedbackCount}, ignoring:`, speechText);
                
                // End conversation if too much feedback
                if (this.feedbackCount >= this.config.maxFeedbackDetections) {
                    console.log('[VoiceAgent] 🛑 Too much feedback detected, ending conversation');
                    await this.endConversation();
                }
                return;
            }
            
            // Legacy feedback check as backup
            if (this.isLikelyFeedback(speechText)) {
                this.feedbackCount++;
                console.log(`[VoiceAgent] 🔄 Legacy feedback detected #${this.feedbackCount}, ignoring:`, speechText);
                
                // End conversation if too much feedback
                if (this.feedbackCount >= this.config.maxFeedbackDetections) {
                    console.log('[VoiceAgent] 🛑 Too much feedback detected, ending conversation');
                    await this.endConversation();
                }
                return;
            }
            
            // Stop any ongoing TTS to prevent overlap
            await this.ttsService.stopSpeaking();
            
            // Add to conversation history
            this.currentConversation.turns.push({
                type: 'user',
                text: speechText,
                timestamp: new Date()
            });
            
            console.log('[VoiceAgent] 🎤 Processing user command:', speechText);
            
            // Analyze the command and current screen context
            const commandAnalysis = await this.analyzeUserCommand(speechText);
            
            // Execute the command if it's actionable
            if (commandAnalysis.isActionable) {
                await this.executeCommand(commandAnalysis);
            } else {
                // Respond conversationally
                await this.respondToUser(commandAnalysis);
            }
            
        } catch (error) {
            console.error('[VoiceAgent] Error processing user speech:', error);
            
            // Only speak error if we're not already in an error loop
            if (!this.isInErrorLoop) {
                this.isInErrorLoop = true;
                setTimeout(() => { this.isInErrorLoop = false; }, 5000);
                await this.ttsService.speak("Sorry, I had trouble with that.");
            }
        } finally {
            this.isProcessingCommand = false;
        }
    }

    isLikelyFeedback(speechText) {
        const text = speechText.toLowerCase();
        
        // Check for repeated phrases (sign of feedback)
        const words = text.split(' ');
        const repeatedWords = words.filter((word, index) => 
            words.indexOf(word) !== index && word.length > 2
        );
        
        if (repeatedWords.length > words.length * 0.3) {
            console.log('[VoiceAgent] 🔄 Detected repeated words feedback:', repeatedWords);
            return true;
        }
        
        // Check for our own TTS patterns (agent hearing itself)
        const agentPhrases = [
            'what would you like me to help you with',
            'how can i assist you today',
            'what can i do for you',
            'i\'m here to help',
            'i\'m listening',
            'what else can i help you with',
            'what task would you like me to perform',
            'hi there'
        ];
        
        for (const phrase of agentPhrases) {
            if (text.includes(phrase)) {
                console.log('[VoiceAgent] 🔄 Detected agent phrase feedback:', phrase);
                return true;
            }
        }
        
        // Check for common TTS feedback patterns
        const feedbackPatterns = [
            /\b(understand you want to)\b.*\1/i,
            /\b(how can)\b.*\1/i,
            /\b(help you)\b.*\1/i,
            /\b(what what)\b/i,
            /\b(can can)\b/i,
            /\b(you you)\b/i,
            /\b(to to)\b/i,
            /(.{10,})\1/i // Any phrase repeated
        ];
        
        return feedbackPatterns.some(pattern => {
            if (pattern.test(text)) {
                console.log('[VoiceAgent] 🔄 Detected pattern feedback:', pattern);
                return true;
            }
            return false;
        });
    }

    async analyzeUserCommand(speechText) {
        // Use AI to analyze the user's command in context of current screen
        const analysis = {
            originalText: speechText,
            intent: null,
            entities: [],
            isActionable: false,
            confidence: 0,
            suggestedActions: [],
            requiresScreenInteraction: false,
            screenElements: []
        };
        
        try {
            // OPTIMIZATION: Use fast pattern matching first (90% of commands can be detected this way)
            const immediateAction = this.detectImmediateAction(speechText);
            if (immediateAction) {
                console.log('[VoiceAgent] 🎯 Immediate action detected (no AI call needed):', immediateAction);
                return immediateAction;
            }
            
            // OPTIMIZATION: Only get screen analysis if we really need it for AI processing
            // (Don't capture if we can handle with pattern matching)
            const needsScreenContext = this.commandNeedsScreenContext(speechText);
            if (needsScreenContext && !this.lastUIAnalysis && this.config.autoScreenshots) {
                // Check if we have a recent screen analysis (cache for 30 seconds)
                const now = Date.now();
                if (!this.lastScreenCaptureTime || (now - this.lastScreenCaptureTime) > 30000) {
                    await this.captureAndAnalyzeScreen();
                }
            }
            
            // OPTIMIZATION: Only use AI analysis for complex commands that pattern matching can't handle
            if (this.needsAIAnalysis(speechText)) {
                const aiAnalysis = await this.getAICommandAnalysis(speechText, this.lastUIAnalysis);
                Object.assign(analysis, aiAnalysis);
                console.log('[VoiceAgent] 🧠 AI command analysis:', analysis);
            } else {
                // Use simple fallback for unrecognized but simple commands
                analysis.intent = 'conversation';
                analysis.confidence = 0.3;
                console.log('[VoiceAgent] 📝 Simple command classification (no AI needed):', analysis);
            }
            
            return analysis;
            
        } catch (error) {
            console.error('[VoiceAgent] Error analyzing command:', error);
            return analysis;
        }
    }

    // NEW: Determine if command needs screen context
    commandNeedsScreenContext(speechText) {
        const text = speechText.toLowerCase();
        return text.includes('click') || 
               text.includes('type') || 
               text.includes('scroll') || 
               text.includes('open') ||
               text.includes('element') ||
               text.includes('button');
    }

    // NEW: Determine if AI analysis is needed
    needsAIAnalysis(speechText) {
        const text = speechText.toLowerCase();
        
        // Skip AI for very simple commands
        if (text.length < 10) return false;
        
        // Skip AI for commands we can handle with patterns
        const simplePatterns = [
            /^(yes|no|okay|ok|sure|thanks|thank you)$/i,
            /^(what|how|when|where|why)\s/i,
            /^(can you|could you|please)\s/i
        ];
        
        for (const pattern of simplePatterns) {
            if (pattern.test(text)) return false;
        }
        
        // Use AI for complex commands that need understanding
        return text.length > 20 || 
               text.includes('complex') || 
               text.includes('explain') ||
               text.includes('analyze');
    }

    detectImmediateAction(speechText) {
        const text = speechText.toLowerCase();
        
        // Screen description patterns
        const screenDescriptionPatterns = [
            /what.*do.*you.*see/i,
            /what.*on.*screen/i,
            /describe.*screen/i,
            /tell.*me.*what.*see/i,
            /what.*visible/i,
            /show.*me.*screen/i
        ];
        
        for (const pattern of screenDescriptionPatterns) {
            if (pattern.test(text)) {
                return {
                    originalText: speechText,
                    intent: 'screen_description',
                    entities: ['describe', 'screen', 'see'],
                    isActionable: true,
                    confidence: 0.95,
                    suggestedActions: ['describe_screen'],
                    requiresScreenInteraction: false,
                    screenElements: []
                };
            }
        }
        
        // Invisibility/Question answering patterns
        const invisibilityPatterns = [
            /answer.*question.*screen/i,
            /answer.*this.*question/i,
            /help.*with.*question/i,
            /solve.*question/i,
            /detect.*question/i,
            /answer.*screen/i
        ];
        
        for (const pattern of invisibilityPatterns) {
            if (pattern.test(text)) {
                return {
                    originalText: speechText,
                    intent: 'invisibility',
                    entities: ['answer', 'questions', 'screen'],
                    isActionable: true,
                    confidence: 0.95,
                    suggestedActions: ['detect_questions', 'type_answers'],
                    requiresScreenInteraction: true,
                    screenElements: []
                };
            }
        }
        
        // Other immediate actions can be added here
        return null;
    }

    async getAICommandAnalysis(speechText, screenContext) {
        try {
            // Use the same AI provider system as MCPClient
            const modelStateService = require('../common/services/modelStateService');
            const { createStreamingLLM } = require('../common/ai/factory');
            
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.1,
                maxTokens: 1000,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            const systemPrompt = `Analyze this voice command and determine what action to take. Be very specific.

User said: "${speechText}"

Determine:
1. Is this asking to answer questions on screen? (look for: "answer", "questions", "help with", "solve")
2. Is this a screen interaction request? (click, type, scroll, open)
3. Is this a general conversation?

Return JSON with:
{
  "intent": "invisibility" | "action" | "conversation",
  "confidence": 0.0-1.0,
  "isActionable": true/false,
  "entities": ["words", "mentioned"],
  "suggestedActions": ["specific", "actions"],
  "requiresScreenInteraction": true/false,
  "screenElements": []
}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: speechText }
            ];

            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        if (data.trim() === '') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                fullResponse += parsed.choices[0].delta.content;
                            }
                        } catch (parseError) {
                            // Skip malformed chunks
                        }
                    }
                }
            }

            // Try to parse JSON response
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback: simple pattern matching
            const lowerText = speechText.toLowerCase();
            if (lowerText.includes('answer') && (lowerText.includes('question') || lowerText.includes('screen'))) {
                return {
                    intent: 'invisibility',
                    confidence: 0.8,
                    isActionable: true,
                    entities: ['answer', 'questions'],
                    suggestedActions: ['detect_questions', 'type_answers'],
                    requiresScreenInteraction: true,
                    screenElements: []
                };
            }

            return {
                intent: 'conversation',
                confidence: 0.3,
                isActionable: false,
                entities: [],
                suggestedActions: [],
                requiresScreenInteraction: false,
                screenElements: []
            };

        } catch (error) {
            console.error('[VoiceAgent] Error getting AI analysis:', error);
            
            // Fallback: simple pattern matching
            const lowerText = speechText.toLowerCase();
            if (lowerText.includes('answer') && (lowerText.includes('question') || lowerText.includes('screen'))) {
                return {
                    intent: 'invisibility',
                    confidence: 0.7,
                    isActionable: true,
                    entities: ['answer', 'questions'],
                    suggestedActions: ['detect_questions', 'type_answers'],
                    requiresScreenInteraction: true,
                    screenElements: []
                };
            }

            return {
                intent: 'unknown',
                confidence: 0,
                isActionable: false,
                entities: [],
                suggestedActions: [],
                requiresScreenInteraction: false,
                screenElements: []
            };
        }
    }

    async executeCommand(commandAnalysis) {
        try {
            console.log('[VoiceAgent] 🎯 Executing command:', commandAnalysis);
            
            // Handle screen description requests directly
            if (commandAnalysis.intent === 'screen_description') {
                await this.describeScreen(this.lastUIAnalysis);
                return;
            }
            
            // NEW: Handle MCP-enhanced question answering
            if (commandAnalysis.intent === 'invisibility' || 
                (commandAnalysis.suggestedActions && commandAnalysis.suggestedActions.includes('answer_questions'))) {
                await this.handleMCPQuestionAnswering(commandAnalysis);
                return;
            }
            
            // NEW: Handle general knowledge questions with MCP
            if (commandAnalysis.intent === 'conversation' && this.isQuestionAboutKnowledge(commandAnalysis.originalText)) {
                await this.handleMCPKnowledgeQuestion(commandAnalysis);
                return;
            }
            
            // Use action executor to perform the command
            const result = await this.actionExecutor.executeCommand(
                commandAnalysis, 
                this.lastUIAnalysis
            );
            
            // Provide feedback to user
            let responseText = "Done!";
            if (result.success) {
                responseText = result.feedback || "Task completed successfully.";
            } else {
                responseText = result.error || "Sorry, I couldn't complete that task.";
            }
            
            // Add to conversation
            this.currentConversation.turns.push({
                type: 'assistant',
                text: responseText,
                timestamp: new Date(),
                action: commandAnalysis,
                result: result
            });
            
            // Speak response
            if (this.config.voiceResponseEnabled) {
                await this.ttsService.speak(responseText);
            }
            
            // Re-analyze screen after action
            if (result.success && commandAnalysis.requiresScreenInteraction) {
                setTimeout(() => this.captureAndAnalyzeScreen(), 1000);
            }
            
        } catch (error) {
            console.error('[VoiceAgent] Error executing command:', error);
            await this.ttsService.speak("Sorry, I encountered an error while trying to do that.");
        }
    }

    async respondToUser(commandAnalysis) {
        // Prevent repetitive responses by checking recent conversation
        const recentResponses = this.currentConversation?.turns
            ?.filter(turn => turn.type === 'assistant')
            ?.slice(-3)
            ?.map(turn => turn.text) || [];

        let responseText;
        
        // Generate more natural conversational response
        if (commandAnalysis.intent === 'conversation' || commandAnalysis.intent === 'unknown') {
            const responses = [
                "What would you like me to help you with?",
                "I'm here to help. What can I do for you?",
                "How can I assist you today?",
                "What task would you like me to perform?"
            ];
            
            // Choose a response that hasn't been used recently
            const availableResponses = responses.filter(resp => 
                !recentResponses.some(recent => recent.includes(resp.split(' ')[0]))
            );
            
            responseText = availableResponses.length > 0 
                ? availableResponses[0] 
                : "I'm listening. What would you like me to do?";
        } else {
            responseText = "I understand. Let me help you with that.";
        }
        
        // Avoid repeating the same response
        if (recentResponses.includes(responseText)) {
            responseText = "What else can I help you with?";
        }
        
        // Add to conversation
        this.currentConversation.turns.push({
            type: 'assistant',
            text: responseText,
            timestamp: new Date()
        });
        
        // Speak response with improved turn-taking
        if (this.config.voiceResponseEnabled) {
            // Wait for any ongoing speech to finish
            await this.waitForUserToFinishSpeaking();
            await this.ttsService.speak(responseText);
        }
    }

    async waitForUserToFinishSpeaking() {
        // Simple implementation: wait for a brief pause
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    async answerUserQuestion(question) {
        try {
            const prompt = `Answer this question concisely and helpfully: "${question}"`;
            const response = await global.askService.generateResponse(prompt, 'gpt-4');
            return response.substring(0, 200); // Keep responses short for voice
        } catch (error) {
            return "I'm not sure about that. Is there something specific you'd like me to do on the screen?";
        }
    }

    async describeScreen(screenAnalysis) {
        try {
            console.log('[VoiceAgent] 🔍 Generating screen description...');
            
            if (!this.lastScreenshot || !this.lastScreenshot.base64) {
                if (this.config.voiceResponseEnabled) {
                    await this.ttsService.speak("I'm having trouble capturing your screen right now. Could you try again?");
                }
                return;
            }

            // Use AI to describe what's on screen
            const modelStateService = require('../common/services/modelStateService');
            const { createStreamingLLM } = require('../common/ai/factory');
            
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            const llm = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.3,
                maxTokens: 300,
                usePortkey: modelInfo.provider === 'openai-leviousa',
                portkeyVirtualKey: modelInfo.provider === 'openai-leviousa' ? modelInfo.apiKey : undefined,
            });

            const systemPrompt = `You are describing what you see on a computer screen for a voice assistant. 

Describe the screen content in a conversational, natural way as if talking to someone. Focus on:
1. The main application or window that's open
2. Key UI elements the user can interact with
3. Any text content that's visible
4. Notable buttons, menus, or controls

Keep your response concise (2-3 sentences max) and conversational. Start with something like "I can see..." or "On your screen there is...". 

Avoid technical jargon and make it sound natural for voice interaction.`;

            const messages = [
                { 
                    role: 'system', 
                    content: systemPrompt 
                },
                { 
                    role: 'user', 
                    content: [
                        { type: 'text', text: 'Describe what you see on this screen.' },
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: `data:image/jpeg;base64,${this.lastScreenshot.base64}` 
                            } 
                        }
                    ]
                }
            ];

            const response = await llm.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        if (data.trim() === '') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                fullResponse += parsed.choices[0].delta.content;
                            }
                        } catch (parseError) {
                            // Skip malformed chunks
                        }
                    }
                }
            }

            // Clean up the response
            const description = fullResponse.trim();
            
            if (description && this.config.voiceResponseEnabled) {
                console.log('[VoiceAgent] 📝 Screen description generated:', description);
                await this.ttsService.speak(description);
            } else {
                // Fallback response
                await this.ttsService.speak("I can see your screen but I'm having trouble describing it right now. What would you like me to help you with?");
            }

        } catch (error) {
            console.error('[VoiceAgent] Error describing screen:', error);
            if (this.config.voiceResponseEnabled) {
                await this.ttsService.speak("I'm having trouble analyzing your screen right now. What can I help you with?");
            }
        }
    }

    async captureAndAnalyzeScreen() {
        try {
            console.log('[VoiceAgent] 📸 Capturing and analyzing screen...');
            
            // Capture screenshot
            const screenshotResult = await global.askService.captureScreenshot();
            
            // Validate screenshot capture
            if (!screenshotResult || !screenshotResult.success || !screenshotResult.base64) {
                console.warn('[VoiceAgent] ⚠️ Screenshot capture failed or returned invalid data:', screenshotResult?.error || 'Unknown error');
                this.lastScreenshot = null;
                // Still analyze with null screenshot - some analyzers can work without it
                if (this.config.advancedUIDetection) {
                    const analysis = await this.screenAnalyzer.analyzeScreen(null);
                    this.lastUIAnalysis = analysis;
                    console.log('[VoiceAgent] 🔍 Screen analysis complete (without screenshot)');
                    return analysis;
                }
                return null;
            }
            
            // Store valid screenshot
            this.lastScreenshot = screenshotResult;
            this.lastScreenCaptureTime = Date.now(); // Update last capture time
            
            // Analyze UI elements with valid screenshot
            if (this.config.advancedUIDetection) {
                const analysis = await this.screenAnalyzer.analyzeScreen(screenshotResult.base64);
                this.lastUIAnalysis = analysis;
                console.log('[VoiceAgent] 🔍 Screen analysis complete');
                return analysis;
            }
            
        } catch (error) {
            console.error('[VoiceAgent] Error capturing/analyzing screen:', error);
        }
    }

    async endConversation() {
        if (!this.isConversing) return;
        
        try {
            console.log('[VoiceAgent] 💬 Ending conversation...');
            this.isConversing = false;
            this.isProcessingCommand = false;
            
            // NEW: Reset feedback detection state
            this.feedbackCount = 0;
            this.recentTTSOutputs = [];
            this.lastTTSText = '';
            console.log('[VoiceAgent] 🔄 Feedback detection state reset');
            
            // Stop conversation manager with comprehensive cleanup
            if (this.conversationManager) {
                await this.conversationManager.stopConversation();
                // Wait a moment for full cleanup
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Save conversation history
            if (this.currentConversation) {
                this.conversationHistory.push({
                    ...this.currentConversation,
                    endTime: new Date()
                });
                this.currentConversation = null;
            }
            
            console.log('[VoiceAgent] ✅ Conversation ended successfully');
            this.emit('conversation-ended');
            
            // Return to wake word listening with delay to prevent conflicts
            if (this.isActive && this.wakeWordDetector) {
                setTimeout(async () => {
                    try {
                        console.log('[VoiceAgent] 🔄 Returning to wake word listening...');
                        await this.wakeWordDetector.startListening();
                        console.log('[VoiceAgent] ✅ Back to wake word listening mode');
                    } catch (error) {
                        console.error('[VoiceAgent] Error returning to wake word listening:', error);
                    }
                }, 500); // 500ms delay to ensure cleanup is complete
            }
            
        } catch (error) {
            console.error('[VoiceAgent] Error ending conversation:', error);
        }
    }

    // NEW: Reset echo prevention state manually
    resetEchoPreventionState() {
        console.log('[VoiceAgent] 🔄 Manually resetting echo prevention state');
        this.feedbackCount = 0;
        this.recentTTSOutputs = [];
        this.lastTTSText = '';
        this.lastTTSTime = 0;
        this.isSpeaking = false;
        
        this.emit('echo-prevention-reset');
        return { success: true };
    }
    
    // NEW: Update echo prevention configuration
    updateEchoPreventionConfig(newConfig) {
        const allowedKeys = [
            'feedbackSimilarityThreshold', 
            'echoPrevention', 
            'maxFeedbackDetections',
            'ttsCooldownPeriod'
        ];
        
        const updates = {};
        for (const key of allowedKeys) {
            if (newConfig.hasOwnProperty(key)) {
                if (key === 'ttsCooldownPeriod') {
                    this[key] = newConfig[key];
                } else {
                    this.config[key] = newConfig[key];
                }
                updates[key] = newConfig[key];
            }
        }
        
        console.log('[VoiceAgent] ⚙️ Updated echo prevention config:', updates);
        this.emit('echo-prevention-config-updated', updates);
        
        return { success: true, updates };
    }
    
    // NEW: Get current echo prevention status
    getEchoPreventionStatus() {
        return {
            isSpeaking: this.isSpeaking,
            feedbackCount: this.feedbackCount,
            recentTTSOutputs: this.recentTTSOutputs.length,
            recentTTSDetails: this.recentTTSOutputs.map(o => ({
                text: o.original,
                normalized: o.normalized,
                age: Date.now() - o.timestamp
            })),
            lastTTSTime: this.lastTTSTime,
            timeSinceLastTTS: this.lastTTSTime ? Date.now() - this.lastTTSTime : null,
            config: {
                echoPrevention: this.config.echoPrevention,
                feedbackSimilarityThreshold: this.config.feedbackSimilarityThreshold,
                maxFeedbackDetections: this.config.maxFeedbackDetections,
                ttsCooldownPeriod: this.ttsCooldownPeriod
            }
        };
    }
    
    // NEW: Debug method to test feedback detection
    testFeedbackDetection(text) {
        console.log('[VoiceAgent] 🧪 Testing feedback detection for:', text);
        
        const result = {
            input: text,
            normalized: this.normalizeTextForComparison(text),
            isCurrentlySpeaking: this.isSpeaking,
            timeSinceLastTTS: this.lastTTSTime ? Date.now() - this.lastTTSTime : null,
            withinCooldown: this.lastTTSTime && (Date.now() - this.lastTTSTime) < this.ttsCooldownPeriod,
            feedbackDetected: this.detectFeedbackLoop(text),
            recentTTSCount: this.recentTTSOutputs.length
        };
        
        console.log('[VoiceAgent] 🧪 Feedback test result:', result);
        return result;
    }

    // Manual trigger for testing
    async triggerVoiceCommand(command) {
        if (!this.isActive) {
            await this.enableVoiceAgent();
        }
        
        console.log('[VoiceAgent] 🧪 Manual voice command trigger:', command);
        
        // Simulate wake word and command
        await this.handleWakeWordDetected({ confidence: 1.0 });
        await this.handleUserSpeech(command);
    }

    // Configuration management
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[VoiceAgent] Configuration updated:', this.config);
        this.emit('config-updated', this.config);
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isActive: this.isActive,
            isListening: this.isListening,
            isConversing: this.isConversing,
            isProcessingCommand: this.isProcessingCommand,
            config: this.config,
            conversationCount: this.conversationHistory.length,
            lastUIAnalysis: this.lastUIAnalysis ? {
                timestamp: this.lastUIAnalysis.timestamp,
                elementsFound: this.lastUIAnalysis.elements?.length || 0
            } : null
        };
    }

    // Testing methods
    async testWakeWordDetection() {
        console.log('[VoiceAgent] 🧪 Testing wake word detection...');
        return await this.wakeWordDetector.test();
    }

    async testTTS() {
        console.log('[VoiceAgent] 🧪 Testing text-to-speech...');
        return await this.ttsService.speak("This is a test of the text to speech system.");
    }

    async testScreenAnalysis() {
        console.log('[VoiceAgent] 🧪 Testing screen analysis...');
        return await this.captureAndAnalyzeScreen();
    }

    async testActionExecution() {
        console.log('[VoiceAgent] 🧪 Testing action execution...');
        const testCommand = {
            intent: 'click',
            entities: ['button'],
            isActionable: true,
            suggestedActions: ['find_button', 'click_button'],
            requiresScreenInteraction: true
        };
        return await this.actionExecutor.executeCommand(testCommand, this.lastUIAnalysis);
    }

    // NEW: Handle MCP-powered question answering on screen
    async handleMCPQuestionAnswering(commandAnalysis) {
        try {
            console.log('[VoiceAgent] 🧠 Using MCP for intelligent question answering...');
            
            // Get the invisibility service which has MCP integration
            if (!global.invisibilityService) {
                await this.ttsService.speak("Question answering service is not available.");
                return;
            }
            
            await this.ttsService.speak("Looking for questions on screen and generating answers...");
            
            // Use the invisibility service's voice-triggered method
            await global.invisibilityService.processQuestionAndAnswerVoiceTriggered();
            
            await this.ttsService.speak("Completed answering questions on screen.");
            
            // Add to conversation
            this.currentConversation.turns.push({
                type: 'assistant',
                text: 'I analyzed the screen and answered any questions I found using my research capabilities.',
                timestamp: new Date(),
                action: commandAnalysis,
                result: { success: true, action: 'mcp_question_answering' }
            });
            
        } catch (error) {
            console.error('[VoiceAgent] Error in MCP question answering:', error);
            await this.ttsService.speak("Sorry, I couldn't process the questions on screen.");
        }
    }

    // NEW: Handle general knowledge questions with MCP enhanced research
    async handleMCPKnowledgeQuestion(commandAnalysis) {
        try {
            console.log('[VoiceAgent] 🔍 Using MCP for knowledge question:', commandAnalysis.originalText);
            
            // Get MCP client
            const mcpClient = global.invisibilityService?.mcpClient;
            if (!mcpClient) {
                // Fallback to regular conversation
                console.log('[VoiceAgent] MCP not available, using regular response');
                return;
            }
            
            await this.ttsService.speak("Let me research that for you...");
            
            // Classify and prepare question for MCP
            const questionType = this.classifyQuestionForMCP(commandAnalysis.originalText);
            const question = {
                text: commandAnalysis.originalText,
                type: questionType,
                context: this.getConversationContext(),
                confidence: 90
            };
            
            // Get screen context for visual questions
            let screenshotBase64 = null;
            if (this.lastScreenshot) {
                screenshotBase64 = this.lastScreenshot.base64;
            }
            
            // Get enhanced answer from MCP
            const answer = await mcpClient.getEnhancedAnswer(question, screenshotBase64);
            
            if (answer) {
                console.log('[VoiceAgent] ✅ Got MCP enhanced answer');
                
                // Speak the answer (truncate if too long for speech)
                const spokenAnswer = this.prepareSpeechAnswer(answer);
                await this.ttsService.speak(spokenAnswer);
                
                // Add to conversation
                this.currentConversation.turns.push({
                    type: 'assistant',
                    text: answer,
                    timestamp: new Date(),
                    action: commandAnalysis,
                    result: { success: true, action: 'mcp_knowledge_answer', type: questionType }
                });
            } else {
                await this.ttsService.speak("I couldn't find a good answer to that question right now.");
            }
            
        } catch (error) {
            console.error('[VoiceAgent] Error in MCP knowledge question:', error);
            await this.ttsService.speak("Sorry, I encountered an error while researching that question.");
        }
    }

    // NEW: Check if text is asking a knowledge question
    isQuestionAboutKnowledge(text) {
        const lowerText = text.toLowerCase();
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
        const knowledgeIndicators = [
            'explain', 'tell me', 'describe', 'define', 'mean', 'difference between',
            'help me understand', 'can you', 'do you know', 'have you heard'
        ];
        
        return questionWords.some(word => lowerText.startsWith(word)) ||
               knowledgeIndicators.some(phrase => lowerText.includes(phrase));
    }

    // NEW: Classify question type for MCP
    classifyQuestionForMCP(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.match(/\b(code|programming|algorithm|function|debug|syntax|javascript|python|java|react|css|html|sql|api)\b/)) {
            return 'coding';
        }
        
        if (lowerText.match(/\b(calculate|solve|equation|formula|math|statistics|probability)\b/)) {
            return 'math';
        }
        
        if (lowerText.match(/\b(architecture|system|design|database|security|performance|technical|how does|works)\b/)) {
            return 'technical';
        }
        
        return 'general';
    }

    // NEW: Prepare answer for speech (truncate if needed)
    prepareSpeechAnswer(answer) {
        if (answer.length <= 300) {
            return answer;
        }
        
        // Find a good breaking point (end of sentence)
        const sentences = answer.split(/[.!?]+/);
        let spokenPart = '';
        
        for (const sentence of sentences) {
            if ((spokenPart + sentence).length > 300) {
                break;
            }
            spokenPart += sentence + '. ';
        }
        
        return spokenPart.trim() || answer.substring(0, 300) + '...';
    }

    // NEW: Get conversation context for MCP
    getConversationContext() {
        if (!this.currentConversation || !this.currentConversation.turns) {
            return '';
        }
        
        return this.currentConversation.turns
            .slice(-5) // Last 5 turns
            .map(turn => `${turn.type}: ${turn.text}`)
            .join('\n');
    }
}

module.exports = VoiceAgentService; 