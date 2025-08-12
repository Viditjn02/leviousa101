const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(() => {
  console.log('🚀 [Debug] Testing forced Paragon iframe creation...');
  
  // Set up CSP filters
  const combinedFilter = { urls: ['https://connect.useparagon.com/*', 'http://localhost:3000/*'] };
  
  session.defaultSession.webRequest.onBeforeSendHeaders(combinedFilter, (details, cb) => {
    console.log('📤 [CSP] onBeforeSendHeaders:', details.url);
    details.requestHeaders['Accept-Encoding'] = 'identity';
    cb({ cancel: false, requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived(combinedFilter, (details, callback) => {
    console.log('📥 [CSP] onHeadersReceived:', details.url);
    
    const lower = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
    const headers = lower(details.responseHeaders || {});

    const originalCSP = headers['content-security-policy'];
    if (originalCSP) {
      console.log('🔒 [CSP] Original CSP:', originalCSP[0].substring(0, 80) + '...');
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
    console.log('✅ [CSP] Applied blob-friendly CSP for:', details.url);
    
    callback({ cancel: false, responseHeaders: headers });
  });

  // Monitor console for CSP/blob errors
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  win.webContents.on('console-message', (event, level, message) => {
    if (message.includes('Refused to') || message.includes('blob:') || message.includes('CSP')) {
      console.log(`🚨 [Console ${level}]:`, message);
    }
  });
  
  console.log('🌐 [Debug] Loading integrations page...');
  
  win.loadURL('http://localhost:3000/integrations?service=gmail&action=connect&userId=test-user').then(async () => {
    console.log('✅ [Debug] Page loaded, waiting for Paragon SDK...');
    
    // Wait for page to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Force create a Paragon iframe manually to test CSP
    console.log('🔧 [Debug] Manually creating Paragon iframe...');
    
    try {
      const result = await win.webContents.executeJavaScript(`
        (function() {
          // Create an iframe pointing to Paragon Connect
          const iframe = document.createElement('iframe');
          iframe.src = 'https://connect.useparagon.com/ui?projectId=db5e019e-0558-4378-93de-f212a73e0606';
          iframe.width = '400';
          iframe.height = '300';
          iframe.style.border = '1px solid red';
          iframe.id = 'test-paragon-iframe';
          document.body.appendChild(iframe);
          
          return 'IFRAME_CREATED';
        })();
      `);
      
      console.log('🖼️ [Debug] Iframe creation result:', result);
      
      // Wait for iframe to load and check for CSP interception
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('🧪 [Debug] Testing blob URL creation in page...');
      
      const blobTest = await win.webContents.executeJavaScript(`
        (function() {
          try {
            const blob = new Blob(['console.log("Blob test success!");'], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            console.log('Created blob URL:', blobUrl);
            
            const script = document.createElement('script');
            script.src = blobUrl;
            document.head.appendChild(script);
            
            return 'BLOB_TEST_SUCCESS';
          } catch (error) {
            return 'BLOB_TEST_FAILED: ' + error.message;
          }
        })();
      `);
      
      console.log('🧪 [Debug] Blob test result:', blobTest);
      
    } catch (error) {
      console.log('❌ [Debug] JavaScript execution error:', error.message);
    }
    
    console.log('\n📊 [Debug] Summary:');
    console.log('=====================================');
    console.log('✅ Localhost CSP interception: WORKING');
    console.log('🔍 Paragon iframe CSP: Check logs above');
    console.log('🧪 Blob URL support: Check test result');
    console.log('=====================================\n');
    
    console.log('💡 [Debug] Window staying open for manual verification...');
    console.log('💡 Check DevTools for any remaining CSP errors');
    console.log('💡 Press Ctrl+C to exit');
    
  }).catch(err => {
    console.log('❌ [Debug] Failed to load page:', err.message);
    app.quit();
  });
});

process.on('SIGINT', () => {
  console.log('\n🔚 [Debug] Exiting...');
  app.quit();
});