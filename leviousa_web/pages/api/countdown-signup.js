import { Resend } from 'resend';
import admin from 'firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "leviousa-101",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
      }),
    });
  } catch (error) {
    console.warn('Firebase Admin init failed:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { name, email } = req.body;

    // Basic validation
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and email are required' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please enter a valid email address' 
      });
    }

    // Create Firebase user
    let userId = null;
    try {
      if (admin.apps.length > 0) {
        const auth = admin.auth();
        const firestore = admin.firestore();
        
        // Check if user exists
        try {
          const existingUser = await auth.getUserByEmail(email);
          return res.status(400).json({ 
            success: false, 
            error: 'This email is already registered!' 
          });
        } catch (error) {
          // User doesn't exist, create new one
          if (error.code === 'auth/user-not-found') {
            const tempPassword = Math.random().toString(36).slice(-12) + 'T1!';
            const userRecord = await auth.createUser({
              email: email,
              password: tempPassword,
              displayName: name,
              disabled: false,
            });
            
            userId = userRecord.uid;
            
            // Store in Firestore
            await firestore.collection('countdownSignups').doc(userId).set({
              userId: userId,
              email: email,
              name: name,
              signupTimestamp: new Date(),
              ipAddress: req.headers['x-forwarded-for'] || 'unknown',
            });
          }
        }
      }
    } catch (fbError) {
      console.warn('Firebase operation failed, continuing with email only:', fbError);
    }

    // Send confirmation email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Leviousa Team <noreply@leviousa.com>',
      to: [email],
      subject: '🚀 Welcome to the Leviousa Revolution!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Leviousa</title>
        </head>
        <body style="font-family: Inter, Arial, sans-serif; background-color: #000; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(45deg, #905151, #f2e9e9); padding: 40px 30px; text-align: center;">
              <h1 style="color: #000; font-size: 28px; font-weight: 800; margin: 0;">LEVIOUSA</h1>
            </div>
            <div style="padding: 40px 30px; color: #fff;">
              <h2 style="color: #fff; font-size: 24px; margin-bottom: 20px;">Hey ${name}! 👋</h2>
              <p style="font-size: 16px; margin-bottom: 20px; color: #bbb;">
                Welcome to the revolution! You're now part of an exclusive group of early users who will experience the future of AI productivity.
              </p>
              <div style="background: rgba(144, 81, 81, 0.1); border: 1px solid rgba(144, 81, 81, 0.3); border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #f2e9e9; margin: 0 0 15px 0; font-size: 18px;">🎁 What you get as an early user:</h3>
                <ul style="color: #bbb; margin: 0; padding-left: 20px;">
                  <li>Chance to win 6 months Pro free ($108 value)</li>
                  <li>Chance to win up to $1000 cash</li>
                  <li>Priority access when we launch</li>
                  <li>Exclusive early user benefits</li>
                </ul>
                <div style="background: rgba(242, 233, 233, 0.05); border: 1px solid rgba(242, 233, 233, 0.1); border-radius: 8px; padding: 15px; margin-top: 15px;">
                  <p style="color: #f2e9e9; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">🎯 How to Win:</p>
                  <p style="color: #bbb; font-size: 13px; margin: 0; line-height: 1.4;">
                    Share leviousa.com on social media and tag us:<br>
                    <strong>Instagram:</strong> @Leviousa.Magic<br>
                    <strong>X/Twitter:</strong> @Leviousa_Magic<br>
                    <strong>LinkedIn:</strong> @leviousa<br>
                    <em style="color: #905151;">Each share increases your chances!</em>
                  </p>
                </div>
              </div>
              <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px;">
                Built with ❤️ in San Francisco<br>
                © 2025 Leviousa, Inc.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Email failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send confirmation email'
      });
    }

    console.log(`✅ Countdown signup successful for ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Successfully signed up for early access!'
    });

  } catch (error) {
    console.error('❌ Countdown signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again.'
    });
  }
}
