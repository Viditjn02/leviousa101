#!/bin/bash

# Upload Final Notarized DMGs with Tutorial Fixes
echo "🍎 UPLOADING FINAL NOTARIZED DMGS WITH TUTORIAL FIXES"
echo "============================================================"

# Create new release with tutorial fixes
RELEASE_TAG="v1.0.0-final-$(date +%s)"
echo "🏷️ Creating final release: $RELEASE_TAG"

gh release create "$RELEASE_TAG" \
    --title "Leviousa v1.0.0 - Final Notarized with Tutorial Fixes" \
    --notes "🎉 Complete Leviousa release with all fixes:
    
🍎 **Security & Notarization:**
- ✅ Apple notarized and code signed
- ✅ No macOS security warnings
- ✅ Developer ID certificate applied

🎬 **Tutorial System Fixed:**
- ✅ Welcome video bundled with app
- ✅ Proper startup sequence: Login → Tutorial (first time) → Main overlay
- ✅ Tutorial only shows for first-time users

🔒 **Integration Restrictions:**
- ✅ Free plan: 10min/day AI, NO integrations
- ✅ Pro plan: Unlimited AI + 130+ integrations
- ✅ Custom branded upgrade dialogs

🎯 **Enhanced Features:**
- ✅ Smart architecture detection (Apple Silicon vs Intel)
- ✅ Timezone fixes for calendar events
- ✅ Path errors resolved
- ✅ UTF-8 encoding fixes

📦 **Downloads:**
- **Apple Silicon (M1/M2/M3):** Leviousa-Latest-Apple-Silicon.dmg
- **Intel Processors:** Leviousa-Latest-Intel.dmg

Generated: $(date)" \
    "dist/Leviousa-1.0.0-arm64.dmg#Leviousa-Latest-Apple-Silicon.dmg" \
    "dist/Leviousa-1.0.0.dmg#Leviousa-Latest-Intel.dmg"

if [ $? -eq 0 ]; then
    echo "✅ Upload successful!"
    echo ""
    echo "🔗 FINAL DOWNLOAD URLS:"
    echo "ARM64: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Latest-Apple-Silicon.dmg"
    echo "Intel: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Latest-Intel.dmg"
    echo ""
    echo "📊 File sizes:"
    ls -lh dist/Leviousa-1.0.0*.dmg
    echo ""
    echo "✅ Features included:"
    echo "🔒 Apple notarized - No security warnings"
    echo "🎬 Tutorial overlay fixed for all users"
    echo "🎯 Integration restrictions enforced"
    echo "🏗️ Smart architecture detection"
    
    # Save URLs for updating website
    echo "export FINAL_ARM64_URL='https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Latest-Apple-Silicon.dmg'" > .final-download-urls
    echo "export FINAL_INTEL_URL='https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Latest-Intel.dmg'" >> .final-download-urls
    echo "export FINAL_RELEASE_TAG='$RELEASE_TAG'" >> .final-download-urls
    
    echo "💾 URLs saved to .final-download-urls"
else
    echo "❌ Upload failed"
    exit 1
fi
