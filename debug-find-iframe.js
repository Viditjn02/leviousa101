// Debug script to find and make Paragon iframe visible
// Run this in browser console after clicking Connect

console.log('🔍 Searching for Paragon elements...\n');

// Check for iframes
const iframes = document.querySelectorAll('iframe');
console.log(`Found ${iframes.length} iframes:`);
iframes.forEach((iframe, i) => {
    console.log(`\nIframe ${i}:`);
    console.log(`  src: ${iframe.src || 'no src'}`);
    console.log(`  id: ${iframe.id || 'no id'}`);
    console.log(`  class: ${iframe.className || 'no class'}`);
    console.log(`  display: ${iframe.style.display}`);
    console.log(`  visibility: ${iframe.style.visibility}`);
    console.log(`  position: ${iframe.style.position}`);
    console.log(`  z-index: ${iframe.style.zIndex}`);
    console.log(`  width: ${iframe.style.width || iframe.width}`);
    console.log(`  height: ${iframe.style.height || iframe.height}`);
    
    // Check computed styles
    const computed = window.getComputedStyle(iframe);
    console.log(`  computed display: ${computed.display}`);
    console.log(`  computed visibility: ${computed.visibility}`);
    console.log(`  computed opacity: ${computed.opacity}`);
    console.log(`  computed z-index: ${computed.zIndex}`);
    
    // Make it visible if it's a Paragon iframe
    if (iframe.src && (iframe.src.includes('paragon') || iframe.src.includes('passport'))) {
        console.log('  🎯 THIS IS A PARAGON IFRAME - Making it visible!');
        iframe.style.display = 'block';
        iframe.style.visibility = 'visible';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.zIndex = '999999';
        iframe.style.opacity = '1';
        iframe.style.border = '5px solid red';
        console.log('  ✅ Forced iframe to be visible with red border');
    }
});

// Check for elements with 'paragon' in class or id
const paragonElements = document.querySelectorAll('[class*="paragon"], [id*="paragon"], [class*="Paragon"], [id*="Paragon"]');
console.log(`\nFound ${paragonElements.length} elements with 'paragon' in class/id:`);
paragonElements.forEach((el, i) => {
    console.log(`\nParagon element ${i}:`);
    console.log(`  tag: ${el.tagName}`);
    console.log(`  id: ${el.id || 'no id'}`);
    console.log(`  class: ${el.className || 'no class'}`);
    console.log(`  display: ${el.style.display}`);
    console.log(`  visibility: ${el.style.visibility}`);
    
    // Make it visible
    el.style.display = 'block';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.border = '3px solid blue';
    console.log('  ✅ Made visible with blue border');
});

// Check shadow DOM roots
const allElements = document.querySelectorAll('*');
let shadowRoots = 0;
allElements.forEach(el => {
    if (el.shadowRoot) {
        shadowRoots++;
        console.log(`\nFound shadow root on ${el.tagName}#${el.id || 'no-id'}`);
        // Check inside shadow DOM
        const shadowIframes = el.shadowRoot.querySelectorAll('iframe');
        if (shadowIframes.length > 0) {
            console.log(`  Contains ${shadowIframes.length} iframes in shadow DOM`);
            shadowIframes.forEach(iframe => {
                if (iframe.src.includes('paragon')) {
                    console.log('  🎯 FOUND PARAGON IFRAME IN SHADOW DOM!');
                }
            });
        }
    }
});
console.log(`\nTotal shadow roots found: ${shadowRoots}`);

// Check if any divs are overlays that might be hidden
const overlays = document.querySelectorAll('div[style*="position: fixed"], div[style*="position: absolute"]');
console.log(`\nFound ${overlays.length} potential overlay divs`);
overlays.forEach((div, i) => {
    const computed = window.getComputedStyle(div);
    if (computed.zIndex > 1000) {
        console.log(`High z-index div ${i}: z-index=${computed.zIndex}, display=${computed.display}`);
    }
});

console.log('\n✅ Debug complete. If you see a red-bordered iframe, that\'s the Paragon Connect Portal!');
