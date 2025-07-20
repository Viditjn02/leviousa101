# Sieve Eye Contact Correction Implementation

## Overview
Leviousa101 now includes the Sieve AI eye contact correction feature that was planned in the original Leviousa project. This feature uses Sieve's AI API to automatically correct eye contact in video calls.

## How It Works

### 1. Architecture
```
User's Camera → Capture Frame → Send to Sieve API → Get Corrected Frame → Display
```

### 2. Key Components

#### Service Layer (`/src/features/eyecontact/sieveEyeContactService.js`)
- Handles communication with Sieve API
- Manages processing state and throttling
- Emits events for UI updates

#### IPC Bridge (`/src/features/eyecontact/eyeContactBridge.js`)
- Provides IPC handlers for renderer communication
- Manages API key configuration
- Handles frame processing requests

#### UI Component (`/src/ui/settings/EyeContactSettings.js`)
- Settings interface for enabling/disabling
- API key configuration
- Status display

## Configuration

### 1. Add Sieve API Key
1. Get your API key from [Sieve](https://www.sievedata.com)
2. Add to `.env` file:
   ```
   SIEVE_API_KEY=your-api-key-here
   ```
3. Or configure through the settings UI

### 2. Enable Feature
Set in `.env`:
```
ENABLE_EYE_CONTACT_CORRECTION=true
```

## Usage

### From Settings UI
1. Go to Settings
2. Find "Eye Contact Correction" section
3. Enter your Sieve API key
4. Toggle the feature on

### Programmatic Usage
```javascript
// Enable eye contact correction
await window.api.eyecontact.enable();

// Process a video frame
const frameData = canvas.toDataURL('image/jpeg');
const result = await window.api.eyecontact.processFrame(frameData);

if (result.success) {
    // Display corrected frame
    image.src = result.dataUrl;
}
```

## API Reference

### Main Process API
```javascript
// Service instance
const sieveEyeContactService = require('./features/eyecontact/sieveEyeContactService');

// Initialize (called on app start if enabled)
await sieveEyeContactService.initialize();

// Process image
const correctedBuffer = await sieveEyeContactService.correctEyeContact(imageBuffer);

// Control
sieveEyeContactService.enableCorrection();
sieveEyeContactService.disableCorrection();

// Status
const status = sieveEyeContactService.getStatus();
// Returns: { enabled, processing, hasApiKey, lastProcessed }
```

### Renderer Process API
```javascript
// Enable/disable
await window.api.eyecontact.enable();
await window.api.eyecontact.disable();

// Get status
const status = await window.api.eyecontact.getStatus();

// Set API key
await window.api.eyecontact.setApiKey('your-key');

// Process frame
const result = await window.api.eyecontact.processFrame(frameData);

// Listen for events
window.api.eyecontact.onCorrectionComplete((event, data) => {
    console.log('Correction complete:', data);
});

window.api.eyecontact.onCorrectionError((event, data) => {
    console.error('Correction error:', data);
});
```

## Performance Considerations

1. **Throttling**: Frames are processed at most every 100ms to prevent API overload
2. **Async Processing**: Correction happens asynchronously to avoid blocking UI
3. **Error Handling**: Failed corrections don't crash the app, just skip the frame

## Limitations

1. **API Key Required**: Feature requires a valid Sieve API key
2. **Internet Connection**: Requires stable internet for API calls
3. **Processing Delay**: ~1-2 second delay for correction processing
4. **Cost**: Sieve API usage may incur costs based on their pricing

## Future Improvements

1. **Batch Processing**: Process multiple frames in one API call
2. **Local Caching**: Cache corrections for similar frames
3. **WebRTC Integration**: Direct integration with video call streams
4. **Performance Metrics**: Track and display processing statistics

## Troubleshooting

### API Key Issues
- Ensure key is valid and has correct permissions
- Check Sieve dashboard for usage limits

### Processing Failures
- Check console for error messages
- Verify internet connection
- Ensure image format is JPEG

### Performance Issues
- Reduce video resolution
- Increase processing interval
- Check network latency

## Security

- API keys are stored locally only
- Images are sent over HTTPS
- No image data is stored permanently
- Processing can be disabled at any time
