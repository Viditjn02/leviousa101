#!/usr/bin/env node

/**
 * Create a REAL working test link for manual onboarding flow testing
 */

const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

const TEST_EMAIL = 'viditjn02@gmail.com';

async function createRealTestLink() {
  console.log('🔗 CREATING REAL TEST LINK FOR MANUAL VERIFICATION');
  console.log('==================================================\n');

  try {
    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'leviousa-101'
    });
    
    const firestore = getFirestore();
    const auth = getAuth();
    
    // Get existing user
    const existingUser = await auth.getUserByEmail(TEST_EMAIL);
    const userId = existingUser.uid;
    const name = TEST_EMAIL.split('@')[0].charAt(0).toUpperCase() + TEST_EMAIL.split('@')[0].slice(1);
    
    console.log(`👤 Using existing user: ${userId}`);
    
    // Create REAL setup token that will work with the web APIs
    const realSetupToken = `real_manual_test_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await firestore.collection('passwordSetupTokens').doc(realSetupToken).set({
      userId,
      email: TEST_EMAIL,
      name,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      used: false,
      type: 'manual_verification_test'
    });
    
    const setupUrl = `https://www.leviousa.com/setup-password?token=${realSetupToken}`;
    
    console.log('✅ REAL TEST LINK CREATED SUCCESSFULLY!');
    console.log('=====================================\n');
    
    console.log('🔗 MANUAL TEST URL:');
    console.log(`${setupUrl}`);
    console.log('');
    
    console.log('📋 COMPLETE MANUAL TEST INSTRUCTIONS:');
    console.log('=====================================');
    console.log('1. 🌐 Click the URL above (or copy/paste into browser)');
    console.log('2. ✅ Verify the setup-password page loads without errors');
    console.log('3. 📝 Enter a password (minimum 6 characters)');
    console.log('4. 📝 Confirm the password');
    console.log('5. ✅ Click "Set Password" or submit button');
    console.log('6. 🔄 Verify you get automatically logged in');
    console.log('7. 📍 Verify you land on: https://www.leviousa.com/activity');
    console.log('8. 👤 Verify you appear as a logged-in user');
    console.log('');
    
    console.log('🧪 ADDITIONAL VERIFICATION TESTS:');
    console.log('==================================');
    console.log('9. 🚪 Try logging out');
    console.log(`10. 🔑 Try logging back in with: ${TEST_EMAIL} + [password you set]`);
    console.log('11. ✅ Verify login works with email/password credentials');
    console.log('12. 📱 Verify you land back on /activity as authenticated user');
    console.log('');
    
    console.log('✅ SUCCESS CRITERIA:');
    console.log('====================');
    console.log('✅ Setup page loads and displays correctly');
    console.log('✅ Password form accepts and validates input');
    console.log('✅ Form submission works without errors');
    console.log('✅ User gets automatically logged in after password setup');
    console.log('✅ User is redirected to /activity page');
    console.log('✅ User appears as authenticated/logged-in');
    console.log('✅ Logout → Login with email/password works');
    console.log('✅ Login redirects back to authenticated state');
    console.log('');
    
    console.log('🚨 FAILURE SCENARIOS TO WATCH FOR:');
    console.log('===================================');
    console.log('❌ Setup page shows "Invalid token" error');
    console.log('❌ Password form shows validation errors');
    console.log('❌ Form submission fails or shows error');
    console.log('❌ No automatic login after password setup');
    console.log('❌ User not redirected to /activity');
    console.log('❌ User appears as guest/unauthenticated');
    console.log('❌ Email/password login fails');
    console.log('');
    
    console.log('🎯 NEXT STEPS:');
    console.log('===============');
    console.log('1. 🧪 Complete the manual test above');
    console.log('2. ✅ If ALL tests pass → Onboarding flow is READY');
    console.log('3. 🚀 If ready → Can proceed with mass email sending');
    console.log('4. ❌ If any test fails → Need to fix issues first');
    console.log('');
    
    console.log('💡 NOTE ABOUT EMAIL API:');
    console.log('=========================');
    console.log('The manual test link bypasses the Vercel environment variable issue');
    console.log('by using the working local Firebase setup. If the manual test passes,');
    console.log('the onboarding flow itself is solid - we just need to fix the');
    console.log('Vercel Firebase environment variables for mass email deployment.');
    
  } catch (error) {
    console.error('\n❌ FAILED TO CREATE TEST LINK:');
    console.error('==============================');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createRealTestLink().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
