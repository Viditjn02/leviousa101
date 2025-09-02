import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
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

interface CountdownStatusResponse {
  countdownActive: boolean;
  countdownCompleted?: boolean;
  completedAt?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CountdownStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      countdownActive: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const firestore = getFirestore();
    
    // Check countdown status from database
    const countdownDoc = await firestore
      .collection('system')
      .doc('countdownStatus')
      .get();
    
    if (countdownDoc.exists) {
      const data = countdownDoc.data();
      const isCompleted = data?.completed || false;
      
      return res.status(200).json({
        countdownActive: !isCompleted,
        countdownCompleted: isCompleted,
        completedAt: data?.completedAt?.toDate?.()?.toISOString() || null,
        message: isCompleted ? 'Countdown completed' : 'Countdown still active'
      });
    } else {
      // No countdown status doc exists, assume countdown is still active
      return res.status(200).json({
        countdownActive: true,
        countdownCompleted: false,
        message: 'Countdown status not initialized, assuming active'
      });
    }
    
  } catch (error: any) {
    console.error('❌ Failed to check countdown status:', error);
    
    // Default to landing page if there's an error
    return res.status(200).json({
      countdownActive: false,
      message: 'Error checking status, defaulting to landing page'
    });
  }
}
