// Email service for sending transactional emails
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface PasswordSetupEmailData {
  email: string;
  name: string;
  setupToken: string;
}

// Create transporter based on environment
function createTransport() {
  // Resend configuration (preferred)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    return {
      sendMail: async (options: any) => {
        const { data, error } = await resend.emails.send({
          from: options.from || 'Leviousa Team <noreply@leviousa.com>',
          to: [options.to],
          subject: options.subject,
          html: options.html,
        });
        if (error) throw error;
        return { messageId: data?.id || 'resend-' + Date.now() };
      }
    };
  }
  // Zoho Mail configuration for business domains
  if (process.env.EMAIL_SERVICE === 'zoho') {
    return nodemailer.createTransport({
      host: 'smtppro.zoho.com', // For business/organization domains
      port: 587, // TLS port (or 465 for SSL)
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.ZOHO_USER, // info@leviousa.com
        pass: process.env.ZOHO_PASSWORD, // Your Zoho password or app-specific password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Use app-specific password
      },
    });
  }
  
  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    // SendGrid SMTP
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  
  if (process.env.EMAIL_SERVICE === 'mailgun') {
    return nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_SMTP_LOGIN,
        pass: process.env.MAILGUN_SMTP_PASSWORD,
      },
    });
  }
  
  // Fallback to console logging for development
  return {
    sendMail: async (options: any) => {
      console.log('📧 Email would be sent:', options);
      return { messageId: 'dev-' + Date.now() };
    }
  };
}

export async function sendEmail(options: EmailOptions) {
  try {
    const transporter = createTransport();
    
    const mailOptions = {
      from: options.from || `"Leviousa Team" <info@leviousa.com>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

export async function sendConfirmationEmail(email: string, name: string): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Leviousa</title>
    </head>
    <body style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #000; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #1e1e1e 100%); border-radius: 12px; overflow: hidden;">
        
        <div style="background: linear-gradient(45deg, #905151, #f2e9e9); padding: 40px 30px; text-align: center;">
          <h1 style="color: #000; font-size: 28px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.1em;">LEVIOUSA</h1>
        </div>
        
        <div style="padding: 40px 30px; color: #fff;">
          <h2 style="color: #fff; font-size: 24px; margin-bottom: 20px;">Hey ${name}! 👋</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px; color: #bbb;">
            Welcome to the revolution! You're now part of an exclusive group of early adopters who will experience the future of AI productivity.
          </p>
          
          <div style="background: rgba(144, 81, 81, 0.1); border: 1px solid rgba(144, 81, 81, 0.3); border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #f2e9e9; margin: 0 0 15px 0; font-size: 18px;">🎁 What you get as a founding member:</h3>
            <ul style="color: #bbb; margin: 0; padding-left: 20px;">
              <li>Chance to win 6 months Pro free ($108 value)</li>
              <li>Chance to win up to $1000 cash</li>
              <li>Priority access when we launch</li>
              <li>Exclusive founding member benefits</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px; color: #bbb;">
            Your account has been created and you're ready to go! When the countdown ends, you'll receive another email with instructions to set up your password and start your journey.
          </p>
          
          <p style="font-size: 16px; margin-bottom: 30px; color: #bbb;">
            <strong style="color: #f2e9e9;">Ready for the upgrade?</strong><br>
            Zero interruptions. Pure magic.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.leviousa.com'}" 
               style="display: inline-block; background: linear-gradient(45deg, #905151, #f2e9e9); color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
              Visit Leviousa
            </a>
          </div>
          
          <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
            Built with ❤️ in San Francisco<br>
            © 2024 Leviousa, Inc. | <a href="https://www.leviousa.com/privacy" style="color: #905151;">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: '🚀 Welcome to the Leviousa Revolution!',
    html,
  });
}

export async function sendPasswordSetupEmail(data: PasswordSetupEmailData): Promise<{ success: boolean; error?: string }> {
  const { email, name, setupToken } = data;
  const setupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.leviousa.com'}/setup-password?token=${setupToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🚀 It's Time! Set Up Your Leviousa Account</title>
    </head>
    <body style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #000; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #1e1e1e 100%); border-radius: 12px; overflow: hidden;">
        
        <div style="background: linear-gradient(45deg, #905151, #f2e9e9); padding: 40px 30px; text-align: center;">
          <h1 style="color: #000; font-size: 28px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.1em;">LEVIOUSA</h1>
        </div>
        
        <div style="padding: 40px 30px; color: #fff;">
          <h2 style="color: #fff; font-size: 24px; margin-bottom: 20px; text-align: center;">🎉 The Wait is Over, ${name}!</h2>
          
          <div style="background: linear-gradient(135deg, rgba(144, 81, 81, 0.2), rgba(242, 233, 233, 0.1)); border: 2px solid #905151; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
            <h3 style="color: #f2e9e9; margin: 0 0 15px 0; font-size: 20px;">🚀 Your AI Revolution Starts NOW!</h3>
            <p style="color: #bbb; font-size: 16px; margin: 0;">
              The countdown has ended. It's time to experience the upgrade you've been waiting for.
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px; color: #bbb;">
            Your Leviousa account is ready and waiting. Click the button below to set up your password and dive into the future of AI productivity.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${setupUrl}" 
               style="display: inline-block; background: linear-gradient(45deg, #905151, #f2e9e9); color: #000; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 8px 24px rgba(144, 81, 81, 0.3);">
              Set Up My Account
            </a>
          </div>
          
          <div style="background: rgba(242, 233, 233, 0.05); border: 1px solid rgba(242, 233, 233, 0.1); border-radius: 8px; padding: 20px; margin: 30px 0;">
            <p style="color: #bbb; font-size: 14px; margin: 0; text-align: center;">
              <strong>Security Note:</strong> This link is valid for 24 hours and can only be used once.<br>
              If you didn't request this, please ignore this email.
            </p>
          </div>
          
          <p style="font-size: 16px; margin: 30px 0; color: #bbb; text-align: center;">
            <strong style="color: #f2e9e9;">Ready for the upgrade?</strong><br>
            Zero interruptions. Pure magic.
          </p>
          
          <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
            Having trouble? Copy and paste this link into your browser:<br>
            <a href="${setupUrl}" style="color: #905151; word-break: break-all;">${setupUrl}</a>
          </p>
          
          <p style="font-size: 14px; color: #999; text-align: center; margin-top: 20px;">
            Built with ❤️ in San Francisco<br>
            © 2024 Leviousa, Inc. | <a href="https://www.leviousa.com/privacy" style="color: #905151;">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: '🚀 It\'s Time! Set Up Your Leviousa Account',
    html,
  });
}

// Function to send all password setup emails (called when countdown ends)
export async function sendPasswordSetupEmailsToCountdownUsers() {
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAuth } = await import('firebase-admin/auth');
    
    const firestore = getFirestore();
    const auth = getAuth();
    
    // Get all countdown signup users
    const countdownSignupsSnapshot = await firestore
      .collection('countdownSignups')
      .get();
    
    console.log(`📧 Sending password setup emails to ${countdownSignupsSnapshot.size} users`);
    
    const emailPromises = [];
    
    for (const doc of countdownSignupsSnapshot.docs) {
      const userData = doc.data();
      const { userId, email, name } = userData;
      
      try {
        // Generate password setup token
        const setupToken = await auth.createCustomToken(userId, {
          passwordSetup: true,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        });
        
        // Store the setup token in Firestore
        await firestore.collection('passwordSetupTokens').doc(setupToken).set({
          userId,
          email,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)), // 24 hours
          used: false,
        });
        
        // Send password setup email
        emailPromises.push(
          sendPasswordSetupEmail({ email, name, setupToken })
        );
        
      } catch (userError) {
        console.error(`❌ Failed to process user ${userId}:`, userError);
      }
    }
    
    // Send all emails
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Password setup emails sent: ${successful} successful, ${failed} failed`);
    
    return { successful, failed, total: results.length };
    
  } catch (error) {
    console.error('❌ Failed to send password setup emails:', error);
    throw error;
  }
}
