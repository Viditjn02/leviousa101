const { EventEmitter } = require('events');
const { execSync, spawn } = require('child_process');

class ConversationManager extends EventEmitter {
    constructor(voiceAgentService = null) {
        super();
        this.isInitialized = false;
        this.isConversationActive = false;
        this.isListening = false;
        this.isSpeaking = false;
        this.voiceAgentService = voiceAgentService; // NEW: Reference to voice agent for state checking
        
        // Audio handling
        this.audioStream = null;
        this.sttSession = null;
        this.currentTranscription = '';
        
        // Conversation state
        this.conversationTimeout = null;
        this.silenceTimeout = null;
        this.lastSpeechTime = 0;
        
        this.config = {
            conversationTimeout: 30000, // 30 seconds
            silenceTimeout: 15000, // 15 seconds of silence (increased from 5 seconds)
            continuousListening: true,
            autoEndOnSilence: true,
            sttProvider: 'deepgram', // Use existing STT service
            language: 'en',
            sampleRate: 16000
        };
        
        console.log('[ConversationManager] Initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[ConversationManager] Already initialized');
            return { success: true };
        }

        try {
            console.log('[ConversationManager] Initializing conversation manager...');
            
            // Verify existing STT service is available
            await this.initializeSTTService();
            
            this.isInitialized = true;
            console.log('[ConversationManager] ✅ Conversation manager initialized');
            
            return { success: true };
            
        } catch (error) {
            console.error('[ConversationManager] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async initializeSTTService() {
        try {
            // Use the real STT service for conversations  
            const RealSTTService = require('./realSTTService');
            this.sttService = new RealSTTService();
            
            const initResult = await this.sttService.initialize();
            if (!initResult.success) {
                throw new Error('Failed to initialize real STT service: ' + initResult.error);
            }
            
            // Listen for real transcriptions
            this.sttService.on('transcription', (data) => {
                if (data.text && data.text.trim().length > 0) {
                    this.processSpeechTranscription(data.text);
                }
            });
            
            console.log('[ConversationManager] Real STT service initialized');
            return { success: true };
            
        } catch (error) {
            console.error('[ConversationManager] Real STT service initialization failed:', error);
            throw error;
        }
    }

    async startConversation() {
        if (this.isConversationActive) {
            console.log('[ConversationManager] Conversation already active');
            return { success: true };
        }

        try {
            console.log('[ConversationManager] 🎤 Starting voice conversation...');
            
            this.isConversationActive = true;
            this.lastSpeechTime = Date.now();
            
            // Start listening for user speech
            await this.startListening();
            
            // Set conversation timeout
            this.setConversationTimeout();
            
            console.log('[ConversationManager] ✅ Voice conversation started');
            this.emit('conversation-started');
            
            return { success: true };
            
        } catch (error) {
            console.error('[ConversationManager] Failed to start conversation:', error);
            this.isConversationActive = false;
            return { success: false, error: error.message };
        }
    }

    async startListening() {
        if (this.isListening) {
            console.log('[ConversationManager] Already listening');
            return;
        }

        try {
            this.isListening = true;
            
            // Use the existing STT service
            console.log('[ConversationManager] 🔊 Starting speech recognition...');
            
            // Start STT session using existing service
            await this.startSTTSession();
            
            // Start silence detection
            this.startSilenceDetection();
            
            console.log('[ConversationManager] ✅ Listening for speech');
            this.emit('listening-started');
            
        } catch (error) {
            console.error('[ConversationManager] Failed to start listening:', error);
            this.isListening = false;
            throw error;
        }
    }

    async startSTTSession() {
        try {
            // Start real STT session for conversation
            this.sttSession = {
                isActive: true,
                transcriptionBuffer: '',
                lastUpdate: Date.now()
            };
            
            // Start real STT listening
            const result = await this.sttService.startListening();
            if (!result.success) {
                throw new Error('Failed to start STT listening: ' + result.error);
            }
            
            console.log('[ConversationManager] Real STT session started');
            
        } catch (error) {
            console.error('[ConversationManager] Failed to start real STT session:', error);
            throw error;
        }
    }



    async processSpeechTranscription(transcription) {
        if (!transcription || transcription.trim().length === 0) return;
        
        try {
            console.log('[ConversationManager] 📝 Speech recognized:', transcription);
            
            // NEW: Check if voice agent is currently speaking (echo prevention)
            if (this.voiceAgentService && this.voiceAgentService.isSpeaking) {
                console.log('[ConversationManager] 🔇 Ignoring transcription - voice agent is speaking');
                return;
            }
            
            // NEW: Check cooldown period after TTS
            if (this.voiceAgentService && this.voiceAgentService.lastTTSTime) {
                const timeSinceLastTTS = Date.now() - this.voiceAgentService.lastTTSTime;
                if (timeSinceLastTTS < (this.voiceAgentService.ttsCooldownPeriod || 2000)) {
                    console.log('[ConversationManager] 🔇 Ignoring transcription - within TTS cooldown period');
                    return;
                }
            }
            
            // NEW: Check for feedback loops
            if (this.voiceAgentService && this.voiceAgentService.detectFeedbackLoop) {
                if (this.voiceAgentService.detectFeedbackLoop(transcription)) {
                    console.log('[ConversationManager] 🔄 Ignoring transcription - feedback loop detected');
                    return;
                }
            }
            
            // Update conversation state
            this.lastSpeechTime = Date.now();
            this.currentTranscription = transcription;
            
            // Reset silence timeout
            this.resetSilenceTimeout();
            
            // Check for conversation end phrases
            if (this.isEndConversationPhrase(transcription)) {
                console.log('[ConversationManager] End conversation phrase detected');
                await this.stopConversation();
                return;
            }
            
            // Emit speech recognition event
            this.emit('speech-recognized', transcription);
            
            // Reset conversation timeout
            this.resetConversationTimeout();
            
        } catch (error) {
            console.error('[ConversationManager] Error processing transcription:', error);
        }
    }

    isEndConversationPhrase(text) {
        const endPhrases = [
            /^(stop|cancel|exit|quit|bye|goodbye|that's all|done|finish)$/i,
            /^(thank you|thanks)$/i,
            /^(no more|nothing else|i'm done)$/i
        ];
        
        const normalizedText = text.trim().toLowerCase();
        return endPhrases.some(pattern => pattern.test(normalizedText));
    }

    startSilenceDetection() {
        this.resetSilenceTimeout();
    }

    resetSilenceTimeout() {
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
        }
        
        if (this.config.autoEndOnSilence) {
            this.silenceTimeout = setTimeout(() => {
                console.log('[ConversationManager] ⏰ Silence timeout - ending conversation');
                this.emit('silence-timeout');
                this.stopConversation();
            }, this.config.silenceTimeout);
        }
    }

    setConversationTimeout() {
        if (this.conversationTimeout) {
            clearTimeout(this.conversationTimeout);
        }
        
        this.conversationTimeout = setTimeout(() => {
            console.log('[ConversationManager] ⏰ Conversation timeout');
            this.emit('conversation-timeout');
            this.stopConversation();
        }, this.config.conversationTimeout);
    }

    resetConversationTimeout() {
        this.setConversationTimeout();
    }

    async stopListening() {
        if (!this.isListening) return;
        
        try {
            console.log('[ConversationManager] 🔇 Stopping speech recognition...');
            
            this.isListening = false;
            
            // Stop STT session with proper cleanup
            if (this.sttSession) {
                this.sttSession.isActive = false;
                this.sttSession = null;
            }
            
            // Stop real STT service with comprehensive cleanup
            if (this.sttService) {
                try {
                    await this.sttService.stopListening();
                    // Force close any lingering sessions
                    if (global.listenService && global.listenService.closeSession) {
                        await global.listenService.closeSession();
                        console.log('[ConversationManager] 🧹 Global listen service session closed');
                    }
                } catch (error) {
                    console.error('[ConversationManager] Error stopping STT service:', error);
                }
            }
            
            // Clear timeouts
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }
            
            // Give a brief moment for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('[ConversationManager] ✅ Speech recognition stopped');
            this.emit('listening-stopped');
            
        } catch (error) {
            console.error('[ConversationManager] Error stopping listening:', error);
        }
    }

    async stopConversation() {
        if (!this.isConversationActive) return;
        
        try {
            console.log('[ConversationManager] 🛑 Stopping voice conversation...');
            
            this.isConversationActive = false;
            
            // Stop listening
            await this.stopListening();
            
            // Clear all timeouts
            if (this.conversationTimeout) {
                clearTimeout(this.conversationTimeout);
                this.conversationTimeout = null;
            }
            
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
                this.silenceTimeout = null;
            }
            
            // Reset state
            this.currentTranscription = '';
            this.lastSpeechTime = 0;
            
            console.log('[ConversationManager] ✅ Voice conversation stopped');
            this.emit('conversation-stopped');
            
            return { success: true };
            
        } catch (error) {
            console.error('[ConversationManager] Error stopping conversation:', error);
            return { success: false, error: error.message };
        }
    }

    // Real-time speech recognition using existing services
    async startRealTimeSTT() {
        try {
            // This would integrate with the existing STT service for real-time transcription
            console.log('[ConversationManager] Starting real-time STT...');
            
            // Use existing listen service if available
            if (global.listenService && global.listenService.startSession) {
                const sessionResult = await global.listenService.startSession();
                if (sessionResult.success) {
                    console.log('[ConversationManager] Real-time STT session started');
                    
                    // Listen for transcription events
                    global.listenService.on('transcription', (data) => {
                        if (data.text && data.text.trim().length > 0) {
                            this.processSpeechTranscription(data.text);
                        }
                    });
                    
                    return { success: true };
                }
            }
            
            // Fallback to manual integration
            console.log('[ConversationManager] Using fallback STT method');
            return { success: true };
            
        } catch (error) {
            console.error('[ConversationManager] Failed to start real-time STT:', error);
            return { success: false, error: error.message };
        }
    }

    // Pause conversation (e.g., when system is speaking)
    async pauseListening() {
        if (!this.isListening) return;
        
        console.log('[ConversationManager] ⏸️ Pausing speech recognition...');
        this.isListening = false;
        
        // Pause timeouts
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
        }
        
        this.emit('listening-paused');
    }

    // Resume conversation
    async resumeListening() {
        if (this.isListening || !this.isConversationActive) return;
        
        console.log('[ConversationManager] ▶️ Resuming speech recognition...');
        
        await this.startListening();
        this.emit('listening-resumed');
    }

    // Manual speech input for testing
    async injectSpeech(text) {
        console.log('[ConversationManager] 🧪 Manual speech injection:', text);
        await this.processSpeechTranscription(text);
    }

    // Get conversation statistics
    getConversationStats() {
        return {
            isActive: this.isConversationActive,
            isListening: this.isListening,
            duration: this.isConversationActive ? Date.now() - this.lastSpeechTime : 0,
            lastSpeechTime: this.lastSpeechTime,
            currentTranscription: this.currentTranscription
        };
    }

    // Configuration management
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[ConversationManager] Configuration updated:', this.config);
        
        // Apply configuration changes
        if (this.isConversationActive) {
            this.resetConversationTimeout();
        }
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isConversationActive: this.isConversationActive,
            isListening: this.isListening,
            isSpeaking: this.isSpeaking,
            config: this.config,
            stats: this.getConversationStats()
        };
    }

    // Testing methods
    async test() {
        console.log('[ConversationManager] 🧪 Running conversation manager test...');
        
        const testResults = {
            initialization: this.isInitialized,
            sttService: !!global.listenService,
            configuration: !!this.config
        };
        
        // Test conversation flow
        try {
            await this.startConversation();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.injectSpeech('test speech recognition');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.stopConversation();
            
            testResults.conversationFlow = true;
        } catch (error) {
            testResults.conversationFlow = false;
            testResults.error = error.message;
        }
        
        console.log('[ConversationManager] Test results:', testResults);
        return testResults;
    }
}

module.exports = ConversationManager; 