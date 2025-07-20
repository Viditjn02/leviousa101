// STT Service Enhancer - Adds Speaker Intelligence
const SpeakerIntelligence = require('./speakerIntelligence');
const leviousaConfig = require('../common/config/leviousa-config');

let speakerIntelligence = null;
let originalCallbacks = {};

function initializeSpeakerIntelligence(sttServiceInstance) {
    // Initialize speaker intelligence if enabled
    if (leviousaConfig.leviousaConfig.isFeatureEnabled('speakerIntelligence')) {
        console.log('[STTEnhancer] Initializing Speaker Intelligence');
        speakerIntelligence = new SpeakerIntelligence();
        speakerIntelligence.initialize();

        // Store original callbacks
        const originalSetCallbacks = sttServiceInstance.setCallbacks.bind(sttServiceInstance);
        
        // Override setCallbacks to intercept transcription callbacks
        sttServiceInstance.setCallbacks = function(callbacks) {
            originalCallbacks = { ...callbacks };
            
            // Wrap the onTranscriptionComplete callback
            const enhancedCallbacks = {
                ...callbacks,
                onTranscriptionComplete: async (speaker, text) => {
                    // Process through speaker intelligence first
                    if (speakerIntelligence) {
                        const enrichedTranscription = await speakerIntelligence.processTranscription({
                            speaker,
                            text,
                            timestamp: Date.now()
                        });

                        // Log for debugging
                        console.log('[STTEnhancer] Processed transcription:', {
                            original: { speaker, text },
                            enriched: {
                                isUser: enrichedTranscription.isUser,
                                confidence: enrichedTranscription.confidence,
                                speakerId: enrichedTranscription.speaker.speakerId
                            }
                        });
                    }

                    // Call original callback
                    if (originalCallbacks.onTranscriptionComplete) {
                        originalCallbacks.onTranscriptionComplete(speaker, text);
                    }
                }
            };

            // Set the enhanced callbacks
            originalSetCallbacks(enhancedCallbacks);
        };

        // Listen for insight generation requests
        speakerIntelligence.on('insight-needed', async (data) => {
            console.log('[STTEnhancer] Insight needed for participant speech');
            
            // Send to Ask service for AI processing
            const askService = require('../ask/askService');
            try {
                const insight = await askService.processInsightRequest({
                    type: 'meeting_insight',
                    transcription: data.transcription,
                    context: data.context
                });

                if (insight) {
                    // Send insight to renderer
                    const { windowPool } = require('../../window/windowManager');
                    const listenWindow = windowPool?.get('listen');
                    
                    if (listenWindow && !listenWindow.isDestroyed()) {
                        listenWindow.webContents.send('speaker-insight', {
                            text: insight.text,
                            speaker: data.transcription.speaker.speakerId,
                            timestamp: Date.now()
                        });
                    }

                    // Log the generated insight
                    speakerIntelligence.interactionLog.push({
                        type: 'insight_generated',
                        data: {
                            originalTranscription: data.transcription,
                            insight: insight.text,
                            confidence: insight.confidence || 0.8
                        },
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error('[STTEnhancer] Error generating insight:', error);
            }
        });

        // Add method to get speaker intelligence status
        sttServiceInstance.getSpeakerIntelligenceStatus = function() {
            if (!speakerIntelligence) {
                return { enabled: false };
            }

            return {
                enabled: true,
                initialized: true,
                calibrated: speakerIntelligence.isCalibrated,
                summary: speakerIntelligence.getMeetingSummary()
            };
        };

        // Add method to reset speaker intelligence
        sttServiceInstance.resetSpeakerIntelligence = function() {
            if (speakerIntelligence) {
                speakerIntelligence.reset();
            }
        };

        console.log('[STTEnhancer] Speaker Intelligence enhancement complete');
    } else {
        console.log('[STTEnhancer] Speaker Intelligence is disabled in configuration');
    }

    return sttServiceInstance;
}

module.exports = {
    initializeSpeakerIntelligence,
    getSpeakerIntelligence: () => speakerIntelligence
};
