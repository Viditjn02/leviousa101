// Test Firebase Admin SDK Setup
// Run this with: node scripts/test-firebase-admin.js

const path = require('path');
const fs = require('fs');

console.log('=== Testing Firebase Admin SDK Setup ===\n');

// Check for service account key file
const possiblePaths = [
    path.join(__dirname, '../firebase-service-account.json'),
    path.join(__dirname, '../serviceAccountKey.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
    path.join(process.cwd(), 'serviceAccountKey.json'),
];

console.log('🔍 Looking for service account key file...');
let serviceAccountPath = null;
for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
        serviceAccountPath = filePath;
        console.log('✅ Found service account key at:', filePath);
        break;
    }
}

if (!serviceAccountPath) {
    console.error('❌ Service account key file not found!');
    console.log('\nTo fix this:');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('2. Click "Generate new private key"');
    console.log('3. Save the file as "firebase-service-account.json" in the project root');
    process.exit(1);
}

// Try to initialize Firebase Admin
try {
    const admin = require('firebase-admin');
    const serviceAccount = require(serviceAccountPath);
    
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'leviousa-101',
            databaseURL: 'https://leviousa-101-default-rtdb.firebaseio.com/'
        });
    }
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    
    // Test creating a custom token
    const testUid = 'test-user-' + Date.now();
    admin.auth().createCustomToken(testUid)
        .then(customToken => {
            console.log('✅ Successfully created custom token for UID:', testUid);
            console.log('   Token (first 50 chars):', customToken.substring(0, 50) + '...');
            
            // Clean up test
            console.log('\n✅ All tests passed! Firebase Admin SDK is properly configured.');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed to create custom token:', error);
            process.exit(1);
        });
        
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.log('\nPossible issues:');
    console.log('- Invalid service account key file');
    console.log('- Missing required npm packages (run: npm install firebase-admin)');
    console.log('- Network connectivity issues');
    process.exit(1);
}
