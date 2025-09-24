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

interface ApiResponse {
  success: boolean;
  message?: string;
  stats?: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors?: string[];
  preview?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { preview = false, adminKey } = req.body;

    // Basic security - require admin key
    if (adminKey !== process.env.ADMIN_EMAIL_KEY && adminKey !== 'leviousa_admin_2025') {
      return res.status(401).json({ success: false, message: 'Unauthorized - Invalid admin key' });
    }

    const firestore = getFirestore();
    const auth = getAuth();

    // Get all waitlist users who need password setup
    console.log('🔍 Fetching waitlist users who need password setup...');
    
    // Check both countdownSignups and users collections
    const [countdownSnapshot, usersSnapshot] = await Promise.all([
      firestore.collection('countdownSignups').get(),
      firestore.collection('users')
        .where('passwordSetupRequired', '==', true)
        .get()
    ]);

    console.log(`📊 Found ${countdownSnapshot.size} countdown signups and ${usersSnapshot.size} users needing password setup`);

    // Combine and deduplicate users
    const usersToEmail = new Map();
    
    // Add countdown signups
    for (const doc of countdownSnapshot.docs) {
      const userData = doc.data();
      if (userData.email && userData.userId) {
        usersToEmail.set(userData.userId, {
          userId: userData.userId,
          email: userData.email,
          name: userData.name || userData.email.split('@')[0],
          source: 'countdownSignups'
        });
      }
    }
    
    // Add users who still need password setup
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      if (userData.email && !usersToEmail.has(userId)) {
        usersToEmail.set(userId, {
          userId: userId,
          email: userData.email,
          name: userData.displayName || userData.name || userData.email.split('@')[0],
          source: 'users'
        });
      }
    }

    const totalUsers = usersToEmail.size;
    console.log(`📧 Total unique users to email: ${totalUsers}`);

    if (preview) {
      // Return preview data without sending emails
      const previewUsers = Array.from(usersToEmail.values()).slice(0, 10);
      return res.status(200).json({
        success: true,
        preview: true,
        message: `Preview: Would send emails to ${totalUsers} users`,
        stats: {
          total: totalUsers,
          successful: 0,
          failed: 0,
          skipped: 0
        }
      });
    }

    // Send actual emails
    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    console.log('📤 Starting to send delay + password setup emails...');

    for (const userData of usersToEmail.values()) {
      try {
        const { userId, email, name } = userData;

        // CRITICAL: Ensure user exists in Firebase Auth (not just Firestore)
        let firebaseUserId = userId;
        try {
          // Try to get the user from Firebase Auth
          await auth.getUser(userId);
          console.log(`✅ User ${email} already exists in Firebase Auth`);
        } catch (userNotFoundError) {
          if (userNotFoundError.code === 'auth/user-not-found') {
            console.log(`🔧 Creating Firebase Auth user for ${email}...`);
            
            // Create the user in Firebase Auth (required for password setup)
            const newUser = await auth.createUser({
              uid: userId, // Use existing UID from Firestore
              email: email,
              displayName: name,
              emailVerified: false,
              disabled: false
            });
            
            firebaseUserId = newUser.uid;
            console.log(`✅ Created Firebase Auth user for ${email} with UID: ${firebaseUserId}`);
          } else {
            throw userNotFoundError; // Re-throw other errors
          }
        }

        // Generate a unique setup token (not a JWT, just a random secure string)
        const setupTokenId = `setup_${firebaseUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the setup token in Firestore
        await firestore.collection('passwordSetupTokens').doc(setupTokenId).set({
          userId: firebaseUserId,
          email,
          name,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
          used: false,
          type: 'delay_apology'
        });

        // Send the delay + password setup email
        const { sendDelayPasswordSetupEmail } = await import('../../utils/delayPasswordSetupEmail');
        const emailResult = await sendDelayPasswordSetupEmail(email, name, setupTokenId);

        if (emailResult.success) {
          results.successful++;
          console.log(`✅ Email sent to ${email}`);
        } else {
          results.failed++;
          results.errors.push(`Failed to send to ${email}: ${emailResult.error}`);
          console.error(`❌ Failed to send to ${email}:`, emailResult.error);
        }

        // Rate limiting - small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        const errorMsg = `Error processing ${userData.email}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    console.log(`📊 Email sending complete: ${results.successful} successful, ${results.failed} failed`);

    return res.status(200).json({
      success: true,
      message: `Delay + password setup emails sent successfully!`,
      stats: {
        total: totalUsers,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped
      },
      errors: results.errors.length > 0 ? results.errors.slice(0, 10) : undefined // Limit error list
    });

  } catch (error: any) {
    console.error('❌ Failed to send delay + password setup emails:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send emails',
      errors: [error.message]
    });
  }
}
