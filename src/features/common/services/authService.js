const { onAuthStateChanged, signInWithCustomToken, signOut } = require('firebase/auth');
const { BrowserWindow, shell } = require('electron');
const { getFirebaseAuth, createCustomToken, verifyIdToken } = require('./firebaseClient');
const encryptionService = require('./encryptionService');
const migrationService = require('./migrationService');
const sessionRepository = require('../repositories/session');
const providerSettingsRepository = require('../repositories/providerSettings');
const permissionService = require('./permissionService');

// ***** GLOBAL ERROR HANDLER FOR UNHANDLED PROMISE REJECTIONS *****
process.on('unhandledRejection', (reason, promise) => {
    console.error('[AuthService] Caught unhandled promise rejection:', reason);
    
    // Don't crash the app for Firebase permission errors
    if (reason && reason.message && reason.message.includes('permissions')) {
        console.error('[AuthService] Firebase permissions error caught globally - continuing operation');
        return;
    }
    
    // Log other unhandled rejections but don't crash
    console.error('[AuthService] Unhandled promise rejection occurred but was caught globally');
});

// Use a more reliable approach for node-fetch
let fetch = null;
const initializeFetch = async () => {
    if (!fetch) {
        try {
            const nodeFetch = await import('node-fetch');
            fetch = nodeFetch.default;
        } catch (error) {
            console.error('[AuthService] Failed to load node-fetch:', error);
            // Fallback to require if import fails
            try {
                fetch = require('node-fetch');
            } catch (requireError) {
                console.error('[AuthService] Failed to require node-fetch:', requireError);
            }
        }
    }
    return fetch;
};

async function getVirtualKeyByEmail(email, idToken) {
    if (!idToken) {
        throw new Error('Firebase ID token is required for virtual key request');
    }

    // Ensure fetch is available
    await initializeFetch();
    if (!fetch) {
        throw new Error('node-fetch module could not be loaded');
    }

    const resp = await fetch('https://serverless-api-sf3o.vercel.app/api/virtual_key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        redirect: 'follow',
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        console.error('[VK] API request failed:', json.message || 'Unknown error');
        throw new Error(json.message || `HTTP ${resp.status}: Virtual key request failed`);
    }

    const vKey = json?.data?.virtualKey || json?.data?.virtual_key || json?.data?.newVKey?.slug;

    if (!vKey) throw new Error('virtual key missing in response');
    return vKey;
}

class AuthService {
    constructor() {
        this.currentUserId = null;
        this.currentUserMode = null; // Only 'firebase' when authenticated
        this.currentUser = null;
        this.isInitialized = false;

        // This ensures the key is ready before any login/logout state change.
        this.initializationPromise = null;

        sessionRepository.setAuthService(this);
        
        // Initialize fetch early to avoid timing issues
        initializeFetch().catch(error => {
            console.error('[AuthService] Early fetch initialization failed:', error);
        });
    }

    initialize() {
        if (this.isInitialized) return this.initializationPromise;

        this.initializationPromise = new Promise((resolve) => {
            const auth = getFirebaseAuth();
            onAuthStateChanged(auth, async (user) => {
                const previousUser = this.currentUser;

                if (user) {
                    // User signed IN
                    console.log(`[AuthService] Firebase user signed in:`, user.uid);
                    this.currentUser = user;
                    this.currentUserId = user.uid;
                    this.currentUserMode = 'firebase';

                    // Clean up any zombie sessions from a previous run for this user.
                    await sessionRepository.endAllActiveSessions();

                    // ** Initialize encryption key for the logged-in user if permissions are already granted **
                    if (process.platform === 'darwin' && !(await permissionService.checkKeychainCompleted(this.currentUserId))) {
                        console.warn('[AuthService] Keychain permission not yet completed for this user. Deferring key initialization.');
                    } else {
                        await encryptionService.initializeKey(user.uid);
                    }

                    // ***** IMMEDIATE: Broadcast auth state FIRST - don't let virtual key block UI *****
                    console.log(`[AuthService] Broadcasting user state change IMMEDIATELY for responsive UI`);
                    console.log(`[AuthService] Current user before broadcast:`, {
                        uid: this.currentUser?.uid,
                        email: this.currentUser?.email,
                        mode: this.currentUserMode
                    });
                    this.broadcastUserState();

                    // ***** TEMPORARILY DISABLED: Virtual key fetch causing Firebase permissions error *****
                    console.log(`[AuthService] Virtual key fetch temporarily disabled due to Firebase IAM permissions issue`);
                    console.log(`[AuthService] Please configure Service Account Token Creator role in Google Cloud Console`);
                    console.log(`[AuthService] See: https://console.cloud.google.com/iam-admin/iam for project leviousa-101`);
                    
                    // TODO: Re-enable after IAM permissions are fixed
                    // setTimeout(() => {
                    //     this.fetchVirtualKeyInBackground(user);
                    // }, 3000);

                    // ** Check for and run data migration for the user **
                    // Run in background without blocking startup, after auth state is broadcast
                    migrationService.checkAndRunMigration(user);

                } else {
                    // User signed OUT or no user
                    console.log(`[AuthService] No Firebase user - authentication required.`);
                    if (previousUser) {
                        console.log(`[AuthService] Clearing API key for logged-out user: ${previousUser.uid}`);
                        if (global.modelStateService) {
                            // The model state service now writes directly to the DB.
                            await global.modelStateService.setFirebaseVirtualKey(null);
                        }
                    }
                    this.currentUser = null;
                    this.currentUserId = null;
                    this.currentUserMode = null;

                    // End active sessions when user logs out
                    await sessionRepository.endAllActiveSessions();

                    encryptionService.resetSessionKey();
                    
                    // Broadcast logout state
                    this.broadcastUserState();
                }
                
                if (!this.isInitialized) {
                    this.isInitialized = true;
                    console.log('[AuthService] Initialized and resolved initialization promise.');
                    console.log('[AuthService] Current auth state at initialization:', {
                        hasUser: !!this.currentUser,
                        userId: this.currentUserId,
                        userMode: this.currentUserMode
                    });
                    resolve();
                }
            });
        });

        return this.initializationPromise;
    }

    async startFirebaseAuthFlow() {
        try {
            const webUrl = process.env.leviousa_WEB_URL;
            // Add cache-busting timestamp to prevent Safari cache issues
            const timestamp = Date.now();
            // Use a simple URL that sets window.name via fragment and includes app identifier
            const authUrl = `${webUrl}/login?t=${timestamp}&app=leviousa#electron=${timestamp}`;
            console.log(`[AuthService] Opening Firebase OAuth auth URL in browser: ${authUrl}`);
            await shell.openExternal(authUrl);
            return { success: true };
        } catch (error) {
            console.error('[AuthService] Failed to open Firebase auth URL:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithCustomToken(token) {
        const auth = getFirebaseAuth();
        try {
            const userCredential = await signInWithCustomToken(auth, token);
            console.log(`[AuthService] Successfully signed in with custom token for user:`, userCredential.user.uid);
            // onAuthStateChanged will handle the state update and broadcast
        } catch (error) {
            console.error('[AuthService] Error signing in with custom token:', error);
            throw error; // Re-throw to be handled by the caller
        }
    }

    async authenticateWithServerSideToken(userInfo) {
        try {
            console.log('[AuthService] Starting server-side authentication for:', userInfo.email);
            
            // Try to create a custom token using Firebase Admin SDK
            let customToken;
            try {
                customToken = await createCustomToken(userInfo.uid, {
                    email: userInfo.email,
                    name: userInfo.displayName || userInfo.name,
                    picture: userInfo.photoURL || userInfo.picture
                });
                console.log('[AuthService] Custom token created successfully');
            } catch (adminError) {
                console.error('[AuthService] Failed to create custom token with Admin SDK:', adminError);
                // If Admin SDK fails, fall back to client-side auth
                return {
                    success: false,
                    error: 'Server-side authentication not available. Please use the standard login method.',
                    fallbackToClient: true
                };
            }
            
            console.log('[AuthService] Signing in user with custom token...');
            
            // Sign in with the custom token
            await this.signInWithCustomToken(customToken);
            
            return { success: true, message: 'Authentication successful' };
        } catch (error) {
            console.error('[AuthService] Server-side authentication failed:', error);
            return { success: false, error: error.message };
        }
    }

    async startServerSideAuthFlow() {
        try {
            // Create a simple form for email/password or redirect to a simpler auth page
            const webUrl = process.env.leviousa_WEB_URL || 'https://www.leviousa.com';
            const authUrl = `${webUrl}/login?mode=server&method=admin`;
            console.log(`[AuthService] Opening server-side auth URL: ${authUrl}`);
            await shell.openExternal(authUrl);
            return { success: true };
        } catch (error) {
            console.error('[AuthService] Failed to open server-side auth URL:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        const auth = getFirebaseAuth();
        try {
            // End all active sessions for the current user BEFORE signing out.
            await sessionRepository.endAllActiveSessions();

            await signOut(auth);
            console.log('[AuthService] User sign-out initiated successfully.');
            // onAuthStateChanged will handle the state update and broadcast,
            // which will also re-evaluate the API key status.
        } catch (error) {
            console.error('[AuthService] Error signing out:', error);
        }
    }
    
    broadcastUserState() {
        const userState = this.getCurrentUser();
        console.log('[AuthService] Broadcasting user state change:', userState);
        const windows = BrowserWindow.getAllWindows();
        console.log('[AuthService] Number of windows to broadcast to:', windows.length);
        
        windows.forEach((win, index) => {
            if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                console.log(`[AuthService] Sending user-state-changed to window ${index}`);
                win.webContents.send('user-state-changed', userState);
            } else {
                console.log(`[AuthService] Skipping destroyed/invalid window ${index}`);
            }
        });
    }

    // ***** BACKGROUND VIRTUAL KEY FETCH - NON-BLOCKING *****
    fetchVirtualKeyInBackground(user) {
        console.log(`[AuthService] Starting background virtual key fetch for ${user.email}`);
        
        // Create a completely isolated promise that can't create unhandled rejections
        const virtualKeyPromise = (async () => {
            try {
                console.log(`[AuthService] Getting ID token for virtual key fetch`);
                const idToken = await user.getIdToken(true);
                console.log(`[AuthService] Got ID token, fetching virtual key for ${user.email}`);
                
                const virtualKey = await getVirtualKeyByEmail(user.email, idToken);
                console.log(`[AuthService] Virtual key fetched successfully`);

                if (global.modelStateService) {
                    await global.modelStateService.setFirebaseVirtualKey(virtualKey);
                    console.log(`[AuthService] Virtual key set in model state service`);
                }
                console.log(`[AuthService] Background virtual key setup completed for ${user.email}`);

            } catch (error) {
                // Comprehensive error handling to prevent unhandled promise rejections
                console.error('[AuthService] Background virtual key fetch failed:', error);
                console.error('[AuthService] Virtual key error details:', error.message);
                
                if (error.code) {
                    console.error('[AuthService] Firebase error code:', error.code);
                }
                
                // Explicitly handle Firebase permission errors
                if (error.message && error.message.includes('permissions')) {
                    console.error('[AuthService] Firebase permissions issue detected - user may need to check Firestore rules');
                }
                
                console.log('[AuthService] Virtual key fetch failed but authentication remains valid');
                
                // Clear any pending virtual key to avoid confusion
                if (global.modelStateService) {
                    try {
                        await global.modelStateService.setFirebaseVirtualKey(null);
                        console.log('[AuthService] Cleared virtual key due to fetch failure');
                    } catch (clearError) {
                        console.error('[AuthService] Failed to clear virtual key:', clearError);
                    }
                }
            }
        })();

        // Explicitly catch any promise rejections to prevent unhandled errors
        virtualKeyPromise.catch((error) => {
            console.error('[AuthService] Caught promise rejection in virtual key fetch:', error);
        });
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getCurrentUser() {
        const isLoggedIn = !!(this.currentUserMode === 'firebase' && this.currentUser);

        if (isLoggedIn) {
            return {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: this.currentUser.displayName,
                mode: 'firebase',
                isLoggedIn: true,
                //////// before_modelStateService ////////
                // hasApiKey: this.hasApiKey // Always true for firebase users, but good practice
                //////// before_modelStateService ////////
            };
        }
        
        // Return null when not authenticated - no default user
        return null;
    }
}

const authService = new AuthService();
module.exports = authService; 