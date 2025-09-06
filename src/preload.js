// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Platform information for renderer processes
  platform: {
    isLinux: process.platform === 'linux',
    isMacOS: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    platform: process.platform
  },

  // MCP (Model Context Protocol) Integration API
  mcp: {
    // Server management
    getServerStatus: () => ipcRenderer.invoke('mcp:getServerStatus'),
    startServer: (serverName, config) => ipcRenderer.invoke('mcp:startServer', serverName, config),
    stopServer: (serverName) => ipcRenderer.invoke('mcp:stopServer', serverName),
    removeServer: (serverName) => ipcRenderer.invoke('mcp:removeServer', serverName),
    testConnection: (serviceName) => ipcRenderer.invoke('mcp:testConnection', serviceName),
    
    // External service setup
    setupExternalService: (serviceName, authType) => ipcRenderer.invoke('mcp:setupExternalService', serviceName, authType),
    disconnectService: (serviceName) => ipcRenderer.invoke('mcp:disconnectService', serviceName),
    getSupportedServices: () => ipcRenderer.invoke('mcp:getSupportedServices'),
    getRegistryServices: () => ipcRenderer.invoke('mcp:getRegistryServices'),
    
    // Paragon Service Management
    getParagonServiceStatus: () => ipcRenderer.invoke('mcp:getParagonServiceStatus'),
    authenticateParagonService: (serviceKey, options) => ipcRenderer.invoke('mcp:authenticateParagonService', serviceKey, options),
    disconnectParagonService: (serviceKey) => ipcRenderer.invoke('mcp:disconnectParagonService', serviceKey),
    
    // Paragon Connect Portal Integration
    paragon: {
      authenticate: (service) => ipcRenderer.invoke('paragon:authenticate', service),
      disconnect: (service) => ipcRenderer.invoke('paragon:disconnect', service),
      getStatus: (service) => ipcRenderer.invoke('paragon:status', service),
      handleOAuthCallback: (code, state) => ipcRenderer.invoke('paragon:handleOAuthCallback', code, state),
      // Listen for OAuth callback events from main process
      onOAuthCallback: (callback) => {
        const wrappedCallback = (event, data) => callback(data);
        ipcRenderer.on('paragon:oauth-callback-received', wrappedCallback);
        // Return cleanup function
        return () => ipcRenderer.removeListener('paragon:oauth-callback-received', wrappedCallback);
      },
    },
    
    // Authentication
    openOAuthWindow: (authUrl, provider, service) => ipcRenderer.invoke('mcp:openOAuthWindow', authUrl, provider, service),
    openExternalUrl: (url) => ipcRenderer.invoke('open-external', url),
    handleOAuthCallback: (code, state) => ipcRenderer.invoke('mcp:handleOAuthCallback', code, state),
    getAuthenticationStatus: () => ipcRenderer.invoke('mcp:getAuthenticationStatus'),
    setCredential: (key, value) => ipcRenderer.invoke('mcp:setCredential', key, value),
    validateConfiguration: () => ipcRenderer.invoke('mcp:validateConfiguration'),
    
    // Authentication completion notifications
    notifyAuthenticationComplete: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationComplete', data),
    notifyAuthenticationFailed: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationFailed', data),
    
    // Protocol and connectivity testing
    testProtocolHandling: () => ipcRenderer.invoke('mcp:testProtocolHandling'),
    processOAuthManually: (code, state) => ipcRenderer.invoke('mcp:processOAuthManually', code, state),
    
    // Tool operations
    callTool: (toolName, args) => ipcRenderer.invoke('mcp:callTool', toolName, args),
    getAvailableTools: () => ipcRenderer.invoke('mcp:getAvailableTools'),
    
    // Event listeners
    onServersUpdated: (callback) => ipcRenderer.on('mcp:servers-updated', callback),
    onAuthStatusUpdated: (callback) => ipcRenderer.on('mcp:auth-status-updated', callback),
    onCredentialUpdated: (callback) => ipcRenderer.on('mcp:credential-updated', callback),
    onServerAdded: (callback) => ipcRenderer.on('mcp:server-added', callback),
    
    // Remove listeners
    removeServersUpdated: (callback) => ipcRenderer.removeListener('mcp:servers-updated', callback),
    removeAuthStatusUpdated: (callback) => ipcRenderer.removeListener('mcp:auth-status-updated', callback),
    removeCredentialUpdated: (callback) => ipcRenderer.removeListener('mcp:credential-updated', callback),
    removeServerAdded: (callback) => ipcRenderer.removeListener('mcp:server-added', callback),
    
    // MCP UI methods
    ui: {
      // Get active UI resources
      getActiveResources: () => ipcRenderer.invoke('mcp:ui:getActiveResources'),
      
      // Invoke UI action
      invokeAction: (actionData) => ipcRenderer.invoke('mcp:ui:invokeAction', actionData),
      
      // Remove UI resource
      removeResource: (resourceId) => ipcRenderer.invoke('mcp:ui:removeResource', resourceId),
      
      // Get tool UI capabilities
      getToolUICapabilities: (toolName) => ipcRenderer.invoke('mcp:ui:getToolUICapabilities', toolName),
      
      // Get contextual actions
      getContextualActions: (context) => ipcRenderer.invoke('mcp:ui:getContextualActions', context),
      
      // Execute an action
      executeAction: (actionId, context) => ipcRenderer.invoke('mcp:ui:executeAction', actionId, context),
      
      // Event listeners for UI resources
      onResourceAvailable: (callback) => ipcRenderer.on('mcp:ui-resource-available', callback),
      onResourceRemoved: (callback) => ipcRenderer.on('mcp:ui-resource-removed', callback),
      
      // Remove UI event listeners
      removeResourceAvailable: (callback) => ipcRenderer.removeListener('mcp:ui-resource-available', callback),
      removeResourceRemoved: (callback) => ipcRenderer.removeListener('mcp:ui-resource-removed', callback)
    }
  },

  // Complete Invisibility Mode API
  invisibility: {
    // Control
    enable: () => ipcRenderer.invoke('invisibility:enable'),
    disable: () => ipcRenderer.invoke('invisibility:disable'),
    
    // Status
    getStatus: () => ipcRenderer.invoke('invisibility:getStatus'),
    
    // Configuration
    updateConfig: (config) => ipcRenderer.invoke('invisibility:updateConfig', config),
    
    // Manual triggers
    processQuestion: () => ipcRenderer.invoke('invisibility:processQuestion'),
    
    // Testing methods
    testQuestionDetection: () => ipcRenderer.invoke('invisibility:testQuestionDetection'),
    testFieldDetection: () => ipcRenderer.invoke('invisibility:testFieldDetection'),
    testTyping: () => ipcRenderer.invoke('invisibility:testTyping'),
    testAnswerGeneration: () => ipcRenderer.invoke('invisibility:testAnswerGeneration'),
    testRemoteAccessDetection: () => ipcRenderer.invoke('invisibility:testRemoteAccessDetection'),
    
    // Event listeners
    onModeEnabled: (callback) => ipcRenderer.on('invisibility:mode-enabled', callback),
    removeModeEnabled: (callback) => ipcRenderer.removeListener('invisibility:mode-enabled', callback),
    onModeDisabled: (callback) => ipcRenderer.on('invisibility:mode-disabled', callback),
    removeModeDisabled: (callback) => ipcRenderer.removeListener('invisibility:mode-disabled', callback),
    onRemoteAccessDetected: (callback) => ipcRenderer.on('invisibility:remote-access-detected', callback),
    removeRemoteAccessDetected: (callback) => ipcRenderer.removeListener('invisibility:remote-access-detected', callback),
    onRemoteAccessEnded: (callback) => ipcRenderer.on('invisibility:remote-access-ended', callback),
    removeRemoteAccessEnded: (callback) => ipcRenderer.removeListener('invisibility:remote-access-ended', callback),
    onOverlayHidden: (callback) => ipcRenderer.on('invisibility:overlay-hidden', callback),
    removeOverlayHidden: (callback) => ipcRenderer.removeListener('invisibility:overlay-hidden', callback),
    onOverlayShown: (callback) => ipcRenderer.on('invisibility:overlay-shown', callback),
    removeOverlayShown: (callback) => ipcRenderer.removeListener('invisibility:overlay-shown', callback),
    onConfigUpdated: (callback) => ipcRenderer.on('invisibility:config-updated', callback),
    removeConfigUpdated: (callback) => ipcRenderer.removeListener('invisibility:config-updated', callback)
  },
  
  // Common utilities used across multiple components
  common: {
    // User & Auth
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    startFirebaseAuth: () => ipcRenderer.invoke('start-firebase-auth'),
    startServerSideAuth: () => ipcRenderer.invoke('start-server-side-auth'),
    authenticateWithServerToken: (userInfo) => ipcRenderer.invoke('authenticate-with-server-token', userInfo),
    firebaseLogout: () => ipcRenderer.invoke('firebase-logout'),
    
    // App Control
      quitApplication: () => ipcRenderer.invoke('quit-application'),
      openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // User state listener (used by multiple components)
      onUserStateChanged: (callback) => ipcRenderer.on('user-state-changed', callback),
      removeOnUserStateChanged: (callback) => ipcRenderer.removeListener('user-state-changed', callback),
  },

  // UI Component specific namespaces
  // src/ui/app/ApiKeyHeader.js
  apiKeyHeader: {
    // Model & Provider Management
    getProviderConfig: () => ipcRenderer.invoke('model:get-provider-config'),
    // LocalAI 통합 API
    getLocalAIStatus: (service) => ipcRenderer.invoke('localai:get-status', service),
    installLocalAI: (service, options) => ipcRenderer.invoke('localai:install', { service, options }),
    startLocalAIService: (service) => ipcRenderer.invoke('localai:start-service', service),
    stopLocalAIService: (service) => ipcRenderer.invoke('localai:stop-service', service),
    installLocalAIModel: (service, modelId, options) => ipcRenderer.invoke('localai:install-model', { service, modelId, options }),
    getInstalledModels: (service) => ipcRenderer.invoke('localai:get-installed-models', service),
    
    // Legacy support (호환성 위해 유지)
    getOllamaStatus: () => ipcRenderer.invoke('localai:get-status', 'ollama'),
    getModelSuggestions: () => ipcRenderer.invoke('ollama:get-model-suggestions'),
    ensureOllamaReady: () => ipcRenderer.invoke('ollama:ensure-ready'),
    installOllama: () => ipcRenderer.invoke('localai:install', { service: 'ollama' }),
    startOllamaService: () => ipcRenderer.invoke('localai:start-service', 'ollama'),
    pullOllamaModel: (modelName) => ipcRenderer.invoke('ollama:pull-model', modelName),
    downloadWhisperModel: (modelId) => ipcRenderer.invoke('whisper:download-model', modelId),
    validateKey: (data) => ipcRenderer.invoke('model:validate-key', data),
    setSelectedModel: (data) => ipcRenderer.invoke('model:set-selected-model', data),
    areProvidersConfigured: () => ipcRenderer.invoke('model:are-providers-configured'),
    
    // Window Management
    getHeaderPosition: () => ipcRenderer.invoke('get-header-position'),
    moveHeaderTo: (x, y) => ipcRenderer.invoke('move-header-to', x, y),
    
    // Listeners
    // LocalAI 통합 이벤트 리스너
    onLocalAIProgress: (callback) => ipcRenderer.on('localai:install-progress', callback),
    removeOnLocalAIProgress: (callback) => ipcRenderer.removeListener('localai:install-progress', callback),
    onLocalAIComplete: (callback) => ipcRenderer.on('localai:installation-complete', callback),
    removeOnLocalAIComplete: (callback) => ipcRenderer.removeListener('localai:installation-complete', callback),
    onLocalAIError: (callback) => ipcRenderer.on('localai:error-notification', callback),
    removeOnLocalAIError: (callback) => ipcRenderer.removeListener('localai:error-notification', callback),
    onLocalAIModelReady: (callback) => ipcRenderer.on('localai:model-ready', callback),
    removeOnLocalAIModelReady: (callback) => ipcRenderer.removeListener('localai:model-ready', callback),
    

    // Remove all listeners (for cleanup)
    removeAllListeners: () => {
      // LocalAI 통합 이벤트
      ipcRenderer.removeAllListeners('localai:install-progress');
      ipcRenderer.removeAllListeners('localai:installation-complete');
      ipcRenderer.removeAllListeners('localai:error-notification');
      ipcRenderer.removeAllListeners('localai:model-ready');
      ipcRenderer.removeAllListeners('localai:service-status-changed');
    }
  },

  // src/ui/app/HeaderController.js
  headerController: {
    // State Management
    sendHeaderStateChanged: (state) => ipcRenderer.send('header-state-changed', state),
    reInitializeModelState: () => ipcRenderer.invoke('model:re-initialize-state'),
    
    // Window Management
    resizeHeaderWindow: (dimensions) => ipcRenderer.invoke('resize-header-window', dimensions),
    
    // Permissions
    checkSystemPermissions: () => ipcRenderer.invoke('check-system-permissions'),
    checkPermissionsCompleted: () => ipcRenderer.invoke('check-permissions-completed'),
    
    // Listeners
    onUserStateChanged: (callback) => ipcRenderer.on('user-state-changed', callback),
    removeOnUserStateChanged: (callback) => ipcRenderer.removeListener('user-state-changed', callback),
    onAuthFailed: (callback) => ipcRenderer.on('auth-failed', callback),
    removeOnAuthFailed: (callback) => ipcRenderer.removeListener('auth-failed', callback),
    onForceShowApiKeyHeader: (callback) => ipcRenderer.on('force-show-apikey-header', callback),
    removeOnForceShowApiKeyHeader: (callback) => ipcRenderer.removeListener('force-show-apikey-header', callback),
  },

  // src/ui/app/MainHeader.js
  mainHeader: {
    // Window Management
    getHeaderPosition: () => ipcRenderer.invoke('get-header-position'),
    moveHeaderTo: (x, y) => ipcRenderer.invoke('move-header-to', x, y),
    sendHeaderAnimationFinished: (state) => ipcRenderer.send('header-animation-finished', state),

    // Settings Window Management
    cancelHideSettingsWindow: () => ipcRenderer.send('cancel-hide-settings-window'),
    showSettingsWindow: () => ipcRenderer.send('show-settings-window'),
    hideSettingsWindow: () => ipcRenderer.send('hide-settings-window'),
    
    // Generic invoke (for dynamic channel names)
    // invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    sendListenButtonClick: (listenButtonText) => ipcRenderer.invoke('listen:changeSession', listenButtonText),
    sendAskButtonClick: () => ipcRenderer.invoke('ask:toggleAskButton'),
    sendToggleAllWindowsVisibility: () => ipcRenderer.invoke('shortcut:toggleAllWindowsVisibility'),
    sendBrowserToggle: () => ipcRenderer.invoke('main-header:browser-toggle'),
    sendBrowserNavigate: (url) => ipcRenderer.invoke('main-header:browser-navigate', url),
    
    // Listeners
    onListenChangeSessionResult: (callback) => ipcRenderer.on('listen:changeSessionResult', callback),
    removeOnListenChangeSessionResult: (callback) => ipcRenderer.removeListener('listen:changeSessionResult', callback),
    onShortcutsUpdated: (callback) => ipcRenderer.on('shortcuts-updated', callback),
    removeOnShortcutsUpdated: (callback) => ipcRenderer.removeListener('shortcuts-updated', callback)
  },

  // src/ui/app/PermissionHeader.js
  permissionHeader: {
    // Permission Management
    checkSystemPermissions: () => ipcRenderer.invoke('check-system-permissions'),
    requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
    openSystemPreferences: (preference) => ipcRenderer.invoke('open-system-preferences', preference),
    markKeychainCompleted: () => ipcRenderer.invoke('mark-keychain-completed'),
    checkKeychainCompleted: (uid) => ipcRenderer.invoke('check-keychain-completed', uid),
    initializeEncryptionKey: () => ipcRenderer.invoke('initialize-encryption-key') // New for keychain
  },

  // src/ui/app/LeviousaApp.js
leviousaApp: {
    // Listeners
    onClickThroughToggled: (callback) => ipcRenderer.on('click-through-toggled', callback),
    removeOnClickThroughToggled: (callback) => ipcRenderer.removeListener('click-through-toggled', callback),
    removeAllClickThroughListeners: () => ipcRenderer.removeAllListeners('click-through-toggled')
  },

  // src/ui/ask/AskView.js
  askView: {
    // Window Management
    closeAskWindow: () => ipcRenderer.invoke('ask:closeAskWindow'),
    adjustWindowHeight: (winName, height) => ipcRenderer.invoke('adjust-window-height', { winName, height }),
    
    // Message Handling
    sendMessage: (text, conversationHistory = []) => ipcRenderer.invoke('ask:sendQuestionFromAsk', text, conversationHistory),

    // Listeners
    onAskStateUpdate: (callback) => ipcRenderer.on('ask:stateUpdate', callback),
    removeOnAskStateUpdate: (callback) => ipcRenderer.removeListener('ask:stateUpdate', callback),

    onAskStreamError: (callback) => ipcRenderer.on('ask-response-stream-error', callback),
    removeOnAskStreamError: (callback) => ipcRenderer.removeListener('ask-response-stream-error', callback),

    // Listeners
    onShowTextInput: (callback) => ipcRenderer.on('ask:showTextInput', callback),
    removeOnShowTextInput: (callback) => ipcRenderer.removeListener('ask:showTextInput', callback),
    
    onScrollResponseUp: (callback) => ipcRenderer.on('aks:scrollResponseUp', callback),
    removeOnScrollResponseUp: (callback) => ipcRenderer.removeListener('aks:scrollResponseUp', callback),
    onScrollResponseDown: (callback) => ipcRenderer.on('aks:scrollResponseDown', callback),
    removeOnScrollResponseDown: (callback) => ipcRenderer.removeListener('aks:scrollResponseDown', callback)
  },

  // src/ui/listen/ListenView.js
  listenView: {
    // Window Management
    adjustWindowHeight: (winName, height) => ipcRenderer.invoke('adjust-window-height', { winName, height }),
    
    // Listeners
    onSessionStateChanged: (callback) => ipcRenderer.on('session-state-changed', callback),
    removeOnSessionStateChanged: (callback) => ipcRenderer.removeListener('session-state-changed', callback)
  },

  // src/ui/listen/stt/SttView.js
  sttView: {
    // Listeners
    onSttUpdate: (callback) => ipcRenderer.on('stt-update', callback),
    removeOnSttUpdate: (callback) => ipcRenderer.removeListener('stt-update', callback)
  },

  // src/ui/listen/summary/SummaryView.js
  summaryView: {
    // Message Handling
    sendQuestionFromSummary: (text) => ipcRenderer.invoke('ask:sendQuestionFromSummary', text),
    
    // Listeners
    onSummaryUpdate: (callback) => ipcRenderer.on('summary-update', callback),
    removeOnSummaryUpdate: (callback) => ipcRenderer.removeListener('summary-update', callback),
    removeAllSummaryUpdateListeners: () => ipcRenderer.removeAllListeners('summary-update')
  },

  // src/ui/settings/SettingsView.js
  settingsView: {
    // User & Auth
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    openPersonalizePage: () => ipcRenderer.invoke('open-personalize-page'),
    firebaseLogout: () => ipcRenderer.invoke('firebase-logout'),
    startFirebaseAuth: () => ipcRenderer.invoke('start-firebase-auth'),
    getFirebaseToken: () => ipcRenderer.invoke('settings:get-firebase-token'),
    
    // Subscription
    getSubscription: () => ipcRenderer.invoke('subscription:getCurrentUser'),

    // Model & Provider Management
    getModelSettings: () => ipcRenderer.invoke('settings:get-model-settings'), // Facade call
    getProviderConfig: () => ipcRenderer.invoke('model:get-provider-config'),
    getAllKeys: () => ipcRenderer.invoke('model:get-all-keys'),
    getAvailableModels: (type) => ipcRenderer.invoke('model:get-available-models', type),
    getSelectedModels: () => ipcRenderer.invoke('model:get-selected-models'),
    validateKey: (data) => ipcRenderer.invoke('model:validate-key', data),
    saveApiKey: (key) => ipcRenderer.invoke('model:save-api-key', key),
    removeApiKey: (provider) => ipcRenderer.invoke('model:remove-api-key', provider),
    setSelectedModel: (data) => ipcRenderer.invoke('model:set-selected-model', data),
    
    // Ollama Management
    getOllamaStatus: () => ipcRenderer.invoke('ollama:get-status'),
    ensureOllamaReady: () => ipcRenderer.invoke('ollama:ensure-ready'),
    shutdownOllama: (graceful) => ipcRenderer.invoke('ollama:shutdown', graceful),
    
    // Whisper Management
    getWhisperInstalledModels: () => ipcRenderer.invoke('whisper:get-installed-models'),
    downloadWhisperModel: (modelId) => ipcRenderer.invoke('whisper:download-model', modelId),
    
    // Settings Management
    getPresets: () => ipcRenderer.invoke('settings:getPresets'),
    getAutoUpdate: () => ipcRenderer.invoke('settings:get-auto-update'),
    setAutoUpdate: (isEnabled) => ipcRenderer.invoke('settings:set-auto-update', isEnabled),
    getContentProtectionStatus: () => ipcRenderer.invoke('get-content-protection-status'),
    toggleContentProtection: () => ipcRenderer.invoke('toggle-content-protection'),
    getCurrentShortcuts: () => ipcRenderer.invoke('settings:getCurrentShortcuts'),
    openShortcutSettingsWindow: () => ipcRenderer.invoke('shortcut:openShortcutSettingsWindow'),
    
    // Window Management
    moveWindowStep: (direction) => ipcRenderer.invoke('move-window-step', direction),
    cancelHideSettingsWindow: () => ipcRenderer.send('cancel-hide-settings-window'),
    hideSettingsWindow: () => ipcRenderer.send('hide-settings-window'),
    
    // App Control
    quitApplication: () => ipcRenderer.invoke('quit-application'),
    
    // Progress Tracking
    pullOllamaModel: (modelName) => ipcRenderer.invoke('ollama:pull-model', modelName),
    
    // Listeners
    onUserStateChanged: (callback) => ipcRenderer.on('user-state-changed', callback),
    removeOnUserStateChanged: (callback) => ipcRenderer.removeListener('user-state-changed', callback),
    onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', callback),
    removeOnSettingsUpdated: (callback) => ipcRenderer.removeListener('settings-updated', callback),
    onPresetsUpdated: (callback) => ipcRenderer.on('presets-updated', callback),
    removeOnPresetsUpdated: (callback) => ipcRenderer.removeListener('presets-updated', callback),
    onShortcutsUpdated: (callback) => ipcRenderer.on('shortcuts-updated', callback),
    removeOnShortcutsUpdated: (callback) => ipcRenderer.removeListener('shortcuts-updated', callback),
    // 통합 LocalAI 이벤트 사용
    onLocalAIInstallProgress: (callback) => ipcRenderer.on('localai:install-progress', callback),
    removeOnLocalAIInstallProgress: (callback) => ipcRenderer.removeListener('localai:install-progress', callback),
    onLocalAIInstallationComplete: (callback) => ipcRenderer.on('localai:installation-complete', callback),
    removeOnLocalAIInstallationComplete: (callback) => ipcRenderer.removeListener('localai:installation-complete', callback)
  },

  // src/ui/settings/ShortCutSettingsView.js
  shortcutSettingsView: {
    // Shortcut Management
    saveShortcuts: (shortcuts) => ipcRenderer.invoke('shortcut:saveShortcuts', shortcuts),
    getDefaultShortcuts: () => ipcRenderer.invoke('shortcut:getDefaultShortcuts'),
    closeShortcutSettingsWindow: () => ipcRenderer.invoke('shortcut:closeShortcutSettingsWindow'),
    
    // Listeners
    onLoadShortcuts: (callback) => ipcRenderer.on('shortcut:loadShortcuts', callback),
    removeOnLoadShortcuts: (callback) => ipcRenderer.removeListener('shortcut:loadShortcuts', callback)
  },

  // src/ui/app/content.html inline scripts
  content: {
    // Listeners
    onSettingsWindowHideAnimation: (callback) => ipcRenderer.on('settings-window-hide-animation', callback),
    removeOnSettingsWindowHideAnimation: (callback) => ipcRenderer.removeListener('settings-window-hide-animation', callback),    
  },

  // src/ui/listen/audioCore/listenCapture.js
  listenCapture: {
    // Audio Management
    sendMicAudioContent: (data) => ipcRenderer.invoke('listen:sendMicAudio', data),
    sendSystemAudioContent: (data) => ipcRenderer.invoke('listen:sendSystemAudio', data),
    startMacosSystemAudio: () => ipcRenderer.invoke('listen:startMacosSystemAudio'),
    stopMacosSystemAudio: () => ipcRenderer.invoke('listen:stopMacosSystemAudio'),
    
    // Session Management
    isSessionActive: () => ipcRenderer.invoke('listen:isSessionActive'),
    
    // Listeners
    onSystemAudioData: (callback) => ipcRenderer.on('system-audio-data', callback),
    removeOnSystemAudioData: (callback) => ipcRenderer.removeListener('system-audio-data', callback)
  },

  // src/ui/listen/audioCore/renderer.js
  renderer: {
    // Listeners
    onChangeListenCaptureState: (callback) => ipcRenderer.on('change-listen-capture-state', callback),
    removeOnChangeListenCaptureState: (callback) => ipcRenderer.removeListener('change-listen-capture-state', callback)
  },

  // Voice Agent API - "Hey Leviousa" Assistant
  voiceAgent: {
    // Main control
    enable: () => ipcRenderer.invoke('voice-agent:enable'),
    disable: () => ipcRenderer.invoke('voice-agent:disable'),
    getStatus: () => ipcRenderer.invoke('voice-agent:getStatus'),
    updateConfig: (config) => ipcRenderer.invoke('voice-agent:updateConfig', config),
    
    // Manual triggers
    triggerWakeWord: () => ipcRenderer.invoke('voice-agent:triggerWakeWord'),
    triggerVoiceCommand: (command) => ipcRenderer.invoke('voice-agent:triggerVoiceCommand', command),
    endConversation: () => ipcRenderer.invoke('voice-agent:endConversation'),
    
    // Screen analysis
    analyzeScreen: () => ipcRenderer.invoke('voice-agent:analyzeScreen'),
    getLastScreenAnalysis: () => ipcRenderer.invoke('voice-agent:getLastScreenAnalysis'),
    findElements: (criteria) => ipcRenderer.invoke('voice-agent:screen:findElements', criteria),
    
    // Text-to-Speech
    speak: (text, options) => ipcRenderer.invoke('voice-agent:tts:speak', text, options),
    stopSpeaking: () => ipcRenderer.invoke('voice-agent:tts:stop'),
    setVoice: (voiceName) => ipcRenderer.invoke('voice-agent:tts:setVoice', voiceName),
    getAvailableVoices: () => ipcRenderer.invoke('voice-agent:tts:getAvailableVoices'),
    
    // Conversation
    injectSpeech: (text) => ipcRenderer.invoke('voice-agent:conversation:injectSpeech', text),
    simulateUserSpeech: (text) => ipcRenderer.invoke('voice-agent:simulateUserSpeech', text),
    getConversationHistory: () => ipcRenderer.invoke('voice-agent:getConversationHistory'),
    
    // Action execution
    getActionHistory: () => ipcRenderer.invoke('voice-agent:action:getHistory'),
    
    // Sub-service status
    getWakeWordStatus: () => ipcRenderer.invoke('voice-agent:wakeWord:getStatus'),
    getTTSStatus: () => ipcRenderer.invoke('voice-agent:tts:getStatus'),
    getConversationStatus: () => ipcRenderer.invoke('voice-agent:conversation:getStatus'),
    getActionStatus: () => ipcRenderer.invoke('voice-agent:action:getStatus'),
    getScreenStatus: () => ipcRenderer.invoke('voice-agent:screen:getStatus'),
    
    // Testing
    testWakeWord: () => ipcRenderer.invoke('voice-agent:test:wakeWord'),
    testTTS: () => ipcRenderer.invoke('voice-agent:test:tts'),
    testScreenAnalysis: () => ipcRenderer.invoke('voice-agent:test:screenAnalysis'),
    testActionExecution: () => ipcRenderer.invoke('voice-agent:test:actionExecution'),
    testFullSystem: () => ipcRenderer.invoke('voice-agent:test:fullSystem'),
    
    // Voice enrollment - Siri-like voice training
    startVoiceEnrollment: () => ipcRenderer.invoke('voice-agent:enrollment:start'),
    recordEnrollmentSample: () => ipcRenderer.invoke('voice-agent:enrollment:recordSample'),
    cancelVoiceEnrollment: () => ipcRenderer.invoke('voice-agent:enrollment:cancel'),
    resetVoiceTemplate: () => ipcRenderer.invoke('voice-agent:enrollment:reset'),
    getVoiceEnrollmentStatus: () => ipcRenderer.invoke('voice-agent:enrollment:getStatus'),
    
    // Event listeners
    onEnabled: (callback) => ipcRenderer.on('voice-agent:enabled', callback),
    onDisabled: (callback) => ipcRenderer.on('voice-agent:disabled', callback),
    onConversationStarted: (callback) => ipcRenderer.on('voice-agent:conversation-started', callback),
    onConversationEnded: (callback) => ipcRenderer.on('voice-agent:conversation-ended', callback),
    onWakeWordDetected: (callback) => ipcRenderer.on('voice-agent:wake-word-detected', callback),
    onSpeechRecognized: (callback) => ipcRenderer.on('voice-agent:speech-recognized', callback),
    onActionCompleted: (callback) => ipcRenderer.on('voice-agent:action-completed', callback),
    onActionFailed: (callback) => ipcRenderer.on('voice-agent:action-failed', callback),
    onSpeechCompleted: (callback) => ipcRenderer.on('voice-agent:speech-completed', callback),
    onSpeechFailed: (callback) => ipcRenderer.on('voice-agent:speech-failed', callback),
    onUIAnalysisUpdated: (callback) => ipcRenderer.on('voice-agent:ui-analysis-updated', callback),
    onConfigUpdated: (callback) => ipcRenderer.on('voice-agent:config-updated', callback),
    onListeningStarted: (callback) => ipcRenderer.on('voice-agent:listening-started', callback),
    onListeningStopped: (callback) => ipcRenderer.on('voice-agent:listening-stopped', callback),
    onConversationTimeout: (callback) => ipcRenderer.on('voice-agent:conversation-timeout', callback),
    onSilenceTimeout: (callback) => ipcRenderer.on('voice-agent:silence-timeout', callback),
    
    // Voice enrollment event listeners
    onVoiceEnrollmentStarted: (callback) => ipcRenderer.on('voice-agent:voice-enrollment-started', callback),
    onVoiceSampleRecordingStarted: (callback) => ipcRenderer.on('voice-agent:voice-sample-recording-started', callback),
    onVoiceSampleRecorded: (callback) => ipcRenderer.on('voice-agent:voice-sample-recorded', callback),
    onVoiceSampleRejected: (callback) => ipcRenderer.on('voice-agent:voice-sample-rejected', callback),
    onVoiceEnrollmentCompleted: (callback) => ipcRenderer.on('voice-agent:voice-enrollment-completed', callback),
    onVoiceEnrollmentCancelled: (callback) => ipcRenderer.on('voice-agent:voice-enrollment-cancelled', callback)
  }
});

// Add Paragon-specific IPC for auth window communication
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // Allow specific channels for Paragon auth communication
      const validChannels = ['paragon-auth-complete', 'paragon-auth-error'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    }
  },
  // Expose listener for Paragon connect triggers
  onTriggerConnect: (listener) => {
    ipcRenderer.on('mcp:trigger-connect', (_event, serviceKey) => {
      listener(serviceKey);
    });
  },
  authenticateParagonService: (serviceKey, options) => ipcRenderer.invoke('mcp:authenticateParagonService', serviceKey, options)
});

// Ensure browser environment is complete before loading Paragon SDK
function setupBrowserEnvironment() {
  // Ensure localStorage exists (it should in Electron, but add fallback)
  if (!window.localStorage) {
    const mockStorage = {
      data: {},
      getItem: function(key) { return this.data[key] || null; },
      setItem: function(key, value) { this.data[key] = value; },
      removeItem: function(key) { delete this.data[key]; },
      clear: function() { this.data = {}; },
      get length() { return Object.keys(this.data).length; },
      key: function(index) { return Object.keys(this.data)[index] || null; }
    };
    window.localStorage = mockStorage;
    window.sessionStorage = mockStorage;
  }

  // Ensure DOM methods exist
  if (!document.querySelector) {
    document.querySelector = () => null;
    document.querySelectorAll = () => [];
    document.getElementById = () => null;
  }

  // Ensure window dimensions are available
  if (!window.innerHeight) {
    window.innerHeight = 600;
    window.innerWidth = 800;
  }
}

// Load Paragon SDK from node_modules (Headless Connect Portal approach)
let paragonSDK = null;
try {
  console.log('[Preload] 🔧 Setting up browser environment for Paragon SDK...');
  setupBrowserEnvironment();
  
  console.log('[Preload] 📦 Loading Paragon SDK from node_modules...');
  // Import the paragon SDK from the installed npm package
  const paragonModule = require('@useparagon/connect');
  paragonSDK = paragonModule.paragon || paragonModule.default || paragonModule;
  console.log('[Preload] ✅ Paragon SDK loaded successfully from node_modules');
} catch (error) {
  console.error('[Preload] ❌ Failed to load Paragon SDK:', error.message);
  console.error('[Preload] Stack trace:', error.stack);
}

// Expose Paragon headless SDK to the renderer with safety checks
contextBridge.exposeInMainWorld('paragonSDK', {
  authenticate: async (...args) => {
    if (!paragonSDK?.authenticate) throw new Error('Paragon SDK not available');
    return await paragonSDK.authenticate(...args);
  },
  installIntegration: async (...args) => {
    if (!paragonSDK?.installIntegration) throw new Error('Paragon SDK not available');
    return await paragonSDK.installIntegration(...args);
  },
  uninstallIntegration: async (...args) => {
    if (!paragonSDK?.uninstallIntegration) throw new Error('Paragon SDK not available');
    return await paragonSDK.uninstallIntegration(...args);
  },
  getIntegrationMetadata: async (...args) => {
    if (!paragonSDK?.getIntegrationMetadata) throw new Error('Paragon SDK not available');
    return await paragonSDK.getIntegrationMetadata(...args);
  },
  getUser: async () => {
    if (!paragonSDK?.getUser) throw new Error('Paragon SDK not available');
    return await paragonSDK.getUser();
  },
  subscribe: (callback) => {
    if (!paragonSDK?.subscribe) throw new Error('Paragon SDK not available');
    return paragonSDK.subscribe(callback);
  },
  unsubscribe: (subscription) => {
    if (!paragonSDK?.unsubscribe) throw new Error('Paragon SDK not available');
    return paragonSDK.unsubscribe(subscription);
  },
  setHeadless: () => {
    if (!paragonSDK?.setHeadless) throw new Error('Paragon SDK not available');
    return paragonSDK.setHeadless(true);
  },
  isAvailable: () => !!paragonSDK
});

// Expose ElectronAPI for Paragon SDK integration
contextBridge.exposeInMainWorld('electronAPI', {
  getParagonCredentials: (userId) => ipcRenderer.invoke('paragon:getCredentials', userId),
  callMCPTool: (tool, args) => ipcRenderer.invoke('mcp:callTool', tool, args),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  closeTutorialWindow: () => ipcRenderer.invoke('tutorial:close'),
  highlightElement: (elementId) => ipcRenderer.invoke('tutorial:highlightElement', elementId),
  clearHighlights: () => ipcRenderer.invoke('tutorial:clearHighlights'),
  completeTutorial: () => ipcRenderer.invoke('tutorial:complete'),
  // BrowserView controls for advanced browser functionality
  navigateBrowserView: (url) => ipcRenderer.invoke('main-header:browser-navigate', url),
  browserViewGoBack: () => ipcRenderer.invoke('browser-view:go-back'),
  browserViewGoForward: () => ipcRenderer.invoke('browser-view:go-forward'),
  browserViewReload: () => ipcRenderer.invoke('browser-view:reload'),
  positionBrowserView: () => ipcRenderer.invoke('browser-view:position'),
  setBrowserWindowOpacity: (opacity) => ipcRenderer.invoke('browser-window:set-opacity', opacity),
  createNewTab: () => ipcRenderer.invoke('browser-tabs:create-new'),
  createNewTabWithUrl: (url, title) => ipcRenderer.invoke('browser-tabs:create-new-with-url', url, title),
  switchTab: (tabId) => ipcRenderer.invoke('browser-tabs:switch', tabId),
  switchTabByIndex: (tabIndex) => ipcRenderer.invoke('browser-tabs:switch-by-index', tabIndex),
  closeTab: (tabId) => ipcRenderer.invoke('browser-tabs:close', tabId),
  closeTabByIndex: (tabIndex) => ipcRenderer.invoke('browser-tabs:close-by-index', tabIndex),
  updateTabUI: () => ipcRenderer.invoke('browser-tabs:update-ui'),
  resizeBrowserWindow: (deltaWidth, deltaHeight) => ipcRenderer.invoke('browser-window:resize', deltaWidth, deltaHeight)
});

// OAuth server management for MCP
ipcRenderer.handle('mcp:startOAuthServer', () => ipcRenderer.invoke('mcp:startOAuthServer'));
ipcRenderer.handle('mcp:stopOAuthServer', () => ipcRenderer.invoke('mcp:stopOAuthServer'));
ipcRenderer.handle('mcp:generateOAuthUrl', (params) => ipcRenderer.invoke('mcp:generateOAuthUrl', params));