const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(() => {
  console.log('🚀 [Debug] App ready, setting up basic webRequest test...');
  
  // Test basic webRequest functionality
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
    console.log('📡 [Debug] Request intercepted:', details.url);
    callback({});
  });
  
  console.log('✅ [Debug] WebRequest filter installed for all URLs');
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false
  });
  
  console.log('🌐 [Debug] Loading test URL...');
  win.loadURL('http://localhost:3000').then(() => {
    console.log('✅ [Debug] URL loaded successfully');
    setTimeout(() => {
      console.log('🔚 [Debug] Test complete, exiting...');
      app.quit();
    }, 3000);
  }).catch(err => {
    console.log('❌ [Debug] URL load failed:', err.message);
    app.quit();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});