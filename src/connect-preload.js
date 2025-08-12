// connect-preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Configure Paragon SDK globally first (before it initializes)
try {
  const { paragon } = require('@useparagon/connect');
  paragon.configureGlobal({
    host: 'useparagon.com',
    apiHost: 'https://api.useparagon.com',
    connectHost: 'https://connect.useparagon.com',
  });
  console.log('[ConnectPreload] ✅ Paragon SDK configured globally');
} catch (error) {
  console.warn('[ConnectPreload] ⚠️ Failed to configure Paragon SDK:', error);
}

// Expose necessary IPC methods for authentication notifications
contextBridge.exposeInMainWorld('api', {
  mcp: {
    notifyAuthenticationComplete: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationComplete', data),
    notifyAuthenticationFailed: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationFailed', data)
  }
});

console.log('[ConnectPreload] ✅ Exposed IPC methods for authentication notifications');

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