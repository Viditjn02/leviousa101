# 🍎 Code Signing Setup Guide for Leviousa
**Apple ID:** viditjn02@gmail.com  
**Team ID:** 8M7TSC3U67

## ✅ Step 1: Get Developer ID Certificate

### Method 1: Using Xcode (Easiest)
```bash
# 1. Open Xcode
# 2. Go to: Xcode → Preferences → Accounts
# 3. Add your Apple ID: viditjn02@gmail.com
# 4. Select your team: 8M7TSC3U67
# 5. Click "Manage Certificates..."
# 6. Click "+" → "Developer ID Application"
# 7. Certificate will be created and installed automatically
```

### Method 2: Using Apple Developer Portal
```bash
# 1. Go to: https://developer.apple.com/account/resources/certificates/
# 2. Click "+" to create new certificate
# 3. Select "Developer ID Application" under "Production"
# 4. Upload your Certificate Signing Request (CSR)
# 5. Download and double-click to install in Keychain
```

## ✅ Step 2: Set Up Notarization Credentials

### Option A: App-Specific Password (Recommended for individual developers)
```bash
# 1. Go to: https://appleid.apple.com/account/manage
# 2. Sign in with: viditjn02@gmail.com
# 3. Generate App-Specific Password for "Leviousa Code Signing"
# 4. Save the password securely

# Set environment variables:
export APPLE_ID="viditjn02@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="8M7TSC3U67"
```

### Option B: API Key (More secure for CI/CD)
```bash
# 1. Go to: https://appstoreconnect.apple.com/access/api
# 2. Create API Key with "Developer" role
# 3. Download .p8 file and note Key ID and Issuer ID

# Set environment variables:
export APPLE_API_KEY="path/to/AuthKey_KEYID.p8"
export APPLE_API_KEY_ID="your-key-id"
export APPLE_API_ISSUER="your-issuer-id"
```

## ✅ Step 3: Build Signed App

### Check Your Certificate
```bash
# Verify certificate is installed:
security find-identity -v -p codesigning
# Should show: "Developer ID Application: Your Name (8M7TSC3U67)"
```

### Build with Code Signing
```bash
# Set your certificate name (replace with actual name from keychain):
export CSC_NAME="Developer ID Application: Vidit Jain (8M7TSC3U67)"

# Build signed app:
npm run build
```

### Manual Notarization (if automatic fails)
```bash
# Submit for notarization:
xcrun notarytool submit dist/Leviousa-1.0.0-arm64.dmg \
  --apple-id "viditjn02@gmail.com" \
  --password "your-app-specific-password" \
  --team-id "8M7TSC3U67" \
  --wait

# If successful, staple the ticket:
xcrun stapler staple dist/Leviousa-1.0.0-arm64.dmg
```

## ✅ Step 4: Test Signed App

```bash
# Verify code signing:
codesign -vvv --deep --strict dist/mac-arm64/Leviousa.app

# Test Gatekeeper:
spctl -a -vvv -t install dist/Leviousa-1.0.0-arm64.dmg

# Should show: "accepted" instead of "rejected"
```

## 🚀 Result After Setup

**Before (Current):**
- ❌ "Leviousa is damaged and can't be opened"
- ❌ Security warning on every install
- ❌ Users must right-click → Open

**After (Signed & Notarized):**
- ✅ No security warnings
- ✅ Double-click to install works
- ✅ Professional, trusted app
- ✅ Mac App Store distribution ready

## 🔧 Environment Variables Summary

Add these to your shell profile (~/.zshrc or ~/.bash_profile):

```bash
# Code Signing
export CSC_NAME="Developer ID Application: Vidit Jain (8M7TSC3U67)"

# Notarization (choose one method)
# Method A: App-Specific Password
export APPLE_ID="viditjn02@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="8M7TSC3U67"

# Method B: API Key (alternative)
# export APPLE_API_KEY="/path/to/AuthKey_KEYID.p8"
# export APPLE_API_KEY_ID="your-key-id" 
# export APPLE_API_ISSUER="your-issuer-id"
```

## 🎯 Quick Start Checklist

- [ ] 1. Get Developer ID Application certificate in Keychain
- [ ] 2. Generate App-Specific Password at appleid.apple.com
- [ ] 3. Set environment variables
- [ ] 4. Run: `CSC_NAME="Developer ID Application: Vidit Jain (8M7TSC3U67)" npm run build`
- [ ] 5. Test signed app - no more security warnings!

**Ready to eliminate security warnings forever!** 🎉
