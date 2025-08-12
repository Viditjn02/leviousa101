const { ipcMain, BrowserWindow } = require('electron');

function initializeVoiceAgentBridge() {
    console.log('[VoiceAgentBridge] Initializing IPC handlers');
    
    const getVoiceAgentService = () => {
        if (!global.voiceAgentService) {
            throw new Error('Voice agent service not available');
        }
        return global.voiceAgentService;
    };

    // Main control handlers
    ipcMain.handle('voice-agent:enable', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.enableVoiceAgent();
            console.log('[VoiceAgentBridge] Voice agent enabled:', result);
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error enabling voice agent:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:disable', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.disableVoiceAgent();
            console.log('[VoiceAgentBridge] Voice agent disabled:', result);
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error disabling voice agent:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:getStatus', async () => {
        try {
            const service = getVoiceAgentService();
            return service.getStatus();
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting status:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('voice-agent:updateConfig', async (event, newConfig) => {
        try {
            const service = getVoiceAgentService();
            service.updateConfig(newConfig);
            return { success: true, config: service.config };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // Manual triggers for testing and development
    ipcMain.handle('voice-agent:triggerWakeWord', async () => {
        try {
            const service = getVoiceAgentService();
            if (service.wakeWordDetector) {
                const result = await service.wakeWordDetector.triggerWakeWord();
                console.log('[VoiceAgentBridge] Manual wake word triggered');
                return result;
            }
            return { success: false, error: 'Wake word detector not available' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error triggering wake word:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:triggerVoiceCommand', async (event, command) => {
        try {
            const service = getVoiceAgentService();
            const result = await service.triggerVoiceCommand(command);
            console.log('[VoiceAgentBridge] Manual voice command triggered:', command);
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error triggering voice command:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:endConversation', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.endConversation();
            console.log('[VoiceAgentBridge] Conversation ended manually');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error ending conversation:', error);
            return { success: false, error: error.message };
        }
    });

    // NEW: Echo prevention handlers
    ipcMain.handle('voice-agent:resetEchoPrevention', async () => {
        try {
            const service = getVoiceAgentService();
            const result = service.resetEchoPreventionState();
            console.log('[VoiceAgentBridge] Echo prevention state reset');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error resetting echo prevention:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:updateEchoPreventionConfig', async (event, newConfig) => {
        try {
            const service = getVoiceAgentService();
            const result = service.updateEchoPreventionConfig(newConfig);
            console.log('[VoiceAgentBridge] Echo prevention config updated:', result);
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error updating echo prevention config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:getEchoPreventionStatus', async () => {
        try {
            const service = getVoiceAgentService();
            return service.getEchoPreventionStatus();
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting echo prevention status:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('voice-agent:testFeedbackDetection', async (event, text) => {
        try {
            const service = getVoiceAgentService();
            const result = service.testFeedbackDetection(text);
            console.log('[VoiceAgentBridge] Feedback detection test completed for:', text);
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error testing feedback detection:', error);
            return { success: false, error: error.message };
        }
    });

    // Screen analysis handlers
    ipcMain.handle('voice-agent:analyzeScreen', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.captureAndAnalyzeScreen();
            console.log('[VoiceAgentBridge] Screen analysis completed');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error analyzing screen:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:getLastScreenAnalysis', async () => {
        try {
            const service = getVoiceAgentService();
            return service.lastUIAnalysis || null;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting screen analysis:', error);
            return null;
        }
    });

    // Sub-service specific handlers

    // Wake Word Detector
    ipcMain.handle('voice-agent:wakeWord:getStatus', async () => {
        try {
            const service = getVoiceAgentService();
            return service.wakeWordDetector ? service.wakeWordDetector.getStatus() : null;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting wake word status:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('voice-agent:wakeWord:updateConfig', async (event, config) => {
        try {
            const service = getVoiceAgentService();
            if (service.wakeWordDetector) {
                service.wakeWordDetector.updateConfig(config);
                return { success: true };
            }
            return { success: false, error: 'Wake word detector not available' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error updating wake word config:', error);
            return { success: false, error: error.message };
        }
    });

    // TTS Service
    ipcMain.handle('voice-agent:tts:speak', async (event, text, options = {}) => {
        try {
            const service = getVoiceAgentService();
            if (service.ttsService) {
                const result = await service.ttsService.speak(text, options);
                return result;
            }
            return { success: false, error: 'TTS service not available' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error with TTS:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:tts:stop', async () => {
        try {
            const service = getVoiceAgentService();
            if (service.ttsService) {
                const result = await service.ttsService.stopSpeaking();
                return result;
            }
            return { success: false, error: 'TTS service not available' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error stopping TTS:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:tts:getStatus', async () => {
        try {
            const service = getVoiceAgentService();
            return service.ttsService ? service.ttsService.getStatus() : null;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting TTS status:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('voice-agent:tts:setVoice', async (event, voiceName) => {
        try {
            const service = getVoiceAgentService();
            if (service.ttsService) {
                const result = await service.ttsService.setVoice(voiceName);
                return result;
            }
            return { success: false, error: 'TTS service not available' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error setting TTS voice:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:tts:getAvailableVoices', async () => {
        try {
            const service = getVoiceAgentService();
            if (service.ttsService) {
                const voices = await service.ttsService.getAvailableVoices();
                return { success: true, voices };
            }
            return { success: false, error: 'TTS service not available' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting available voices:', error);
            return { success: false, error: error.message };
        }
    });

    // Conversation Manager
    ipcMain.handle('voice-agent:conversation:getStatus', async () => {
        try {
            const service = getVoiceAgentService();
            return service.conversationManager ? service.conversationManager.getStatus() : null;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting conversation status:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('voice-agent:conversation:injectSpeech', async (event, text) => {
        try {
            const service = getVoiceAgentService();
            if (service.conversationManager) {
                await service.conversationManager.injectSpeech(text);
                return { success: true };
            }
            return { success: false, error: 'Conversation manager not available' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error injecting speech:', error);
            return { success: false, error: error.message };
        }
    });

    // Action Executor
    ipcMain.handle('voice-agent:action:getStatus', async () => {
        try {
            const service = getVoiceAgentService();
            return service.actionExecutor ? service.actionExecutor.getStatus() : null;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting action executor status:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('voice-agent:action:getHistory', async () => {
        try {
            const service = getVoiceAgentService();
            if (service.actionExecutor) {
                return service.actionExecutor.executionHistory.slice(-20); // Last 20 actions
            }
            return [];
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting action history:', error);
            return [];
        }
    });

    // Screen Analyzer
    ipcMain.handle('voice-agent:screen:getStatus', async () => {
        try {
            const service = getVoiceAgentService();
            return service.screenAnalyzer ? service.screenAnalyzer.getStatus() : null;
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting screen analyzer status:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('voice-agent:screen:findElements', async (event, searchCriteria) => {
        try {
            const service = getVoiceAgentService();
            if (service.screenAnalyzer && service.lastUIAnalysis) {
                const { type, text } = searchCriteria;
                
                let elements = [];
                if (type) {
                    elements = service.screenAnalyzer.findElementsByType(type);
                } else if (text) {
                    elements = service.screenAnalyzer.findElementsByText(text);
                } else {
                    elements = service.screenAnalyzer.findClickableElements();
                }
                
                return { success: true, elements };
            }
            return { success: false, error: 'Screen analyzer not available or no analysis' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error finding elements:', error);
            return { success: false, error: error.message };
        }
    });

    // Voice enrollment handlers
    ipcMain.handle('voice-agent:enrollment:start', async () => {
        try {
            const service = getVoiceAgentService();
            if (!service || !service.wakeWordDetector) {
                return { success: false, error: 'Voice agent service not available' };
            }
            const result = await service.wakeWordDetector.startVoiceEnrollment();
            console.log('[VoiceAgentBridge] Voice enrollment started');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Start enrollment failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:enrollment:recordSample', async () => {
        try {
            const service = getVoiceAgentService();
            if (!service || !service.wakeWordDetector) {
                return { success: false, error: 'Voice agent service not available' };
            }
            const result = await service.wakeWordDetector.recordEnrollmentSample();
            console.log('[VoiceAgentBridge] Enrollment sample recording started');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Record sample failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:enrollment:cancel', async () => {
        try {
            const service = getVoiceAgentService();
            if (!service || !service.wakeWordDetector) {
                return { success: false, error: 'Voice agent service not available' };
            }
            const result = await service.wakeWordDetector.cancelVoiceEnrollment();
            console.log('[VoiceAgentBridge] Voice enrollment cancelled');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Cancel enrollment failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:enrollment:reset', async () => {
        try {
            const service = getVoiceAgentService();
            if (!service || !service.wakeWordDetector) {
                return { success: false, error: 'Voice agent service not available' };
            }
            const result = await service.wakeWordDetector.resetVoiceTemplate();
            console.log('[VoiceAgentBridge] Voice template reset');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Reset voice template failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:enrollment:getStatus', async () => {
        try {
            const service = getVoiceAgentService();
            if (!service || !service.wakeWordDetector) {
                return { available: false, error: 'Voice agent service not available' };
            }
            const result = service.wakeWordDetector.getVoiceEnrollmentStatus();
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Get enrollment status failed:', error);
            return { available: false, error: error.message };
        }
    });

    // Testing handlers
    ipcMain.handle('voice-agent:test:wakeWord', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.testWakeWordDetection();
            console.log('[VoiceAgentBridge] Wake word test completed');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Wake word test failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:test:tts', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.testTTS();
            console.log('[VoiceAgentBridge] TTS test completed');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] TTS test failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:test:screenAnalysis', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.testScreenAnalysis();
            console.log('[VoiceAgentBridge] Screen analysis test completed');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Screen analysis test failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:test:actionExecution', async () => {
        try {
            const service = getVoiceAgentService();
            const result = await service.testActionExecution();
            console.log('[VoiceAgentBridge] Action execution test completed');
            return result;
        } catch (error) {
            console.error('[VoiceAgentBridge] Action execution test failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('voice-agent:test:fullSystem', async () => {
        try {
            const service = getVoiceAgentService();
            
            const testResults = {
                wakeWord: await service.testWakeWordDetection(),
                tts: await service.testTTS(),
                screenAnalysis: await service.testScreenAnalysis(),
                actionExecution: await service.testActionExecution(),
                overallStatus: service.getStatus()
            };
            
            console.log('[VoiceAgentBridge] Full system test completed');
            return { success: true, results: testResults };
            
        } catch (error) {
            console.error('[VoiceAgentBridge] Full system test failed:', error);
            return { success: false, error: error.message };
        }
    });

    // Conversation history
    ipcMain.handle('voice-agent:getConversationHistory', async () => {
        try {
            const service = getVoiceAgentService();
            return service.conversationHistory.slice(-10); // Last 10 conversations
        } catch (error) {
            console.error('[VoiceAgentBridge] Error getting conversation history:', error);
            return [];
        }
    });

    // Advanced features
    ipcMain.handle('voice-agent:simulateUserSpeech', async (event, speechText) => {
        try {
            const service = getVoiceAgentService();
            if (service.conversationManager && service.isConversing) {
                await service.handleUserSpeech(speechText);
                return { success: true };
            }
            return { success: false, error: 'No active conversation' };
        } catch (error) {
            console.error('[VoiceAgentBridge] Error simulating user speech:', error);
            return { success: false, error: error.message };
        }
    });

    // Event forwarding to renderer processes
    const service = getVoiceAgentService();
    if (service) {
        const broadcastToRenderers = (eventName, data) => {
            BrowserWindow.getAllWindows().forEach(window => {
                if (window.webContents && !window.webContents.isDestroyed()) {
                    window.webContents.send(eventName, data);
                }
            });
        };

        // Voice agent events
        service.on('voice-agent-enabled', () => {
            console.log('[VoiceAgentBridge] Broadcasting voice-agent-enabled');
            broadcastToRenderers('voice-agent:enabled');
        });

        service.on('voice-agent-disabled', () => {
            console.log('[VoiceAgentBridge] Broadcasting voice-agent-disabled');
            broadcastToRenderers('voice-agent:disabled');
        });

        service.on('conversation-started', () => {
            console.log('[VoiceAgentBridge] Broadcasting conversation-started');
            broadcastToRenderers('voice-agent:conversation-started');
        });

        service.on('conversation-ended', () => {
            console.log('[VoiceAgentBridge] Broadcasting conversation-ended');
            broadcastToRenderers('voice-agent:conversation-ended');
        });

        service.on('action-completed', (result) => {
            console.log('[VoiceAgentBridge] Broadcasting action-completed');
            broadcastToRenderers('voice-agent:action-completed', result);
        });

        service.on('action-failed', (error) => {
            console.log('[VoiceAgentBridge] Broadcasting action-failed');
            broadcastToRenderers('voice-agent:action-failed', error);
        });

        service.on('ui-analysis-updated', (analysis) => {
            console.log('[VoiceAgentBridge] Broadcasting ui-analysis-updated');
            broadcastToRenderers('voice-agent:ui-analysis-updated', {
                timestamp: analysis.timestamp,
                elementsFound: analysis.elements?.length || 0,
                confidence: analysis.confidence
            });
        });

        service.on('config-updated', (config) => {
            console.log('[VoiceAgentBridge] Broadcasting config-updated');
            broadcastToRenderers('voice-agent:config-updated', config);
        });

        // Wake word detector events
        if (service.wakeWordDetector) {
            service.wakeWordDetector.on('wake-word-detected', (data) => {
                console.log('[VoiceAgentBridge] Broadcasting wake-word-detected');
                broadcastToRenderers('voice-agent:wake-word-detected', data);
            });

            service.wakeWordDetector.on('listening-started', () => {
                broadcastToRenderers('voice-agent:listening-started');
            });

            service.wakeWordDetector.on('listening-stopped', () => {
                broadcastToRenderers('voice-agent:listening-stopped');
            });

            // Voice enrollment events
            service.wakeWordDetector.on('voice-enrollment-started', (data) => {
                console.log('[VoiceAgentBridge] Broadcasting voice-enrollment-started');
                broadcastToRenderers('voice-agent:voice-enrollment-started', data);
            });

            service.wakeWordDetector.on('voice-sample-recording-started', (data) => {
                console.log('[VoiceAgentBridge] Broadcasting voice-sample-recording-started');
                broadcastToRenderers('voice-agent:voice-sample-recording-started', data);
            });

            service.wakeWordDetector.on('voice-sample-recorded', (data) => {
                console.log('[VoiceAgentBridge] Broadcasting voice-sample-recorded');
                broadcastToRenderers('voice-agent:voice-sample-recorded', data);
            });

            service.wakeWordDetector.on('voice-sample-rejected', (data) => {
                console.log('[VoiceAgentBridge] Broadcasting voice-sample-rejected');
                broadcastToRenderers('voice-agent:voice-sample-rejected', data);
            });

            service.wakeWordDetector.on('voice-enrollment-completed', (data) => {
                console.log('[VoiceAgentBridge] Broadcasting voice-enrollment-completed');
                broadcastToRenderers('voice-agent:voice-enrollment-completed', data);
            });

            service.wakeWordDetector.on('voice-enrollment-cancelled', () => {
                console.log('[VoiceAgentBridge] Broadcasting voice-enrollment-cancelled');
                broadcastToRenderers('voice-agent:voice-enrollment-cancelled');
            });
        }

        // TTS events
        if (service.ttsService) {
            service.ttsService.on('speech-completed', (data) => {
                broadcastToRenderers('voice-agent:speech-completed', data);
            });

            service.ttsService.on('speech-failed', (data) => {
                broadcastToRenderers('voice-agent:speech-failed', data);
            });

            service.ttsService.on('speech-stopped', () => {
                broadcastToRenderers('voice-agent:speech-stopped');
            });
        }

        // Conversation manager events
        if (service.conversationManager) {
            service.conversationManager.on('speech-recognized', (text) => {
                broadcastToRenderers('voice-agent:speech-recognized', { text });
            });

            service.conversationManager.on('conversation-timeout', () => {
                broadcastToRenderers('voice-agent:conversation-timeout');
            });

            service.conversationManager.on('silence-timeout', () => {
                broadcastToRenderers('voice-agent:silence-timeout');
            });
        }
    }

    console.log('[VoiceAgentBridge] IPC handlers initialized with event forwarding');
}

module.exports = { initializeVoiceAgentBridge }; 