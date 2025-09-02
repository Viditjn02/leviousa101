import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { sendConfirmationEmail } from '../../utils/emailService';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
  };

  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

interface CountdownSignupRequest {
  name: string;
  email: string;
}

interface CountdownSignupResponse {
  success: boolean;
  message: string;
  userId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CountdownSignupResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { name, email }: CountdownSignupRequest = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please enter a valid email address' 
      });
    }

    const auth = getAuth();
    const firestore = getFirestore();

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(email);
      return res.status(400).json({ 
        success: false, 
        error: 'This email is already registered. Thanks for your interest!' 
      });
    } catch (error: any) {
      // User doesn't exist, which is what we want
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking existing user:', error);
        throw error;
      }
    }

    // Generate a temporary password for the user
    const tempPassword = Math.random().toString(36).slice(-12) + 'T1!';

    // Create Firebase user - ACTIVE immediately
    const userRecord = await auth.createUser({
      email: email,
      password: tempPassword,
      displayName: name,
      disabled: false, // User is active immediately
    });

    // Set custom claims for early access
    await auth.setCustomUserClaims(userRecord.uid, {
      earlyAccess: true,
      countdownSignup: true,
      signupTimestamp: Date.now(),
    });

    // Store additional user data in Firestore
    await firestore.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: name,
      earlyAccess: true,
      countdownSignup: true,
      signupTimestamp: new Date(),
      passwordSetupRequired: true, // They need to set password after countdown
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Store in countdown signups collection for tracking
    await firestore.collection('countdownSignups').doc(userRecord.uid).set({
      userId: userRecord.uid,
      email: email,
      name: name,
      signupTimestamp: new Date(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    // Send confirmation email
    const emailResult = await sendConfirmationEmail(email, name);
    if (!emailResult.success) {
      console.warn('⚠️ Confirmation email failed to send, but signup was successful:', emailResult.error);
    }

    console.log(`✅ Countdown signup successful for ${email} (${userRecord.uid})`);

    return res.status(200).json({
      success: true,
      message: 'Successfully signed up for early access!',
      userId: userRecord.uid
    });

  } catch (error: any) {
    console.error('❌ Countdown signup error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ 
        success: false, 
        error: 'This email is already registered. Thanks for your interest!' 
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again.'
    });
  }
}


