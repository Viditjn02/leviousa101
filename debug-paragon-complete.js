// Comprehensive Paragon SDK debugging script
// Run this in the browser console on your integrations page

console.clear();
console.log('%c=== PARAGON SDK COMPREHENSIVE DEBUG ===', 'color: blue; font-size: 16px; font-weight: bold');

// Test configurations
const configs = [
    { name: 'Default (no config)', config: null },
    { name: 'With useparagon.com', config: { host: 'useparagon.com' } },
    { name: 'With connect.useparagon.com', config: { host: 'connect.useparagon.com' } },
    { name: 'With app.useparagon.com', config: { host: 'app.useparagon.com' } },
    { name: 'With empty string', config: { host: '' } }
];

const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
const userId = '7J1iNQy1GSTH0iyJWXHOIfI2D6G2';

async function testConfiguration(configName, configObj) {
    console.log(`\n%c Testing: ${configName}`, 'color: green; font-weight: bold');
    
    try {
        // Reset SDK if possible
        if (window.paragon && window.paragon.reset) {
            window.paragon.reset();
        }
        
        // Apply configuration
        if (configObj && window.paragon && window.paragon.configureGlobal) {
            console.log('  Applying config:', configObj);
            window.paragon.configureGlobal(configObj);
        }
        
        // Get token
        console.log('  Fetching token...');
        const tokenResponse = await fetch(`/api/paragonToken?userId=${userId}`);
        const tokenData = await tokenResponse.json();
        const token = tokenData.userToken;
        console.log('  ✓ Token obtained');
        
        // Authenticate
        console.log('  Authenticating...');
        await window.paragon.authenticate(projectId, token);
        const user = window.paragon.getUser();
        console.log('  ✓ Authenticated:', user.authenticated);
        
        // Monitor DOM
        let domChanges = [];
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'IFRAME' || 
                            (node.id && node.id.includes('paragon')) ||
                            (node.className && node.className.toString().includes('paragon'))) {
                            domChanges.push({
                                type: node.tagName,
                                id: node.id,
                                class: node.className.toString(),
                                src: node.src
                            });
                        }
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Try connect
        console.log('  Calling paragon.connect("gmail")...');
        const connectPromise = window.paragon.connect('gmail');
        
        // Wait for result or timeout
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve('TIMEOUT'), 3000);
        });
        
        const result = await Promise.race([connectPromise, timeoutPromise]);
        observer.disconnect();
        
        console.log('  Connect result:', result);
        console.log('  DOM changes detected:', domChanges.length > 0 ? domChanges : 'None');
        
        // Check for iframes
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
            src: f.src?.substring(0, 100),
            display: window.getComputedStyle(f).display,
            visibility: window.getComputedStyle(f).visibility
        }));
        console.log('  Current iframes:', iframes);
        
        return { success: true, domChanges, result };
        
    } catch (error) {
        console.error('  ✗ Error:', error.message);
        return { success: false, error: error.message };
    }
}

// Test all configurations
async function runAllTests() {
    const results = {};
    
    for (const config of configs) {
        results[config.name] = await testConfiguration(config.name, config.config);
        
        // Clean up any created elements
        document.querySelectorAll('[id*="paragon"]').forEach(el => el.remove());
        document.querySelectorAll('iframe[src*="paragon"]').forEach(el => el.remove());
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n%c=== SUMMARY ===', 'color: blue; font-size: 14px; font-weight: bold');
    Object.entries(results).forEach(([name, result]) => {
        const status = result.success && result.domChanges?.length > 0 ? '✓ WORKING' : '✗ FAILED';
        console.log(`${status}: ${name}`);
        if (result.domChanges?.length > 0) {
            console.log('  Created elements:', result.domChanges);
        }
    });
    
    // Additional tests
    console.log('\n%c=== ADDITIONAL CHECKS ===', 'color: blue; font-size: 14px; font-weight: bold');
    
    // Check blob: URL support
    try {
        const blob = new Blob(['test'], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        console.log('✓ Blob URLs supported');
        URL.revokeObjectURL(url);
    } catch (e) {
        console.log('✗ Blob URLs not supported:', e.message);
    }
    
    // Check current page CSP
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (meta) {
        console.log('Page has CSP meta tag:', meta.content);
    } else {
        console.log('No CSP meta tag found');
    }
    
    // Try popup
    console.log('\n%cTrying popup window...', 'color: orange');
    const popup = window.open(
        `https://connect.useparagon.com/ui?projectId=${projectId}&integration=gmail`,
        'paragon-test',
        'width=500,height=600'
    );
    if (popup) {
        console.log('✓ Popup opened - check if it loads correctly');
        setTimeout(() => popup.close(), 5000);
    } else {
        console.log('✗ Popup blocked');
    }
}

// Run tests
console.log('Starting tests... This will take about 15 seconds.');
runAllTests();
