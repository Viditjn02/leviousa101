# Leviousa101 Development Workflow - Firebase Hosting

This guide explains how to run your development environment using the Firebase hosting domain (`leviousa-101.web.app`) for all builds to avoid OAuth redirect URI issues.

## Why Firebase Hosting for All Builds?

- ✅ **No OAuth Issues**: Uses the same domain as production for all builds
- ✅ **Consistent Environment**: Same URLs across dev/prod/packaged builds  
- ✅ **No Localhost Configuration**: Avoid configuring OAuth for localhost
- ✅ **Real Production Testing**: Test with actual Firebase services
- ✅ **Packaged Builds Work**: DMG/installer builds use Firebase hosting too

## Development Setup

### 1. Initial Setup (One Time)

```bash
# Install Firebase CLI globally if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init hosting
```

### 2. Development Workflow

#### For Development/Testing

```bash
# 1. Start the Electron app (this starts the API server)
npm start

# 2. The app automatically uses Firebase hosting
# Frontend: https://leviousa-101.web.app
# API: http://localhost:9001
```

#### For Packaged Development Builds (DMG)

```bash
# 1. Build the web app
cd leviousa_web
npm run build
firebase deploy --only hosting

# 2. Build the DMG
cd ..
npm run build

# 3. The packaged app will still use Firebase hosting
# No localhost dependencies even in packaged builds!
```

### 3. Architecture - All Builds

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron App  │    │  Firebase       │    │   Backend API   │
│  (Dev/Packaged) │◄──►│  Hosting        │◄──►│                 │
│   Main Process  │    │                 │    │  localhost:9001 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       https://leviousa-101.web.app
                       (Used by ALL builds)
```

### 4. Environment Configuration

The app now automatically:
- **Always** sets `leviousa_WEB_URL=https://leviousa-101.web.app`
- Keeps API on `localhost:9001` (dev) or dynamic port (packaged)
- Uses Firebase hosting for frontend in **all scenarios**
- No more localhost frontend server even in production builds

### 5. Deployment Workflow

#### Development Testing:
1. `npm start` - Uses Firebase hosting + local API

#### Packaged DMG Testing:
1. `cd leviousa_web && npm run build && firebase deploy`
2. `npm run build` - Creates DMG that uses Firebase hosting

#### Production Release:
1. Same as DMG - Firebase hosting for consistency 
This workflow ensures your development environment matches production exactly! 🚀 