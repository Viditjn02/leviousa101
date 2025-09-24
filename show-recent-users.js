#!/usr/bin/env node

/**
 * Show recent Firebase Auth users to find the correct date range
 */

const { getAuth } = require('firebase-admin/auth');
const { initializeApp, cert } = require('firebase-admin/app');
const path = require('path');

async function showRecentUsers() {
  console.log('🔍 SHOWING RECENT FIREBASE AUTH USERS');
  console.log('=====================================\n');

  try {
    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'leviousa-101'
    });
    
    const auth = getAuth();

    // Get recent users
    console.log('📋 Fetching all Firebase Auth users...');
    const listUsersResult = await auth.listUsers(50); // Get first 50 users
    
    console.log(`Found ${listUsersResult.users.length} users. Showing creation dates:\n`);
    
    // Group users by creation date
    const usersByDate = {};
    
    listUsersResult.users.forEach((userRecord) => {
      const createdAt = new Date(userRecord.metadata.creationTime);
      const createdDate = createdAt.toDateString();
      const email = userRecord.email;
      const name = userRecord.displayName;
      
      if (!usersByDate[createdDate]) {
        usersByDate[createdDate] = [];
      }
      
      usersByDate[createdDate].push({ email, name });
    });
    
    // Show users grouped by date
    const sortedDates = Object.keys(usersByDate).sort((a, b) => new Date(b) - new Date(a));
    
    console.log('📅 USERS BY CREATION DATE (most recent first):');
    console.log('===============================================');
    
    sortedDates.forEach(date => {
      const users = usersByDate[date];
      console.log(`\n📅 ${date} (${users.length} users):`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. 📧 ${user.email} ${user.name ? `(${user.name})` : '(no name)'}`);
      });
    });
    
    console.log('\n🎯 WHAT TO DO:');
    console.log('===============');
    console.log('1. Find the date(s) with your real waitlist users');
    console.log('2. Update the script to target those specific dates');
    console.log('3. Run mass email deployment for those dates');
    
    // Show September dates specifically
    const septDates = sortedDates.filter(date => date.includes('Sep'));
    if (septDates.length > 0) {
      console.log('\n📅 SEPTEMBER DATES FOUND:');
      septDates.forEach(date => {
        const users = usersByDate[date];
        console.log(`   ${date}: ${users.length} users`);
      });
    } else {
      console.log('\n❌ NO SEPTEMBER 2025 DATES FOUND');
      console.log('Users might be from different dates');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

showRecentUsers().catch(console.error);
