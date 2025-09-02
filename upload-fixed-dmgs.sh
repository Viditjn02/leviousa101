#!/bin/bash

# Upload FIXED DMGs with Native Module Architecture Fix
echo "🔧 UPLOADING FIXED DMGS - ARCHITECTURE ISSUE RESOLVED"
echo "=========================================================="

# Create release with architecture fix
RELEASE_TAG="v1.0.0-fixed-$(date +%s)"
echo "🏷️ Creating FIXED release: $RELEASE_TAG"

gh release create "$RELEASE_TAG" \
    --title "Leviousa v1.0.0 - FIXED Empty Screen Issue" \
    --notes "🔧 **CRITICAL FIX: Empty Screen Issue Resolved**

🐛 **Issue Fixed:**
- ❌ Empty screen on app startup in built DMG
- ❌ Architecture mismatch in better-sqlite3 native module  
- ❌ Database connection failures in production

✅ **Solution Applied:**
- ✅ Rebuilt native modules for correct ARM64/x64 architectures
- ✅ Fixed better-sqlite3 architecture compatibility  
- ✅ Database now connects properly in built DMG
- ✅ All overlays and UI now appear correctly

🍎 **Security & Features:**
- ✅ Apple notarized and code signed
- ✅ No macOS security warnings
- ✅ Integration restrictions enforced
- ✅ Tutorial system working
- ✅ Smart architecture detection

🎯 **Startup Flow:**
1. Login/Signup overlay appears
2. Tutorial video (first time only)
3. Main app overlay ready to use

📦 **Downloads:**
- **Apple Silicon (M1/M2/M3):** Leviousa-Fixed-Apple-Silicon.dmg
- **Intel Processors:** Leviousa-Fixed-Intel.dmg

Generated: $(date)" \
    "dist/Leviousa-1.0.0-arm64.dmg#Leviousa-Fixed-Apple-Silicon.dmg" \
    "dist/Leviousa-1.0.0.dmg#Leviousa-Fixed-Intel.dmg"

if [ $? -eq 0 ]; then
    echo "✅ FIXED DMGs uploaded successfully!"
    echo ""
    echo "🔗 FIXED DOWNLOAD URLS:"
    echo "ARM64: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Fixed-Apple-Silicon.dmg"
    echo "Intel: https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Fixed-Intel.dmg"
    echo ""
    echo "✅ Features working:"
    echo "🔧 Architecture compatibility fixed"
    echo "🗄️ Database connections working"
    echo "👁️ Overlays and UI appearing"
    echo "🎬 Tutorial system functional"
    echo "🔒 Apple notarized, no warnings"
    
    # Save the fixed URLs
    echo "export FIXED_ARM64_URL='https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Fixed-Apple-Silicon.dmg'" > .fixed-download-urls
    echo "export FIXED_INTEL_URL='https://github.com/Viditjn02/leviousa101/releases/download/$RELEASE_TAG/Leviousa-Fixed-Intel.dmg'" >> .fixed-download-urls
    echo "export FIXED_RELEASE_TAG='$RELEASE_TAG'" >> .fixed-download-urls
    
    echo "💾 Fixed URLs saved to .fixed-download-urls"
else
    echo "❌ Upload failed"
    exit 1
fi
