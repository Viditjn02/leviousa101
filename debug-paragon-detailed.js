// Run this in the console to debug why connect isn't showing UI

console.log('=== DETAILED PARAGON DEBUG ===\n');

// 1. Check current integration status
const user = window.paragon.getUser();
console.log('1. Current user state:');
console.log('   Authenticated:', user.authenticated);
console.log('   User ID:', user.userId);
console.log('   Gmail status:', user.integrations?.gmail);

// 2. Try disconnect first (in case it's already connected)
if (user.integrations?.gmail?.enabled) {
    console.log('\n2. Gmail appears connected, trying to disconnect first...');
    window.paragon.uninstallIntegration('gmail').then(() => {
        console.log('   Disconnected. Now try connecting again.');
    }).catch(err => {
        console.log('   Disconnect error:', err);
    });
}

// 3. Monitor DOM for any changes
console.log('\n3. Starting DOM monitor...');
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
                const el = node;
                if (el.tagName === 'IFRAME') {
                    console.log('   🔍 IFRAME ADDED:', el.src || 'no src');
                    // Make it visible
                    el.style.cssText = 'position:fixed!important;top:50px!important;left:50px!important;right:50px!important;bottom:50px!important;z-index:999999!important;border:5px solid red!important;display:block!important;visibility:visible!important;';
                }
                if (el.tagName === 'DIV' && (el.id?.includes('paragon') || el.className?.includes('paragon'))) {
                    console.log('   🔍 PARAGON DIV ADDED:', el.id, el.className);
                    el.style.border = '3px solid blue';
                }
                // Check for portal/modal divs
                if (el.className?.includes('portal') || el.className?.includes('modal') || el.getAttribute('role') === 'dialog') {
                    console.log('   🔍 PORTAL/MODAL ADDED:', el.className);
                }
            }
        });
        mutation.removedNodes.forEach(node => {
            if (node.nodeType === 1 && node.tagName === 'IFRAME') {
                console.log('   ❌ IFRAME REMOVED:', node.src || 'no src');
            }
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });

// 4. Try connect with different approaches
console.log('\n4. Testing connect methods...\n');

// Method A: Simple connect
console.log('Method A: Simple connect');
window.paragon.connect('gmail').then(result => {
    console.log('   Result:', result);
}).catch(error => {
    console.log('   Error:', error);
});

// Method B: After a delay, try with options
setTimeout(() => {
    console.log('\nMethod B: Connect with popup mode');
    window.paragon.connect('gmail', { 
        displayMode: 'popup',
        onSuccess: (data) => console.log('   Success callback:', data),
        onError: (err) => console.log('   Error callback:', err)
    });
}, 2000);

// Method C: Try opening portal directly
setTimeout(() => {
    console.log('\nMethod C: Try openPortal if available');
    if (window.paragon.openPortal) {
        window.paragon.openPortal();
    } else {
        console.log('   openPortal method not available');
    }
}, 4000);

// 5. Check for existing iframes
setTimeout(() => {
    console.log('\n5. Checking for iframes after 5 seconds...');
    const iframes = document.querySelectorAll('iframe');
    console.log(`   Found ${iframes.length} iframes`);
    iframes.forEach((iframe, i) => {
        console.log(`   Iframe ${i}:`, iframe.src?.substring(0, 100) || 'no src');
    });
    
    // Stop observer
    observer.disconnect();
    console.log('\n=== Debug complete ===');
}, 5000);
