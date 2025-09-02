import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
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

  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

interface ValidateTokenRequest {
  token: string;
}

interface ValidateTokenResponse {
  success: boolean;
  data?: {
    userId: string;
    email: string;
    name?: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateTokenResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { token }: ValidateTokenRequest = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token is required' 
      });
    }

    const firestore = getFirestore();

    // Check if token exists in passwordSetupTokens collection
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

    // Get user information from countdown signups
    const countdownSignupDoc = await firestore
      .collection('countdownSignups')
      .doc(tokenData.userId)
      .get();

    if (!countdownSignupDoc.exists) {
      return res.status(400).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const signupData = countdownSignupDoc.data();

    return res.status(200).json({
      success: true,
      data: {
        userId: tokenData.userId,
        email: tokenData.email,
        name: signupData.name
      }
    });

  } catch (error: any) {
    console.error('❌ Token validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate token'
    });
  }
}
