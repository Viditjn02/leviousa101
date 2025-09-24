#!/usr/bin/env node

/**
 * Search for REAL waitlist users across all Firestore collections
 */

const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

async function findRealWaitlistUsers() {
  console.log('🔍 SEARCHING FOR REAL WAITLIST USERS');
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
    
    console.log('🔍 Checking multiple collections for real users...\n');
    
    // Check different possible collections
    const collectionsToCheck = [
      'countdownSignups',
      'waitlistUsers', 
      'earlyAccess',
      'users',
      'signups',
      'subscribers'
    ];
    
    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`📋 Checking collection: ${collectionName}`);
        const snapshot = await firestore.collection(collectionName).limit(20).get();
        
        if (snapshot.size === 0) {
          console.log(`   ❌ Empty collection (${snapshot.size} users)`);
          continue;
        }
        
        console.log(`   ✅ Found ${snapshot.size} users in ${collectionName}:`);
        
        const realUsers = [];
        const testUsers = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const email = data.email;
          const name = data.name || data.displayName;
          
          if (email) {
            // Check if it's a real email vs test email
            if (email.includes('@example.com') || 
                email.includes('@test.com') ||
                email.toLowerCase().includes('test') ||
                email.toLowerCase().includes('local')) {
              testUsers.push({ email, name });
            } else {
              realUsers.push({ email, name });
            }
          }
        });
        
        if (realUsers.length > 0) {
          console.log(`   🎯 REAL USERS FOUND (${realUsers.length}):`);
          realUsers.forEach((user, index) => {
            console.log(`      ${index + 1}. 📧 ${user.email} (${user.name || 'No name'})`);
          });
        }
        
        if (testUsers.length > 0) {
          console.log(`   🧪 Test users (${testUsers.length}): ${testUsers.map(u => u.email).join(', ')}`);
        }
        
        console.log('');
        
        // If we found real users, save them for deployment
        if (realUsers.length > 0) {
          console.log(`🎯 FOUND ${realUsers.length} REAL USERS IN ${collectionName}!`);
          return { collection: collectionName, realUsers, testUsers };
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking ${collectionName}: Collection might not exist`);
      }
    }
    
    console.log('❌ NO REAL USERS FOUND IN ANY COLLECTION');
    console.log('=========================================');
    console.log('This suggests:');
    console.log('1. All current users are test data');
    console.log('2. Real waitlist might be stored elsewhere'); 
    console.log('3. Waitlist hasn\'t been created yet');
    console.log('4. Users might be stored in a different Firebase project');
    
    return null;

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findRealWaitlistUsers().catch(console.error);
