// connect-preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Paragon SDK will be loaded in renderer process (browser context)
// Preload only handles IPC bridge for authentication notifications
console.log('[ConnectPreload] 🔧 Setting up browser environment for Paragon SDK...');
console.log('[ConnectPreload] 📦 Paragon SDK will be loaded in renderer process (not preload)');

// Expose necessary IPC methods for authentication notifications
contextBridge.exposeInMainWorld('api', {
  mcp: {
    notifyAuthenticationComplete: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationComplete', data),
    notifyAuthenticationFailed: (data) => ipcRenderer.invoke('mcp:notifyAuthenticationFailed', data),
    paragon: {
      authenticate: (service) => ipcRenderer.invoke('paragon:authenticate', service),
      disconnect: (service) => ipcRenderer.invoke('paragon:disconnect', service),
      getStatus: (service) => ipcRenderer.invoke('paragon:status', service)
    }
  }
});

// Also expose electronAPI for integration page detection
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  isElectron: true
});

console.log('[ConnectPreload] ✅ Exposed IPC methods for authentication notifications');
console.log('[ConnectPreload] ✅ Exposed ElectronAPI for integration page detection');

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