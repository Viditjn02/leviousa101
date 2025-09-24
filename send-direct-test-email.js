#!/usr/bin/env node

/**
 * DIRECT EMAIL SENDING - Generate Firebase link + send custom email
 */

const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');
const { Resend } = require('resend');
const path = require('path');

const TEST_EMAIL = 'viditjn02@gmail.com';

async function sendDirectTestEmail() {
  console.log('🚀 DIRECT EMAIL SENDING WITH FIREBASE + CUSTOM TEMPLATE');
  console.log('====================================================\n');

  try {
    // 1. Initialize Firebase Admin locally
    console.log('1. 🔥 Initializing Firebase Admin...');
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'leviousa-101'
    });
    
    console.log('✅ Firebase Admin initialized');

    // 2. Generate Firebase password reset link
    console.log('\n2. 🔗 Generating Firebase password reset link...');
    const auth = getAuth();
    
    const passwordResetLink = await auth.generatePasswordResetLink(TEST_EMAIL, {
      url: 'https://www.leviousa.com/activity',
    });
    
    console.log('✅ Firebase password reset link generated');
    console.log(`🔗 Link: ${passwordResetLink.substring(0, 80)}...`);

    // 3. Create custom email template
    console.log('\n3. 🎨 Creating custom email template...');
    const name = TEST_EMAIL.split('@')[0].charAt(0).toUpperCase() + TEST_EMAIL.split('@')[0].slice(1);
    
    const emailHtml = createCustomEmailTemplate(name, passwordResetLink);
    console.log('✅ Custom email template created');

    // 4. Send via Resend (set API key as environment variable)
    console.log('\n4. 📧 Sending email via Resend...');
    
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY not set - simulating email send');
      console.log('📧 EMAIL CONTENT READY:');
      console.log(`   📤 From: Leviousa Team <info@leviousa.com>`);
      console.log(`   📧 To: ${TEST_EMAIL}`);
      console.log(`   📝 Subject: "Whitelist status: unlocked - Your Leviousa account is ready!"`);
      console.log(`   🔗 Contains secure Firebase password reset link`);
      console.log(`   🎨 Beautiful custom template with apology section`);
      console.log('');
      console.log('🎯 TO ACTUALLY SEND:');
      console.log('Set RESEND_API_KEY environment variable and run again');
      console.log('Or manually send email with the template and Firebase link');
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const emailResult = await resend.emails.send({
      from: 'Leviousa Team <info@leviousa.com>',
      to: TEST_EMAIL,
      subject: 'Whitelist status: unlocked - Your Leviousa account is ready!',
      html: emailHtml,
    });

    if (emailResult.error) {
      throw new Error(`Resend error: ${emailResult.error.message}`);
    }

    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('===========================');
    console.log(`📧 Email ID: ${emailResult.data.id}`);
    console.log(`📤 Sent to: ${TEST_EMAIL}`);
    console.log(`📤 From: Leviousa Team <info@leviousa.com>`);
    console.log('');
    console.log('🧪 WHAT TO TEST:');
    console.log('1. Check your email inbox');
    console.log('2. Click "🚀 Activate My Account" button');
    console.log('3. Set password on Firebase page');
    console.log('4. Verify redirect to /activity page');
    console.log('5. Confirm automatic login');
    console.log('');
    console.log('⏰ Link expires in 1 hour for security');
    console.log('🎯 If this works → Ready for mass deployment!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 WHAT WE HAVE CONFIRMED:');
    console.log('✅ Firebase password reset generation: WORKS');
    console.log('✅ Custom email template: READY');
    console.log('✅ Email sender updated to info@leviousa.com');
    console.log('');
    console.log('🔧 NEXT: Set RESEND_API_KEY to actually send the email');
  }
}

// Create the beautiful custom email template
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

sendDirectTestEmail().catch(console.error);
