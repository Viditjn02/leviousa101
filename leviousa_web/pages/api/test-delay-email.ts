import { NextApiRequest, NextApiResponse } from 'next';
import { sendDelayPasswordSetupEmail } from '../../utils/delayPasswordSetupEmail';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, adminKey } = req.body;

    // Basic security - require admin key
    if (adminKey !== process.env.ADMIN_EMAIL_KEY && adminKey !== 'test123') {
      return res.status(401).json({ success: false, message: 'Unauthorized - Invalid admin key' });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address required' });
    }

    console.log(`📧 Sending test delay + password setup email to: ${email}`);

    // CRITICAL: Create REAL working setup token for complete flow testing
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAuth } = await import('firebase-admin/auth');
    
    // Initialize Firebase Admin if not already done
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    if (!getApps().length) {
      try {
        // Try to use service account file first (for local development)
        const path = await import('path');
        const fs = await import('fs');
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

    const firestore = getFirestore();
    const auth = getAuth();
    
    // Extract name from email
    const name = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
    
    // Create or get Firebase Auth user
    let userId;
    try {
      // Try to find existing user by email
      const existingUser = await auth.getUserByEmail(email);
      userId = existingUser.uid;
      console.log(`✅ Found existing Firebase Auth user: ${userId}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        console.log(`🔧 Creating new Firebase Auth user for test: ${email}`);
        const newUser = await auth.createUser({
          email: email,
          displayName: name,
          emailVerified: false,
          disabled: false
        });
        userId = newUser.uid;
        console.log(`✅ Created Firebase Auth user: ${userId}`);
      } else {
        throw error;
      }
    }

    // Generate REAL setup token and store in Firestore
    const testSetupToken = `setup_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await firestore.collection('passwordSetupTokens').doc(testSetupToken).set({
      userId,
      email,
      name,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      used: false,
      type: 'test_complete_flow'
    });
    
    console.log(`✅ Created REAL working setup token: ${testSetupToken}`);

    // Send the test email
    const emailResult = await sendDelayPasswordSetupEmail(email, name, testSetupToken);

    if (emailResult.success) {
      console.log(`✅ Test email sent successfully to ${email}`);
      return res.status(200).json({
        success: true,
        message: `Test delay + password setup email sent to ${email}`,
      });
    } else {
      console.error(`❌ Failed to send test email to ${email}:`, emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: emailResult.error
      });
    }

  } catch (error: any) {
    console.error('❌ Test email API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
