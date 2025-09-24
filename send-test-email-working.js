#!/usr/bin/env node

/**
 * SEND WORKING TEST EMAIL with Firebase password reset link
 */

const axios = require('axios');

async function sendTestEmail() {
  console.log('🚀 SENDING TEST EMAIL WITH FIREBASE PASSWORD RESET');
  console.log('================================================\n');

  const testEmail = 'viditjn02@gmail.com';

  try {
    console.log(`📧 Sending beautiful custom email to: ${testEmail}`);
    console.log('🔧 Using Firebase password reset + custom template');
    console.log('📤 From: Leviousa Team <info@leviousa.com>');
    console.log('');

    const response = await axios.post('https://www.leviousa.com/api/send-password-setup-simple', {
      adminKey: 'test123',
      testEmail: testEmail
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (response.data.success) {
      console.log('✅ SUCCESS! Test email sent successfully!');
      console.log('==========================================');
      console.log(`📧 Check your inbox: ${testEmail}`);
      console.log('');
      console.log('📋 WHAT TO EXPECT IN EMAIL:');
      console.log('✅ Beautiful custom template with your design');
      console.log('✅ Subject: "Whitelist status: unlocked - Your Leviousa account is ready!"');
      console.log('✅ From: Leviousa Team <info@leviousa.com>');
      console.log('✅ Apology section (no hand emoji)');
      console.log('✅ "Invisible Browser – Browse any website without anyone knowing"');
      console.log('✅ Single button: "🚀 Activate My Account"');
      console.log('✅ Secure Firebase password reset link');
      console.log('');
      console.log('🧪 COMPLETE FLOW TO TEST:');
      console.log('1. 📧 Receive email in inbox');
      console.log('2. 🚀 Click "🚀 Activate My Account" button');
      console.log('3. 🔐 Set password on Firebase page');
      console.log('4. ✅ Should redirect to /activity page');
      console.log('5. 👤 Should be automatically logged in');
      console.log('');
      console.log('⏰ IMPORTANT: Link expires in 1 hour for security');
      console.log('');
      console.log('🎯 IF THIS WORKS → READY FOR MASS DEPLOYMENT!');
      
    } else {
      console.error('❌ Failed to send email:', response.data.message || response.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check if RESEND_API_KEY is set in Vercel environment');
    console.log('2. Verify API deployment is working');
    console.log('3. Check Firebase service account permissions');
  }
}

sendTestEmail().catch(console.error);
