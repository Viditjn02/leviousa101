#!/usr/bin/env node

/**
 * Check for REAL countdown users (vs test users)
 */

const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

async function checkRealUsers() {
  console.log('🔍 CHECKING FOR REAL COUNTDOWN USERS');
  console.log('====================================\n');

  try {
    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'leviousa-101'
    });
    
    const firestore = getFirestore();
    
    // Get ALL countdown users
    console.log('📋 Fetching ALL countdown users...');
    const countdownSnapshot = await firestore.collection('countdownSignups').get();
    
    console.log(`Found ${countdownSnapshot.size} total countdown users:\n`);
    
    const realUsers = [];
    const testUsers = [];
    
    countdownSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const email = data.email;
      const name = data.name;
      
      // Classify as test vs real user
      if (email && (email.includes('@example.com') || email.includes('test') || email.includes('local'))) {
        testUsers.push({ email, name });
      } else {
        realUsers.push({ email, name });
      }
    });
    
    console.log('👥 REAL USERS:');
    console.log('==============');
    if (realUsers.length === 0) {
      console.log('❌ No real users found!');
      console.log('All users appear to be test/dummy accounts');
    } else {
      realUsers.forEach((user, index) => {
        console.log(`${index + 1}. 📧 ${user.email} (${user.name || 'No name'})`);
      });
    }
    
    console.log('\n🧪 TEST USERS:');
    console.log('===============');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. 🧪 ${user.email} (${user.name || 'No name'})`);
    });
    
    console.log('\n📊 SUMMARY:');
    console.log('============');
    console.log(`✅ Real users: ${realUsers.length}`);
    console.log(`🧪 Test users: ${testUsers.length}`);
    console.log(`📧 Total users: ${realUsers.length + testUsers.length}`);
    
    if (realUsers.length === 0) {
      console.log('\n⚠️ WARNING:');
      console.log('===========');
      console.log('No real users found in countdown signups!');
      console.log('This might mean:');
      console.log('1. All signups are test data');
      console.log('2. Real users are stored elsewhere');
      console.log('3. The collection is for testing only');
      console.log('');
      console.log('🔍 Should we check other collections for real users?');
    } else {
      console.log('\n🚀 READY FOR DEPLOYMENT:');
      console.log('========================');
      console.log(`Can send emails to ${realUsers.length} real users!`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRealUsers().catch(console.error);
