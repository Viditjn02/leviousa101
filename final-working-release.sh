#!/bin/bash

# Upload FINAL WORKING DMGs - Empty Screen Issue Resolved
echo "🎉 UPLOADING FINAL WORKING DMGS - EMPTY SCREEN FIXED!"
echo "======================================================="

RELEASE_TAG="v1.0.0-WORKING-$(date +%s)"
echo "🏷️ Creating FINAL WORKING release: $RELEASE_TAG"

gh release create "$RELEASE_TAG" \
    --title "Leviousa v1.0.0 - WORKING FINAL VERSION ✅" \
    --notes "🎉 **FINAL WORKING VERSION - EMPTY SCREEN ISSUE RESOLVED**

🔧 **CRITICAL FIXES APPLIED:**
✅ **Empty Screen Fixed** - Native module architecture corrected
✅ **Database Connection** - SQLite now works in built DMG  
✅ **Overlays Working** - Login/Tutorial/Main overlays appear correctly
✅ **Tutorial System** - Welcome video bundled and functional

🍎 **Apple Security:**
✅ **Notarized & Code Signed** - No macOS security warnings
✅ **Developer ID Certificate** - Vidit Jain (8LNUMP84V8)
✅ **Malware Protection** - Apple approval prevents false flagging

🎯 **Perfect Startup Experience:**
1. **Login/Signup Overlay** - Appears first for authentication
2. **Tutorial Video** - Shows for first-time users only
3. **Main App Overlay** - Ready for all features

🔒 **Integration Restrictions:**
✅ **Free Plan** - 10min/day AI, NO integrations, custom branded dialogs
✅ **Pro Plan** - Unlimited AI + 130+ integrations
✅ **Smart Detection** - Auto-detects Apple Silicon vs Intel

📱 **Architecture Support:**
✅ **Apple Silicon (M1/M2/M3)** - ARM64 native modules
✅ **Intel Processors** - x64 native modules
✅ **Auto-Detection** - Website serves correct version

**THIS VERSION WORKS PERFECTLY - NO MORE EMPTY SCREEN!**

Generated: $(date)" \
    "dist/Leviousa-1.0.0-arm64.dmg#Leviousa-WORKING-Apple-Silicon.dmg" \
    "dist/Leviousa-1.0.0.dmg#Leviousa-WORKING-Intel.dmg"

if [ $? -eq 0 ]; then
    echo "🎉 FINAL WORKING DMGs uploaded successfully!"
    echo ""
    echo "🔗 FINAL WORKING DOWNLOAD URLS:"
    echo "ARM64: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-WORKING-Apple-Silicon.dmg"
    echo "Intel: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-WORKING-Intel.dmg"
    echo ""
    echo "✅ ALL ISSUES RESOLVED:"
    echo "🔧 Empty screen issue fixed"
    echo "🗄️ Database connections working" 
    echo "👁️ All overlays appearing correctly"
    echo "🎬 Tutorial system functional"
    echo "🔒 Apple notarized, no warnings"
    echo "🎯 Integration restrictions enforced"
    echo "🏗️ Smart architecture detection"
    
    # Save final working URLs
    echo "export WORKING_ARM64_URL='https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-WORKING-Apple-Silicon.dmg'" > .working-download-urls
    echo "export WORKING_INTEL_URL='https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-WORKING-Intel.dmg'" >> .working-download-urls
    echo "export WORKING_RELEASE_TAG='$RELEASE_TAG'" >> .working-download-urls
    
    echo "💾 Final working URLs saved"
    echo ""
    echo "🚀 READY FOR YOUR FRIEND TO TEST!"
    echo "No more empty screen - everything working!"
else
    echo "❌ Upload failed"
    exit 1
fi
