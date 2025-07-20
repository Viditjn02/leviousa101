# Authentication Setup Instructions for Leviousa 101

## Issues Fixed

1. **Firebase Configuration Mismatch**: The Electron app and web app were using different Firebase configurations. Both now use the same configuration.

2. **Missing ID Token**: The authentication flow was missing the ID token when sending deep links back to the Electron app.

3. **Environment Variables**: The `leviousa_WEB_URL` was commented out in the .env file.

## Required Steps to Complete Authentication Setup

### 1. Rebuild the Web Application

The web app needs to be rebuilt with the new Firebase configuration:

```bash
cd leviousa_web
npm run build
```

### 2. Deploy Firebase Cloud Functions

Make sure the authentication callback function is deployed:

```bash
cd functions
npm install
firebase deploy --only functions:leviousaAuthCallback
```

### 3. Configure Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com)
2. Select your `leviousa-101` project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add these domains:
   - `localhost`
   - `leviousa-101.web.app`
   - `leviousa-101.firebaseapp.com`
   - `127.0.0.1`

### 4. Enable Authentication Providers

In Firebase Console:
1. Go to **Authentication** → **Sign-in method**
2. Enable:
   - Email/Password
   - Google

### 5. Update OAuth Consent Screen (for Google Sign-in)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Add authorized domains:
   - `leviousa-101.web.app`
   - `leviousa-101.firebaseapp.com`

### 6. Test the Authentication Flow

1. Start the Electron app:
   ```bash
   npm start
   ```

2. Click the login button in the app
3. The browser should open to `https://leviousa-101.web.app/login?mode=electron`
4. Sign in with Google or Email/Password
5. The app should receive the authentication and log you in

## Troubleshooting

### If authentication still fails:

1. **Check Browser Console**: Look for any Firebase errors in the web browser console
2. **Check Electron Console**: Look for authentication errors in the Electron dev tools
3. **Verify Firebase Config**: Ensure both apps use the same Firebase configuration
4. **Check Deep Links**: On Windows, make sure the `leviousa://` protocol is registered

### Common Issues:

- **"This browser is not secure"**: This happens when Google blocks OAuth in Electron. The fix implemented uses the user's default browser instead.
- **"Domain not authorized"**: Add the domain to Firebase Console authorized domains
- **Deep link doesn't work**: Check if the protocol handler is registered correctly

## Architecture Overview

The authentication flow works as follows:

1. User clicks login in Electron app
2. App opens `https://leviousa-101.web.app/login?mode=electron` in default browser
3. User authenticates with Firebase in the browser
4. Browser gets ID token and sends deep link: `leviousa://auth-success?token=...`
5. Electron app receives deep link and exchanges ID token for custom token
6. Electron app signs in with custom token
7. User is authenticated in both web and Electron contexts

This approach bypasses Google's restrictions on OAuth in Electron while maintaining security.
