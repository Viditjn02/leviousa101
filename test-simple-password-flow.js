#!/usr/bin/env node

/**
 * Test the SIMPLE Firebase password reset flow
 */

const axios = require('axios');

async function testSimplePasswordFlow() {
  console.log('🚀 TESTING SIMPLE FIREBASE PASSWORD SETUP');
  console.log('=========================================\n');

  const testEmail = 'viditjn02@gmail.com';

  try {
    console.log('📧 Sending Firebase password setup email...');
    console.log(`📍 To: ${testEmail}`);
    console.log('🔧 Using Firebase\'s built-in sendPasswordResetEmail');
    
    const response = await axios.post('https://www.leviousa.com/api/send-password-setup-simple', {
      adminKey: 'test123',
      testEmail: testEmail
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    if (response.data.success) {
      console.log('\n✅ SUCCESS! Password setup email sent');
      console.log('=====================================');
      
      console.log('\n📋 WHAT TO DO NEXT:');
      console.log('1. 📧 Check your email inbox');
      console.log('2. 🔍 Look for Firebase password reset email');
      console.log('3. 🔗 Click the "Reset Password" link');
      console.log('4. 🔐 Set your new password on Firebase\'s page');
      console.log('5. ✅ You should be automatically logged in');
      console.log('6. 📍 Should redirect to https://www.leviousa.com/activity');
      console.log('');
      
      console.log('🎯 BENEFITS OF THIS APPROACH:');
      console.log('✅ Uses Firebase\'s proven infrastructure');
      console.log('✅ Secure token generation & validation');
      console.log('✅ Built-in email delivery');
      console.log('✅ Automatic login after password setup');
      console.log('✅ Much simpler than custom tokens');
      console.log('✅ No custom validation needed');
      console.log('');
      
      console.log('🚀 IF THIS WORKS:');
      console.log('- The complete onboarding flow is READY');
      console.log('- We can send to all waitlist users immediately');
      console.log('- No more 405/500 API errors');
      console.log('- Users get a proven, secure experience');
      
    } else {
      console.error('❌ Failed to send email:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSimplePasswordFlow().catch(console.error);
