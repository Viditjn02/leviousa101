const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(() => {
  console.log('🔧 [TEST] Setting up CSP test...');
  
  // Debug: Log ALL requests - exactly like our main app
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://*/*', 'http://*/*'] }, (details, callback) => {
    if (details.url.includes('useparagon.com')) {
      console.log('🔍 [DEBUG] All Paragon requests:', details.url, 'Type:', details.resourceType);
    }
    if (details.url.includes('localhost:3000')) {
      console.log('🔍 [DEBUG] Localhost request:', details.url, 'Type:', details.resourceType);
    }
    callback({});
  });

  // CSP header interception
  const combinedFilter = { urls: ['https://connect.useparagon.com/*', 'http://localhost:3000/*'] };
  session.defaultSession.webRequest.onHeadersReceived(combinedFilter, (details, callback) => {
    console.log('🔒 [CSP] Intercepted headers for:', details.url);
    
    const headers = Object.fromEntries(Object.entries(details.responseHeaders || {}).map(([k, v]) => [k.toLowerCase(), v]));
    headers['content-security-policy'] = ["default-src 'self' https: http: blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http:;"];
    
    console.log('✅ [CSP] Applied relaxed CSP to:', details.url);
    callback({ cancel: false, responseHeaders: headers });
  });

  console.log('✅ [TEST] CSP test setup complete');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: session.defaultSession
    }
  });

  console.log('🌐 [TEST] Loading integrations...');
  win.loadURL('http://localhost:3000/integrations?service=gmail&action=connect&userId=test');
});

process.on('SIGINT', () => app.quit());