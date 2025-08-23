# 🔐 Leviousa Code Signing Setup Guide

## Overview

This guide will help you set up code signing for Leviousa to eliminate security warnings and provide a seamless installation experience for your users.

## 🍎 macOS Code Signing Requirements

### 1. Apple Developer Program
- **Required**: Apple Developer Account ($99/year)
- **Sign up**: https://developer.apple.com/programs/

### 2. Required Certificates

You need **TWO** certificates:

#### A. Developer ID Application Certificate
- **Purpose**: Signs the .app bundle
- **Filename**: `Developer ID Application: Your Name (TEAM_ID)`

#### B. Developer ID Installer Certificate  
- **Purpose**: Signs the .dmg installer
- **Filename**: `Developer ID Installer: Your Name (TEAM_ID)`

### 3. Certificate Installation

#### Option A: Automatic (Recommended)
```bash
# Install Xcode (includes certificate management)
# Open Xcode > Preferences > Accounts > Add Apple ID
# Download certificates automatically
```

#### Option B: Manual
1. Login to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/)
2. Create **Developer ID Application** certificate
3. Create **Developer ID Installer** certificate  
4. Download `.cer` files and double-click to install in Keychain

## 🔧 Electron Builder Configuration

Your `electron-builder.yml` is already configured, but needs these updates:

```yaml
# Updated electron-builder.yml
mac:
  category: public.app-category.utilities
  icon: src/ui/assets/logo.icns
  minimumSystemVersion: '11.0'
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: entitlements.plist
  entitlementsInherit: entitlements.plist
  # Code signing configuration
  identity: "Developer ID Application: YOUR_NAME (TEAM_ID)"
  signIgnore: [
    "node_modules"
  ]
  target:
    - target: dmg
      arch: [arm64, x64]  # Both Apple Silicon and Intel
    - target: zip
      arch: [arm64, x64]

# DMG configuration  
dmg:
  sign: true
  identity: "Developer ID Installer: YOUR_NAME (TEAM_ID)"
```

## 📝 Required Files

### 1. Create `entitlements.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
</dict>
</plist>
```

### 2. Create `.env` for signing credentials
```bash
# .env (DO NOT COMMIT TO GIT)
CSC_NAME="Developer ID Application: YOUR_NAME (TEAM_ID)"
CSC_INSTALLER_IDENTITY="Developer ID Installer: YOUR_NAME (TEAM_ID)"
CSC_KEY_PASSWORD="your_certificate_password_if_needed"
```

## 🚀 GitHub Actions Setup

### 1. Add Secrets to GitHub Repository

Go to: `Settings > Secrets and Variables > Actions`

Add these secrets:
```
CSC_LINK=<base64_encoded_p12_certificate>
CSC_KEY_PASSWORD=<certificate_password>
APPLE_ID=<your_apple_developer_email>
APPLE_ID_PASSWORD=<app_specific_password>
APPLE_TEAM_ID=<your_team_id>
```

### 2. Updated Build Workflow

```yaml
# .github/workflows/build.yml (add to existing)
- name: 🔐 Import Code Signing Certificates
  if: runner.os == 'macOS'
  uses: apple-actions/import-codesign-certs@v1
  with:
    p12-file-base64: ${{ secrets.CSC_LINK }}
    p12-password: ${{ secrets.CSC_KEY_PASSWORD }}

- name: 🖥️ Build & Sign Electron app
  env:
    CSC_NAME: ${{ secrets.CSC_NAME }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: npm run build
```

## 🧪 Testing Code Signing

### 1. Verify Certificates Installed
```bash
security find-identity -v -p codesigning
```

### 2. Test Local Build
```bash
# Build with signing
npm run build

# Verify signature
codesign -vvv --deep --strict dist/mac*/Leviousa.app
spctl -a -vvv -t install dist/Leviousa-*.dmg
```

### 3. Expected Output
```
dist/mac-arm64/Leviousa.app: valid on disk
dist/mac-arm64/Leviousa.app: satisfies its Designated Requirement
dist/Leviousa-1.0.0-arm64.dmg: accepted
```

## 🎯 Step-by-Step Setup

### Phase 1: Get Certificates (15 minutes)
1. ✅ Join Apple Developer Program
2. ✅ Create Developer ID certificates
3. ✅ Install certificates in Keychain

### Phase 2: Update Configuration (5 minutes) 
1. ✅ Update `electron-builder.yml`
2. ✅ Create `entitlements.plist`
3. ✅ Test local build

### Phase 3: CI/CD Setup (10 minutes)
1. ✅ Export certificate as .p12
2. ✅ Add secrets to GitHub
3. ✅ Update workflow
4. ✅ Test automated build

## 🚨 Troubleshooting

### Common Issues

#### "No identity found"
```bash
# Check installed certificates
security find-identity -v -p codesigning

# If empty, re-install certificates
```

#### "Resource fork, Finder information, or similar detritus not allowed"
```bash
# Clean build and try again
rm -rf dist node_modules
npm install
npm run build
```

#### "Gatekeeper assessment failed"  
```bash
# Check signature
codesign -dv --verbose=4 dist/mac*/Leviousa.app
```

### Getting Help

1. **Apple Developer Forums**: https://developer.apple.com/forums/
2. **Electron Builder Docs**: https://www.electron.build/code-signing
3. **Stack Overflow**: Search "electron builder code signing"

## ✅ Success Checklist

- [ ] Apple Developer account active
- [ ] Both certificates installed in Keychain  
- [ ] `entitlements.plist` created
- [ ] `electron-builder.yml` updated with signing config
- [ ] Local build successful with `codesign -vvv`
- [ ] GitHub secrets added
- [ ] CI/CD workflow updated
- [ ] Automated build creates signed DMG
- [ ] DMG installs without security warnings

---

## 💰 Cost Summary

- **Apple Developer Program**: $99/year
- **Time Investment**: ~30 minutes setup
- **Result**: Professional, trusted installers with no security warnings

**ROI**: Removes friction for 100% of your macOS users → higher conversion rates

---

*Once complete, your users will get a seamless installation experience with no security warnings!* 🎉
