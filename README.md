# Leviousa - AI Meeting Assistant

Leviousa is a commercial AI meeting assistant with pre-configured API keys and advanced features like Speaker Intelligence.

## Key Features

### 🔑 Pre-configured API Keys
- No need for users to enter their own API keys
- Pre-configured with OpenAI, Anthropic, and Deepgram keys
- Automatic setup on first launch

### 🎯 Speaker Intelligence
- Distinguishes between user speech and other meeting participants
- Only shows insights from OTHER speakers (not your own speech)
- Learns your speech patterns over time for better accuracy
- Real-time speaker detection using content and context analysis

### 🧠 Meeting Intelligence
- Real-time transcription and insights
- Automatic meeting summaries
- Action item extraction
- Participant tracking

### 👁️ Eye Contact Correction
- Real-time eye contact correction using Sieve AI
- Makes you appear to look at the camera in video calls
- Configurable API key and enable/disable toggle
- Processes frames with intelligent throttling

### 🔒 Enhanced Privacy
- All data processed locally when possible
- Support for local LLM (Ollama)
- Configurable data retention policies

## Installation

This is commercial software. Please contact Leviousa for installation and licensing information.

For development purposes only:
1. Install dependencies:
   ```bash
   npm install
   cd leviousa_web && npm install && cd ..
   ```
2. Build the web interface:
   ```bash
   npm run build:web
   ```
3. Start the application:
   ```bash
   npm start
   ```

## Configuration

The application uses pre-configured API keys stored in the `.env` file. These keys are:
- **OpenAI**: For GPT-4 language model
- **Anthropic**: For Claude language model (backup)
- **Deepgram**: For real-time speech-to-text

## How It Works

### Speaker Intelligence System
1. **Audio Capture**: Captures system audio and microphone input
2. **Transcription**: Real-time speech-to-text using Deepgram
3. **Speaker Detection**: Analyzes speech patterns to identify speakers
4. **Insight Generation**: Only generates insights for non-user speech
5. **Display**: Shows relevant insights in the overlay

### User Voice Calibration
- The system learns your voice patterns after 5 speech samples
- Uses first-person language indicators (I, my, me)
- Analyzes speech continuity and context
- Improves accuracy over time

## Architecture

```
Leviousa101/
├── src/
│   ├── features/
│   │   ├── intelligence/     # Speaker Intelligence
│   │   ├── listen/          # Audio capture & transcription
│   │   ├── ask/             # AI processing
│   │   └── common/          # Shared services
│   ├── bridge/
│   │   └── leviousaBridge.js # Pre-configured API handling
│   └── index.js             # Main process
└── leviousa_web/         # Web UI
```

## Commercial Features

1. **No API Key Setup**: Users don't need to provide their own API keys
2. **Speaker Intelligence**: Advanced speaker detection and filtering
3. **Pre-configured Providers**: Default LLM and STT providers are set
4. **Enhanced Privacy**: More privacy controls and local processing options
5. **Commercial Licensing**: Proprietary software with commercial licensing

## Development

This section is for internal development purposes only.

### Environment Variables
Create a `.env` file with:
```env
ANTHROPIC_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
DEEPGRAM_API_KEY=your-key-here
ENABLE_SPEAKER_INTELLIGENCE=true
ENABLE_MEETING_INTELLIGENCE=true
DEFAULT_LLM_PROVIDER=openai
DEFAULT_STT_PROVIDER=deepgram
```

### Testing Speaker Intelligence
1. Start a meeting or video call
2. Speak naturally - the system will calibrate to your voice
3. When others speak, insights will appear in the overlay
4. Check the dashboard for complete meeting logs

## License

This is commercial software owned by Leviousa. All rights reserved.

For licensing and commercial use, please contact Leviousa.
