const { EventEmitter } = require('events');
const { execSync } = require('child_process');

class WakeWordDetector extends EventEmitter {
    constructor(voiceAgentService = null) {
        super();
        this.isInitialized = false;
        this.isListening = false;
        this.audioStream = null;
        this.sttService = null;
        this.voiceAgentService = voiceAgentService; // NEW: Reference to voice agent for state checking
        this.wakeWordPatterns = [
            /hey\s+leviousa/i,
            /hi\s+leviousa/i,
            /hello\s+leviousa/i,
            /okay\s+leviousa/i
        ];
        
        this.config = {
            confidenceThreshold: 0.7,
            sampleRate: 16000,
            channels: 1,
            bufferDuration: 3000, // 3 seconds
            continuousListening: true,
            useSystemVoiceRecognition: true
        };
        
        // Audio processing
        this.audioBuffer = [];
        this.processingInterval = null;
        this.lastWakeWordTime = 0;
        this.cooldownPeriod = 5000; // 5 seconds between wake words
        
        console.log('[WakeWordDetector] Initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[WakeWordDetector] Already initialized');
            return { success: true };
        }

        try {
            console.log('[WakeWordDetector] Initializing wake word detection...');
            
            // Check if we have microphone permissions
            await this.checkMicrophonePermissions();
            
            // Initialize STT service for wake word detection
            await this.initializeSTTService();
            
            // Initialize voice enrollment service
            await this.initializeVoiceEnrollment();
            
            this.isInitialized = true;
            console.log('[WakeWordDetector] ✅ Wake word detector initialized');
            
            return { success: true };
            
        } catch (error) {
            console.error('[WakeWordDetector] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async checkMicrophonePermissions() {
        try {
            // Simplified microphone permission check - just verify that system_profiler works
            // Full permission verification will happen when STT service starts
            const result = execSync(`system_profiler SPAudioDataType | grep -c "Built-in Microphone" || echo "0"`, { encoding: 'utf8' }).trim();
            
            if (result === '0') {
                console.warn('[WakeWordDetector] ⚠️ Built-in microphone not detected, but continuing...');
            } else {
                console.log('[WakeWordDetector] ✅ Microphone hardware detected');
            }
            
        } catch (error) {
            console.warn('[WakeWordDetector] Microphone permission check failed, but continuing:', error.message);
            // Don't throw - let the actual STT service handle permission checks
        }
    }

    async initializeSTTService() {
        try {
            // Use the real STT service for wake word detection
            const RealSTTService = require('./realSTTService');
            this.sttService = new RealSTTService();
            
            const initResult = await this.sttService.initialize();
            if (!initResult.success) {
                throw new Error('Failed to initialize real STT service: ' + initResult.error);
            }
            
            // Listen for real transcriptions
            this.sttService.on('transcription', async (data) => {
                if (data.text && data.text.trim().length > 0) {
                    await this.processTranscription(data.text, data.confidence);
                }
            });
            
            console.log('[WakeWordDetector] Real STT service initialized');
            
        } catch (error) {
            console.error('[WakeWordDetector] Failed to initialize real STT:', error);
            throw error;
        }
    }

    async initializeVoiceEnrollment() {
        try {
            console.log('[WakeWordDetector] Initializing voice enrollment service...');
            
            // Initialize voice enrollment service
            const VoiceEnrollmentService = require('./voiceEnrollmentService');
            this.voiceEnrollment = new VoiceEnrollmentService();
            
            const initResult = await this.voiceEnrollment.initialize();
            if (!initResult.success) {
                console.warn('[WakeWordDetector] Voice enrollment failed to initialize:', initResult.error);
                // Don't throw - voice enrollment is optional
            }
            
            // Set up voice enrollment event listeners
            this.setupVoiceEnrollmentListeners();
            
            console.log('[WakeWordDetector] ✅ Voice enrollment service initialized');
            
        } catch (error) {
            console.warn('[WakeWordDetector] Voice enrollment initialization failed:', error.message);
            // Don't throw - voice enrollment is optional, wake word detection can still work
        }
    }

    setupVoiceEnrollmentListeners() {
        if (!this.voiceEnrollment) return;
        
        this.voiceEnrollment.on('enrollment-started', (data) => {
            console.log('[WakeWordDetector] Voice enrollment started:', data);
            this.emit('voice-enrollment-started', data);
        });
        
        this.voiceEnrollment.on('sample-recording-started', (data) => {
            console.log('[WakeWordDetector] Sample recording started:', data);
            this.emit('voice-sample-recording-started', data);
        });
        
        this.voiceEnrollment.on('sample-recorded', (data) => {
            console.log('[WakeWordDetector] Sample recorded:', data);
            this.emit('voice-sample-recorded', data);
        });
        
        this.voiceEnrollment.on('sample-rejected', (data) => {
            console.log('[WakeWordDetector] Sample rejected:', data);
            this.emit('voice-sample-rejected', data);
        });
        
        this.voiceEnrollment.on('enrollment-completed', (data) => {
            console.log('[WakeWordDetector] Voice enrollment completed:', data);
            this.emit('voice-enrollment-completed', data);
        });
        
        this.voiceEnrollment.on('enrollment-cancelled', () => {
            console.log('[WakeWordDetector] Voice enrollment cancelled');
            this.emit('voice-enrollment-cancelled');
        });
    }





    async startListening() {
        if (this.isListening) {
            console.log('[WakeWordDetector] Already listening');
            return { success: true };
        }

        try {
            console.log('[WakeWordDetector] 🎤 Starting wake word listening...');
            
            this.isListening = true;
            
            // Start continuous audio monitoring
            await this.startAudioMonitoring();
            
            console.log('[WakeWordDetector] ✅ Now listening for "Hey Leviousa"');
            this.emit('listening-started');
            
            return { success: true };
            
        } catch (error) {
            console.error('[WakeWordDetector] Failed to start listening:', error);
            this.isListening = false;
            return { success: false, error: error.message };
        }
    }

    async startAudioMonitoring() {
        try {
            // Start real STT service for continuous listening
            const result = await this.sttService.startListening();
            if (!result.success) {
                throw new Error('Failed to start STT listening: ' + result.error);
            }
            
            console.log('[WakeWordDetector] Real audio monitoring started with STT service');
            
        } catch (error) {
            console.error('[WakeWordDetector] Failed to start audio monitoring:', error);
            throw error;
        }
    }

    async processTranscription(transcriptionText, confidence) {
        try {
            console.log('[WakeWordDetector] Processing transcription:', transcriptionText);
            
            // NEW: Check if voice agent is currently speaking (echo prevention)
            if (this.voiceAgentService && this.voiceAgentService.isSpeaking) {
                console.log('[WakeWordDetector] 🔇 Ignoring transcription - voice agent is speaking');
                return;
            }
            
            // NEW: Check cooldown period after TTS
            if (this.voiceAgentService && this.voiceAgentService.lastTTSTime) {
                const timeSinceLastTTS = Date.now() - this.voiceAgentService.lastTTSTime;
                if (timeSinceLastTTS < (this.voiceAgentService.ttsCooldownPeriod || 2000)) {
                    console.log('[WakeWordDetector] 🔇 Ignoring transcription - within TTS cooldown period');
                    return;
                }
            }
            
            // If we're in enrollment mode, process for enrollment
            if (this.voiceEnrollment && this.voiceEnrollment.isEnrolling) {
                await this.voiceEnrollment.processEnrollmentTranscription(transcriptionText);
                return; // Don't process for wake word detection during enrollment
            }
            
            // Use voice enrollment verification if available, otherwise fall back to pattern matching
            let wakeWordDetected = null;
            
            if (this.voiceEnrollment && this.voiceEnrollment.isEnrolled()) {
                // Use personalized voice verification
                const voiceMatch = await this.voiceEnrollment.verifyVoiceMatch(transcriptionText);
                if (voiceMatch.isMatch) {
                    wakeWordDetected = {
                        confidence: voiceMatch.confidence,
                        method: 'voice-enrollment',
                        phraseSimilarity: voiceMatch.phraseSimilarity
                    };
                }
            } else {
                // Fall back to regex pattern matching
                wakeWordDetected = this.detectWakeWordInText(transcriptionText);
                if (wakeWordDetected) {
                    wakeWordDetected.method = 'pattern-matching';
                }
            }
            
            if (wakeWordDetected) {
                const now = Date.now();
                
                // Check cooldown period
                if (now - this.lastWakeWordTime > this.cooldownPeriod) {
                    this.lastWakeWordTime = now;
                    
                    console.log('[WakeWordDetector] 🎯 Wake word detected:', {
                        transcription: transcriptionText,
                        method: wakeWordDetected.method,
                        confidence: wakeWordDetected.confidence
                    });
                    
                    this.emit('wake-word-detected', {
                        transcription: transcriptionText,
                        confidence: Math.max(confidence || 0, wakeWordDetected.confidence),
                        timestamp: now,
                        method: wakeWordDetected.method,
                        pattern: wakeWordDetected.pattern || 'voice-match'
                    });
                }
            }
            
        } catch (error) {
            console.error('[WakeWordDetector] Transcription processing error:', error);
        }
    }

    detectWakeWordInText(text) {
        if (!text || typeof text !== 'string') return false;
        
        const normalizedText = text.toLowerCase().trim();
        
        for (let i = 0; i < this.wakeWordPatterns.length; i++) {
            const pattern = this.wakeWordPatterns[i];
            const match = normalizedText.match(pattern);
            
            if (match) {
                // Calculate confidence based on match quality
                const confidence = this.calculateMatchConfidence(normalizedText, match);
                
                if (confidence >= this.config.confidenceThreshold) {
                    return {
                        match: match[0],
                        confidence: confidence,
                        pattern: pattern.source
                    };
                }
            }
        }
        
        return false;
    }

    calculateMatchConfidence(text, match) {
        // Simple confidence calculation based on:
        // 1. Exact match vs partial match
        // 2. Position in text
        // 3. Surrounding context
        
        let confidence = 0.8; // Base confidence
        
        // Boost if wake word is at the beginning
        if (text.indexOf(match[0]) === 0) {
            confidence += 0.1;
        }
        
        // Boost if it's the only significant content
        const wordCount = text.split(/\s+/).length;
        if (wordCount <= 3) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }

    async stopListening() {
        if (!this.isListening) {
            return { success: true };
        }

        try {
            console.log('[WakeWordDetector] 🔇 Stopping wake word listening...');
            
            this.isListening = false;
            
            // Stop real STT service
            if (this.sttService) {
                await this.sttService.stopListening();
            }
            
            // Clear audio buffer
            this.audioBuffer = [];
            
            console.log('[WakeWordDetector] ✅ Wake word listening stopped');
            this.emit('listening-stopped');
            
            return { success: true };
            
        } catch (error) {
            console.error('[WakeWordDetector] Failed to stop listening:', error);
            return { success: false, error: error.message };
        }
    }

    // Manual trigger for testing
    async triggerWakeWord() {
        console.log('[WakeWordDetector] 🧪 Manual wake word trigger');
        
        this.emit('wake-word-detected', {
            transcription: 'hey leviousa',
            confidence: 1.0,
            timestamp: Date.now(),
            pattern: 'manual_trigger'
        });
        
        return { success: true };
    }

    // Advanced wake word detection using multiple approaches
    async enableAdvancedDetection() {
        try {
            // This could integrate with more sophisticated wake word detection
            // like PocketSphinx, Snowboy, or custom trained models
            
            console.log('[WakeWordDetector] Advanced detection would be enabled here');
            
            // For now, we'll enhance the existing pattern matching
            this.wakeWordPatterns.push(
                /.*leviousa.*/i,
                /hey.*lev.*/i,
                /hello.*assistant/i
            );
            
            // Lower confidence threshold for more sensitive detection
            this.config.confidenceThreshold = 0.6;
            
            return { success: true };
            
        } catch (error) {
            console.error('[WakeWordDetector] Failed to enable advanced detection:', error);
            return { success: false, error: error.message };
        }
    }

    // Configuration management
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[WakeWordDetector] Configuration updated:', this.config);
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isListening: this.isListening,
            config: this.config,
            patternsCount: this.wakeWordPatterns.length,
            lastWakeWordTime: this.lastWakeWordTime
        };
    }

    // Voice enrollment methods
    async startVoiceEnrollment() {
        if (!this.voiceEnrollment) {
            return { success: false, error: 'Voice enrollment service not available' };
        }
        return await this.voiceEnrollment.startEnrollment();
    }

    async recordEnrollmentSample() {
        if (!this.voiceEnrollment) {
            return { success: false, error: 'Voice enrollment service not available' };
        }
        return await this.voiceEnrollment.recordEnrollmentSample();
    }

    async cancelVoiceEnrollment() {
        if (!this.voiceEnrollment) {
            return { success: false, error: 'Voice enrollment service not available' };
        }
        return await this.voiceEnrollment.cancelEnrollment();
    }

    async resetVoiceTemplate() {
        if (!this.voiceEnrollment) {
            return { success: false, error: 'Voice enrollment service not available' };
        }
        return await this.voiceEnrollment.resetVoiceTemplate();
    }

    getVoiceEnrollmentStatus() {
        if (!this.voiceEnrollment) {
            return { available: false, error: 'Voice enrollment service not available' };
        }
        return { available: true, ...this.voiceEnrollment.getEnrollmentStatus() };
    }

    isVoiceEnrolled() {
        return this.voiceEnrollment && this.voiceEnrollment.isEnrolled();
    }

    // Testing methods
    async test() {
        console.log('[WakeWordDetector] 🧪 Running wake word detection test...');
        
        const testPhrases = [
            'hey leviousa',
            'hello leviousa',
            'hi leviousa',
            'hey there',
            'leviousa help me'
        ];
        
        const results = [];
        
        for (const phrase of testPhrases) {
            const detection = this.detectWakeWordInText(phrase);
            results.push({
                phrase: phrase,
                detected: !!detection,
                confidence: detection ? detection.confidence : 0
            });
        }
        
        // Test voice enrollment if available
        if (this.voiceEnrollment) {
            const enrollmentTest = await this.voiceEnrollment.test();
            results.push({
                voiceEnrollmentTest: enrollmentTest,
                isVoiceEnrolled: this.isVoiceEnrolled()
            });
        }
        
        console.log('[WakeWordDetector] Test results:', results);
        return results;
    }
}

module.exports = WakeWordDetector; 