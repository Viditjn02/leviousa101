// Leviousa101 - Enhanced STT Service with Speaker Intelligence
const { initializeSpeakerIntelligence } = require('./sttServiceEnhancer');
const SttService = require('../listen/stt/sttService');

// Enhanced STT Service Class
class EnhancedSttService extends SttService {
    constructor() {
        super();
        // Apply speaker intelligence enhancement to this instance
        initializeSpeakerIntelligence(this);
    }
}

// Export the enhanced class
module.exports = EnhancedSttService;
