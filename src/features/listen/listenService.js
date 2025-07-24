const { BrowserWindow } = require('electron');
const leviousaConfig = require('../common/config/leviousa-config');
// Use enhanced STT service if speaker intelligence is enabled
const SttService = leviousaConfig.leviousaConfig.isFeatureEnabled('speakerIntelligence') 
    ? require('../intelligence/enhancedSttService')
    : require('./stt/sttService');
const SummaryService = require('./summary/summaryService');
const authService = require('../common/services/authService');
const sessionRepository = require('../common/repositories/session');
const sttRepository = require('./stt/repositories');
const internalBridge = require('../../bridge/internalBridge');

class ListenService {
    constructor() {
        this.sttService = new SttService();
        this.summaryService = new SummaryService();
        this.currentSessionId = null;
        this.isInitializingSession = false;
        
        // NEW: Audio queuing during initialization
        this.audioQueue = [];
        this.isSTTReady = false;
        this.maxQueueSize = 50; // Reduced from 100 to prevent memory buildup
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 5; // Reduced from 10 for faster recovery
        this.lastErrorTime = 0;
        this.errorCooldownPeriod = 3000; // Reduced from 5 seconds
        
        // NEW: Auto-restart management
        this.autoRestartEnabled = true;
        this.restartAttempts = 0;
        this.maxRestartAttempts = 3;
        this.restartCooldown = 5000; // Reduced from 10 seconds for faster recovery
        this.lastRestartTime = 0;
        
        // NEW: Session monitoring and keepalive
        this.sessionHealthCheck = null;
        this.keepAliveInterval = null;
        this.lastAudioReceived = 0;
        this.sessionTimeoutThreshold = 30000; // 30 seconds without audio = potential timeout
        this.keepAliveFrequency = 15000; // Send keepalive every 15 seconds
        this.isMonitoringHealth = false;

        this.setupServiceCallbacks();
        this.setupSTTSessionMonitoring();
        console.log('[ListenService] Service instance created with enhanced STT session management.');
    }
    
    // NEW: Get diagnostic information about STT session state
    getSTTDiagnostics() {
        return {
            isSTTReady: this.isSTTReady,
            isSessionActive: this.sttService.isSessionActive(),
            consecutiveErrors: this.consecutiveErrors,
            audioQueueLength: this.audioQueue.length,
            isInitializing: this.isInitializingSession,
            lastErrorTime: this.lastErrorTime,
            timeSinceLastError: this.lastErrorTime ? Date.now() - this.lastErrorTime : null,
            circuitBreakerActive: this.consecutiveErrors >= this.maxConsecutiveErrors,
            // NEW: Auto-restart diagnostics
            autoRestartEnabled: this.autoRestartEnabled,
            restartAttempts: this.restartAttempts,
            maxRestartAttempts: this.maxRestartAttempts,
            lastRestartTime: this.lastRestartTime,
            timeSinceLastRestart: this.lastRestartTime ? Date.now() - this.lastRestartTime : null,
            restartCooldownRemaining: this.lastRestartTime ? Math.max(0, this.restartCooldown - (Date.now() - this.lastRestartTime)) : 0
        };
    }
    
    // NEW: Control auto-restart behavior
    setAutoRestart(enabled) {
        this.autoRestartEnabled = enabled;
        console.log(`[ListenService] 🔄 Auto-restart ${enabled ? 'enabled' : 'disabled'}`);
        return { success: true, autoRestartEnabled: this.autoRestartEnabled };
    }
    
    // NEW: Reset restart attempts (useful for debugging)
    resetRestartAttempts() {
        this.restartAttempts = 0;
        this.lastRestartTime = 0;
        console.log('[ListenService] 🔄 Restart attempts reset');
        return { success: true, restartAttempts: this.restartAttempts };
    }

    setupServiceCallbacks() {
        // STT service callbacks
        this.sttService.setCallbacks({
            onTranscriptionComplete: (speaker, text) => {
                this.handleTranscriptionComplete(speaker, text);
            },
            onStatusUpdate: (status) => {
                this.sendToRenderer('update-status', status);
            }
        });

        // Summary service callbacks
        this.summaryService.setCallbacks({
            onAnalysisComplete: (data) => {
                console.log('📊 Analysis completed:', data);
            },
            onStatusUpdate: (status) => {
                this.sendToRenderer('update-status', status);
            }
        });
        
        // NEW: Setup STT session monitoring for auto-restart
        this.setupSTTSessionMonitoring();
    }
    
    // NEW: Monitor STT sessions and restart when they close unexpectedly
    setupSTTSessionMonitoring() {
        const originalCloseSessions = this.sttService.closeSessions.bind(this.sttService);
        
        // Override closeSessions to detect when sessions are closed
        this.sttService.closeSessions = async () => {
            const result = await originalCloseSessions();
            
            // Mark STT as not ready when sessions are closed
            if (this.isSTTReady) {
                console.log('[ListenService] 🔄 STT sessions closed, marking as not ready');
                this.isSTTReady = false;
                
                // Attempt auto-restart if enabled and within limits
                this.attemptSTTRestart();
            }
            
            return result;
        };
    }
    
    // NEW: Attempt to restart STT sessions automatically
    async attemptSTTRestart() {
        if (!this.autoRestartEnabled) {
            console.log('[ListenService] 🚫 Auto-restart disabled');
            return;
        }
        
        const timeSinceLastRestart = Date.now() - this.lastRestartTime;
        if (timeSinceLastRestart < this.restartCooldown) {
            console.log(`[ListenService] 🕒 Restart cooldown active (${Math.round((this.restartCooldown - timeSinceLastRestart) / 1000)}s remaining)`);
            return;
        }
        
        if (this.restartAttempts >= this.maxRestartAttempts) {
            console.log(`[ListenService] 🛑 Maximum restart attempts (${this.maxRestartAttempts}) reached`);
            this.stopAudioCapture(); // Stop audio capture to prevent infinite queuing
            return;
        }
        
        this.restartAttempts++;
        this.lastRestartTime = Date.now();
        
        console.log(`[ListenService] 🔄 Attempting STT restart (${this.restartAttempts}/${this.maxRestartAttempts})...`);
        
        try {
            // Wait a moment before restarting
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to initialize STT sessions again
            const success = await this.initializeSession('en');
            if (success) {
                console.log('[ListenService] ✅ STT sessions restarted successfully');
                this.restartAttempts = 0; // Reset on success
            } else {
                console.log('[ListenService] ❌ STT restart failed');
            }
        } catch (error) {
            console.error('[ListenService] STT restart error:', error.message);
        }
    }
    
    // NEW: Stop audio capture to prevent infinite queuing
    stopAudioCapture() {
        console.log('[ListenService] 🛑 Stopping audio capture due to persistent STT issues');
        
        // Clear the audio queue
        this.audioQueue = [];
        
        // Stop macOS audio capture
        this.stopMacOSAudioCapture();
        
        // Notify the UI
        this.sendToRenderer('update-status', 'STT sessions failed - audio capture stopped');
        this.sendToRenderer('change-listen-capture-state', { status: "stop" });
    }

    sendToRenderer(channel, data) {
        const { windowPool } = require('../../window/windowManager');
        const listenWindow = windowPool?.get('listen');
        
        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
        }
    }

    initialize() {
        this.setupIpcHandlers();
        console.log('[ListenService] Initialized and ready.');
    }

    async handleListenRequest(listenButtonText) {
        const { windowPool } = require('../../window/windowManager');
        const listenWindow = windowPool.get('listen');
        const header = windowPool.get('header');

        try {
            switch (listenButtonText) {
                case 'Listen':
                    console.log('[ListenService] changeSession to "Listen"');
                    internalBridge.emit('window:requestVisibility', { name: 'listen', visible: true });
                    await this.initializeSession();
                    if (listenWindow && !listenWindow.isDestroyed()) {
                        listenWindow.webContents.send('session-state-changed', { isActive: true });
                    }
                    break;
        
                case 'Stop':
                    console.log('[ListenService] changeSession to "Stop"');
                    await this.closeSession();
                    if (listenWindow && !listenWindow.isDestroyed()) {
                        listenWindow.webContents.send('session-state-changed', { isActive: false });
                    }
                    break;
        
                case 'Done':
                    console.log('[ListenService] changeSession to "Done"');
                    internalBridge.emit('window:requestVisibility', { name: 'listen', visible: false });
                    listenWindow.webContents.send('session-state-changed', { isActive: false });
                    break;
        
                default:
                    throw new Error(`[ListenService] unknown listenButtonText: ${listenButtonText}`);
            }
            
            header.webContents.send('listen:changeSessionResult', { success: true });

        } catch (error) {
            console.error('[ListenService] error in handleListenRequest:', error);
            header.webContents.send('listen:changeSessionResult', { success: false });
            throw error; 
        }
    }

    async handleTranscriptionComplete(speaker, text) {
        console.log(`[ListenService] Transcription complete: ${speaker} - ${text}`);
        
        // Save to database
        await this.saveConversationTurn(speaker, text);
        
        // Add to summary service for analysis
        this.summaryService.addConversationTurn(speaker, text);
    }

    async saveConversationTurn(speaker, transcription) {
        if (!this.currentSessionId) {
            console.error('[DB] Cannot save turn, no active session ID.');
            return;
        }
        if (transcription.trim() === '') return;

        try {
            await sessionRepository.touch(this.currentSessionId);
            await sttRepository.addTranscript({
                sessionId: this.currentSessionId,
                speaker: speaker,
                text: transcription.trim(),
            });
            console.log(`[DB] Saved transcript for session ${this.currentSessionId}: (${speaker})`);
            
            // NEW: Trigger intelligent title generation after meaningful conversation
            this.triggerTitleGeneration(this.currentSessionId);
        } catch (error) {
            console.error('Failed to save transcript to DB:', error);
        }
    }

    // NEW: Trigger intelligent title generation for session
    async triggerTitleGeneration(sessionId) {
        try {
            // Don't generate titles immediately - wait for some conversation
            const sessionRepository = require('../common/repositories/session');
            const sttRepository = require('./stt/repositories');
            
            // Get transcript count for this session
            const transcripts = await sttRepository.getAllTranscriptsBySessionId(sessionId);
            
            // Generate title after 8-12 meaningful transcripts (a few exchanges)
            if (transcripts.length >= 8 && transcripts.length <= 15) {
                console.log(`[ListenService] Triggering title generation for session ${sessionId} (${transcripts.length} transcripts)`);
                
                // Generate title in background (don't await to avoid blocking)
                sessionRepository.generateIntelligentTitle(sessionId).catch(error => {
                    console.warn('[ListenService] Title generation failed:', error.message);
                });
            }
        } catch (error) {
            console.warn('[ListenService] Error in title generation trigger:', error.message);
        }
    }

    async initializeNewSession() {
        try {
            // The UID is no longer passed to the repository method directly.
            // The adapter layer handles UID injection. We just ensure a user is available.
            const user = authService.getCurrentUser();
            if (!user) {
                // This case should ideally not happen as authService initializes a default user.
                throw new Error("Cannot initialize session: auth service not ready.");
            }
            
            this.currentSessionId = await sessionRepository.getOrCreateActive('listen');
            console.log(`[DB] New listen session ensured: ${this.currentSessionId}`);

            // Set session ID for summary service
            this.summaryService.setSessionId(this.currentSessionId);
            
            // Reset conversation history
            this.summaryService.resetConversationHistory();

            console.log('New conversation session started:', this.currentSessionId);
            return true;
        } catch (error) {
            console.error('Failed to initialize new session in DB:', error);
            this.currentSessionId = null;
            return false;
        }
    }

    async initializeSession(language = 'en') {
        if (this.isInitializingSession) {
            console.log('Session initialization already in progress.');
            return false;
        }

        this.isInitializingSession = true;
        this.sendToRenderer('session-initializing', true);
        this.sendToRenderer('update-status', 'Initializing sessions...');

        try {
            // Initialize database session
            const sessionInitialized = await this.initializeNewSession();
            if (!sessionInitialized) {
                throw new Error('Failed to initialize database session');
            }

            /* ---------- STT Initialization Retry Logic ---------- */
            const MAX_RETRY = 10;
            const RETRY_DELAY_MS = 300;   // 0.3 seconds

            let sttReady = false;
            for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
                try {
                    await this.sttService.initializeSttSessions(language);
                    sttReady = true;
                    break;                         // Exit on success
                } catch (err) {
                    console.warn(
                        `[ListenService] STT init attempt ${attempt} failed: ${err.message}`
                    );
                    if (attempt < MAX_RETRY) {
                        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                    }
                }
            }
            if (!sttReady) throw new Error('STT init failed after retries');
            
            // NEW: Mark STT as ready and process queued audio
            this.isSTTReady = true;
            this.consecutiveErrors = 0; // Reset error counter
            this.restartAttempts = 0; // Reset restart attempts on successful init
            this.lastAudioReceived = Date.now(); // Initialize audio timestamp
            
            // Start health monitoring
            this.startSessionHealthMonitoring();
            
            await this.processQueuedAudio();
            console.log('[ListenService] 🎤 STT sessions ready, processed queued audio');
            /* ------------------------------------------- */

            // CRITICAL FIX: Send event to trigger audio capture in frontend
            this.sendToRenderer('change-listen-capture-state', { status: "start" });

            console.log('✅ Listen service initialized successfully.');
            this.sendToRenderer('session-initialized', true);
            this.sendToRenderer('update-status', 'Listening...');
            return true;
        } catch (error) {
            console.error('Failed to initialize session:', error);
            this.currentSessionId = null;
            this.isSTTReady = false;
            this.sendToRenderer('session-initialized', false);
            this.sendToRenderer('update-status', `Error: ${error.message}`);
            
            // Try auto-restart if this was an initialization failure
            if (this.autoRestartEnabled) {
                setTimeout(() => this.attemptSTTRestart(), 2000);
            }
            
            return false;
        } finally {
            this.isInitializingSession = false;
        }
    }

    async sendMicAudioContent(data, mimeType) {
        // Update last audio received timestamp
        this.lastAudioReceived = Date.now();
        
        // NEW: Circuit breaker - if too many consecutive errors, pause briefly
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            const timeSinceLastError = Date.now() - this.lastErrorTime;
            if (timeSinceLastError < this.errorCooldownPeriod) {
                // Still in cooldown period, silently drop audio
                return { success: false, error: 'Circuit breaker active' };
            } else {
                // Reset circuit breaker
                this.consecutiveErrors = 0;
                console.log('[ListenService] 🔄 Circuit breaker reset, resuming audio processing');
            }
        }
        
        // NEW: If STT not ready, queue the audio data (with smart limits)
        if (!this.isSTTReady) {
            // Check if we should stop queuing due to too many restart failures
            if (this.restartAttempts >= this.maxRestartAttempts && !this.autoRestartEnabled) {
                return { success: false, error: 'STT restart failed, dropping audio' };
            }
            
            if (this.audioQueue.length < this.maxQueueSize) {
                this.audioQueue.push({ data, mimeType, timestamp: Date.now() });
                
                // Only log occasionally to avoid spam
                if (this.audioQueue.length % 10 === 0 || this.audioQueue.length <= 3) {
                    console.log(`[ListenService] 📦 Queued audio (${this.audioQueue.length}/${this.maxQueueSize})`);
                }
            } else {
                // Queue full - check if we should stop audio capture entirely
                if (this.restartAttempts >= this.maxRestartAttempts) {
                    console.log('[ListenService] 🛑 Queue full and restart attempts exhausted - stopping audio capture');
                    this.stopAudioCapture();
                    return { success: false, error: 'Audio capture stopped due to persistent STT failure' };
                }
                
                // Queue full, remove oldest and add new (reduce logging)
                this.audioQueue.shift();
                this.audioQueue.push({ data, mimeType, timestamp: Date.now() });
                
                // Only log queue full messages occasionally
                if (this.audioQueue.length % 25 === 0) {
                    console.log(`[ListenService] 📦 Audio queue full, replaced oldest entry (${this.audioQueue.length} total)`);
                }
            }
            return { success: false, error: 'STT not ready, audio queued' };
        }
        
        // NEW: STT is ready, try to send
        try {
            const result = await this.sttService.sendMicAudioContent(data, mimeType);
            this.consecutiveErrors = 0; // Reset on success
            return result;
        } catch (error) {
            this.consecutiveErrors++;
            this.lastErrorTime = Date.now();
            
            // Only log errors periodically to avoid spam
            if (this.consecutiveErrors === 1 || this.consecutiveErrors % 5 === 0) {
                console.error(`[ListenService] STT send failed (${this.consecutiveErrors} consecutive):`, error.message);
            }
            
            return { success: false, error: error.message };
        }
    }
    
    // NEW: Process queued audio data once STT is ready
    async processQueuedAudio() {
        if (this.audioQueue.length === 0) return;
        
        console.log(`[ListenService] 🔄 Processing ${this.audioQueue.length} queued audio chunks...`);
        
        // Process queued audio more aggressively for faster response
        const maxProcess = Math.min(this.audioQueue.length, 30); // Increased from 20
        const toProcess = this.audioQueue.splice(0, maxProcess);
        
        // Process in smaller batches to avoid overwhelming
        const batchSize = 5;
        for (let i = 0; i < toProcess.length; i += batchSize) {
            const batch = toProcess.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async ({ data, mimeType, timestamp }) => {
                // Skip very old audio (older than 3 seconds) 
                if (Date.now() - timestamp > 3000) {
                    return;
                }
                
                try {
                    await this.sttService.sendMicAudioContent(data, mimeType);
                } catch (error) {
                    // Log batch processing errors but don't stop
                    console.warn('[ListenService] Error processing queued audio chunk:', error.message);
                }
            }));
            
            // Very small delay between batches
            if (i + batchSize < toProcess.length) {
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
        
        if (this.audioQueue.length > 0) {
            console.log(`[ListenService] 📦 ${this.audioQueue.length} audio chunks still queued`);
        }
    }

    async startMacOSAudioCapture() {
        if (process.platform !== 'darwin') {
            throw new Error('macOS audio capture only available on macOS');
        }
        return await this.sttService.startMacOSAudioCapture();
    }

    async stopMacOSAudioCapture() {
        this.sttService.stopMacOSAudioCapture();
    }

    isSessionActive() {
        return this.sttService.isSessionActive();
    }
    
    // NEW: Check if STT is ready to receive audio
    isSTTSessionReady() {
        return this.isSTTReady && this.sttService.isSessionActive();
    }

    async closeSession() {
        try {
            this.sendToRenderer('change-listen-capture-state', { status: "stop" });
            // Close STT sessions
            await this.sttService.closeSessions();

            await this.stopMacOSAudioCapture();

            // End database session
            if (this.currentSessionId) {
                await sessionRepository.end(this.currentSessionId);
                console.log(`[DB] Session ${this.currentSessionId} ended.`);
            }

            // Reset state
            this.currentSessionId = null;
            this.summaryService.resetConversationHistory();
            
            // NEW: Reset STT state and clear queue
            this.isSTTReady = false;
            this.audioQueue = [];
            this.consecutiveErrors = 0;
            this.restartAttempts = 0; // Reset restart attempts on manual close
            this.lastAudioReceived = 0; // Reset audio timestamp
            this.stopSessionHealthMonitoring(); // Stop health monitoring on close
            console.log('[ListenService] 🔄 STT state and audio queue reset');

            console.log('Listen service session closed.');
            return { success: true };
        } catch (error) {
            console.error('Error closing listen service session:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentSessionData() {
        return {
            sessionId: this.currentSessionId,
            conversationHistory: this.summaryService.getConversationHistory(),
            totalTexts: this.summaryService.getConversationHistory().length,
            analysisData: this.summaryService.getCurrentAnalysisData(),
        };
    }

    getConversationHistory() {
        return this.summaryService.getConversationHistory();
    }

    _createHandler(asyncFn, successMessage, errorMessage) {
        return async (...args) => {
            try {
                const result = await asyncFn.apply(this, args);
                if (successMessage) console.log(successMessage);
                // `startMacOSAudioCapture`는 성공 시 { success, error } 객체를 반환하지 않으므로,
                // 핸들러가 일관된 응답을 보내도록 여기서 success 객체를 반환합니다.
                // 다른 함수들은 이미 success 객체를 반환합니다.
                return result && typeof result.success !== 'undefined' ? result : { success: true };
            } catch (e) {
                console.error(errorMessage, e);
                return { success: false, error: e.message };
            }
        };
    }

    // NEW: Enhanced error handler for audio content with circuit breaker awareness
    handleSendMicAudioContent = async (...args) => {
        try {
            const result = await this.sendMicAudioContent.apply(this, args);
            
            // Only log successful sends if there were recent errors
            if (this.consecutiveErrors > 0 && result.success) {
                console.log('[ListenService] ✅ Audio sending resumed successfully');
            }
            
            return result && typeof result.success !== 'undefined' ? result : { success: true };
        } catch (e) {
            // Enhanced error handling - only log if not in circuit breaker mode
            if (this.consecutiveErrors < this.maxConsecutiveErrors) {
                console.error('Error sending user audio:', e.message);
            } else if (this.consecutiveErrors === this.maxConsecutiveErrors) {
                console.error(`[ListenService] 🔌 Circuit breaker activated after ${this.maxConsecutiveErrors} consecutive errors. Audio processing paused.`);
            }
            
            return { success: false, error: e.message };
        }
    };

    handleStartMacosAudio = this._createHandler(
        async () => {
            if (process.platform !== 'darwin') {
                return { success: false, error: 'macOS audio capture only available on macOS' };
            }
            if (this.sttService.isMacOSAudioRunning?.()) {
                return { success: false, error: 'already_running' };
            }
            await this.startMacOSAudioCapture();
            return { success: true, error: null };
        },
        'macOS audio capture started.',
        'Error starting macOS audio capture:'
    );
    
    handleStopMacosAudio = this._createHandler(
        this.stopMacOSAudioCapture,
        'macOS audio capture stopped.',
        'Error stopping macOS audio capture:'
    );

    handleUpdateGoogleSearchSetting = this._createHandler(
        async (enabled) => {
            console.log('Google Search setting updated to:', enabled);
        },
        null,
        'Error updating Google Search setting:'
    );

    // NEW: Start session health monitoring
    startSessionHealthMonitoring() {
        if (this.isMonitoringHealth) return;
        
        this.isMonitoringHealth = true;
        
        // Health check every 10 seconds
        this.sessionHealthCheck = setInterval(() => {
            this.checkSessionHealth();
        }, 10000);
        
        // Keepalive mechanism for Deepgram sessions
        this.keepAliveInterval = setInterval(() => {
            this.sendKeepAlive();
        }, this.keepAliveFrequency);
        
        console.log('[ListenService] 🏥 Session health monitoring started');
    }
    
    // NEW: Stop session health monitoring
    stopSessionHealthMonitoring() {
        this.isMonitoringHealth = false;
        
        if (this.sessionHealthCheck) {
            clearInterval(this.sessionHealthCheck);
            this.sessionHealthCheck = null;
        }
        
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        
        console.log('[ListenService] 🏥 Session health monitoring stopped');
    }
    
    // NEW: Check if STT sessions are healthy
    checkSessionHealth() {
        if (!this.isSTTReady) return;
        
        const timeSinceLastAudio = Date.now() - this.lastAudioReceived;
        
        // If no audio received for a while, check if sessions are still active
        if (timeSinceLastAudio > this.sessionTimeoutThreshold) {
            console.log('[ListenService] 🏥 Checking session health - no audio received for', timeSinceLastAudio, 'ms');
            
            if (!this.sttService.isSessionActive()) {
                console.log('[ListenService] 🏥 Sessions appear inactive, triggering restart');
                this.isSTTReady = false;
                this.attemptSTTRestart();
            }
        }
    }
    
    // NEW: Send keepalive signal to maintain session
    async sendKeepAlive() {
        if (!this.isSTTReady || !this.sttService.isSessionActive()) return;
        
        try {
            // Send a small silent audio chunk to keep session alive
            const silentChunk = Buffer.alloc(320, 0); // 20ms of silence at 16kHz
            const base64Silent = silentChunk.toString('base64');
            
            // Only log keepalive occasionally to avoid spam
            if (Math.random() < 0.1) {
                console.log('[ListenService] 💓 Sending keepalive signal');
            }
            
            await this.sttService.sendMicAudioContent(base64Silent, 'audio/pcm');
        } catch (error) {
            // Don't log keepalive failures as errors since they're not critical
            if (Math.random() < 0.1) {
                console.log('[ListenService] 💓 Keepalive failed (expected if session closed):', error.message);
            }
        }
    }
}

const listenService = new ListenService();
module.exports = listenService;