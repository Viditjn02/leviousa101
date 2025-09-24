#!/usr/bin/env node

/**
 * Create a working test token locally to test the password setup flow
 */

const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

async function createTestToken() {
  console.log('🔧 Creating working test token for password setup flow...\n');

  try {
    // Load environment from web app
    require('dotenv').config({ path: path.join(__dirname, 'leviousa_web/.env.production') });
    
    // Initialize Firebase Admin with local credentials
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

    if (!serviceAccount.private_key) {
      console.log('⚠️ Firebase credentials not available locally');
      console.log('💡 Alternative: Test with manual token creation');
      
      // Create a manual test token for testing
      const testEmail = 'viditjn02@gmail.com';
      const testToken = `manual_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`\n🔗 Manual test approach:`);
      console.log(`📧 Email: ${testEmail}`);
      console.log(`🎫 Test token: ${testToken}`);
      console.log(`🔗 Test URL: https://www.leviousa.com/setup-password?token=${testToken}`);
      console.log(`\n⚠️ Note: This token won't work until stored in Firestore`);
      console.log(`💡 Recommendation: Use the working test-delay-email API instead`);
      
      return;
    }

    initializeApp({ credential: cert(serviceAccount) });
    
    const firestore = getFirestore();
    const auth = getAuth();
    
    const testEmail = 'viditjn02@gmail.com';
    const testName = 'Vidit';
    
    // Create or get Firebase Auth user
    let userId;
    try {
      const existingUser = await auth.getUserByEmail(testEmail);
      userId = existingUser.uid;
      console.log(`✅ Found existing user: ${userId}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email: testEmail,
          displayName: testName,
          emailVerified: false
        });
        userId = newUser.uid;
        console.log(`✅ Created new user: ${userId}`);
      } else {
        throw error;
      }
    }

    // Create working setup token
    const testSetupToken = `test_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await firestore.collection('passwordSetupTokens').doc(testSetupToken).set({
      userId,
      email: testEmail,
      name: testName,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
      used: false,
      type: 'local_test'
    });
    
    console.log(`✅ Created working setup token: ${testSetupToken}`);
    console.log(`🔗 Working test URL: https://www.leviousa.com/setup-password?token=${testSetupToken}`);
    console.log(`\n🎯 Test this URL to verify the complete password setup flow!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestToken().catch(console.error);
