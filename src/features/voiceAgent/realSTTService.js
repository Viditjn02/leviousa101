const { EventEmitter } = require('events');

class RealSTTService extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.isListening = false;
        this.currentSession = null;
        
        this.config = {
            provider: 'deepgram', // Use existing STT provider
            language: 'en',
            continuous: true,
            interimResults: true
        };
        
        console.log('[RealSTTService] Initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[RealSTTService] Already initialized');
            return { success: true };
        }

        try {
            console.log('[RealSTTService] Initializing real STT service...');
            
            // Check if existing listen service is available
            if (!global.listenService) {
                throw new Error('Listen service not available - required for real STT');
            }
            
            this.isInitialized = true;
            console.log('[RealSTTService] ✅ Real STT service initialized');
            
            return { success: true };
            
        } catch (error) {
            console.error('[RealSTTService] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async startListening() {
        if (this.isListening) {
            console.log('[RealSTTService] Already listening');
            return { success: true };
        }

        try {
            console.log('[RealSTTService] 🎤 Starting real speech recognition...');
            
            // Use existing listen service for STT
            const sessionResult = await global.listenService.initializeSession('en');
            
            if (!sessionResult) {
                throw new Error('Failed to initialize STT session');
            }
            
            // NEW: Wait for STT to be fully ready before proceeding
            await this.waitForSTTReady();
            
            this.currentSession = 'active';
            this.isListening = true;
            
            // Hook into the STT service's transcription callback
            this.setupTranscriptionHook();
            
            console.log('[RealSTTService] ✅ Real STT listening started');
            this.emit('listening-started');
            
            return { success: true };
            
        } catch (error) {
            console.error('[RealSTTService] Failed to start listening:', error);
            this.isListening = false;
            return { success: false, error: error.message };
        }
    }
    
    // NEW: Wait for STT service to be fully ready
    async waitForSTTReady(maxWaitMs = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
            if (global.listenService && global.listenService.isSTTReady) {
                console.log('[RealSTTService] ✅ STT service is ready');
                return true;
            }
            
            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('STT service did not become ready within timeout period');
    }

    setupTranscriptionHook() {
        // Hook into the existing STT service's transcription callback
        if (global.listenService && global.listenService.sttService) {
            // Store the original callback
            const originalCallback = global.listenService.sttService.callbacks?.onTranscriptionComplete;
            
            // Create our enhanced callback
            const enhancedCallback = (speaker, text) => {
                // Call the original callback first
                if (originalCallback) {
                    originalCallback(speaker, text);
                }
                
                // Then emit our own transcription event for voice agent
                if (this.isListening && text && text.trim().length > 0) {
                    console.log('[RealSTTService] 📝 Transcription received:', text);
                    this.emit('transcription', {
                        text: text,
                        speaker: speaker,
                        confidence: 0.8, // Default confidence
                        isFinal: true,
                        timestamp: Date.now()
                    });
                }
            };
            
            // Override the callback
            global.listenService.sttService.setCallbacks({
                ...global.listenService.sttService.callbacks,
                onTranscriptionComplete: enhancedCallback
            });
            
            console.log('[RealSTTService] ✅ Transcription hook installed');
        } else {
            console.warn('[RealSTTService] ⚠️ Could not hook into STT service - callbacks may not work');
        }
    }

    async stopListening() {
        if (!this.isListening) {
            return { success: true };
        }

        try {
            console.log('[RealSTTService] 🔇 Stopping real speech recognition...');
            
            // Stop existing listen service session
            if (this.currentSession && global.listenService) {
                await global.listenService.closeSession();
            }
            
            this.isListening = false;
            this.currentSession = null;
            
            console.log('[RealSTTService] ✅ Real STT listening stopped');
            this.emit('listening-stopped');
            
            return { success: true };
            
        } catch (error) {
            console.error('[RealSTTService] Error stopping listening:', error);
            return { success: false, error: error.message };
        }
    }

    // Wake word detection using real STT
    async detectWakeWord(audioData) {
        if (!this.isListening) {
            return null;
        }
        
        try {
            // The real transcription will come through the transcription event
            // This method is called by WakeWordDetector but actual detection
            // happens in the event listeners
            return null;
            
        } catch (error) {
            console.error('[RealSTTService] Wake word detection error:', error);
            return null;
        }
    }

    // Real-time transcription for conversations
    async getTranscription() {
        if (!this.isListening) {
            return null;
        }
        
        // Transcriptions come through events, not polling
        return null;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[RealSTTService] Configuration updated:', this.config);
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isListening: this.isListening,
            currentSession: this.currentSession,
            config: this.config,
            hasListenService: !!global.listenService
        };
    }

    async test() {
        console.log('[RealSTTService] 🧪 Testing real STT service...');
        
        try {
            const testResults = {
                initialization: this.isInitialized,
                listenServiceAvailable: !!global.listenService,
                canStartSession: false
            };
            
            // Test if we can start a session
            if (global.listenService) {
                try {
                    const sessionResult = await global.listenService.initializeSession('en');
                    testResults.canStartSession = !!sessionResult;
                    
                    if (sessionResult) {
                        // End the test session
                        await global.listenService.closeSession();
                    }
                } catch (error) {
                    testResults.sessionError = error.message;
                }
            }
            
            console.log('[RealSTTService] Test results:', testResults);
            return testResults;
            
        } catch (error) {
            console.error('[RealSTTService] Test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = RealSTTService; 