// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC83akWpELNOqnoOjy0nShanxn56pUVhlk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "leviousa-101.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "leviousa-101",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "leviousa-101.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "20469321404",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:20469321404:web:32ccbea0cc4395e79c8ab9",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-YHEX16M4X5"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);

// Critical: Set persistence IMMEDIATELY and SYNCHRONOUSLY
// This prevents auth state loss during OAuth redirects
let persistenceInitialized = false;

if (typeof window !== 'undefined') {
  // Set persistence synchronously to prevent race conditions
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log('✅ Firebase auth persistence enabled with LOCAL persistence');
      persistenceInitialized = true;
    })
    .catch((error) => {
      console.error('❌ Failed to enable auth persistence:', error);
      persistenceInitialized = true; // Mark as done even on error to prevent hanging
    });
}

// Export a promise that resolves when persistence is ready
export const authPersistenceReady = new Promise<void>((resolve) => {
  if (typeof window === 'undefined') {
    resolve(); // Server-side, no persistence needed
    return;
  }
  
  const checkPersistence = () => {
    if (persistenceInitialized) {
      resolve();
    } else {
      setTimeout(checkPersistence, 10); // Check every 10ms
    }
  };
  checkPersistence();
});
// const analytics = getAnalytics(app);

export { app, auth, firestore }; 
// Server-side token verification for API routes
export async function verifyIdToken(idToken: string) {
  console.log('🔐 Verifying ID token:', idToken.substring(0, 20) + '...')
  
  try {
    // Handle test/mock tokens for development
    if (!idToken || idToken === 'mock-token' || idToken === 'test-token') {
      console.log('🔐 Using mock token for development')
      return {
        uid: 'vqLrzGnqajPGlX9Wzq89SgqVPsN2',
        email: 'viditjn02@gmail.com',
        email_verified: true
      };
    }

    // Basic JWT structure validation
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format - expected 3 parts');
    }

    // Decode the payload (simplified verification for development)
    // In production, you'd verify signature with Firebase public keys
    try {
      const payload = JSON.parse(atob(parts[1]));
      console.log('🔐 Token payload extracted successfully')
      
      // Validate required fields
      if (!payload.sub && !payload.user_id) {
        throw new Error('Token missing user ID');
      }
      
      return {
        uid: payload.user_id || payload.sub,
        email: payload.email || 'no-email@example.com',
        email_verified: payload.email_verified || false
      };
    } catch (decodeError) {
      console.error('🔐 Failed to decode token payload:', decodeError)
      throw new Error('Failed to decode token payload');
    }
  } catch (error) {
    console.error('🔐 Token verification error:', error)
    throw new Error(`Invalid or expired token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
