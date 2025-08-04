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