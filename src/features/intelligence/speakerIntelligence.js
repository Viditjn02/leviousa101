const { EventEmitter } = require('events');

class SpeakerIntelligence extends EventEmitter {
    constructor() {
        super();
        this.currentSpeakers = new Map();
        this.userProfile = null;
        this.transcriptionBuffer = [];
        this.speakerSessions = new Map();
        this.meetingContext = {
            participants: [],
            startTime: null,
            userSpeaking: false,
            otherSpeaking: false
        };
        
        // Configuration
        this.config = {
            bufferSize: 50,
            userCalibrationThreshold: 5,
            confidenceThreshold: 0.7,
            silenceTimeout: 2000,
            contextWindowMs: 30000
        };

        this.isCalibrated = false;
        this.userCalibrationSamples = [];
        this.interactionLog = [];
    }

    /**
     * Initialize speaker intelligence system
     */
    async initialize() {
        console.log('🎯 [SpeakerIntelligence] Initializing Speaker Intelligence System');
        this.meetingContext.startTime = Date.now();
        this.emit('initialized');
    }

    /**
     * Process incoming transcription with speaker detection
     */
    async processTranscription(transcription) {
        try {
            const timestamp = Date.now();
            const speakerData = await this.detectSpeaker(transcription);
            
            // Add to transcription buffer
            const enrichedTranscription = {
                ...transcription,
                timestamp,
                speaker: speakerData,
                isUser: speakerData.isUser,
                confidence: speakerData.confidence
            };

            this.transcriptionBuffer.push(enrichedTranscription);
            
            // Maintain buffer size
            if (this.transcriptionBuffer.length > this.config.bufferSize) {
                this.transcriptionBuffer.shift();
            }

            // Log everything for backend recording
            this.interactionLog.push({
                type: 'transcription',
                data: enrichedTranscription,
                timestamp
            });

            // Update meeting context
            this.updateMeetingContext(enrichedTranscription);

            // Generate insights only for non-user speech
            if (!enrichedTranscription.isUser && enrichedTranscription.confidence > this.config.confidenceThreshold) {
                // Emit insight request for AI processing
                this.emit('insight-needed', {
                    transcription: enrichedTranscription,
                    context: this.getContextWindow()
                });
            }

            // Emit events
            this.emit('transcription-processed', enrichedTranscription);
            
            return enrichedTranscription;
        } catch (error) {
            console.error('[SpeakerIntelligence] Error processing transcription:', error);
            this.emit('error', error);
        }
    }

    /**
     * Detect speaker from transcription
     */
    async detectSpeaker(transcription) {
        const speakerData = {
            speakerId: 'unknown',
            isUser: false,
            confidence: 0.5,
            method: 'heuristic'
        };

        try {
            // Content-based detection
            const contentScore = this.analyzeContentForUserSpeech(transcription.text);
            
            // Context-based detection
            const contextScore = this.analyzeContextForUserSpeech(transcription);
            
            // Combine scores
            const combinedScore = (contentScore + contextScore) / 2;
            
            speakerData.isUser = combinedScore > 0.6;
            speakerData.confidence = Math.abs(combinedScore - 0.5) * 2;
            speakerData.speakerId = speakerData.isUser ? 'user' : 'participant-' + this.getParticipantId(transcription);

            // Calibration
            if (!this.isCalibrated && speakerData.isUser && speakerData.confidence > 0.8) {
                this.userCalibrationSamples.push(transcription);
                if (this.userCalibrationSamples.length >= this.config.userCalibrationThreshold) {
                    this.calibrateUserProfile();
                }
            }

        } catch (error) {
            console.error('[SpeakerIntelligence] Speaker detection error:', error);
        }

        return speakerData;
    }

    /**
     * Analyze content to determine if it's user speech
     */
    analyzeContentForUserSpeech(text) {
        const userIndicators = [
            /\b(I|my|me|myself|mine)\b/gi,
            /\b(I'm|I'll|I've|I'd)\b/gi,
            /\b(let me|allow me|I think|I believe)\b/gi,
            /\b(as I mentioned|from my perspective)\b/gi
        ];

        const otherIndicators = [
            /\b(you|your|yours)\b/gi,
            /\b(they|them|their)\b/gi,
            /\b(the team|everyone|we should)\b/gi,
            /\b(what do you think|your thoughts)\b/gi
        ];

        let userScore = 0;
        let otherScore = 0;

        userIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) userScore += matches.length;
        });

        otherIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) otherScore += matches.length;
        });

        const total = userScore + otherScore;
        if (total === 0) return 0.5;

        return userScore / total;
    }

    /**
     * Analyze context to determine speaker
     */
    analyzeContextForUserSpeech(transcription) {
        const recentTranscriptions = this.transcriptionBuffer.slice(-5);
        
        if (recentTranscriptions.length === 0) return 0.5;

        const recentUserSpeech = recentTranscriptions.filter(t => t.isUser).length;
        const continuityScore = recentUserSpeech / recentTranscriptions.length;

        const lengthScore = Math.min(transcription.text.length / 100, 1) * 0.3;

        return (continuityScore * 0.7) + lengthScore;
    }

    /**
     * Get participant ID
     */
    getParticipantId(transcription) {
        // In production, this would use voice biometrics
        return Math.floor(Math.random() * 3) + 1;
    }

    /**
     * Calibrate user profile
     */
    calibrateUserProfile() {
        console.log('🎙️ [SpeakerIntelligence] Calibrating user voice profile');
        
        this.userProfile = {
            avgLength: this.userCalibrationSamples.reduce((sum, t) => sum + t.text.length, 0) / this.userCalibrationSamples.length,
            commonPhrases: this.extractCommonPhrases(this.userCalibrationSamples),
            speechPatterns: this.analyzeSpeechPatterns(this.userCalibrationSamples),
            calibratedAt: Date.now()
        };

        this.isCalibrated = true;
        console.log('✅ [SpeakerIntelligence] User voice profile calibrated');
        this.emit('user-calibrated', this.userProfile);
    }

    /**
     * Extract common phrases
     */
    extractCommonPhrases(samples) {
        const phrases = [];
        samples.forEach(sample => {
            const words = sample.text.toLowerCase().split(/\s+/);
            for (let i = 0; i < words.length - 1; i++) {
                phrases.push(words.slice(i, i + 2).join(' '));
            }
        });

        const frequency = {};
        phrases.forEach(phrase => {
            frequency[phrase] = (frequency[phrase] || 0) + 1;
        });

        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([phrase]) => phrase);
    }

    /**
     * Analyze speech patterns
     */
    analyzeSpeechPatterns(samples) {
        return {
            avgSentenceLength: samples.reduce((sum, s) => sum + s.text.split('.').length, 0) / samples.length,
            questionRate: samples.reduce((sum, s) => sum + (s.text.match(/\?/g) || []).length, 0) / samples.length,
            exclamationRate: samples.reduce((sum, s) => sum + (s.text.match(/!/g) || []).length, 0) / samples.length
        };
    }

    /**
     * Update meeting context
     */
    updateMeetingContext(transcription) {
        if (transcription.isUser) {
            this.meetingContext.userSpeaking = true;
            this.meetingContext.otherSpeaking = false;
        } else {
            this.meetingContext.userSpeaking = false;
            this.meetingContext.otherSpeaking = true;
        }

        if (!transcription.isUser && !this.meetingContext.participants.includes(transcription.speaker.speakerId)) {
            this.meetingContext.participants.push(transcription.speaker.speakerId);
        }
    }

    /**
     * Get context window
     */
    getContextWindow() {
        const windowStart = Date.now() - this.config.contextWindowMs;
        return this.transcriptionBuffer
            .filter(t => t.timestamp > windowStart)
            .map(t => ({
                speaker: t.isUser ? 'User' : t.speaker.speakerId,
                text: t.text,
                timestamp: t.timestamp
            }));
    }

    /**
     * Get interaction log
     */
    getInteractionLog() {
        return this.interactionLog;
    }

    /**
     * Get meeting summary
     */
    getMeetingSummary() {
        return {
            context: this.meetingContext,
            participants: this.meetingContext.participants.length,
            duration: Date.now() - this.meetingContext.startTime,
            totalTranscriptions: this.transcriptionBuffer.length,
            userCalibrated: this.isCalibrated,
            insightsGenerated: this.interactionLog.filter(i => i.type === 'insight_generated').length
        };
    }

    /**
     * Reset for new meeting
     */
    reset() {
        this.transcriptionBuffer = [];
        this.meetingContext = {
            participants: [],
            startTime: Date.now(),
            userSpeaking: false,
            otherSpeaking: false
        };
        this.interactionLog = [];
        
        console.log('🔄 [SpeakerIntelligence] Reset for new meeting');
        this.emit('reset');
    }
}

module.exports = SpeakerIntelligence;
