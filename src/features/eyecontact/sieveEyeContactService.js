const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class SieveEyeContactService extends EventEmitter {
    constructor() {
        super();
        this.apiKey = process.env.SIEVE_API_KEY || '';
        this.apiEndpoint = 'https://mango.sievedata.com/v2/push';
        this.isProcessing = false;
        this.correctionEnabled = false; // Disabled by default until API key is set
        this.lastProcessedTime = 0;
        this.minProcessingInterval = 100; // Process every 100ms max
        
        // Check if API key is configured
        if (this.apiKey) {
            this.correctionEnabled = true;
            console.log('✅ [SieveEyeContact] Service initialized with API key');
        } else {
            console.log('⚠️ [SieveEyeContact] No API key found. Eye contact correction disabled.');
        }
    }

    async initialize() {
        if (!this.apiKey) {
            console.log('⚠️ [SieveEyeContact] Cannot initialize without API key');
            return false;
        }

        try {
            // Test API connection
            const testResponse = await axios.get('https://mango.sievedata.com/v2/jobs', {
                headers: {
                    'X-API-Key': this.apiKey
                },
                timeout: 5000
            });
            
            console.log('✅ [SieveEyeContact] API connection verified');
            this.correctionEnabled = true;
            return true;
        } catch (error) {
            console.error('❌ [SieveEyeContact] Failed to connect to API:', error.message);
            this.correctionEnabled = false;
            return false;
        }
    }

    async correctEyeContact(imageBuffer, options = {}) {
        if (!this.correctionEnabled || this.isProcessing || !this.apiKey) {
            return null;
        }

        const now = Date.now();
        if (now - this.lastProcessedTime < this.minProcessingInterval) {
            return null; // Skip if too soon
        }

        try {
            this.isProcessing = true;
            this.lastProcessedTime = now;

            // Create form data
            const formData = new FormData();
            
            // Add the image
            formData.append('file', imageBuffer, {
                filename: 'frame.jpg',
                contentType: 'image/jpeg'
            });

            // Add function name
            formData.append('function', 'sieve/eye-contact-correction');
            
            // Add inputs
            formData.append('inputs', JSON.stringify({
                file: { url: 'file' }
            }));

            // Make API request
            const response = await axios.post(this.apiEndpoint, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-API-Key': this.apiKey
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 30000
            });

            if (response.data && response.data.id) {
                // Poll for job completion
                const result = await this.pollJobStatus(response.data.id);
                
                if (result && result.outputs && result.outputs.length > 0) {
                    const correctedImageUrl = result.outputs[0].url;
                    
                    // Download the corrected image
                    const imageResponse = await axios.get(correctedImageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 10000
                    });
                    
                    const correctedBuffer = Buffer.from(imageResponse.data);
                    
                    // Emit success event
                    this.emit('correction-complete', {
                        success: true,
                        timestamp: now,
                        size: correctedBuffer.length
                    });
                    
                    return correctedBuffer;
                }
            }

            return null;
        } catch (error) {
            console.error('[SieveEyeContact] Correction error:', error.message);
            
            // Emit error event
            this.emit('correction-error', {
                error: error.message,
                timestamp: now
            });
            
            return null;
        } finally {
            this.isProcessing = false;
        }
    }

    async pollJobStatus(jobId, maxAttempts = 30, interval = 1000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await axios.get(`https://mango.sievedata.com/v2/jobs/${jobId}`, {
                    headers: {
                        'X-API-Key': this.apiKey
                    },
                    timeout: 5000
                });

                const job = response.data;
                
                if (job.status === 'succeeded') {
                    return job;
                } else if (job.status === 'failed') {
                    throw new Error(`Job failed: ${job.error || 'Unknown error'}`);
                }
                
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, interval));
            } catch (error) {
                console.error('[SieveEyeContact] Error polling job status:', error.message);
                throw error;
            }
        }
        
        throw new Error('Job polling timeout');
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        if (apiKey) {
            console.log('✅ [SieveEyeContact] API key updated');
            this.initialize();
        } else {
            console.log('⚠️ [SieveEyeContact] API key removed');
            this.correctionEnabled = false;
        }
    }

    enableCorrection() {
        if (this.apiKey) {
            this.correctionEnabled = true;
            console.log('✅ [SieveEyeContact] Correction enabled');
            this.emit('status-changed', { enabled: true });
        } else {
            console.log('⚠️ [SieveEyeContact] Cannot enable without API key');
        }
    }

    disableCorrection() {
        this.correctionEnabled = false;
        console.log('❌ [SieveEyeContact] Correction disabled');
        this.emit('status-changed', { enabled: false });
    }

    getStatus() {
        return {
            enabled: this.correctionEnabled,
            processing: this.isProcessing,
            hasApiKey: !!this.apiKey,
            lastProcessed: this.lastProcessedTime
        };
    }
}

// Create singleton instance
const sieveEyeContactService = new SieveEyeContactService();

module.exports = sieveEyeContactService;
