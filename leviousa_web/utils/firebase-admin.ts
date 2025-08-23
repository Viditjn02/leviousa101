// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin if not already initialized
let adminApp: App | undefined
let db: Firestore | undefined

function initializeFirebaseAdmin(): { firestore: Firestore; adminApp: App } {
  if (adminApp && db) {
    return { firestore: db, adminApp }
  }

  try {
    // Check if already initialized
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      db = getFirestore(adminApp)
      console.log('🔥 Firebase Admin using existing app')
      return { firestore: db, adminApp }
    }

    // For Vercel/production: Use Application Default Credentials
    // This works without service account files when deployed to Vercel
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'leviousa-101',
      })
      console.log('🔥 Firebase Admin initialized with ADC for production')
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
      // For development with service account
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || 'leviousa-101',
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      })
      console.log('🔥 Firebase Admin initialized with service account')
    } else {
      // Fallback - this might not work in production
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'leviousa-101',
      })
      console.log('🔥 Firebase Admin initialized with default credentials')
    }
    
    db = getFirestore(adminApp)
    return { firestore: db, adminApp }
    
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error)
    throw new Error(`Firebase Admin initialization failed: ${error}`)
  }
}

// Export a function that returns initialized instances
export function getFirebaseAdmin() {
  return initializeFirebaseAdmin()
}

// For backward compatibility
export const { firestore: firestoreInstance, adminApp: adminAppExport } = (() => {
  try {
    return initializeFirebaseAdmin()
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin during import:', error)
    // Return undefined values that will cause errors if used without proper initialization
    return { firestore: undefined as any, adminApp: undefined as any }
  }
})()

export { firestoreInstance as firestore, adminAppExport as adminApp }
