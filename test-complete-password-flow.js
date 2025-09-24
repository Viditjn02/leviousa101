#!/usr/bin/env node

/**
 * Test the complete password setup flow with a real Firestore user
 */

const axios = require('axios');

async function testCompletePasswordFlow() {
  console.log('🧪 TESTING COMPLETE PASSWORD SETUP FLOW');
  console.log('=======================================\n');

  const testEmail = 'viditjn02@gmail.com';
  
  try {
    // Step 1: Send test email (this creates the setup token)
    console.log('1. 📧 Sending test email with real setup token...');
    
    const emailResponse = await axios.post('https://www.leviousa.com/api/test-delay-email', {
      email: testEmail,
      adminKey: 'test123'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!emailResponse.data.success) {
      console.error('❌ Failed to send test email:', emailResponse.data.message);
      return;
    }

    console.log('✅ Test email sent successfully');
    console.log('📧 Check your email and find the setup link');
    console.log('🔗 The link should be: https://www.leviousa.com/setup-password?token=...');
    
    console.log('\n2. 🔍 What to test in the complete flow:');
    console.log('   📧 1. Check email received with correct content');
    console.log('   🔗 2. Click the "🚀 Activate My Account" button');
    console.log('   📝 3. Fill out password form on setup page');
    console.log('   🔐 4. Submit password and verify auto-login works');
    console.log('   🎯 5. Confirm you land on /activity page as logged-in user');
    
    console.log('\n3. ✅ Email content verification:');
    console.log('   📬 Subject: "Whitelist status: unlocked - Your Leviousa account is ready!"');
    console.log('   🚫 No hand emoji in apology section');
    console.log('   🌐 "Invisible Browser – Browse any website without anyone knowing"');
    console.log('   🚀 Single button: "🚀 Activate My Account"');
    console.log('   🔗 Button points to password setup page');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Check your email inbox for the test email');
    console.log('2. Click the "🚀 Activate My Account" button');
    console.log('3. Set up a password on the setup page');
    console.log('4. Verify you get automatically logged into Leviousa');
    console.log('5. If everything works, confirm and I\'ll send to all waitlist users!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCompletePasswordFlow().catch(console.error);
