# Voice Agent Implementation - "Hey Leviousa"

## Overview

The Voice Agent feature transforms Leviousa into a powerful voice-activated assistant that responds to "Hey Leviousa" and can see the screen, understand voice commands, and perform automated tasks using AppleScript. This implementation provides a Siri-like experience with advanced AI capabilities for desktop automation.

## Key Features

### 🎤 Voice Activation
- **Wake Word Detection**: Responds to "Hey Leviousa", "Hi Leviousa", "Hello Leviousa", and variations
- **Continuous Listening**: Always monitoring for wake word when enabled
- **Conversation Management**: Handles bidirectional voice communication with timeouts
- **Natural Speech Recognition**: Uses system STT and AI-enhanced processing

### 👁️ Advanced Screen Analysis
- **AI Vision Integration**: Uses vision-capable LLMs to understand screen content
- **Multi-Strategy Detection**: Combines AI vision, Accessibility API, OCR, and AppleScript
- **Comprehensive Element Detection**: Finds buttons, text fields, dropdowns, menus, and more
- **Smart Element Classification**: Prioritizes and ranks UI elements by relevance
- **Real-time Analysis**: Captures and analyzes screen context automatically

### 🤖 Intelligent Action Execution
- **Natural Language Processing**: Converts voice commands to executable actions
- **Multi-Strategy Element Finding**: Finds UI elements by text, position, type, and accessibility
- **Comprehensive Action Support**: Click, type, scroll, select, open, close, navigate, search
- **Smart Retry Logic**: Automatically retries failed actions with different strategies
- **Human-like Interaction**: Natural delays and error handling

### 🗣️ Natural Voice Responses
- **macOS Native TTS**: Uses high-quality system voices (Samantha, Alex, etc.)
- **Context-Aware Responses**: Different speech patterns for confirmations, errors, greetings
- **Queue Management**: Handles multiple speech requests smoothly
- **Interruption Support**: Can stop current speech for new urgent responses
- **Voice Customization**: Configurable voice, rate, and speech patterns

### 🧠 MCP Integration
- **Intelligent Answer Generation**: Uses LLMs to understand context and generate responses
- **Research Capabilities**: Can perform web searches and gather information
- **Question Classification**: Handles coding, interview, technical, and general questions
- **Context-Aware Processing**: Considers screen content when generating responses

## Architecture

### Core Services

#### 1. VoiceAgentService (`src/features/voiceAgent/voiceAgentService.js`)
- **Role**: Main orchestrator and coordinator
- **Responsibilities**:
  - Manages overall voice agent state and configuration
  - Coordinates between all sub-services
  - Handles conversation flow and lifecycle
  - Processes voice commands and generates responses
  - Manages screen analysis and action execution

#### 2. WakeWordDetector (`src/features/voiceAgent/wakeWordDetector.js`)
- **Role**: Continuous wake word monitoring
- **Responsibilities**:
  - Listens for "Hey Leviousa" activation phrase
  - Uses pattern matching and confidence scoring
  - Manages audio processing and cooldown periods
  - Handles multiple wake word variations

#### 3. ConversationManager (`src/features/voiceAgent/conversationManager.js`)
- **Role**: Bidirectional voice communication
- **Responsibilities**:
  - Manages active conversations with timeouts
  - Handles speech recognition and processing
  - Detects conversation end phrases
  - Manages silence detection and auto-ending

#### 4. AdvancedScreenAnalyzer (`src/features/voiceAgent/advancedScreenAnalyzer.js`)
- **Role**: Comprehensive UI element detection
- **Responsibilities**:
  - Combines AI vision, Accessibility API, OCR, and AppleScript
  - Detects and classifies all interactive UI elements
  - Provides smart element ranking and deduplication
  - Caches analysis results for performance

#### 5. ActionExecutor (`src/features/voiceAgent/actionExecutor.js`)
- **Role**: Natural language to automation conversion
- **Responsibilities**:
  - Parses voice commands into actionable plans
  - Finds target UI elements using multiple strategies
  - Executes actions with retry logic and error handling
  - Records execution history and provides feedback

#### 6. TTSService (`src/features/voiceAgent/ttsService.js`)
- **Role**: Natural voice responses
- **Responsibilities**:
  - Manages text-to-speech with native macOS voices
  - Handles speech queuing and interruption
  - Provides context-aware speech patterns
  - Manages voice selection and customization

### Integration Points

#### IPC Bridge (`src/features/voiceAgent/voiceAgentBridge.js`)
- Secure communication between main and renderer processes
- Comprehensive API exposure for all voice agent functionality
- Real-time event forwarding for status updates
- Testing and debugging interfaces

#### Main Process Integration (`src/index.js`)
- Service initialization during app startup
- Global service registration for cross-module access
- Error handling and graceful degradation

#### UI Component (`src/ui/settings/VoiceAgentSettings.js`)
- Complete settings interface with real-time status
- Configuration controls for all aspects
- Testing and debugging tools
- Conversation history and monitoring

## Usage Instructions

### Basic Setup

1. **Enable Voice Agent**:
   - Open Leviousa settings
   - Navigate to "Voice Agent - Hey Leviousa" section
   - Click "Enable Voice Agent"
   - Grant necessary permissions when prompted

2. **Grant System Permissions**:
   - **Accessibility**: Required for UI automation
   - **Microphone**: Required for voice recognition
   - **Screen Recording**: Required for screen analysis

### Voice Commands

#### Activation
- Say "Hey Leviousa" to start a conversation
- Wait for the confirmation response
- Speak your command clearly

#### Supported Command Types

**Clicking Elements**:
- "Click the OK button"
- "Press the submit button"
- "Tap the first link"

**Text Input**:
- "Type hello world"
- "Enter my email address"
- "Write a message"

**Navigation**:
- "Scroll down"
- "Go to settings"
- "Open preferences"

**Selection**:
- "Select the dropdown"
- "Choose the first option"
- "Pick the red item"

**Application Control**:
- "Open Safari"
- "Close this window"
- "Launch Calculator"

**Complex Actions**:
- "Find the search box and type JavaScript"
- "Click the menu button and select preferences"
- "Open the first link in the list"

### Configuration Options

#### Main Settings
- **Wake Word**: Customize activation phrase
- **Voice Responses**: Enable/disable audio feedback
- **Screen Analysis**: Control automatic screen capture
- **Action Execution**: Enable/disable automation
- **Auto Screenshots**: Automatic screen capture

#### Advanced Settings
- **Conversation Timeout**: How long to wait for user input
- **Confidence Threshold**: Minimum confidence for wake word detection
- **Retry Attempts**: Number of action retry attempts
- **Voice Selection**: Choose from available macOS voices

### Testing and Debugging

#### Individual Component Tests
- **Wake Word Test**: Verify wake word detection
- **TTS Test**: Test text-to-speech functionality
- **Screen Analysis Test**: Verify UI element detection
- **Action Execution Test**: Test automation capabilities

#### Full System Test
- Runs comprehensive test of all components
- Provides detailed results and error reporting
- Useful for troubleshooting and validation

## Technical Implementation Details

### Wake Word Detection
```javascript
// Pattern-based detection with confidence scoring
this.wakeWordPatterns = [
    /hey\s+leviousa/i,
    /hi\s+leviousa/i,
    /hello\s+leviousa/i,
    /okay\s+leviousa/i
];
```

### Screen Analysis Strategy
```javascript
// Multi-approach analysis for comprehensive coverage
const analysisResults = await Promise.all([
    this.analyzeWithAIVision(screenshotBase64),
    this.analyzeWithAccessibilityAPI(),
    this.analyzeWithOCR(screenshotBase64),
    this.analyzeWithAppleScript()
]);
```

### Action Planning
```javascript
// Smart element finding with multiple strategies
const strategies = {
    byText: { priority: 9, method: 'findByText' },
    byPosition: { priority: 7, method: 'findByPosition' },
    byType: { priority: 8, method: 'findByType' },
    byAccessibility: { priority: 8, method: 'findByAccessibility' },
    byIndex: { priority: 5, method: 'findByIndex' }
};
```

### AppleScript Integration
```applescript
-- Example: Click element by position
tell application "System Events"
    try
        set frontApp to first application process whose frontmost is true
        click at {x, y}
        return "success"
    on error errMsg
        return "error: " & errMsg
    end try
end tell
```

### AI Vision Processing
```javascript
// Vision AI for comprehensive screen understanding
const prompt = `Analyze this screenshot and identify ALL interactive UI elements...`;
const response = await global.askService.generateVisionResponse(prompt, screenshotBase64);
```

## Error Handling and Edge Cases

### Robust Error Recovery
- **Retry Logic**: Automatic retries with exponential backoff
- **Fallback Strategies**: Multiple approaches for element detection
- **Graceful Degradation**: Continues operating with reduced functionality
- **User Feedback**: Clear error messages and suggested actions

### Edge Case Handling
- **Permission Denial**: Graceful handling with user guidance
- **Network Issues**: Offline operation where possible
- **Element Not Found**: Smart suggestions and alternatives
- **Speech Recognition Errors**: Confirmation and retry mechanisms

## Performance Optimizations

### Caching Strategy
- **Screen Analysis Cache**: Reduces redundant processing
- **Element Detection Cache**: Improves response times
- **Voice Model Cache**: Faster wake word detection

### Resource Management
- **Background Processing**: Non-blocking operations
- **Memory Management**: Automatic cleanup and limits
- **CPU Optimization**: Efficient processing pipelines

## Security Considerations

### Privacy Protection
- **Local Processing**: No cloud dependency for basic functions
- **Screen Data Handling**: Secure capture and processing
- **Voice Data**: Processed locally when possible
- **User Consent**: Clear permission requests

### Access Control
- **Accessibility Permissions**: Required for automation
- **Microphone Access**: Controlled voice input
- **Screen Recording**: Secure screen analysis

## Future Enhancements

### Planned Features
- **Multi-language Support**: Beyond English wake words
- **Custom Commands**: User-defined voice shortcuts
- **Learning Capabilities**: Adaptive behavior based on usage
- **Advanced Integration**: Deeper system integration

### Technical Improvements
- **Offline Voice Models**: Reduce cloud dependency
- **Faster Screen Analysis**: Optimized processing
- **Better Element Detection**: Enhanced AI models
- **Cross-platform Support**: Windows and Linux compatibility

## Troubleshooting

### Common Issues

#### Voice Agent Won't Enable
1. Check accessibility permissions in System Preferences
2. Verify microphone permissions
3. Restart the application
4. Check console logs for errors

#### Wake Word Not Detected
1. Verify microphone is working
2. Speak clearly and at normal volume
3. Check wake word patterns in settings
4. Test with manual trigger button

#### Actions Not Executing
1. Verify accessibility permissions
2. Check if target application is active
3. Ensure UI elements are visible and clickable
4. Review action execution logs

#### Poor Screen Analysis
1. Ensure screen recording permissions
2. Check for overlay applications blocking view
3. Verify AI vision service is available
4. Test with simpler interfaces first

### Debug Information
- Check browser console for detailed logs
- Use individual component tests to isolate issues
- Review conversation history for patterns
- Monitor system performance during operation

## API Reference

### Main Voice Agent API
```javascript
// Enable/disable voice agent
await window.api.voiceAgent.enable();
await window.api.voiceAgent.disable();

// Manual triggers
await window.api.voiceAgent.triggerWakeWord();
await window.api.voiceAgent.triggerVoiceCommand('click the button');

// Screen analysis
const analysis = await window.api.voiceAgent.analyzeScreen();
const elements = await window.api.voiceAgent.findElements({ type: 'button' });

// Text-to-speech
await window.api.voiceAgent.speak('Hello, world!');
await window.api.voiceAgent.setVoice('Samantha');

// Status and configuration
const status = await window.api.voiceAgent.getStatus();
await window.api.voiceAgent.updateConfig({ voiceResponseEnabled: true });
```

### Event Listeners
```javascript
// Voice agent events
window.api.voiceAgent.onEnabled(() => console.log('Enabled'));
window.api.voiceAgent.onWakeWordDetected((event, data) => console.log('Wake word detected'));
window.api.voiceAgent.onSpeechRecognized((event, data) => console.log('Speech:', data.text));
window.api.voiceAgent.onActionCompleted((event, result) => console.log('Action completed'));
```

## Conclusion

The Voice Agent implementation provides a sophisticated, production-ready voice assistant that integrates seamlessly with the Leviousa ecosystem. With comprehensive screen analysis, intelligent action execution, and natural voice interaction, it enables powerful hands-free automation while maintaining user privacy and system security.

The modular architecture allows for easy extension and customization, while the robust error handling ensures reliable operation across diverse usage scenarios. The implementation serves as a foundation for advanced AI-driven desktop automation capabilities. 