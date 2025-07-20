// Firebase Authentication Debug Helper
// Run this in the browser console on the login page to debug authentication issues

(function debugFirebaseAuth() {
    const firebase = window.firebase;
    
    console.log('=== Firebase Authentication Debug Info ===');
    
    // Check if Firebase is loaded
    if (!firebase) {
        console.error('❌ Firebase is not loaded!');
        return;
    }
    
    // Check Firebase configuration
    const app = firebase.app();
    const config = app.options;
    console.log('📋 Firebase Config:');
    console.log('  API Key:', config.apiKey);
    console.log('  Auth Domain:', config.authDomain);
    console.log('  Project ID:', config.projectId);
    console.log('  App ID:', config.appId);
    
    // Check authentication state
    const auth = firebase.auth();
    console.log('\n🔐 Authentication State:');
    console.log('  Current User:', auth.currentUser);
    console.log('  Auth Domain:', auth.config.authDomain);
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    console.log('\n🔗 URL Parameters:');
    console.log('  Mode:', urlParams.get('mode'));
    console.log('  Method:', urlParams.get('method'));
    
    // Listen for auth state changes
    console.log('\n👂 Listening for auth state changes...');
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ User signed in:', {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            });
            
            // Try to get ID token
            user.getIdToken(true).then(token => {
                console.log('🔑 ID Token obtained (first 50 chars):', token.substring(0, 50) + '...');
            }).catch(err => {
                console.error('❌ Failed to get ID token:', err);
            });
        } else {
            console.log('❌ No user signed in');
        }
    });
    
    // Test deep link format
    console.log('\n🔗 Deep Link Format Examples:');
    const testUser = {
        uid: 'test123',
        email: 'test@example.com',
        displayName: 'Test User'
    };
    const testToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2ZjU0OT...';
    
    console.log('  Standard auth:', 'leviousa://auth-success?' + new URLSearchParams({
        token: testToken,
        uid: testUser.uid,
        email: testUser.email,
        displayName: testUser.displayName
    }).toString());
    
    console.log('  Server auth:', 'leviousa://server-auth-success?' + new URLSearchParams({
        uid: testUser.uid,
        email: testUser.email,
        displayName: testUser.displayName,
        photoURL: '',
        method: 'server'
    }).toString());
    
    console.log('\n✅ Debug info complete. Check for any errors above.');
})();
