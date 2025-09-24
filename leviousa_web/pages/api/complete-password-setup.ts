import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin safely inside the handler
async function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
      // Try to use service account file first (for local development)
      const path = require('path');
      const fs = require('fs');
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log('✅ Using local service account file');
        const serviceAccount = require(serviceAccountPath);
        initializeApp({ credential: cert(serviceAccount) });
      } else {
        // Fallback to environment variables (for production)
        console.log('⚠️ Using environment variables for Firebase config');
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID || "leviousa-101",
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
        };
        initializeApp({ credential: cert(serviceAccount as any) });
      }
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw new Error('Failed to initialize Firebase Admin SDK');
    }
  }
}

interface CompletePasswordSetupRequest {
  token: string;
  password: string;
}

interface CompletePasswordSetupResponse {
  success: boolean;
  customToken?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompletePasswordSetupResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Initialize Firebase Admin inside the handler
    await initializeFirebaseAdmin();

    const { token, password }: CompletePasswordSetupRequest = req.body;

    if (!token || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      });
    }

    const auth = getAuth();
    const firestore = getFirestore();

    // Validate the setup token
    const tokenDoc = await firestore
      .collection('passwordSetupTokens')
      .doc(token)
      .get();

    if (!tokenDoc.exists) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid setup token' 
      });
    }

    const tokenData = tokenDoc.data();
    
    // Check if token is expired
    if (tokenData.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Setup token has expired' 
      });
    }

    // Check if token has already been used
    if (tokenData.used) {
      return res.status(400).json({ 
        success: false, 
        error: 'Setup token has already been used' 
      });
    }

    const userId = tokenData.userId;

    // Update the user's password in Firebase Auth
    await auth.updateUser(userId, {
      password: password,
    });

    // Mark the token as used
    await firestore
      .collection('passwordSetupTokens')
      .doc(token)
      .update({
        used: true,
        usedAt: new Date(),
      });

    // Update user document to mark password as set
    await firestore
      .collection('users')
      .doc(userId)
      .update({
        passwordSetupRequired: false,
        passwordSetAt: new Date(),
        updatedAt: new Date(),
      });

    // Create custom token for immediate login
    const customToken = await auth.createCustomToken(userId, {
      passwordSetup: false,
      earlyAccess: true,
      countdownUser: true,
    });

    console.log(`✅ Password setup completed for user ${userId}`);

    return res.status(200).json({
      success: true,
      customToken: customToken,
      message: 'Password setup completed successfully!'
    });

  } catch (error: any) {
    console.error('❌ Password setup completion error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return res.status(400).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ 
        success: false, 
        error: 'Password is too weak. Please choose a stronger password.' 
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to complete password setup'
    });
  }
}
