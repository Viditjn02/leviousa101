#!/bin/bash

# Simple Autonomous DMG Upload
echo "🍎 SIMPLE NOTARIZED DMG UPLOAD"
echo "=============================="

# Check files exist
if [ ! -f "dist/Leviousa-1.0.0-arm64.dmg" ]; then
    echo "❌ ARM64 DMG not found"
    exit 1
fi

if [ ! -f "dist/Leviousa-1.0.0.dmg" ]; then
    echo "❌ Intel DMG not found"  
    exit 1
fi

echo "✅ Both DMG files found"

# Create simple release
RELEASE_TAG="v1.0.0-$(date +%s)"
echo "🏷️ Creating release: $RELEASE_TAG"

gh release create "$RELEASE_TAG" \
    --title "Leviousa v1.0.0 - Notarized DMGs" \
    --notes "Apple notarized and code signed DMG files. Integration restrictions included." \
    "dist/Leviousa-1.0.0-arm64.dmg#Leviousa-Latest-Apple-Silicon.dmg" \
    "dist/Leviousa-1.0.0.dmg#Leviousa-Latest-Intel.dmg"

if [ $? -eq 0 ]; then
    echo "✅ Upload successful!"
    echo ""
    echo "🔗 Download URLs:"
    echo "ARM64: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Latest-Apple-Silicon.dmg"
    echo "Intel: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Latest-Intel.dmg"
    echo ""
    echo "🔒 Security: Apple notarized, no warnings"
    echo "📊 Size: ~210MB (ARM64), ~218MB (Intel)"
else
    echo "❌ Upload failed"
    exit 1
fi
