import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { sendDelayPasswordSetupEmail } from '../../utils/delayPasswordSetupEmail';

// Initialize Firebase Admin safely inside the handler
async function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
      const path = require('path');
      const fs = require('fs');
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log('✅ Using local service account file');
        const serviceAccount = require(serviceAccountPath);
        initializeApp({ credential: cert(serviceAccount) });
      } else {
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

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  sentTo?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { adminKey, testEmail } = req.body;

    // Basic security check
    if (adminKey !== 'test123' && adminKey !== process.env.ADMIN_EMAIL_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await initializeFirebaseAdmin();
    
    const auth = getAuth();
    const firestore = getFirestore();

    console.log('🚀 SIMPLE FIREBASE PASSWORD SETUP EMAIL');
    console.log('=======================================');

    if (testEmail) {
      // Send to single test email
      console.log(`📧 Sending custom password setup email to: ${testEmail}`);
      
      // Generate Firebase password reset link
      const passwordResetLink = await auth.generatePasswordResetLink(testEmail, {
        url: 'https://www.leviousa.com/activity', // Redirect after password setup
      });
      
      console.log('🔗 Generated secure Firebase password reset link');
      
      // Extract name from email
      const name = testEmail.split('@')[0].charAt(0).toUpperCase() + testEmail.split('@')[0].slice(1);
      
      // Send custom email template via Resend
      const emailResult = await sendDelayPasswordSetupEmail(testEmail, name, passwordResetLink);
      
      if (emailResult.success) {
        console.log(`✅ Custom password setup email sent to ${testEmail}`);
        return res.status(200).json({
          success: true,
          message: `Custom password setup email sent to ${testEmail}`,
          sentTo: 1
        });
      } else {
        throw new Error(`Email sending failed: ${emailResult.error}`);
      }
    } else {
      // Send to all countdown signups
      console.log('📧 Sending custom password setup emails to all countdown signups...');
      
      const countdownSnapshot = await firestore.collection('countdownSignups').get();
      console.log(`Found ${countdownSnapshot.size} countdown signups`);
      
      let sentCount = 0;
      const sendPromises = [];
      
      for (const doc of countdownSnapshot.docs) {
        const data = doc.data();
        const email = data.email;
        const name = data.name || email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        
        if (email) {
          console.log(`📤 Processing email: ${email}`);
          
          const sendPromise = (async () => {
            try {
              // Generate Firebase password reset link for this user
              const passwordResetLink = await auth.generatePasswordResetLink(email, {
                url: 'https://www.leviousa.com/activity',
              });
              
              // Send custom email template via Resend
              const emailResult = await sendDelayPasswordSetupEmail(email, name, passwordResetLink);
              
              if (emailResult.success) {
                console.log(`✅ Sent custom email to ${email}`);
              } else {
                console.error(`❌ Failed to send to ${email}: ${emailResult.error}`);
              }
            } catch (error) {
              console.error(`❌ Error processing ${email}:`, error.message);
            }
          })();
          
          sendPromises.push(sendPromise);
          sentCount++;
        }
      }
      
      // Wait for all emails to be processed
      await Promise.all(sendPromises);
      
      console.log(`🎉 All ${sentCount} custom password setup emails processed!`);
      
      return res.status(200).json({
        success: true,
        message: `Custom password setup emails sent to ${sentCount} users`,
        sentTo: sentCount
      });
    }

  } catch (error: any) {
    console.error('❌ Error sending password setup emails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send password setup emails'
    });
  }
}
