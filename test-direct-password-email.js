#!/usr/bin/env node

/**
 * Direct test - send Firebase password reset link via custom email template
 */

const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

const TEST_EMAIL = 'viditjn02@gmail.com';

async function testDirectPasswordEmail() {
  console.log('🚀 DIRECT PASSWORD SETUP EMAIL TEST');
  console.log('===================================\n');

  try {
    // Initialize Firebase Admin locally
    console.log('1. 🔥 Initializing Firebase Admin...');
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'leviousa-101'
    });
    
    console.log('✅ Firebase Admin initialized');
    
    // Generate password reset link
    console.log('\n2. 🔗 Generating Firebase password reset link...');
    const auth = getAuth();
    
    const passwordResetLink = await auth.generatePasswordResetLink(TEST_EMAIL, {
      url: 'https://www.leviousa.com/activity', // Redirect after password setup
    });
    
    console.log('✅ Password reset link generated');
    console.log(`🔗 Link: ${passwordResetLink.substring(0, 80)}...`);
    
    // Send via custom email template using existing service
    console.log('\n3. 📧 Sending custom email via existing email service...');
    
    // Import the email functions from the web utils
    const { sendDelayPasswordSetupEmail } = require('./leviousa_web/utils/delayPasswordSetupEmail');
    
    const name = TEST_EMAIL.split('@')[0].charAt(0).toUpperCase() + TEST_EMAIL.split('@')[0].slice(1);
    
    const emailResult = await sendDelayPasswordSetupEmail(TEST_EMAIL, name, passwordResetLink);
    
    if (!emailResult.success) {
      throw new Error(`Email sending failed: ${emailResult.error}`);
    }
    
    console.log('✅ Email sent successfully!');
    console.log(`📧 Message ID: ${emailResult.messageId || 'N/A'}`);
    
    console.log('\n🎉 SUCCESS! TEST EMAIL SENT');
    console.log('===========================');
    console.log(`📧 Check your inbox: ${TEST_EMAIL}`);
    console.log('📋 What to test:');
    console.log('1. Email should arrive with beautiful template');
    console.log('2. Click "🚀 Activate My Account" button');
    console.log('3. Should go to Firebase password reset page');
    console.log('4. Set your password');
    console.log('5. Should redirect to /activity and log you in');
    
    console.log('\n✅ BENEFITS OF THIS APPROACH:');
    console.log('🔐 Firebase handles secure token generation');
    console.log('📧 Custom beautiful email template via Resend');
    console.log('🚀 Automatic login after password setup');
    console.log('🔄 Redirects to /activity page');
    console.log('⚡ Much simpler than custom token system');
    
    console.log('\n🚀 IF THIS WORKS - WE CAN SEND TO ALL USERS!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check RESEND_API_KEY environment variable');
    console.error('2. Verify firebase-service-account.json exists');
    console.error('3. Make sure user exists in Firebase Auth');
    process.exit(1);
  }
}

testDirectPasswordEmail().catch(console.error);
