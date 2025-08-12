// Leviousa101 - Enhanced STT Service with Speaker Intelligence
const { initializeSpeakerIntelligence } = require('./sttServiceEnhancer');
const SttService = require('../listen/stt/sttService');

// Enhanced STT Service Class
class EnhancedSttService extends SttService {
    constructor() {
        super();
        console.log('[EnhancedSttService] Initializing Enhanced STT Service with Speaker Intelligence');
        // Apply speaker intelligence enhancement to this instance
        initializeSpeakerIntelligence(this);
        console.log('[EnhancedSttService] Enhanced STT Service initialization complete');
    }
}

// Export the enhanced class
module.exports = EnhancedSttService;
