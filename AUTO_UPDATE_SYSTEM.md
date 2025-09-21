# Leviousa Auto-Update System

## 🎯 Overview

Leviousa now uses a robust auto-update system powered by `electron-updater` with Vercel hosting. This system provides:

- ✅ **Automatic Updates**: Check for updates every 4 hours
- ✅ **Secure Delivery**: Code-signed and notarized updates
- ✅ **User Control**: Users choose when to restart for updates  
- ✅ **Reliable Hosting**: Updates served from your Vercel domain
- ✅ **Delta Updates**: Efficient blockmap-based differential updates

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Electron App  │───▶│  Vercel Hosting  │───▶│  Vercel Blob    │
│  (auto-updater) │    │ /updates/mac/... │    │ (update files)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Update Flow:**
1. App checks `https://leviousa.com/updates/mac/latest-mac.yml`
2. Vercel API routes proxy requests to Vercel Blob storage
3. electron-updater downloads and verifies the update ZIP
4. User gets notified and chooses when to install

## 📁 File Structure

### Core Configuration Files
```
├── electron-builder.yml          # Build & publish config
├── src/index.js                 # Auto-updater initialization
├── scripts/upload-updates.js    # Upload script for Blob storage
├── leviousa_web/
│   ├── vercel.json              # Vercel routing config
│   └── app/api/updates/mac/     # Update API endpoints
│       ├── latest-mac.yml/route.ts
│       └── [file]/route.ts
```

### Generated Update Files (after build)
```
dist/
├── latest-mac.yml                    # Update metadata
├── Leviousa-1.0.0-mac.zip           # Signed & notarized app
└── Leviousa-1.0.0-mac.zip.blockmap  # Delta update data
```

## 🚀 Building & Publishing Updates

### 1. Build with Auto-Update Files
```bash
# Build the app and generate update files
npm run build

# Or build + upload to Vercel Blob in one step
npm run build:with-updates
```

### 2. Upload Update Files to Vercel Blob
```bash
# Upload the latest build files to Vercel Blob
npm run upload-updates
```

This will output URLs like:
```
BLOB_LATEST_MAC_YML=https://xyz.public.blob.vercel-storage.com/latest-mac.yml
BLOB_BASE_URL=https://xyz.public.blob.vercel-storage.com
```

### 3. Update Vercel Environment Variables
Add these to your Vercel project settings:
```bash
BLOB_LATEST_MAC_YML=<latest-mac.yml URL>
BLOB_BASE_URL=<base URL for ZIP files>
```

### 4. Deploy Vercel Frontend
```bash
cd leviousa_web
npx vercel --prod
```

## ⚙️ Configuration Details

### electron-builder.yml
```yaml
publish:
  provider: generic
  url: https://leviousa.com/updates/mac

mac:
  target:
    - target: zip
      arch: universal  # ZIP first for auto-updater
  artifactName: Leviousa-${version}-mac.${ext}
  hardenedRuntime: true
  notarize: true
```

### Auto-Updater Settings
```javascript
// In src/index.js
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
```

## 🔒 Security Features

- **Code Signing**: All updates signed with Developer ID certificate
- **Notarization**: Apple notarization for Gatekeeper approval
- **SHA512 Verification**: Automatic file integrity checking
- **Secure Hosting**: Served over HTTPS from your domain

## 🛠️ Troubleshooting

### Common Issues

**Build fails with signing errors:**
- Ensure your Developer ID certificate is installed
- Check that `identity: "Vidit Jain (8LNUMP84V8)"` matches your cert

**Upload script fails:**
- Verify `BLOB_READ_WRITE_TOKEN` environment variable is set
- Check that build files exist in `/dist` directory

**Auto-updater not working:**
- Check console logs for `[AutoUpdater]` messages
- Verify Vercel environment variables are set
- Test API endpoints manually: `https://leviousa.com/updates/mac/latest-mac.yml`

### Testing the System

**1. Test API Endpoints:**
```bash
curl https://leviousa.com/updates/mac/latest-mac.yml
curl -I https://leviousa.com/updates/mac/Leviousa-1.0.0-mac.zip
```

**2. Test Local App:**
- Install current version
- Build new version with higher version number
- Upload update files
- Launch app and check console for update messages

**3. Verify Code Signing:**
```bash
# Check if app is properly signed
codesign --verify --deep --strict --verbose=2 dist/mac/Leviousa.app

# Check if app is notarized
spctl --assess --type exec -vv dist/mac/Leviousa.app
```

## 📊 Version Management

### Version Bumping
1. Update `version` in `package.json`
2. Update `version` in `leviousa_web/package.json` 
3. Run `npm run build:with-updates`

### Rollback Process
If you need to rollback an update:
1. Re-upload previous version's files to Blob
2. Update `latest-mac.yml` to point to previous version
3. Redeploy Vercel frontend

## 🔄 Update Process (User Experience)

1. **Background Check**: App silently checks for updates every 4 hours
2. **Download**: If update found, downloads in background with progress
3. **User Notification**: Shows friendly dialog: "Update Ready - Restart Now or Later"
4. **Installation**: Update installs on next app launch (or immediate restart)
5. **Seamless**: User experience is smooth with minimal interruption

## 🎛️ Environment Variables

### Required for Upload Script
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xyz123  # Vercel Blob write access
```

### Required for Vercel API Routes
```bash
BLOB_LATEST_MAC_YML=https://xyz.public.blob.vercel-storage.com/latest-mac.yml
BLOB_BASE_URL=https://xyz.public.blob.vercel-storage.com
```

## 📈 Monitoring & Analytics

Monitor update success rates by watching:
- Vercel function logs for API endpoint hits
- Console logs in production apps (if accessible)
- User reports of update issues

The system now provides enterprise-grade auto-updates with minimal user friction! 🎉
