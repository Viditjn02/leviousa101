// Centralized Firebase Admin initialization
import { initializeApp, getApps, cert, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let firestore: any = null

export function getFirestoreAdmin() {
  if (firestore) {
    console.log('♻️ Reusing existing Firestore connection')
    return firestore
  }

  try {
    // Clean up any existing apps first
    const existingApps = getApps()
    if (existingApps.length > 0) {
      console.log(`🧹 Cleaning up ${existingApps.length} existing Firebase apps`)
      existingApps.forEach(app => deleteApp(app))
    }

    // Initialize fresh Firebase Admin app
    const serviceAccount = require('../firebase-service-account.json')
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    }, `leviousa-admin-${Date.now()}`) // Unique name to avoid conflicts

    firestore = getFirestore(app)
    console.log(`🔥 Fresh Firebase Admin initialized: ${app.name}`)
    
    return firestore
    
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error)
    throw error
  }
}