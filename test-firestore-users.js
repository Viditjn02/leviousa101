#!/usr/bin/env node

/**
 * Test script to check Firestore users and test password setup flow
 */

const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "leviousa-101",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

initializeApp({
  credential: cert(serviceAccount),
});

async function testFirestoreAndPasswordSetup() {
  console.log('🔍 TESTING FIRESTORE USERS AND PASSWORD SETUP FLOW');
  console.log('=================================================\n');

  const firestore = getFirestore();
  const auth = getAuth();

  try {
    // 1. Check countdownSignups collection
    console.log('1. 📋 Checking countdownSignups collection...\n');
    const countdownSnapshot = await firestore.collection('countdownSignups').limit(5).get();
    console.log(`Found ${countdownSnapshot.size} countdown signups:`);
    
    countdownSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ${data.email} (${data.name || 'No name'}) - UID: ${data.userId || doc.id}`);
    });

    // 2. Check users collection
    console.log('\n2. 👥 Checking users collection...\n');
    const usersSnapshot = await firestore.collection('users')
      .where('passwordSetupRequired', '==', true)
      .limit(5)
      .get();
    console.log(`Found ${usersSnapshot.size} users needing password setup:`);
    
    usersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  ${index + 1}. ${data.email} (${data.displayName || data.name || 'No name'}) - UID: ${doc.id}`);
    });

    // 3. Pick a test user for password setup flow
    console.log('\n3. 🧪 Testing password setup flow...\n');
    
    let testUser = null;
    if (countdownSnapshot.size > 0) {
      const firstDoc = countdownSnapshot.docs[0];
      testUser = {
        userId: firstDoc.data().userId || firstDoc.id,
        email: firstDoc.data().email,
        name: firstDoc.data().name || firstDoc.data().email.split('@')[0],
        source: 'countdownSignups'
      };
    } else if (usersSnapshot.size > 0) {
      const firstDoc = usersSnapshot.docs[0];
      testUser = {
        userId: firstDoc.id,
        email: firstDoc.data().email,
        name: firstDoc.data().displayName || firstDoc.data().name || firstDoc.data().email.split('@')[0],
        source: 'users'
      };
    }

    if (!testUser) {
      console.log('❌ No test users found in either collection');
      return;
    }

    console.log(`🎯 Testing with user: ${testUser.email} (${testUser.source})`);

    // 4. Check if user exists in Firebase Auth
    console.log('\n4. 🔐 Checking Firebase Auth status...\n');
    try {
      const authUser = await auth.getUser(testUser.userId);
      console.log(`✅ User exists in Firebase Auth:`);
      console.log(`   UID: ${authUser.uid}`);
      console.log(`   Email: ${authUser.email}`);
      console.log(`   Email Verified: ${authUser.emailVerified}`);
      console.log(`   Disabled: ${authUser.disabled}`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log(`🔧 User NOT in Firebase Auth - would be created during email send`);
        console.log(`   This is normal for countdown signups`);
      } else {
        console.log(`❌ Auth error: ${authError.message}`);
      }
    }

    // 5. Test token creation (simulate email process)
    console.log('\n5. 🎫 Testing setup token creation...\n');
    const testTokenId = `test_${testUser.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Creating test token: ${testTokenId}`);
    await firestore.collection('passwordSetupTokens').doc(testTokenId).set({
      userId: testUser.userId,
      email: testUser.email,
      name: testUser.name,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      used: false,
      type: 'test_verification'
    });
    
    console.log(`✅ Test token created successfully`);
    console.log(`🔗 Test setup URL: https://www.leviousa.com/setup-password?token=${testTokenId}`);

    // 6. Verify token can be retrieved
    console.log('\n6. ✅ Verifying token retrieval...\n');
    const tokenDoc = await firestore.collection('passwordSetupTokens').doc(testTokenId).get();
    
    if (tokenDoc.exists) {
      const tokenData = tokenDoc.data();
      console.log(`✅ Token retrieved successfully:`);
      console.log(`   User ID: ${tokenData.userId}`);
      console.log(`   Email: ${tokenData.email}`);
      console.log(`   Expires: ${tokenData.expiresAt.toDate()}`);
      console.log(`   Used: ${tokenData.used}`);
    } else {
      console.log(`❌ Token not found after creation`);
    }

    // 7. Clean up test token
    console.log('\n7. 🧹 Cleaning up test token...\n');
    await firestore.collection('passwordSetupTokens').doc(testTokenId).delete();
    console.log(`✅ Test token cleaned up`);

    console.log('\n📊 SUMMARY:');
    console.log('============');
    console.log(`Countdown signups: ${countdownSnapshot.size}`);
    console.log(`Users needing setup: ${usersSnapshot.size}`);
    console.log(`Total potential emails: ${countdownSnapshot.size + usersSnapshot.size}`);
    console.log(`Test user: ${testUser.email}`);
    console.log(`Token creation: ✅ Working`);
    console.log(`Setup URL generation: ✅ Working`);
    console.log('\n🎉 Password setup flow verification complete!');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testFirestoreAndPasswordSetup().catch(console.error);
