#!/usr/bin/env node

/**
 * MASS EMAIL DEPLOYMENT - Send to all countdown users
 */

const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, cert } = require('firebase-admin/app');
const { Resend } = require('resend');
const path = require('path');

async function sendMassEmails() {
  console.log('🚀 MASS EMAIL DEPLOYMENT TO ALL WAITLIST USERS');
  console.log('===============================================\n');

  try {
    // 1. Initialize Firebase Admin
    console.log('1. 🔥 Initializing Firebase Admin...');
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'leviousa-101'
    });
    
    console.log('✅ Firebase Admin initialized');

    const auth = getAuth();
    const firestore = getFirestore();
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 2. Get all countdown users
    console.log('\n2. 📋 Fetching all countdown users...');
    const countdownSnapshot = await firestore.collection('countdownSignups').get();
    console.log(`✅ Found ${countdownSnapshot.size} countdown users`);

    if (countdownSnapshot.size === 0) {
      console.log('❌ No countdown users found!');
      return;
    }

    // 3. Send emails to all users
    console.log('\n3. 📧 Sending password setup emails...');
    console.log('=====================================');

    let sentCount = 0;
    let errorCount = 0;
    const results = [];

    for (const doc of countdownSnapshot.docs) {
      const data = doc.data();
      const email = data.email;
      const name = data.name || email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);

      if (!email) {
        console.log(`⚠️ Skipping user with no email: ${doc.id}`);
        continue;
      }

      try {
        console.log(`📤 Processing: ${email} (${name})`);

        // Generate Firebase password reset link
        const passwordResetLink = await auth.generatePasswordResetLink(email, {
          url: 'https://www.leviousa.com/activity',
        });

        // Create email template
        const emailHtml = createCustomEmailTemplate(name, passwordResetLink);

        // Send via Resend
        const emailResult = await resend.emails.send({
          from: 'Leviousa Team <info@leviousa.com>',
          to: email,
          subject: 'Whitelist status: unlocked - Your Leviousa account is ready!',
          html: emailHtml,
        });

        if (emailResult.error) {
          throw new Error(`Resend error: ${emailResult.error.message}`);
        }

        console.log(`✅ SUCCESS: ${email} → Email ID: ${emailResult.data.id}`);
        sentCount++;
        
        results.push({
          email,
          name,
          status: 'success',
          emailId: emailResult.data.id
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ FAILED: ${email} → ${error.message}`);
        errorCount++;
        
        results.push({
          email,
          name,
          status: 'error',
          error: error.message
        });
      }
    }

    // 4. Final summary
    console.log('\n🎉 MASS EMAIL DEPLOYMENT COMPLETE!');
    console.log('===================================');
    console.log(`✅ Successfully sent: ${sentCount}`);
    console.log(`❌ Failed to send: ${errorCount}`);
    console.log(`📊 Total processed: ${sentCount + errorCount}`);
    console.log('');
    
    console.log('📧 EMAIL DETAILS:');
    console.log(`📤 From: Leviousa Team <info@leviousa.com>`);
    console.log(`📝 Subject: "Whitelist status: unlocked - Your Leviousa account is ready!"`);
    console.log(`🎨 Template: Beautiful custom design with apology`);
    console.log(`🔗 Links: Secure Firebase password reset (1-hour expiry)`);
    console.log('');
    
    console.log('👥 WHAT USERS WILL DO:');
    console.log('1. Receive beautiful email in their inbox');
    console.log('2. Click "🚀 Activate My Account" button');
    console.log('3. Set password on Firebase page');
    console.log('4. Get automatically redirected to /activity');
    console.log('5. Start using Leviousa as authenticated users!');
    console.log('');
    
    if (errorCount > 0) {
      console.log('⚠️ ERRORS SUMMARY:');
      results.filter(r => r.status === 'error').forEach(result => {
        console.log(`   ❌ ${result.email}: ${result.error}`);
      });
      console.log('');
    }
    
    console.log('🎯 DEPLOYMENT SUCCESS!');
    console.log('Your waitlist users can now access Leviousa! 🚀');

  } catch (error) {
    console.error('\n❌ MASS DEPLOYMENT FAILED:', error.message);
    console.error('🚨 No emails were sent due to critical error');
  }
}

// Create the beautiful custom email template (UPDATED VERSION)
function createCustomEmailTemplate(name, setupUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Whitelist status: unlocked - Your Leviousa account is ready!</title>
    </head>
    <body style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #000; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #1e1e1e 100%); border-radius: 12px; overflow: hidden;">
        
        <div style="background: linear-gradient(45deg, #905151, #f2e9e9); padding: 40px 30px; text-align: center;">
          <h1 style="color: #000; font-size: 28px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.1em;">LEVIOUSA</h1>
        </div>
        
        <div style="padding: 40px 30px; color: #fff;">
          <h2 style="color: #fff; font-size: 24px; margin-bottom: 20px;">Hey ${name}! 👋</h2>
          
          <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.05)); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
            <h3 style="color: #ffc107; margin: 0 0 15px 0; font-size: 18px;">We're Sorry for the Delay!</h3>
            <p style="color: #bbb; font-size: 16px; margin: 0; line-height: 1.5;">
              We know you've been waiting patiently for your Leviousa access. Thank you for your understanding – great things take time to perfect!
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px; color: #bbb;">
            Your exclusive early access is now ready! We've been working hard behind the scenes to make sure your experience is absolutely magical.
          </p>
          
          <div style="background: rgba(144, 81, 81, 0.1); border: 1px solid rgba(144, 81, 81, 0.3); border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #f2e9e9; margin: 0 0 15px 0; font-size: 18px;">🎁 What you get as a founding member:</h3>
            <ul style="color: #bbb; margin: 0; padding-left: 20px;">
              <li><strong style="color: #f2e9e9;">Full access to Leviousa</strong> – Your invisible upgrade awaits!</li>
              <li><strong style="color: #f2e9e9;">Invisible Browser</strong> – Browse any website without anyone knowing</li>
              <li><strong style="color: #f2e9e9;">130+ integrations</strong> – Gmail, Notion, Slack, and more</li>
              <li><strong style="color: #f2e9e9;">Screen-aware AI</strong> – Magic that knows what you're doing</li>
              <li><strong style="color: #f2e9e9;">Priority support</strong> – We're here to help!</li>
            </ul>
          </div>
          
          <div style="background: rgba(242, 233, 233, 0.05); border: 1px solid rgba(242, 233, 233, 0.1); border-radius: 8px; padding: 20px; margin: 30px 0;">
            <p style="color: #bbb; font-size: 14px; margin: 0; text-align: center;">
              <strong>Secure Setup Link:</strong> This secure link expires in 1 hour.<br>
              <strong>⏰ Please activate within the next hour</strong> - if it expires, just reply to this email and we'll send a fresh link!
            </p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 30px; color: #bbb;">
            <strong style="color: #f2e9e9;">Ready for the upgrade?</strong><br>
            Zero interruptions. Pure magic.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" 
               style="display: inline-block; background: linear-gradient(45deg, #905151, #f2e9e9); color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
              🚀 Activate My Account
            </a>
          </div>
          
          <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px;">
            Having trouble with the button? <a href="${setupUrl}" style="color: #905151;">Click here instead</a><br>
            <span style="font-size: 11px; color: #666;">Or reply to this email if you need a fresh link</span>
          </p>
          
          <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
            Built with ❤️ in San Francisco<br>
            © 2025 Leviousa, Inc. | <a href="https://www.leviousa.com/privacy-policy" style="color: #905151;">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

sendMassEmails().catch(console.error);
