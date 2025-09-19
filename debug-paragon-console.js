// Test script to run in the browser console to debug Paragon
console.log('=== PARAGON SDK DEBUG ===');

// 1. Check if SDK is loaded
console.log('1. Checking SDK availability:');
console.log('  window.paragon:', typeof window.paragon);
if (window.paragon) {
    console.log('  Available methods:', Object.keys(window.paragon));
}

// 2. Check authentication state
if (window.paragon && window.paragon.getUser) {
    console.log('2. Current user state:');
    const user = window.paragon.getUser();
    console.log('  User:', user);
}

// 3. Check metadata
if (window.paragon && window.paragon.getIntegrationMetadata) {
    console.log('3. Integration metadata:');
    const metadata = window.paragon.getIntegrationMetadata();
    console.log('  Available integrations:', metadata);
}

// 4. Try authenticating if needed
async function testAuth() {
    const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
    const userId = '7J1iNQy1GSTH0iyJWXHOIfI2D6G2';
    
    console.log('4. Testing authentication:');
    
    // Get a fresh token
    try {
        const tokenResponse = await fetch(`/api/paragonToken?userId=${userId}`);
        const tokenData = await tokenResponse.json();
        const token = tokenData.userToken;
        console.log('  Got token:', token.substring(0, 50) + '...');
        
        // Authenticate
        await window.paragon.authenticate(projectId, token);
        console.log('  ✅ Authenticated successfully');
        
        // Check user again
        const user = window.paragon.getUser();
        console.log('  User after auth:', user);
        
        // Now try connect with different options
        console.log('5. Testing different connect methods:');
        
        // Method 1: Simple connect
        console.log('  Method 1: paragon.connect("gmail")');
        try {
            const result1 = await window.paragon.connect('gmail');
            console.log('    Result:', result1);
        } catch (err) {
            console.log('    Error:', err);
        }
        
        // Method 2: Connect with options
        console.log('  Method 2: paragon.connect with options');
        try {
            const result2 = await window.paragon.connect('gmail', {
                displayMode: 'popup' // or 'iframe'
            });
            console.log('    Result:', result2);
        } catch (err) {
            console.log('    Error:', err);
        }
        
        // Method 3: Connect with callback
        console.log('  Method 3: paragon.connect with callback');
        window.paragon.connect('gmail', {
            onSuccess: (data) => {
                console.log('    Success callback:', data);
            },
            onError: (error) => {
                console.log('    Error callback:', error);
            }
        });
        
    } catch (error) {
        console.error('  Failed:', error);
    }
}

// Run the test
if (window.paragon) {
    testAuth();
} else {
    console.error('❌ Paragon SDK not found on window object');
}

// 6. Monitor DOM for iframe/div creation
console.log('6. Monitoring DOM for 5 seconds...');
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'IFRAME') {
                console.log('  📍 IFRAME ADDED:', node.src);
            }
            if (node.nodeName === 'DIV' && (node.id?.includes('paragon') || node.className?.includes('paragon'))) {
                console.log('  📍 PARAGON DIV ADDED:', node);
            }
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => {
    observer.disconnect();
    console.log('  Monitoring stopped');
}, 5000);
