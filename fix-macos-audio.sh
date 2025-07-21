#!/bin/bash

# Fix macOS SystemAudioDump Security Issues
# This script resolves the "SystemAudioDump Not Opened" security warning

echo "🔧 Fixing macOS SystemAudioDump security issues..."

# Path to SystemAudioDump executable
SYSTEM_AUDIO_PATH="src/ui/assets/SystemAudioDump"

# Check if file exists
if [ ! -f "$SYSTEM_AUDIO_PATH" ]; then
    echo "❌ SystemAudioDump not found at $SYSTEM_AUDIO_PATH"
    exit 1
fi

echo "📁 Found SystemAudioDump at $SYSTEM_AUDIO_PATH"

# Remove quarantine attribute (this is what causes the security warning)
echo "🛡️ Removing quarantine attribute..."
xattr -d com.apple.quarantine "$SYSTEM_AUDIO_PATH" 2>/dev/null || echo "   ℹ️ No quarantine attribute found (this is fine)"

# Ensure executable permissions
echo "🔐 Setting executable permissions..."
chmod +x "$SYSTEM_AUDIO_PATH"

# Check if spctl (System Policy Control) is blocking it
echo "🔍 Checking System Policy Control status..."
spctl --assess --type execute "$SYSTEM_AUDIO_PATH" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ SystemAudioDump is now allowed by macOS security"
else
    echo "⚠️ SystemAudioDump may still be blocked by System Policy Control"
    echo "💡 If you still see security warnings, you may need to:"
    echo "   1. Go to System Preferences > Security & Privacy > General"
    echo "   2. Click 'Allow Anyway' next to the SystemAudioDump warning"
    echo "   3. Or disable Gatekeeper temporarily with: sudo spctl --master-disable"
fi

# Test if executable runs
echo "🧪 Testing SystemAudioDump executable..."
if "$SYSTEM_AUDIO_PATH" --help >/dev/null 2>&1; then
    echo "✅ SystemAudioDump is working correctly!"
else
    echo "⚠️ SystemAudioDump may not be working correctly"
    echo "💡 Try running the application again - the security warning should be resolved"
fi

echo ""
echo "🎉 macOS SystemAudioDump fix completed!"
echo "🔄 Please restart your Leviousa application to test the audio capture" 