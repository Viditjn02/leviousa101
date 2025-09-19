// Force Paragon to use inline iframe mode instead of popup
console.log('Testing Paragon with forced inline mode...\n');

// First, check if there's a way to configure the SDK
if (window.paragon.configureGlobal) {
    console.log('Configuring SDK for inline mode...');
    window.paragon.configureGlobal({
        displayMode: 'inline',
        host: 'useparagon.com'
    });
}

// Create a container div for the iframe
const container = document.createElement('div');
container.id = 'paragon-container';
container.style.cssText = `
    position: fixed;
    top: 50px;
    left: 50px;
    right: 50px;
    bottom: 50px;
    z-index: 999999;
    background: white;
    border: 5px solid blue;
    box-shadow: 0 0 50px rgba(0,0,0,0.5);
`;
document.body.appendChild(container);
console.log('Created container div for Paragon');

// Try different connection methods
console.log('\n1. Trying connect with inline mode and container...');
window.paragon.connect('gmail', {
    displayMode: 'inline',
    container: container,
    onSuccess: (data) => {
        console.log('Success:', data);
    },
    onError: (error) => {
        console.log('Error:', error);
    }
}).then(result => {
    console.log('Connect resolved:', result);
}).catch(err => {
    console.log('Connect rejected:', err);
});

// Alternative: Try creating the iframe manually using the URL pattern we found
setTimeout(() => {
    console.log('\n2. Manually creating Paragon iframe...');
    
    // Get current auth state
    const user = window.paragon.getUser();
    const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
    
    // Create iframe with the URL pattern we discovered
    const iframe = document.createElement('iframe');
    iframe.src = `https://connect.useparagon.com/ui?projectId=${projectId}&integration=gmail&userId=${user.userId}`;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    
    // Clear container and add iframe
    container.innerHTML = '';
    container.appendChild(iframe);
    
    console.log('Iframe created with src:', iframe.src);
}, 2000);

// Also check if there's an existing iframe that's hidden
setTimeout(() => {
    console.log('\n3. Checking for any hidden Paragon elements...');
    
    // Check all elements for Paragon-related attributes
    const allElements = document.querySelectorAll('*');
    let paragonElements = [];
    
    allElements.forEach(el => {
        const attrs = Array.from(el.attributes);
        const hasParagon = attrs.some(attr => 
            attr.name.includes('paragon') || 
            attr.value.includes('paragon') ||
            attr.value.includes('connect.useparagon.com')
        );
        
        if (hasParagon) {
            paragonElements.push({
                tag: el.tagName,
                id: el.id,
                class: el.className,
                display: window.getComputedStyle(el).display,
                visibility: window.getComputedStyle(el).visibility
            });
        }
    });
    
    if (paragonElements.length > 0) {
        console.log('Found Paragon elements:', paragonElements);
    } else {
        console.log('No Paragon elements found in DOM');
    }
}, 3000);
