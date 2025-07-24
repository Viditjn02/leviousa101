const { EventEmitter } = require('events');
const { execSync, spawn } = require('child_process');

class TTSService extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.isSpeaking = false;
        this.currentSpeechProcess = null;
        this.speechQueue = [];
        this.isProcessingQueue = false;
        
        this.config = {
            voice: 'Samantha', // macOS voice
            rate: 180, // Words per minute
            volume: 0.8, // 0.0 to 1.0
            pitch: 1.0, // Pitch multiplier
            enabled: true,
            queueSpeech: true,
            interruptible: true,
            useSystemVoice: true,
            fallbackToBeep: false
        };
        
        // Available macOS voices
        this.availableVoices = [
            'Alex', 'Alice', 'Allison', 'Ava', 'Samantha', 'Susan', 'Victoria',
            'Bruce', 'Fred', 'Junior', 'Ralph', 'Tom', 'Albert', 'Bad News',
            'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Deranged',
            'Good News', 'Hysterical', 'Pipe Organ', 'Trinoids', 'Whisper', 'Zarvox'
        ];
        
        // Speech patterns for different response types
        this.speechPatterns = {
            confirmation: { rate: 160, pitch: 1.1, volume: 0.7 },
            error: { rate: 140, pitch: 0.9, volume: 0.8 },
            information: { rate: 170, pitch: 1.0, volume: 0.7 },
            greeting: { rate: 150, pitch: 1.2, volume: 0.8 },
            instruction: { rate: 160, pitch: 1.0, volume: 0.8 }
        };
        
        console.log('[TTS] Service initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('[TTS] Already initialized');
            return { success: true };
        }

        try {
            console.log('[TTS] Initializing text-to-speech service...');
            
            // Check if system TTS is available
            await this.checkTTSAvailability();
            
            // Initialize voice settings
            await this.initializeVoiceSettings();
            
            this.isInitialized = true;
            console.log('[TTS] ✅ Text-to-speech service initialized');
            
            return { success: true };
            
        } catch (error) {
            console.error('[TTS] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async checkTTSAvailability() {
        try {
            // Test macOS say command
            const testScript = `
                do shell script "which say"
            `;
            
            const result = execSync(`osascript -e '${testScript}'`, { encoding: 'utf8' });
            
            if (!result.includes('/usr/bin/say')) {
                throw new Error('macOS say command not available');
            }
            
            console.log('[TTS] ✅ macOS TTS system verified');
            
        } catch (error) {
            console.error('[TTS] TTS availability check failed:', error);
            throw new Error('Text-to-speech system not available');
        }
    }

    async initializeVoiceSettings() {
        try {
            // Get list of available voices
            const voiceList = await this.getAvailableVoices();
            
            // Verify selected voice is available
            if (!voiceList.includes(this.config.voice)) {
                console.warn(`[TTS] Voice '${this.config.voice}' not available, using default`);
                this.config.voice = voiceList.includes('Samantha') ? 'Samantha' : voiceList[0];
            }
            
            console.log('[TTS] Voice settings initialized:', this.config.voice);
            
        } catch (error) {
            console.error('[TTS] Voice settings initialization failed:', error);
            // Continue with defaults
        }
    }

    async getAvailableVoices() {
        try {
            // Get the full voice list and parse it properly
            const result = execSync(`say -v \\?`, { encoding: 'utf8' });
            const lines = result.trim().split('\n');
            
            const voices = [];
            
            for (const line of lines) {
                if (line.trim().length === 0) continue;
                
                // Handle different voice formats:
                // Format 1: "VoiceName    locale    # Description"
                // Format 2: "(null) - VoiceName (Language) locale # Description"
                
                if (line.startsWith('(null) - ')) {
                    // Extract voice name from "(null) - VoiceName (Language)" format
                    const match = line.match(/^\(null\) - ([^(]+) \(/);
                    if (match) {
                        const voiceName = match[1].trim();
                        if (voiceName && !voices.includes(voiceName)) {
                            voices.push(voiceName);
                        }
                    }
                } else {
                    // Regular format: get first word before spaces
                    const firstWord = line.split(/\s+/)[0];
                    if (firstWord && firstWord !== '(null)' && !voices.includes(firstWord)) {
                        voices.push(firstWord);
                    }
                }
            }
            
            // Remove duplicates and sort
            const uniqueVoices = [...new Set(voices)].sort();
            
            console.log(`[TTS] Found ${uniqueVoices.length} available voices`);
            return uniqueVoices;
            
        } catch (error) {
            console.error('[TTS] Failed to get available voices:', error);
            return this.availableVoices; // Fallback to hardcoded list
        }
    }

    async speak(text, options = {}) {
        if (!this.config.enabled || !text || text.trim().length === 0) {
            return { success: false, error: 'TTS disabled or no text provided' };
        }

        try {
            console.log('[TTS] 🗣️ Speaking:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
            
            const speechOptions = {
                ...this.config,
                ...options,
                text: text.trim()
            };
            
            if (this.config.queueSpeech) {
                return await this.queueSpeech(speechOptions);
            } else {
                return await this.speakImmediate(speechOptions);
            }
            
        } catch (error) {
            console.error('[TTS] Speech failed:', error);
            return { success: false, error: error.message };
        }
    }

    async queueSpeech(speechOptions) {
        return new Promise((resolve) => {
            this.speechQueue.push({
                options: speechOptions,
                resolve: resolve,
                timestamp: Date.now()
            });
            
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessingQueue || this.speechQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.speechQueue.length > 0) {
            const speechItem = this.speechQueue.shift();
            
            try {
                const result = await this.speakImmediate(speechItem.options);
                speechItem.resolve(result);
                
                // Short pause between queued items
                await this.delay(200);
                
            } catch (error) {
                speechItem.resolve({ success: false, error: error.message });
            }
        }

        this.isProcessingQueue = false;
    }

    async speakImmediate(speechOptions) {
        // Stop current speech if interruptible
        if (this.isSpeaking && this.config.interruptible) {
            await this.stopSpeaking();
        }

        // Wait for current speech to finish if not interruptible
        if (this.isSpeaking && !this.config.interruptible) {
            await this.waitForSpeechCompletion();
        }

        try {
            this.isSpeaking = true;
            
            // NEW: Emit speech-started event for echo prevention
            this.emit('speech-started', {
                text: speechOptions.text,
                timestamp: Date.now()
            });
            
            const result = await this.executeSpeech(speechOptions);
            
            this.isSpeaking = false;
            this.currentSpeechProcess = null;
            
            this.emit('speech-completed', {
                text: speechOptions.text,
                success: result.success
            });
            
            return result;
            
        } catch (error) {
            this.isSpeaking = false;
            this.currentSpeechProcess = null;
            
            this.emit('speech-failed', {
                text: speechOptions.text,
                error: error.message
            });
            
            throw error;
        }
    }

    async executeSpeech(speechOptions) {
        const { text, voice, rate, volume, pitch, responseType } = speechOptions;
        
        // Apply speech pattern if specified
        let finalOptions = { ...speechOptions };
        if (responseType && this.speechPatterns[responseType]) {
            finalOptions = { ...finalOptions, ...this.speechPatterns[responseType] };
        }
        
        try {
            // Prepare text for speech
            const cleanText = this.prepareSpeechText(text);
            
            // Use macOS say command
            const result = await this.macOSSpeech(cleanText, finalOptions);
            
            return {
                success: true,
                text: cleanText,
                voice: finalOptions.voice,
                duration: result.duration
            };
            
        } catch (error) {
            console.error('[TTS] Speech execution failed:', error);
            
            // Fallback to system beep if enabled
            if (this.config.fallbackToBeep) {
                await this.systemBeep();
            }
            
            return { success: false, error: error.message };
        }
    }

    async macOSSpeech(text, options) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // Build say command
            const args = [
                '-v', options.voice || this.config.voice,
                '-r', Math.round(options.rate || this.config.rate).toString()
            ];
            
            // Add volume control if supported
            if (options.volume !== undefined) {
                // Volume is controlled through system volume
                // We'll use a wrapper script for volume control
            }
            
            args.push(text);
            
            // Execute say command
            this.currentSpeechProcess = spawn('say', args);
            
            this.currentSpeechProcess.on('close', (code) => {
                const duration = Date.now() - startTime;
                
                if (code === 0) {
                    resolve({ duration });
                } else {
                    reject(new Error(`Speech process exited with code ${code}`));
                }
            });
            
            this.currentSpeechProcess.on('error', (error) => {
                reject(new Error(`Speech process error: ${error.message}`));
            });
            
            // Timeout protection
            setTimeout(() => {
                if (this.currentSpeechProcess && !this.currentSpeechProcess.killed) {
                    this.currentSpeechProcess.kill();
                    reject(new Error('Speech timeout'));
                }
            }, 30000); // 30 second timeout
        });
    }

    prepareSpeechText(text) {
        // Clean and prepare text for better speech synthesis
        let cleanText = text
            .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Add pauses after sentences
            .replace(/\b(URL|API|UI|AI|TTS|STT|HTTP|JSON|XML|HTML|CSS|JS)\b/gi, (match) => {
                // Spell out common acronyms
                return match.split('').join(' ');
            })
            .replace(/[#@$%^&*()_+={}[\]\\|;:'"<>?/]/g, ' ') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        // Limit length for speech
        if (cleanText.length > 500) {
            cleanText = cleanText.substring(0, 497) + '...';
        }
        
        return cleanText;
    }

    async stopSpeaking() {
        if (!this.isSpeaking) return { success: true };
        
        try {
            console.log('[TTS] 🛑 Stopping speech...');
            
            // Kill current speech process
            if (this.currentSpeechProcess) {
                this.currentSpeechProcess.kill('SIGTERM');
                this.currentSpeechProcess = null;
            }
            
            // Use say command to stop
            execSync('killall say', { stdio: 'ignore' });
            
            this.isSpeaking = false;
            
            this.emit('speech-stopped');
            
            console.log('[TTS] ✅ Speech stopped');
            return { success: true };
            
        } catch (error) {
            console.error('[TTS] Failed to stop speech:', error);
            return { success: false, error: error.message };
        }
    }

    async waitForSpeechCompletion() {
        return new Promise((resolve) => {
            if (!this.isSpeaking) {
                resolve();
                return;
            }
            
            const checkCompletion = () => {
                if (!this.isSpeaking) {
                    resolve();
                } else {
                    setTimeout(checkCompletion, 100);
                }
            };
            
            checkCompletion();
        });
    }

    async systemBeep() {
        try {
            execSync('afplay /System/Library/Sounds/Glass.aiff', { stdio: 'ignore' });
        } catch (error) {
            console.error('[TTS] System beep failed:', error);
        }
    }

    // Voice management
    async setVoice(voiceName) {
        const availableVoices = await this.getAvailableVoices();
        
        if (!availableVoices.includes(voiceName)) {
            throw new Error(`Voice '${voiceName}' not available`);
        }
        
        this.config.voice = voiceName;
        console.log('[TTS] Voice changed to:', voiceName);
        
        this.emit('voice-changed', voiceName);
        return { success: true, voice: voiceName };
    }

    async testVoice(voiceName = null) {
        const testVoice = voiceName || this.config.voice;
        const testText = `Hello, this is a test of the ${testVoice} voice.`;
        
        return await this.speak(testText, { 
            voice: testVoice,
            responseType: 'information'
        });
    }

    // Response type shortcuts
    async speakConfirmation(text) {
        return await this.speak(text, { responseType: 'confirmation' });
    }

    async speakError(text) {
        return await this.speak(text, { responseType: 'error' });
    }

    async speakGreeting(text) {
        return await this.speak(text, { responseType: 'greeting' });
    }

    async speakInstruction(text) {
        return await this.speak(text, { responseType: 'instruction' });
    }

    // Queue management
    clearQueue() {
        this.speechQueue = [];
        console.log('[TTS] Speech queue cleared');
    }

    getQueueStatus() {
        return {
            queueLength: this.speechQueue.length,
            isProcessing: this.isProcessingQueue,
            isSpeaking: this.isSpeaking
        };
    }

    // Utility methods
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Configuration management
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[TTS] Configuration updated:', this.config);
        this.emit('config-updated', this.config);
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isSpeaking: this.isSpeaking,
            isProcessingQueue: this.isProcessingQueue,
            queueLength: this.speechQueue.length,
            config: this.config,
            availableVoices: this.availableVoices.slice(0, 10) // First 10 voices
        };
    }

    // Testing methods
    async test() {
        console.log('[TTS] 🧪 Running TTS test...');
        
        try {
            const testResults = {
                initialization: this.isInitialized,
                voiceAvailability: false,
                speechTest: false,
                availableVoices: 0
            };
            
            // Test voice availability
            const voices = await this.getAvailableVoices();
            testResults.availableVoices = voices.length;
            testResults.voiceAvailability = voices.length > 0;
            
            // Test speech
            const speechResult = await this.speak('This is a test of the text to speech system');
            testResults.speechTest = speechResult.success;
            
            console.log('[TTS] Test results:', testResults);
            return testResults;
            
        } catch (error) {
            console.error('[TTS] Test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Advanced features
    async speakWithSSML(ssmlText) {
        // Simple SSML-like support for enhanced speech
        let processedText = ssmlText
            .replace(/<break time="(\d+)ms"\/>/g, (match, time) => {
                // Convert break tags to pauses
                const pauseDuration = parseInt(time) / 100;
                return ' '.repeat(Math.max(1, Math.floor(pauseDuration)));
            })
            .replace(/<emphasis level="strong">([^<]+)<\/emphasis>/g, '$1') // Emphasis
            .replace(/<\/?\w+[^>]*>/g, ''); // Remove other tags
        
        return await this.speak(processedText);
    }

    async adjustSpeechRate(multiplier) {
        const newRate = Math.max(80, Math.min(400, this.config.rate * multiplier));
        this.config.rate = newRate;
        console.log('[TTS] Speech rate adjusted to:', newRate);
        return { success: true, rate: newRate };
    }
}

module.exports = TTSService; 