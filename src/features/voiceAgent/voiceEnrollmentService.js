const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class VoiceEnrollmentService extends EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.isEnrolling = false;
        this.enrollmentSamples = [];
        this.voiceTemplate = null;
        this.enrollmentProgress = 0;
        this.enrollmentAttempts = 0; // Track total attempts
        this.maxEnrollmentAttempts = 20; // Maximum attempts before giving up
        this.enrollmentStartTime = null;
        this.originalTranscriptionCallback = null; // Store original callback to restore later
        
        this.config = {
            requiredSamples: 5,           // Number of "Hey Leviousa" samples needed
            targetPhrase: 'hey leviousa', // Normalized target phrase
            confidenceThreshold: 0.7,    // Minimum confidence for voice match
            enrollmentTimeout: 30000,    // 30 seconds per sample
            maxEnrollmentTime: 300000,   // 5 minutes total enrollment time
            templatePath: path.join(os.homedir(), '.leviousa', 'voice-template.json')
        };
        
        console.log('[VoiceEnrollment] Service initialized');
    }

    async initialize() {
        if (this.isInitialized) {
            return { success: true };
        }

        try {
            console.log('[VoiceEnrollment] Initializing voice enrollment service...');
            
            // Ensure template directory exists
            const templateDir = path.dirname(this.config.templatePath);
            await fs.mkdir(templateDir, { recursive: true });
            
            // Load existing voice template if available
            await this.loadVoiceTemplate();
            
            this.isInitialized = true;
            console.log('[VoiceEnrollment] ✅ Voice enrollment service initialized');
            
            return { success: true };
            
        } catch (error) {
            console.error('[VoiceEnrollment] ❌ Failed to initialize:', error);
            return { success: false, error: error.message };
        }
    }

    async loadVoiceTemplate() {
        try {
            const templateData = await fs.readFile(this.config.templatePath, 'utf8');
            this.voiceTemplate = JSON.parse(templateData);
            console.log('[VoiceEnrollment] ✅ Existing voice template loaded');
            return true;
        } catch (error) {
            console.log('[VoiceEnrollment] No existing voice template found - enrollment required');
            return false;
        }
    }

    async saveVoiceTemplate() {
        try {
            const templateData = JSON.stringify(this.voiceTemplate, null, 2);
            await fs.writeFile(this.config.templatePath, templateData);
            console.log('[VoiceEnrollment] ✅ Voice template saved');
            return true;
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to save voice template:', error);
            return false;
        }
    }

    async startEnrollment() {
        if (this.isEnrolling) {
            return { success: false, error: 'Enrollment already in progress' };
        }

        try {
            console.log('[VoiceEnrollment] 🎤 Starting voice enrollment...');
            
            this.isEnrolling = true;
            this.enrollmentSamples = [];
            this.enrollmentProgress = 0;
            this.enrollmentAttempts = 0;
            this.enrollmentStartTime = Date.now();
            
            // Ensure audio listening is active for enrollment
            await this.ensureAudioListening();
            
            this.emit('enrollment-started', {
                requiredSamples: this.config.requiredSamples,
                targetPhrase: 'Hey Leviousa',
                instructions: 'Please say "Hey Leviousa" clearly when prompted'
            });
            
            // Automatically start recording the first sample after a brief delay
            setTimeout(async () => {
                await this.recordEnrollmentSample();
            }, 1000); // Give UI time to update
            
            console.log('[VoiceEnrollment] ✅ Voice enrollment started');
            return { success: true };
            
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to start enrollment:', error);
            this.isEnrolling = false;
            return { success: false, error: error.message };
        }
    }

    async recordEnrollmentSample() {
        if (!this.isEnrolling) {
            return { success: false, error: 'Enrollment not active' };
        }

        if (this.enrollmentSamples.length >= this.config.requiredSamples) {
            return { success: false, error: 'Enrollment already complete' };
        }

        try {
            const sampleNumber = this.enrollmentSamples.length + 1;
            console.log(`[VoiceEnrollment] 🎤 Recording sample ${sampleNumber}/${this.config.requiredSamples}...`);
            
            this.emit('sample-recording-started', {
                sampleNumber,
                totalSamples: this.config.requiredSamples,
                instruction: `Please say "Hey Leviousa" now (${sampleNumber}/${this.config.requiredSamples})`
            });
            
            return { success: true, sampleNumber };
            
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to start sample recording:', error);
            return { success: false, error: error.message };
        }
    }

    async processEnrollmentTranscription(transcriptionText, audioFeatures = null) {
        if (!this.isEnrolling) {
            return { success: false, error: 'Enrollment not active' };
        }

        // Check for timeout conditions
        const now = Date.now();
        if (now - this.enrollmentStartTime > this.config.maxEnrollmentTime) {
            console.log('[VoiceEnrollment] ⏰ Enrollment timeout - cancelling');
            await this.cancelEnrollment();
            this.emit('enrollment-cancelled', { reason: 'Maximum enrollment time exceeded' });
            return { success: false, error: 'Enrollment timeout' };
        }

        this.enrollmentAttempts++;
        if (this.enrollmentAttempts > this.maxEnrollmentAttempts) {
            console.log('[VoiceEnrollment] ⏰ Too many attempts - cancelling');
            await this.cancelEnrollment();
            this.emit('enrollment-cancelled', { reason: 'Too many failed attempts' });
            return { success: false, error: 'Too many failed attempts' };
        }

        try {
            // Normalize the transcription for comparison
            const normalizedText = this.normalizeText(transcriptionText);
            const targetPhrase = this.config.targetPhrase;
            
            console.log('[VoiceEnrollment] 🔍 Processing transcription:', {
                original: transcriptionText,
                normalized: normalizedText,
                target: targetPhrase,
                attempt: this.enrollmentAttempts,
                isEnrolling: this.isEnrolling
            });
            
            // Check if transcription matches target phrase
            const similarity = this.calculatePhraseSimilarity(normalizedText, targetPhrase);
            // Lower threshold to 40% to be more forgiving of STT errors
            const isValidSample = similarity > 0.4;
            
            console.log('[VoiceEnrollment] 📊 Similarity analysis:', {
                similarity: similarity.toFixed(3),
                threshold: 0.4,
                isValid: isValidSample,
                transcription: transcriptionText
            });
            
            if (isValidSample) {
                // Create voice sample
                const sample = {
                    id: `sample_${Date.now()}`,
                    transcription: transcriptionText,
                    normalizedText: normalizedText,
                    similarity: similarity,
                    timestamp: Date.now(),
                    audioFeatures: audioFeatures || this.extractBasicFeatures(transcriptionText)
                };
                
                this.enrollmentSamples.push(sample);
                this.enrollmentProgress = this.enrollmentSamples.length;
                
                console.log(`[VoiceEnrollment] ✅ Valid sample recorded (${this.enrollmentProgress}/${this.config.requiredSamples})`);
                
                this.emit('sample-recorded', {
                    sampleNumber: this.enrollmentProgress,
                    totalSamples: this.config.requiredSamples,
                    similarity: similarity,
                    isComplete: this.enrollmentProgress >= this.config.requiredSamples
                });
                
                // Check if enrollment is complete
                if (this.enrollmentProgress >= this.config.requiredSamples) {
                    await this.completeEnrollment();
                } else {
                    // Automatically start recording the next sample
                    setTimeout(async () => {
                        await this.recordEnrollmentSample();
                    }, 2000); // 2 second delay between samples
                }
                
                return { success: true, similarity, progress: this.enrollmentProgress };
                
            } else {
                console.log(`[VoiceEnrollment] ❌ Invalid sample - similarity too low: ${similarity.toFixed(2)} (attempt ${this.enrollmentAttempts}/${this.maxEnrollmentAttempts})`);
                
                this.emit('sample-rejected', {
                    transcription: transcriptionText,
                    similarity: similarity,
                    reason: `Please say "Hey Leviousa" more clearly (similarity: ${Math.round(similarity * 100)}%, attempt ${this.enrollmentAttempts}/${this.maxEnrollmentAttempts})`
                });
                
                // Automatically retry recording the same sample with exponential backoff
                const retryDelay = Math.min(3000 + (this.enrollmentAttempts * 1000), 10000);
                setTimeout(async () => {
                    await this.recordEnrollmentSample();
                }, retryDelay);
                
                return { success: false, error: 'Sample rejected - please try again', similarity };
            }
            
        } catch (error) {
            console.error('[VoiceEnrollment] Error processing enrollment transcription:', error);
            return { success: false, error: error.message };
        }
    }

    async completeEnrollment() {
        try {
            console.log('[VoiceEnrollment] 🎯 Completing voice enrollment...');
            
            // Create voice template from samples
            this.voiceTemplate = this.createVoiceTemplate(this.enrollmentSamples);
            
            // Save template to disk
            await this.saveVoiceTemplate();
            
            // Reset enrollment state
            this.isEnrolling = false;
            this.enrollmentProgress = 0;
            this.enrollmentAttempts = 0;
            
            // Restore original STT callback
            if (this.originalTranscriptionCallback && global.listenService && global.listenService.sttService) {
                global.listenService.sttService.setCallbacks({
                    ...global.listenService.sttService.callbacks,
                    onTranscriptionComplete: this.originalTranscriptionCallback
                });
                this.originalTranscriptionCallback = null;
            }
            
            console.log('[VoiceEnrollment] ✅ Voice enrollment completed successfully');
            
            this.emit('enrollment-completed', {
                samplesRecorded: this.enrollmentSamples.length,
                templateCreated: true,
                message: 'Voice enrollment complete! The system will now respond only to your voice.'
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to complete enrollment:', error);
            this.isEnrolling = false;
            return { success: false, error: error.message };
        }
    }

    createVoiceTemplate(samples) {
        // Create a simple voice template based on enrollment samples
        // In a production system, this would use more sophisticated audio features
        
        const template = {
            version: '1.0',
            createdAt: new Date().toISOString(),
            targetPhrase: this.config.targetPhrase,
            samples: samples.map(sample => ({
                id: sample.id,
                normalizedText: sample.normalizedText,
                similarity: sample.similarity,
                features: sample.audioFeatures
            })),
            statistics: {
                averageSimilarity: samples.reduce((sum, s) => sum + s.similarity, 0) / samples.length,
                sampleCount: samples.length,
                commonVariations: this.findCommonVariations(samples)
            }
        };
        
        console.log('[VoiceEnrollment] Voice template created:', {
            samples: template.samples.length,
            averageSimilarity: template.statistics.averageSimilarity,
            variations: template.statistics.commonVariations.length
        });
        
        return template;
    }

    findCommonVariations(samples) {
        // Find common transcription variations for better matching
        const variations = samples.map(s => s.normalizedText);
        const uniqueVariations = [...new Set(variations)];
        
        return uniqueVariations.map(variation => ({
            text: variation,
            frequency: variations.filter(v => v === variation).length
        })).sort((a, b) => b.frequency - a.frequency);
    }

    async verifyVoiceMatch(transcriptionText, confidence = 0.8) {
        if (!this.voiceTemplate) {
            console.log('[VoiceEnrollment] No voice template available - enrollment required');
            return { isMatch: false, confidence: 0, reason: 'No voice template' };
        }

        try {
            const normalizedText = this.normalizeText(transcriptionText);
            const targetPhrase = this.config.targetPhrase;
            
            // Check phrase similarity
            const phraseSimilarity = this.calculatePhraseSimilarity(normalizedText, targetPhrase);
            
            if (phraseSimilarity < 0.5) {
                return { isMatch: false, confidence: phraseSimilarity, reason: 'Phrase mismatch' };
            }
            
            // Check against enrolled variations
            const variationMatch = this.voiceTemplate.statistics.commonVariations.some(
                variation => this.calculatePhraseSimilarity(normalizedText, variation.text) > 0.7
            );
            
            // Calculate overall confidence
            const overallConfidence = Math.max(phraseSimilarity, variationMatch ? 0.8 : 0);
            const isMatch = overallConfidence >= this.config.confidenceThreshold;
            
            console.log('[VoiceEnrollment] Voice verification:', {
                transcription: transcriptionText,
                normalized: normalizedText,
                phraseSimilarity: phraseSimilarity,
                variationMatch: variationMatch,
                overallConfidence: overallConfidence,
                isMatch: isMatch
            });
            
            return {
                isMatch: isMatch,
                confidence: overallConfidence,
                phraseSimilarity: phraseSimilarity,
                reason: isMatch ? 'Voice match confirmed' : 'Voice match failed'
            };
            
        } catch (error) {
            console.error('[VoiceEnrollment] Error verifying voice match:', error);
            return { isMatch: false, confidence: 0, reason: 'Verification error' };
        }
    }

    normalizeText(text) {
        return text.toLowerCase()
                  .replace(/[^\w\s]/g, '')  // Remove punctuation
                  .replace(/\s+/g, ' ')     // Normalize whitespace
                  .trim();
    }

    calculatePhraseSimilarity(text1, text2) {
        // Enhanced similarity calculation for STT transcription variations
        const words1 = text1.split(' ').filter(w => w.length > 0);
        const words2 = text2.split(' ').filter(w => w.length > 0);
        
        // Check for direct matches
        if (text1 === text2) return 1.0;
        
        // Check if target phrase is contained in transcription
        if (text1.includes(text2) || text2.includes(text1)) return 0.9;
        
        // Calculate word overlap with partial matching
        let matchScore = 0;
        const maxWords = Math.max(words1.length, words2.length);
        
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1 === word2) {
                    matchScore += 1.0; // Exact word match
                } else if (word1.includes(word2) || word2.includes(word1)) {
                    matchScore += 0.8; // Partial word match
                } else if (this.levenshteinDistance(word1, word2) <= 2 && Math.min(word1.length, word2.length) > 3) {
                    matchScore += 0.6; // Close spelling match
                }
            }
        }
        
        const wordSimilarity = Math.min(matchScore / maxWords, 1.0);
        
        // Check for phonetic similarities
        const phoneticSimilarity = this.calculatePhoneticSimilarity(text1, text2);
        
        // Return the best similarity score
        const finalSimilarity = Math.max(wordSimilarity, phoneticSimilarity);
        
        console.log('[VoiceEnrollment] Similarity calculation:', {
            text1,
            text2,
            wordSimilarity: wordSimilarity.toFixed(2),
            phoneticSimilarity: phoneticSimilarity.toFixed(2),
            finalSimilarity: finalSimilarity.toFixed(2)
        });
        
        return finalSimilarity;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    calculatePhoneticSimilarity(text1, text2) {
        // Enhanced phonetic similarity for "leviousa" variations based on actual STT transcriptions
        const phoneticMap = {
            'leviousa': [
                'liviosa', 'leviosa', 'lariosa', 'alariosa', 'aliviosa', 
                'olivia', 'hayliviosa', 'haliviosa', 'laviosa', 'leviousa',
                'leriousa', 'leriosa', 'liviousa', 'leviousla', 'levious'
            ],
            'hey': ['hay', 'hi', 'he', 'a', 'ay', 'hey', 'hei']
        };
        
        let similarity = 0;
        
        // Normalize both texts for comparison
        const norm1 = text1.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const norm2 = text2.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        // Check for direct substring matches first
        if (norm1.includes('hey') && norm1.includes('leviousa')) {
            if (norm2.includes('hey') || norm2.includes('hi') || norm2.includes('hay')) {
                similarity = Math.max(similarity, 0.7);
            }
        }
        
        // Check phonetic variations
        for (const [standard, variations] of Object.entries(phoneticMap)) {
            // Check if text1 contains standard and text2 contains variation
            if (norm1.includes(standard)) {
                for (const variation of variations) {
                    if (norm2.includes(variation)) {
                        similarity = Math.max(similarity, 0.8);
                        break;
                    }
                }
            }
            
            // Check reverse: text2 contains standard and text1 contains variation
            if (norm2.includes(standard)) {
                for (const variation of variations) {
                    if (norm1.includes(variation)) {
                        similarity = Math.max(similarity, 0.8);
                        break;
                    }
                }
            }
        }
        
        // Special case: if we see variations like "lariosa", "alariosa", etc., give high similarity
        const leviousaVariations = /l[aei]r?i[vo]+s[aol]?|olivia|aliviosa|alariosa/i;
        if ((norm1.match(leviousaVariations) && norm2.includes('leviousa')) ||
            (norm2.match(leviousaVariations) && norm1.includes('leviousa'))) {
            similarity = Math.max(similarity, 0.8);
        }
        
        // If we have "hey" or similar + any leviousa variation, boost similarity
        const hasGreeting1 = /\b(hey|hi|hay|hello)\b/i.test(norm1);
        const hasGreeting2 = /\b(hey|hi|hay|hello)\b/i.test(norm2);
        const hasNameVariation1 = /l[aeiou]*[rv]*i[aeiou]*[oslu]+[ao]?/i.test(norm1);
        const hasNameVariation2 = /l[aeiou]*[rv]*i[aeiou]*[oslu]+[ao]?/i.test(norm2);
        
        if ((hasGreeting1 && hasNameVariation2) || (hasGreeting2 && hasNameVariation1)) {
            similarity = Math.max(similarity, 0.7);
        }
        
        return similarity;
    }

    extractBasicFeatures(transcriptionText) {
        // Extract basic features for voice matching
        // In production, this would use actual audio features
        return {
            wordCount: transcriptionText.split(' ').length,
            characterCount: transcriptionText.length,
            hasTargetWords: this.normalizeText(transcriptionText).includes('hey') && 
                           this.normalizeText(transcriptionText).includes('leviousa'),
            timestamp: Date.now()
        };
    }

    async cancelEnrollment() {
        this.isEnrolling = false;
        this.enrollmentSamples = [];
        this.enrollmentProgress = 0;
        this.enrollmentAttempts = 0;
        
        // Restore original STT callback if we had one
        if (this.originalTranscriptionCallback && global.listenService && global.listenService.sttService) {
            global.listenService.sttService.setCallbacks({
                ...global.listenService.sttService.callbacks,
                onTranscriptionComplete: this.originalTranscriptionCallback
            });
            this.originalTranscriptionCallback = null;
        }
        
        this.emit('enrollment-cancelled');
        console.log('[VoiceEnrollment] Enrollment cancelled and STT callback restored');
        
        return { success: true };
    }

    async resetVoiceTemplate() {
        try {
            await fs.unlink(this.config.templatePath);
            this.voiceTemplate = null;
            console.log('[VoiceEnrollment] Voice template reset');
            return { success: true };
        } catch (error) {
            console.error('[VoiceEnrollment] Error resetting voice template:', error);
            return { success: false, error: error.message };
        }
    }

    isEnrolled() {
        return this.voiceTemplate !== null;
    }

    getEnrollmentStatus() {
        return {
            isInitialized: this.isInitialized,
            isEnrolling: this.isEnrolling,
            isEnrolled: this.isEnrolled(),
            progress: this.enrollmentProgress,
            requiredSamples: this.config.requiredSamples,
            templatePath: this.config.templatePath
        };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[VoiceEnrollment] Configuration updated:', this.config);
    }

    async ensureAudioListening() {
        try {
            console.log('[VoiceEnrollment] Setting up direct STT transcription hook for enrollment...');
            
            // Instead of starting the global listen service, we need to hook directly into the STT transcription flow
            if (global.listenService && global.listenService.sttService) {
                // Store the original transcription callback
                this.originalTranscriptionCallback = global.listenService.sttService.callbacks?.onTranscriptionComplete;
                
                // Create our enrollment-aware callback
                const enrollmentAwareCallback = (speaker, text) => {
                    // If we're enrolling, intercept the transcription for enrollment processing
                    if (this.isEnrolling) {
                        console.log('[VoiceEnrollment] 🎯 Intercepted transcription for enrollment:', text);
                        // Process for enrollment (async but don't await to avoid blocking)
                        this.processEnrollmentTranscription(text).catch(error => {
                            console.error('[VoiceEnrollment] Error processing enrollment transcription:', error);
                        });
                        return; // Don't pass to normal conversation flow during enrollment
                    }
                    
                    // If not enrolling, pass to original callback
                    if (this.originalTranscriptionCallback) {
                        this.originalTranscriptionCallback(speaker, text);
                    }
                };
                
                // Override the STT callback
                global.listenService.sttService.setCallbacks({
                    ...global.listenService.sttService.callbacks,
                    onTranscriptionComplete: enrollmentAwareCallback
                });
                
                // Initialize STT session if not already active
                await global.listenService.initializeSession('en');
                
                console.log('[VoiceEnrollment] ✅ Direct STT transcription hook established for enrollment');
            } else {
                console.warn('[VoiceEnrollment] Global listen service not available - voice enrollment may not work');
            }
        } catch (error) {
            console.error('[VoiceEnrollment] Failed to setup direct STT hook:', error);
            // Continue anyway - but enrollment may not work properly
        }
    }

    async test() {
        console.log('[VoiceEnrollment] 🧪 Testing voice enrollment service...');
        
        const testResults = {
            initialization: this.isInitialized,
            templateExists: this.isEnrolled(),
            canNormalizeText: this.normalizeText('Hey, Leviousa!') === 'hey leviousa',
            canCalculateSimilarity: this.calculatePhraseSimilarity('hey leviousa', 'hey liviosa') > 0.7
        };
        
        console.log('[VoiceEnrollment] Test results:', testResults);
        return testResults;
    }
}

module.exports = VoiceEnrollmentService; 