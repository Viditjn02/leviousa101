# Leviousa101 Development Workflow - Firebase Hosting

This guide explains how to run your development environment using the Firebase hosting domain (`leviousa-101.firebaseapp.com`) instead of localhost to avoid OAuth redirect URI issues.

## Why Firebase Hosting for Development?

- ✅ **No OAuth Issues**: Uses the same domain as production
- ✅ **Consistent Environment**: Same URLs across dev/prod
- ✅ **No Localhost Configuration**: Avoid configuring OAuth for localhost
- ✅ **Real Production Testing**: Test with actual Firebase services

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

#### Option A: Using Firebase Hosting Channels (Recommended)

```bash
# 1. Start the Electron app (this starts the API server)
npm start

# 2. In a new terminal, build and deploy to a dev channel
cd leviousa_web
npm run build
firebase hosting:channel:deploy dev --expires 7d

# 3. Your app is now available at:
# https://leviousa-101--dev-<random-id>.web.app
# or potentially: https://leviousa-101.firebaseapp.com (if configured)
```

#### Option B: Using Firebase Hosting Emulator with Production Domain

```bash
# 1. Start the Electron app
npm start

# 2. In a new terminal, serve using Firebase hosting
cd leviousa_web
npm run build
firebase serve --only hosting --host leviousa-101.firebaseapp.com --port 5000

# 3. Your app is available at: https://leviousa-101.firebaseapp.com:5000
```

### 3. Development Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron App  │    │  Firebase       │    │   Backend API   │
│                 │◄──►│  Hosting        │◄──►│                 │
│   Main Process  │    │                 │    │  localhost:9001 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       https://leviousa-101.firebaseapp.com
```

### 4. Environment Configuration

The app automatically detects development mode and:
- Sets `leviousa_WEB_URL=https://leviousa-101.firebaseapp.com`
- Keeps API on `localhost:9001` 
- Uses Firebase hosting for the frontend

### 5. Firebase Hosting Configuration

Your `firebase.json` should include:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      }
    ]
  }
}
```

## OAuth Configuration

With this setup, your Google OAuth configuration only needs:
- **Authorized JavaScript origins**: `https://leviousa-101.firebaseapp.com`
- **Authorized redirect URIs**: `https://leviousa-101.firebaseapp.com/__/auth/handler`

No localhost configuration required! 🎉

## Troubleshooting

### Issue: Firebase hosting channel returns 404
**Solution**: Make sure you built the app first with `npm run build`

### Issue: API calls fail from Firebase hosting
**Solution**: Check that your Electron app is running (API server on localhost:9001)

### Issue: Authentication still fails
**Solution**: Verify that `leviousa_WEB_URL` is set to `https://leviousa-101.firebaseapp.com` in your environment

### Issue: Changes not reflected
**Solution**: You need to rebuild and redeploy to Firebase hosting after making changes

## Quick Start Commands

```bash
# Terminal 1: Start Electron + API
npm start

# Terminal 2: Deploy frontend to Firebase
cd leviousa_web
npm run dev:hosting

# Access your app at: https://leviousa-101.firebaseapp.com
```

## Production Deployment

For production, use:
```bash
npm run build:web
firebase deploy --only hosting
```

This workflow ensures your development environment matches production exactly! 🚀 