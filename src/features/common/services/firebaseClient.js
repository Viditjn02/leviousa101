const { initializeApp, getApps } = require('firebase/app');
const { initializeAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');

// Add Firebase Admin SDK for server-side auth
const admin = require('firebase-admin');

// More reliable approach for electron-store
let Store = null;
const initializeStore = async () => {
    if (!Store) {
        try {
            const electronStore = await import('electron-store');
            Store = electronStore.default;
        } catch (error) {
            console.error('[FirebaseClient] Failed to load electron-store:', error);
            throw error;
        }
    }
    return Store;
};

// setLogLevel('debug');

/**
 * Firebase Auth expects the `persistence` option passed to `initializeAuth()` to be *classes*,
 * not instances. It then calls `new PersistenceClass()` internally.  
 *
 * The helper below returns such a class, pre-configured with an `electron-store` instance that
 * will be shared across all constructed objects. This mirrors the pattern used by Firebase's own
 * `browserLocalPersistence` implementation as well as community solutions for NodeJS.
 */
async function createElectronStorePersistence(storeName = 'firebase-auth-session') {
    // Ensure Store is loaded
    await initializeStore();
    
    // Create a single `electron-store` behind the scenes – all Persistence instances will use it.
    const sharedStore = new Store({ name: storeName });

    return class ElectronStorePersistence {
        constructor() {
            this.store = sharedStore;
            this.type = 'LOCAL';
        }

        /**
         * Firebase calls this to check whether the persistence is usable in the current context.
         */
        _isAvailable() {
            return Promise.resolve(true);
        }

        // Sanitize keys to avoid dot-prop parsing issues while preserving uniqueness
        _sanitizeKey(key) {
            // Use base64 encoding to avoid special characters while preserving uniqueness
            return 'fb_' + Buffer.from(key, 'utf8').toString('base64').replace(/[^a-zA-Z0-9]/g, '_');
        }

        async _set(key, value) {
            const sanitizedKey = this._sanitizeKey(key);
            this.store.set(sanitizedKey, value);
        }

        async _get(key) {
            const sanitizedKey = this._sanitizeKey(key);
            return this.store.get(sanitizedKey) ?? null;
        }

        async _remove(key) {
            const sanitizedKey = this._sanitizeKey(key);
            this.store.delete(sanitizedKey);
        }

        /**
         * These are used by Firebase to react to external storage events (e.g. multi-tab).
         * Electron apps are single-renderer per process, so we can safely provide no-op
         * implementations.
         */
        _addListener(_key, _listener) {
            // no-op
        }

        _removeListener(_key, _listener) {
            // no-op
        }
    };
}

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyC83akWpELNOqnoOjy0nShanxn56pUVhlk',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'leviousa-101.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'leviousa-101',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'leviousa-101.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '20469321404',
    appId: process.env.FIREBASE_APP_ID || '1:20469321404:web:32ccbea0cc4395e79c8ab9',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-YHEX16M4X5',
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreInstance = null; // To hold the specific DB instance
let adminApp = null; // Firebase Admin SDK instance

async function initializeFirebase() {
    if (firebaseApp) {
        console.log('[FirebaseClient] Firebase already initialized.');
        return;
    }
    try {
        // Initialize Firebase Client SDK
        firebaseApp = initializeApp(firebaseConfig);
        
        // Build a *class* persistence provider and hand it to Firebase.
        const ElectronStorePersistence = await createElectronStorePersistence('firebase-auth-session');

        firebaseAuth = initializeAuth(firebaseApp, {
            // `initializeAuth` accepts a single class or an array – we pass an array for future
            // extensibility and to match Firebase examples.
            persistence: [ElectronStorePersistence],
        });

        // Initialize Firestore with the default database
        firestoreInstance = getFirestore(firebaseApp);

        // Initialize Firebase Admin SDK for server-side auth (non-blocking)
        initializeFirebaseAdmin().catch(error => {
            console.error('[FirebaseClient] Firebase Admin initialization failed (non-blocking):', error);
        });

        console.log('[FirebaseClient] Firebase initialized successfully with class-based electron-store persistence.');
        console.log('[FirebaseClient] Firestore instance is targeting the "leviousa" database.');
    } catch (error) {
        console.error('[FirebaseClient] Firebase initialization failed:', error);
    }
}

async function initializeFirebaseAdmin() {
    try {
        // Check if admin app is already initialized
        if (adminApp) {
            console.log('[FirebaseClient] Firebase Admin already initialized.');
            return;
        }

        // Try to find service account key file
        const path = require('path');
        const fs = require('fs');
        
        // Look for service account key in multiple locations
        const possiblePaths = [
            path.join(__dirname, '../../../../firebase-service-account.json'),
            path.join(__dirname, '../../../../serviceAccountKey.json'),
            path.join(process.cwd(), 'firebase-service-account.json'),
            path.join(process.cwd(), 'serviceAccountKey.json'),
        ];

        let serviceAccountPath = null;
        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                serviceAccountPath = filePath;
                break;
            }
        }

        if (serviceAccountPath) {
            // Initialize with service account key
            const serviceAccount = require(serviceAccountPath);
            adminApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'leviousa-101', // Explicitly set project ID
                databaseURL: `https://leviousa-101-default-rtdb.firebaseio.com/`
            });
            console.log('[FirebaseClient] Firebase Admin initialized with service account.');
        } else {
            // Initialize with environment-based credentials (fallback)
            adminApp = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: 'leviousa-101', // Explicitly set project ID
                databaseURL: `https://leviousa-101-default-rtdb.firebaseio.com/`
            });
            console.log('[FirebaseClient] Firebase Admin initialized with application default credentials.');
        }
    } catch (error) {
        console.error('[FirebaseClient] Firebase Admin initialization failed:', error);
        console.log('[FirebaseClient] Continuing with client-side auth only.');
    }
}

function getFirebaseAuth() {
    if (!firebaseAuth) {
        throw new Error("Firebase Auth has not been initialized. Call initializeFirebase() first.");
    }
    return firebaseAuth;
}

function getFirestoreInstance() {
    if (!firestoreInstance) {
        throw new Error("Firestore has not been initialized. Call initializeFirebase() first.");
    }
    return firestoreInstance;
}

function getFirebaseAdmin() {
    if (!adminApp) {
        throw new Error("Firebase Admin has not been initialized. Service account key may be missing.");
    }
    return adminApp;
}

async function createCustomToken(uid, additionalClaims = {}) {
    try {
        if (!adminApp) {
            // Try to initialize admin if not already done
            await initializeFirebaseAdmin();
            if (!adminApp) {
                throw new Error("Firebase Admin not initialized. Cannot create custom token.");
            }
        }
        
        const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
        console.log('[FirebaseClient] Custom token created for user:', uid);
        return customToken;
    } catch (error) {
        console.error('[FirebaseClient] Failed to create custom token:', error);
        throw error;
    }
}

async function verifyIdToken(idToken) {
    try {
        if (!adminApp) {
            // Try to initialize admin if not already done
            await initializeFirebaseAdmin();
            if (!adminApp) {
                throw new Error("Firebase Admin not initialized. Cannot verify ID token.");
            }
        }
        
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('[FirebaseClient] ID token verified for user:', decodedToken.uid);
        return decodedToken;
    } catch (error) {
        console.error('[FirebaseClient] Failed to verify ID token:', error);
        throw error;
    }
}

module.exports = {
    initializeFirebase,
    getFirebaseAuth,
    getFirestoreInstance,
    getFirebaseAdmin,
    createCustomToken,
    verifyIdToken,
}; 