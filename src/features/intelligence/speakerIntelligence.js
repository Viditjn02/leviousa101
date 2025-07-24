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
            /\b(as I mentioned|from my perspective)\b/gi,
            /\b(I need|I want|I would like)\b/gi,
            /\b(I can|I will|I should)\b/gi
        ];

        const participantIndicators = [
            /\b(you|your|yours)\b/gi,
            /\b(they|them|their)\b/gi,
            /\b(we should|let's|shall we)\b/gi,
            /\b(what do you think|your thoughts|do you)\b/gi,
            /\b(have you|did you|can you|will you)\b/gi,
            /\b(you could|you should|you might)\b/gi
        ];

        // Question patterns that suggest addressing the user
        const questionIndicators = [
            /\?.*\b(you|your)\b/gi,
            /^(what|how|when|where|why|who).*\byou\b/gi,
            /\bdo you\b/gi,
            /\bhave you\b/gi
        ];

        let userScore = 0;
        let participantScore = 0;

        // Check user indicators
        userIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) userScore += matches.length;
        });

        // Check participant indicators
        participantIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) participantScore += matches.length;
        });

        // Check question indicators (strong indicator of participant speech)
        questionIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) participantScore += matches.length * 2; // Weight questions more heavily
        });

        // If text starts with a greeting or question, likely participant
        if (/^(hello|hi|hey|good morning|good afternoon|what|how|when|where|why)/i.test(text.trim())) {
            participantScore += 1;
        }

        // If text contains answers or confirmations, likely user
        if (/^(yes|no|okay|sure|absolutely|definitely|maybe|perhaps|I think so)/i.test(text.trim())) {
            userScore += 1;
        }

        const total = userScore + participantScore;
        if (total === 0) return 0.3; // Slight bias toward participant if no indicators

        const userRatio = userScore / total;
        console.log(`[SpeakerIntelligence] Content analysis - User: ${userScore}, Participant: ${participantScore}, Ratio: ${userRatio.toFixed(2)}`);
        
        return userRatio;
    }

    /**
     * Analyze context to determine speaker
     */
    analyzeContextForUserSpeech(transcription) {
        const recentTranscriptions = this.transcriptionBuffer.slice(-5);
        
        if (recentTranscriptions.length === 0) return 0.5;

        // Look at conversation patterns
        const recentUserSpeech = recentTranscriptions.filter(t => t.isUser).length;
        const recentParticipantSpeech = recentTranscriptions.filter(t => !t.isUser).length;
        
        // If there's been a lot of user speech recently, this might be participant
        const continuityScore = recentUserSpeech / recentTranscriptions.length;
        
        // Length-based heuristic: Users often give shorter responses
        const lengthScore = Math.min(transcription.text.length / 100, 1);
        const lengthBias = transcription.text.length < 50 ? 0.3 : -0.1; // Short text biased toward user
        
        // Time-based analysis: Check for turn-taking patterns
        const timeBias = this.analyzeTurnTaking();
        
        const contextScore = (continuityScore * 0.4) + (lengthScore * 0.3) + (lengthBias * 0.2) + (timeBias * 0.1);
        
        console.log(`[SpeakerIntelligence] Context analysis - Continuity: ${continuityScore.toFixed(2)}, Length: ${lengthScore.toFixed(2)}, Bias: ${lengthBias.toFixed(2)}, Score: ${contextScore.toFixed(2)}`);
        
        return Math.max(0, Math.min(1, contextScore));
    }

    /**
     * Analyze turn-taking patterns
     */
    analyzeTurnTaking() {
        const recentTranscriptions = this.transcriptionBuffer.slice(-3);
        if (recentTranscriptions.length < 2) return 0.5;
        
        // If the last speaker was a participant, this is likely user
        const lastSpeaker = recentTranscriptions[recentTranscriptions.length - 1];
        if (lastSpeaker && !lastSpeaker.isUser) {
            return 0.7; // Likely user response
        }
        
        // If last speaker was user, this is likely participant
        if (lastSpeaker && lastSpeaker.isUser) {
            return 0.3; // Likely participant response
        }
        
        return 0.5;
    }

    /**
     * Get participant ID based on speech characteristics
     */
    getParticipantId(transcription) {
        // Simple heuristic-based participant identification
        // In production, this would use voice biometrics or other advanced methods
        
        const text = transcription.text.toLowerCase();
        const textLength = text.length;
        
        // Use text characteristics to create consistent participant IDs
        let participantId = 1;
        
        // Method 1: Hash-based on speaking style indicators
        if (text.includes('question') || text.includes('?') || text.startsWith('what') || text.startsWith('how')) {
            participantId = 1; // "Questioner" participant
        } else if (text.includes('think') || text.includes('believe') || text.includes('opinion')) {
            participantId = 2; // "Thinker" participant  
        } else if (textLength > 100) {
            participantId = 3; // "Detailed" participant (long responses)
        } else {
            participantId = Math.floor((textLength + text.charCodeAt(0)) % 3) + 1;
        }
        
        // Store participant in our tracking
        const speakerId = `participant-${participantId}`;
        if (!this.meetingContext.participants.includes(speakerId)) {
            this.meetingContext.participants.push(speakerId);
            console.log(`[SpeakerIntelligence] New participant identified: ${speakerId}`);
        }
        
        return participantId;
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
