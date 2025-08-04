const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(() => {
  console.log('🚀 [Debug] Testing real CSP interception...');
  
  // Set up our actual CSP filters
  const combinedFilter = { urls: ['https://connect.useparagon.com/*', 'http://localhost:3000/*'] };
  
  session.defaultSession.webRequest.onBeforeSendHeaders(combinedFilter, (details, cb) => {
    console.log('📤 [CSP Debug] onBeforeSendHeaders:', details.url);
    details.requestHeaders['Accept-Encoding'] = 'identity';
    cb({ cancel: false, requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived(combinedFilter, (details, callback) => {
    console.log('📥 [CSP Debug] onHeadersReceived:', details.url);
    
    const lower = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
    const headers = lower(details.responseHeaders || {});

    const originalCSP = headers['content-security-policy'];
    if (originalCSP) {
      console.log('🔒 [CSP Debug] Original CSP found:', originalCSP[0].substring(0, 100) + '...');
    }

    delete headers['content-security-policy'];
    delete headers['content-security-policy-report-only'];
    delete headers['content-encoding'];

    const relaxedCSP = "default-src 'self' https: http: blob: data:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http:; " +
        "connect-src 'self' https: http: ws: wss: blob:; " +
        "img-src 'self' data: blob: https: http:; " +
        "style-src 'self' 'unsafe-inline' https: http:; " +
        "font-src 'self' data: https: http:; " +
        "frame-src 'self' https: http: blob:; " +
        "worker-src 'self' blob:; " +
        "child-src 'self' https: http: blob:; " +
        "object-src 'self' blob: https: http:;";
    
    headers['content-security-policy'] = [relaxedCSP];
    console.log('✅ [CSP Debug] Applied relaxed CSP for:', details.url);
    
    callback({ cancel: false, responseHeaders: headers });
  });

  console.log('✅ [Debug] CSP filters installed');
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  console.log('🌐 [Debug] Loading integrations page...');
  win.loadURL('http://localhost:3000/integrations?service=gmail&action=connect&userId=test-user').then(() => {
    console.log('✅ [Debug] Integrations page loaded');
    
    // Wait a bit for any iframe loads
    setTimeout(() => {
      console.log('🔍 [Debug] Checking page contents...');
      
      win.webContents.executeJavaScript(`
        document.querySelector('iframe[src*="connect.useparagon.com"]') ? 'IFRAME_FOUND' : 'NO_IFRAME'
      `).then(result => {
        console.log('🖼️ [Debug] Paragon iframe status:', result);
        
        // Keep window open for testing
        console.log('💡 [Debug] Window staying open for manual testing...');
        console.log('💡 Press Ctrl+C to exit');
      });
      
    }, 5000);
    
  }).catch(err => {
    console.log('❌ [Debug] Failed to load integrations page:', err.message);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  // Don't quit on window close for debugging
});

process.on('SIGINT', () => {
  console.log('\n🔚 [Debug] Exiting...');
  app.quit();
});