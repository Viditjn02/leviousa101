const { EventEmitter } = require('events');
const { systemPreferences, screen, desktopCapturer } = require('electron');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class InvisibilityService extends EventEmitter {
    constructor() {
        super();
        this.isInvisibilityModeActive = false;
        this.isMonitoring = false;
        this.isProcessingQuestion = false;
        this.remoteAccessDetectionInterval = null;
        this.screenMonitoringInterval = null;
        this.lastRemoteAccessState = false;
        this.questionDetector = null;
        this.fieldFinder = null;
        this.humanTyper = null;
        this.mcpClient = null;
        
        // Configuration
        this.config = {
            remoteAccessCheckInterval: 3000, // 3 seconds
            screenMonitoringInterval: 2000,  // 2 seconds
            autoHideOnRemoteAccess: true,
            autoShowWhenSafe: true,
            questionDetectionEnabled: true,
            autoAnsweringEnabled: true
        };

        console.log('[InvisibilityService] Service initialized');
    }

    async initialize() {
        try {
            console.log('[InvisibilityService] Initializing dependent services...');
            
            // Initialize dependent services
            const QuestionDetector = require('./questionDetector');
            const FieldFinder = require('./fieldFinder');
            const HumanTyper = require('./humanTyper');
            const MCPClient = require('./mcpClient');

            this.questionDetector = new QuestionDetector();
            this.fieldFinder = new FieldFinder();
            this.humanTyper = new HumanTyper();
            this.mcpClient = new MCPClient();

            console.log('[InvisibilityService] Initializing QuestionDetector...');
            await this.questionDetector.initialize();
            console.log('[InvisibilityService] ✅ QuestionDetector initialized');

            console.log('[InvisibilityService] Initializing FieldFinder...');
            await this.fieldFinder.initialize();
            console.log('[InvisibilityService] ✅ FieldFinder initialized');

            console.log('[InvisibilityService] Initializing HumanTyper...');
            await this.humanTyper.initialize();
            console.log('[InvisibilityService] ✅ HumanTyper initialized');

            console.log('[InvisibilityService] Initializing MCPClient...');
            await this.mcpClient.initialize();
            console.log('[InvisibilityService] ✅ MCPClient initialized');

            console.log('[InvisibilityService] All dependent services initialized successfully');
            
            // Ensure overlay is visible after initialization (unless explicitly hidden)
            await this.ensureOverlayVisible();
            
            return true;
        } catch (error) {
            console.error('[InvisibilityService] Initialization failed:', error);
            console.error('[InvisibilityService] Error stack:', error.stack);
            
            // Reset all services to null on failure
            this.questionDetector = null;
            this.fieldFinder = null;
            this.humanTyper = null;
            this.mcpClient = null;
            
            // Re-throw the error so the main application knows initialization failed
            throw new Error(`InvisibilityService initialization failed: ${error.message}`);
        }
    }

    // NEW: Ensure overlay is visible by default
    async ensureOverlayVisible() {
        try {
            console.log('[InvisibilityService] 👁️ Ensuring overlay is visible by default...');
            await this.showOverlay('Default visibility after initialization', true); // Force show
        } catch (error) {
            console.error('[InvisibilityService] Error ensuring overlay visibility:', error);
        }
    }

    async enableInvisibilityMode() {
        if (this.isInvisibilityModeActive) {
            console.log('[InvisibilityService] Invisibility mode already active');
            return;
        }

        console.log('[InvisibilityService] 🕵️ Enabling complete invisibility mode');
        this.isInvisibilityModeActive = true;
        
        // Start remote access monitoring
        await this.startRemoteAccessMonitoring();
        
        // Start background screen monitoring
        await this.startScreenMonitoring();
        
        // Hide overlay immediately for safety
        await this.hideOverlay('Invisibility mode activated');
        
        this.emit('invisibility-mode-enabled');
        console.log('[InvisibilityService] ✅ Complete invisibility mode is now active');
    }

    async disableInvisibilityMode() {
        if (!this.isInvisibilityModeActive) {
            console.log('[InvisibilityService] Invisibility mode already inactive');
            return;
        }

        console.log('[InvisibilityService] Disabling invisibility mode');
        this.isInvisibilityModeActive = false;
        
        // Stop monitoring
        this.stopRemoteAccessMonitoring();
        this.stopScreenMonitoring();
        
        // Restore overlay to normal "visible but undetectable" state
        await this.showOverlay('Returning to normal undetectable mode');
        
        this.emit('invisibility-mode-disabled');
        console.log('[InvisibilityService] ✅ Returned to normal undetectable mode - overlay visible to you but undetectable to others');
    }

    async startRemoteAccessMonitoring() {
        if (this.remoteAccessDetectionInterval) {
            clearInterval(this.remoteAccessDetectionInterval);
        }

        console.log('[InvisibilityService] 🔍 Starting remote access detection...');
        
        this.remoteAccessDetectionInterval = setInterval(async () => {
            const remoteAccessDetected = await this.detectRemoteAccess();
            
            if (remoteAccessDetected && !this.lastRemoteAccessState) {
                console.log('[InvisibilityService] 🚨 Remote access detected! Hiding overlay...');
                await this.hideOverlay('Remote access detected');
                this.lastRemoteAccessState = true;
                this.emit('remote-access-detected');
            } else if (!remoteAccessDetected && this.lastRemoteAccessState) {
                console.log('[InvisibilityService] ✅ Remote access ended. Overlay remains hidden in invisibility mode.');
                this.lastRemoteAccessState = false;
                this.emit('remote-access-ended');
            }
        }, this.config.remoteAccessCheckInterval);
    }

    stopRemoteAccessMonitoring() {
        if (this.remoteAccessDetectionInterval) {
            clearInterval(this.remoteAccessDetectionInterval);
            this.remoteAccessDetectionInterval = null;
            console.log('[InvisibilityService] Remote access monitoring stopped');
        }
    }

    async startScreenMonitoring() {
        if (this.screenMonitoringInterval) {
            clearInterval(this.screenMonitoringInterval);
        }

        console.log('[InvisibilityService] 👁️ Starting background screen monitoring...');
        this.isMonitoring = true;
        
        this.screenMonitoringInterval = setInterval(async () => {
            if (!this.isProcessingQuestion && this.config.questionDetectionEnabled) {
                // Monitor screen for questions but don't auto-process
                // Only process when CMD+L is pressed
                await this.backgroundScreenAnalysis();
            }
        }, this.config.screenMonitoringInterval);
    }

    stopScreenMonitoring() {
        if (this.screenMonitoringInterval) {
            clearInterval(this.screenMonitoringInterval);
            this.screenMonitoringInterval = null;
            this.isMonitoring = false;
            console.log('[InvisibilityService] Screen monitoring stopped');
        }
    }

    async detectRemoteAccess() {
        try {
            if (process.platform === 'darwin') {
                return await this.detectMacOSRemoteAccess();
            } else if (process.platform === 'win32') {
                return await this.detectWindowsRemoteAccess();
            } else {
                return await this.detectLinuxRemoteAccess();
            }
        } catch (error) {
            console.error('[InvisibilityService] Error detecting remote access:', error);
            return false;
        }
    }

    async detectMacOSRemoteAccess() {
        try {
            // Method 1: Check for screen sharing processes
            const screenSharingProcesses = [
                'ScreenSharingAgent',
                'AppleVNCServer',
                'TeamViewer',
                'AnyDesk',
                'Chrome Remote Desktop',
                'RustDesk'
            ];

            for (const process of screenSharingProcesses) {
                try {
                    execSync(`pgrep -f "${process}"`, { stdio: 'ignore' });
                    console.log(`[InvisibilityService] Remote access detected: ${process}`);
                    return true;
                } catch {
                    // Process not found, continue checking
                }
            }

            // Method 2: Check for active VNC connections
            try {
                const netstat = execSync('netstat -an | grep :5900', { encoding: 'utf8' });
                if (netstat.includes('ESTABLISHED')) {
                    console.log('[InvisibilityService] VNC connection detected');
                    return true;
                }
            } catch {
                // No VNC connections
            }

            // Method 3: Check system preferences for screen sharing status
            try {
                const screenStatus = systemPreferences.getMediaAccessStatus('screen');
                if (screenStatus === 'granted') {
                    // Additional check to see if screen recording is actively being used
                    const activeScreenCapture = await this.checkActiveScreenCapture();
                    if (activeScreenCapture) {
                        console.log('[InvisibilityService] Active screen capture detected');
                        return true;
                    }
                }
            } catch (error) {
                console.error('[InvisibilityService] Error checking screen status:', error);
            }

            return false;
        } catch (error) {
            console.error('[InvisibilityService] Error in macOS remote access detection:', error);
            return false;
        }
    }

    async detectWindowsRemoteAccess() {
        try {
            // Check for Remote Desktop session
            const sessionCheck = execSync('query session', { encoding: 'utf8' });
            if (sessionCheck.includes('rdp-tcp')) {
                return true;
            }

            // Check for remote access software
            const remoteProcesses = [
                'TeamViewer.exe',
                'AnyDesk.exe',
                'chrome_remote_desktop_host.exe',
                'vncserver.exe',
                'RustDesk.exe'
            ];

            const processes = execSync('tasklist', { encoding: 'utf8' });
            for (const process of remoteProcesses) {
                if (processes.toLowerCase().includes(process.toLowerCase())) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('[InvisibilityService] Error in Windows remote access detection:', error);
            return false;
        }
    }

    async detectLinuxRemoteAccess() {
        try {
            // Check for VNC, SSH X11 forwarding, and remote access tools
            const remoteProcesses = [
                'vncserver',
                'x11vnc',
                'teamviewer',
                'anydesk',
                'rustdesk'
            ];

            for (const process of remoteProcesses) {
                try {
                    execSync(`pgrep ${process}`, { stdio: 'ignore' });
                    return true;
                } catch {
                    // Process not found
                }
            }

            // Check for SSH connections with X11 forwarding
            try {
                const sshCheck = execSync('who | grep "("', { encoding: 'utf8' });
                if (sshCheck.length > 0) {
                    return true;
                }
            } catch {
                // No SSH connections
            }

            return false;
        } catch (error) {
            console.error('[InvisibilityService] Error in Linux remote access detection:', error);
            return false;
        }
    }

    async checkActiveScreenCapture() {
        try {
            // Try to capture screen and see if it's being blocked or if other apps are capturing
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 100, height: 100 }
            });

            // If we can't get sources or they're empty, something else might be using screen capture
            return sources.length === 0;
        } catch (error) {
            // If screen capture fails, assume something else is using it
            return true;
        }
    }

    async backgroundScreenAnalysis() {
        // Passive screen monitoring - just keep track of what's on screen
        // Don't process unless triggered by CMD+L
        try {
            const screenshot = await this.captureScreen();
            if (screenshot) {
                // Store latest screenshot for quick access when CMD+L is pressed
                this.lastScreenshot = screenshot;
                this.lastScreenshotTime = Date.now();
            }
        } catch (error) {
            console.error('[InvisibilityService] Background screen analysis error:', error);
        }
    }

    async processQuestionAndAnswer() {
        if (this.isProcessingQuestion) {
            console.log('[InvisibilityService] Already processing a question, ignoring trigger');
            return;
        }

        if (!this.isInvisibilityModeActive) {
            console.log('[InvisibilityService] Invisibility mode not active, ignoring trigger');
            return;
        }

        return await this._executeQuestionProcessing();
    }

    // NEW: Voice-triggered question processing (bypasses invisibility mode requirement)
    async processQuestionAndAnswerVoiceTriggered() {
        if (this.isProcessingQuestion) {
            console.log('[InvisibilityService] Already processing a question, ignoring trigger');
            return;
        }

        console.log('[InvisibilityService] 🎤 Voice-triggered question processing (bypassing invisibility mode requirement)');
        return await this._executeQuestionProcessing();
    }

    // NEW: Common question processing logic
    async _executeQuestionProcessing() {

        // Safety check: Ensure all services are properly initialized
        if (!this.questionDetector || !this.fieldFinder || !this.humanTyper || !this.mcpClient) {
            console.error('[InvisibilityService] ❌ Services not properly initialized:');
            console.error(`  - QuestionDetector: ${this.questionDetector ? '✅' : '❌'}`);
            console.error(`  - FieldFinder: ${this.fieldFinder ? '✅' : '❌'}`);
            console.error(`  - HumanTyper: ${this.humanTyper ? '✅' : '❌'}`);
            console.error(`  - MCPClient: ${this.mcpClient ? '✅' : '❌'}`);
            console.error('[InvisibilityService] Please restart the application to reinitialize services');
            return;
        }

        console.log('[InvisibilityService] 🧠 CMD+L triggered! Starting question detection and auto-answering...');
        this.isProcessingQuestion = true;

        try {
            // Step 1: Capture current screen
            const screenshot = this.lastScreenshot || await this.captureScreen();
            if (!screenshot) {
                throw new Error('Failed to capture screen');
            }

            // Step 2: Detect questions on screen
            console.log('[InvisibilityService] 🔍 Analyzing screen for questions...');
            const detectedQuestions = await this.questionDetector.detectQuestions(screenshot);
            
            if (!detectedQuestions || detectedQuestions.length === 0) {
                console.log('[InvisibilityService] ❌ No questions detected on screen');
                return;
            }

            console.log(`[InvisibilityService] ✅ Found ${detectedQuestions.length} question(s)`);
            
            // Step 3: Find input fields
            console.log('[InvisibilityService] 🎯 Locating input fields...');
            const inputFields = await this.fieldFinder.findInputFields();
            
            if (!inputFields || inputFields.length === 0) {
                console.log('[InvisibilityService] ❌ No input fields found');
                return;
            }

            console.log(`[InvisibilityService] ✅ Found ${inputFields.length} input field(s)`);

            // Step 4: Get answers for each question (OPTIMIZED: Process in parallel)
            console.log('[InvisibilityService] 🚀 Generating answers in parallel for faster response...');
            
            // Generate all answers in parallel to reduce response time
            const answerPromises = detectedQuestions.map(async (question, index) => {
                try {
                    console.log(`[InvisibilityService] 🤖 Getting answer for: "${question.text.substring(0, 50)}..."`);
                    const answer = await this.mcpClient.getAnswer(question, screenshot);
                    return { index, question, answer, success: !!answer };
                } catch (error) {
                    console.error(`[InvisibilityService] Failed to generate answer for question ${index + 1}:`, error);
                    return { index, question, answer: null, success: false, error: error.message };
                }
            });
            
            // Wait for all answers to be generated
            const answerResults = await Promise.all(answerPromises);
            console.log(`[InvisibilityService] ✅ Generated ${answerResults.filter(r => r.success).length}/${answerResults.length} answers`);
            
            // Step 5: Type answers sequentially (typing must be sequential to avoid conflicts)
            for (const result of answerResults) {
                if (!result.success || !result.answer) {
                    console.log(`[InvisibilityService] ⏭️ Skipping question ${result.index + 1} (no answer generated)`);
                    continue;
                }
                
                const inputField = inputFields[result.index];
                if (!inputField) {
                    console.log(`[InvisibilityService] ⏭️ Skipping question ${result.index + 1} (no input field)`);
                    continue;
                }

                console.log(`[InvisibilityService] ✅ Generated answer (${result.answer.length} chars)`);
                
                // Focus field and type answer using universal methods
                const focusSuccess = await this.fieldFinder.focusField(inputField);
                
                if (focusSuccess) {
                    // Check typing speed mode from config
                    const typingMode = this.config?.typingSpeedMode || 'bolt';
                    console.log(`[InvisibilityService] ⌨️ Using ${typingMode} typing mode for ${inputField.application}`);
                    
                    try {
                        if (typingMode === 'human') {
                            // Use human-like typing
                            await this.humanTyper.typeText(result.answer, {
                                humanLike: true,
                                includeErrors: false,  // Don't introduce errors in answers
                                includeBackspacing: false,
                                speed: 'normal'  // 40-60 WPM
                            });
                            console.log('[InvisibilityService] ✅ Answer typed successfully via human-like typing');
                        } else {
                            // Use bolt (instant) typing
                            const typingSuccess = await this.fieldFinder.typeInField(inputField, result.answer);
                            
                            if (typingSuccess) {
                                console.log('[InvisibilityService] ✅ Answer typed successfully via bolt typing');
                            } else {
                                console.log('[InvisibilityService] ⚠️ Bolt typing failed, falling back to HumanTyper');
                                await this.humanTyper.typeText(result.answer, {
                                    humanLike: false,
                                    includeErrors: false,
                                    includeBackspacing: false
                                });
                                console.log('[InvisibilityService] ✅ Answer typed successfully via HumanTyper fallback');
                            }
                        }
                        
                        console.log('[InvisibilityService] ✅ Answer typed successfully');
                    } catch (typingError) {
                        console.error(`[InvisibilityService] Failed to type answer for question ${result.index + 1}:`, typingError);
                    }
                } else {
                    console.log(`[InvisibilityService] ❌ Failed to focus field for question ${result.index + 1}`);
                }
            }

        } catch (error) {
            console.error('[InvisibilityService] Error processing question:', error);
            console.error('[InvisibilityService] Error stack:', error.stack);
            
            // Provide specific error guidance
            if (error.message.includes('QuestionDetector not initialized')) {
                console.error('[InvisibilityService] 💡 Try restarting the application to fix QuestionDetector initialization');
            } else if (error.message.includes('FieldFinder not initialized')) {
                console.error('[InvisibilityService] 💡 Check accessibility permissions and restart the application');
            } else if (error.message.includes('Cannot read properties of null')) {
                console.error('[InvisibilityService] 💡 Service initialization issue - restart the application');
            }
        } finally {
            this.isProcessingQuestion = false;
        }
    }

    async captureScreen() {
        try {
            const askService = require('../ask/askService');
            const result = await askService.captureScreenshot({ quality: 'high' });
            return result.success ? result.base64 : null;
        } catch (error) {
            console.error('[InvisibilityService] Screen capture failed:', error);
            return null;
        }
    }

    async hideOverlay(reason = 'Manual hide') {
        try {
            const { windowPool } = require('../../window/windowManager');
            console.log(`[InvisibilityService] 🙈 Hiding overlay: ${reason}`);
            
            // Hide all windows
            windowPool.forEach((window, name) => {
                if (!window.isDestroyed() && window.isVisible()) {
                    window.__wasVisible = true;
                    window.hide();
                }
            });

            this.emit('overlay-hidden', { reason });
        } catch (error) {
            console.error('[InvisibilityService] Error hiding overlay:', error);
        }
    }

    async showOverlay(reason = 'Manual show', force = false) {
        try {
            if (this.isInvisibilityModeActive && !force) {
                console.log('[InvisibilityService] Overlay remains hidden in invisibility mode');
                return;
            }

            const { windowPool } = require('../../window/windowManager');
            console.log(`[InvisibilityService] 👁️ Showing overlay: ${reason}${force ? ' (forced)' : ''}`);
            
            // Show previously visible windows
            windowPool.forEach((window, name) => {
                if (!window.isDestroyed() && window.__wasVisible) {
                    window.show();
                    window.__wasVisible = false;
                }
            });

            this.emit('overlay-shown', { reason, forced: force });
        } catch (error) {
            console.error('[InvisibilityService] Error showing overlay:', error);
        }
    }

    getStatus() {
        return {
            isInvisibilityModeActive: this.isInvisibilityModeActive,
            isMonitoring: this.isMonitoring,
            isProcessingQuestion: this.isProcessingQuestion,
            lastRemoteAccessState: this.lastRemoteAccessState,
            config: this.config
        };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('[InvisibilityService] Configuration updated:', this.config);
        this.emit('config-updated', this.config);
    }

    async retryInitialization() {
        console.log('[InvisibilityService] 🔄 Retrying service initialization...');
        try {
            return await this.initialize();
        } catch (error) {
            console.error('[InvisibilityService] Retry initialization also failed:', error);
            throw error;
        }
    }

    getServiceStatus() {
        return {
            questionDetector: {
                initialized: !!this.questionDetector,
                ready: this.questionDetector?.isInitialized || false
            },
            fieldFinder: {
                initialized: !!this.fieldFinder,
                ready: this.fieldFinder?.isInitialized || false
            },
            humanTyper: {
                initialized: !!this.humanTyper,
                ready: this.humanTyper?.isInitialized || false
            },
            mcpClient: {
                initialized: !!this.mcpClient,
                ready: this.mcpClient?.isInitialized || false
            },
            overallReady: !!(this.questionDetector && this.fieldFinder && this.humanTyper && this.mcpClient)
        };
    }

    async ensureServicesReady() {
        const status = this.getServiceStatus();
        if (!status.overallReady) {
            console.log('[InvisibilityService] Services not ready, attempting to initialize...');
            await this.retryInitialization();
        }
        return this.getServiceStatus();
    }
}

module.exports = InvisibilityService; 