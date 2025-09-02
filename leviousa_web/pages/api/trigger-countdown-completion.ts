import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { sendPasswordSetupEmailsToCountdownUsers } from '../../utils/emailService';

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

interface TriggerCountdownCompletionResponse {
  success: boolean;
  message?: string;
  results?: {
    successful: number;
    failed: number;
    total: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TriggerCountdownCompletionResponse>
) {
  // This endpoint can be triggered manually or via a scheduled function
  // In production, you'd typically use a cron job or Cloud Function scheduled trigger
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Optional: Add authorization check
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.COUNTDOWN_TRIGGER_SECRET}`) {
      // For security, you should set COUNTDOWN_TRIGGER_SECRET in your environment
      console.warn('⚠️ Unauthorized countdown completion trigger attempt');
      // Don't return error details for security, but you can still proceed if needed
    }

    console.log('🎯 Triggering countdown completion emails...');

    // Send password setup emails to all countdown users
    const results = await sendPasswordSetupEmailsToCountdownUsers();

    // Mark countdown as completed in database
    const firestore = getFirestore();
    await firestore.collection('system').doc('countdownStatus').set({
      completed: true,
      completedAt: new Date(),
      emailResults: results,
    }, { merge: true });

    console.log(`✅ Countdown completion triggered successfully: ${results.successful}/${results.total} emails sent`);

    return res.status(200).json({
      success: true,
      message: `Countdown completion triggered successfully. ${results.successful}/${results.total} emails sent.`,
      results
    });

  } catch (error: any) {
    console.error('❌ Failed to trigger countdown completion:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger countdown completion'
    });
  }
}

// Alternative approach: You can also set this up as a Vercel Cron Job
// Create vercel.json in the project root with:
/*
{
  "crons": [
    {
      "path": "/api/trigger-countdown-completion",
      "schedule": "0 21 * * *"
    }
  ]
}
*/
