// connect-preload.js
const { contextBridge, ipcRenderer } = require('electron');

// NOTE: @useparagon/connect is browser-only and cannot be required in preload context
// SDK configuration will be handled in the renderer process where it belongs
console.log('[ConnectPreload] 🔄 Paragon SDK will be loaded in browser context (renderer process)');

// Expose necessary IPC methods for authentication notifications and status
contextBridge.exposeInMainWorld('api', {
  mcp: {
    notifyAuthenticationComplete: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationComplete', data),
    notifyAuthenticationFailed: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationFailed', data),
    getParagonServiceStatus: () => ipcRenderer.invoke('mcp:getParagonServiceStatus'),
    getAuthenticatedServices: (userId) => ipcRenderer.invoke('mcp:getAuthenticatedServices', userId)
  },
  
  // 🔒 Subscription API for pro detection on web integration page
  subscription: {
    getCurrentUser: () => ipcRenderer.invoke('subscription:getCurrentUser')
  }
});

console.log('[ConnectPreload] ✅ Exposed IPC methods for authentication notifications and subscription access');

// Defensive meta CSP removal
function scrubCSPMeta() {
  const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"]');
  console.log(`[ConnectPreload] 🔍 Found ${metaTags.length} CSP meta tags to remove`);
  metaTags.forEach(m => {
    console.log('[ConnectPreload] 🗑️ Removing CSP meta tag:', m.outerHTML);
    m.remove();
  });
  
  // Also check what CSP is currently active
  const currentCSP = document.querySelector('meta[http-equiv*="Content-Security-Policy"]');
  if (currentCSP) {
    console.log('[ConnectPreload] ⚠️ CSP meta tag still present after cleanup:', currentCSP.outerHTML);
  } else {
    console.log('[ConnectPreload] ✅ No CSP meta tags found in document');
  }
}

// Remove CSP meta tags on load and when DOM changes
window.addEventListener('DOMContentLoaded', scrubCSPMeta);
new MutationObserver(scrubCSPMeta).observe(document.head || document, { 
  childList: true, 
  subtree: true 
});

console.log('[ConnectPreload] ✅ CSP meta scrubber installed');