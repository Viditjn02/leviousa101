#!/usr/bin/env node

/**
 * SIMPLE TEST - Generate Firebase password reset link and show results
 */

const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

const TEST_EMAIL = 'viditjn02@gmail.com';

async function testSimpleEmail() {
  console.log('🚀 SIMPLE FIREBASE PASSWORD RESET TEST');
  console.log('=====================================\n');

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
    
    console.log('✅ Password reset link generated successfully!');
    console.log(`🔗 Full Link: ${passwordResetLink}`);
    
    console.log('\n📧 MANUAL EMAIL SENDING INSTRUCTIONS:');
    console.log('=====================================');
    console.log('Since local email sending is complex, here\'s what to do:');
    console.log('');
    console.log('1. 📧 MANUALLY send an email to viditjn02@gmail.com with:');
    console.log('   📝 Subject: "Whitelist status: unlocked - Your Leviousa account is ready!"');
    console.log(`   🔗 Button link: ${passwordResetLink}`);
    console.log('   🎨 Use your beautiful email template');
    console.log('');
    console.log('2. 🧪 TEST THE COMPLETE FLOW:');
    console.log('   ✅ Click the password reset link in email');
    console.log('   🔐 Set your password on Firebase page');
    console.log('   🚀 Should redirect to https://www.leviousa.com/activity');
    console.log('   👤 Should be automatically logged in');
    console.log('');
    console.log('3. ✅ IF THAT WORKS:');
    console.log('   🚀 We can use the working API to send to all users!');
    console.log('   📧 Each user gets a secure Firebase password reset link');
    console.log('   🎨 Wrapped in your beautiful email template');
    
    console.log('\n🔥 FIREBASE LINK IS READY!');
    console.log('The hard part (secure token generation) is done!');
    console.log('Just need to send it via your email template.');

    // Show how the API would work
    console.log('\n🔧 WORKING API APPROACH:');
    console.log('Once you test the link above, we can use:');
    console.log('POST /api/send-password-setup-simple');
    console.log('Body: { "adminKey": "test123", "testEmail": "viditjn02@gmail.com" }');
    console.log('This will:');
    console.log('1. Generate Firebase password reset link (like above)');
    console.log('2. Send via Resend with your custom email template');
    console.log('3. User gets beautiful email with secure Firebase link');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testSimpleEmail().catch(console.error);
