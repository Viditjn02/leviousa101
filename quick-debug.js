const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(() => {
  console.log('🚀 Quick CSP debug starting...');
  
  // Log ALL requests
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
    console.log('📡 REQUEST:', details.url);
    callback({});
  });
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  console.log('🌐 Loading integrations...');
  win.loadURL('http://localhost:3000/integrations?service=gmail&action=connect&userId=test');
  
  setTimeout(() => {
    console.log('⏰ Debug timeout - keeping window open');
  }, 10000);
});

process.on('SIGINT', () => app.quit());