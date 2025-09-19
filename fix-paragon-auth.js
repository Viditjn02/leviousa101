// Fix authentication and create working iframe
console.log('=== Fixing Paragon Authentication and UI ===\n');

// Step 1: Re-authenticate the SDK
async function fixParagonAuth() {
    const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
    const userId = '7J1iNQy1GSTH0iyJWXHOIfI2D6G2';
    
    console.log('1. Fetching fresh token...');
    try {
        const response = await fetch(`/api/paragonToken?userId=${userId}`);
        const data = await response.json();
        const token = data.userToken;
        
        console.log('2. Re-authenticating SDK...');
        await window.paragon.authenticate(projectId, token);
        console.log('   ✅ SDK authenticated');
        
        const user = window.paragon.getUser();
        console.log('   User state:', user);
        
        // Step 2: Try connect again
        console.log('\n3. Attempting connect with authenticated SDK...');
        const result = await window.paragon.connect('gmail');
        console.log('   Connect result:', result);
        
    } catch (error) {
        console.error('   Error:', error);
    }
}

// Step 3: Create a working iframe with proper authentication
function createAuthenticatedIframe() {
    console.log('\n4. Creating authenticated iframe...');
    
    // Remove old container if exists
    const oldContainer = document.getElementById('paragon-container');
    if (oldContainer) oldContainer.remove();
    
    // Create new container
    const container = document.createElement('div');
    container.id = 'paragon-authenticated-container';
    container.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50px;
        right: 50px;
        bottom: 50px;
        z-index: 999999;
        background: white;
        border: 5px solid green;
        box-shadow: 0 0 50px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
    `;
    
    // Add header with close button
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 10px;
        background: #f0f0f0;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <h3 style="margin: 0;">Paragon Connect - Gmail</h3>
        <button onclick="document.getElementById('paragon-authenticated-container').remove()" 
                style="padding: 5px 10px; cursor: pointer;">Close</button>
    `;
    
    // Create iframe
    const iframe = document.createElement('iframe');
    const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
    const user = window.paragon.getUser();
    
    // Build proper authenticated URL
    // According to Paragon docs, we need to pass the auth token
    const authToken = localStorage.getItem('paragon:authToken') || '';
    
    iframe.src = `https://connect.useparagon.com/ui?projectId=${projectId}&integration=gmail`;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; flex: 1;';
    iframe.setAttribute('allow', 'clipboard-write; clipboard-read');
    
    container.appendChild(header);
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    console.log('   ✅ Iframe created with authenticated URL');
    console.log('   If you see CSP errors, the Paragon UI needs to be loaded differently.');
    
    // Monitor iframe for messages
    window.addEventListener('message', (event) => {
        if (event.origin === 'https://connect.useparagon.com') {
            console.log('📬 Message from Paragon:', event.data);
        }
    });
}

// Step 4: Alternative - Open in popup
function openInPopup() {
    console.log('\n5. Opening Paragon in popup window...');
    const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
    const url = `https://connect.useparagon.com/ui?projectId=${projectId}&integration=gmail`;
    
    const popup = window.open(url, 'paragon-connect', 'width=500,height=600,left=100,top=100');
    if (popup) {
        console.log('   ✅ Popup opened');
    } else {
        console.log('   ❌ Popup blocked - please allow popups for this site');
    }
}

// Run the fixes
(async () => {
    await fixParagonAuth();
    
    // Wait a bit then try iframe
    setTimeout(() => {
        createAuthenticatedIframe();
    }, 1000);
    
    // Also provide popup option
    console.log('\n📝 To open in a popup instead, run: openInPopup()');
})();
