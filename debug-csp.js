#!/usr/bin/env node

/**
 * Automated CSP and CORS debugging script for Paragon integration
 * Tests CSP headers, blob URL support, and Paragon Connect portal loading
 */

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

console.log('🔍 [CSP Debug] Starting automated CSP/CORS testing...');

let testWindow;
let testResults = {
  cspHeadersApplied: false,
  blobUrlsAllowed: false,
  metaTagsRemoved: false,
  paragonLoaded: false,
  errors: []
};

app.whenReady().then(async () => {
  console.log('📱 [CSP Debug] Electron ready, setting up test environment...');
  
  // Set up the same CSP intercepts as main app
  setupCSPInterception();
  
  // Create test window
  testWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show for debugging
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'connect-preload.js')
    }
  });

  // Monitor console messages for CSP errors
  testWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (message.includes('Refused to') && message.includes('Content Security Policy')) {
      console.log('❌ [CSP Debug] CSP Error detected:', message);
      testResults.errors.push(message);
    } else if (message.includes('blob:')) {
      if (message.includes('Refused to load blob:')) {
        console.log('❌ [CSP Debug] Blob URL blocked:', message);
        testResults.errors.push(message);
      } else {
        console.log('✅ [CSP Debug] Blob URL allowed:', message);
        testResults.blobUrlsAllowed = true;
      }
    }
  });

  // Start the test sequence
  await runCSPTests();
});

function setupCSPInterception() {
  console.log('🔧 [CSP Debug] Setting up CSP interception...');
  
  const combinedFilter = { urls: ['https://connect.useparagon.com/*', 'http://localhost:3000/*'] };

  // Monitor requests
  session.defaultSession.webRequest.onBeforeSendHeaders(combinedFilter, (details, cb) => {
    console.log('📤 [CSP Debug] Intercepting request:', details.url);
    details.requestHeaders['Accept-Encoding'] = 'identity';
    cb({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Monitor CSP header modifications
  session.defaultSession.webRequest.onHeadersReceived(combinedFilter, (details, callback) => {
    console.log('📥 [CSP Debug] Intercepting response:', details.url);
    
    const lower = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
    const headers = lower(details.responseHeaders || {});

    // Check if CSP headers exist
    const originalCSP = headers['content-security-policy'];
    if (originalCSP) {
      console.log('🔒 [CSP Debug] Original CSP:', originalCSP[0]);
    }

    // Apply our CSP patch
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
    testResults.cspHeadersApplied = true;

    console.log('✅ [CSP Debug] Applied relaxed CSP for:', details.url);
    console.log('🔒 [CSP Debug] New CSP allows blob: URLs');
    
    callback({ cancel: false, responseHeaders: headers });
  });

  // Monitor HTML modifications
  session.defaultSession.webRequest.onBeforeRequest(combinedFilter, (details, callback) => {
    if (details.resourceType !== 'mainFrame' && details.resourceType !== 'subFrame') return callback({});

    console.log('📝 [CSP Debug] Filtering HTML content for:', details.url);
    
    const filter = session.defaultSession.webRequest.filterResponseData(details.id);
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();
    let raw = '';
    
    filter.on('data', (chunk) => {
      raw += decoder.decode(chunk, { stream: true });
    });
    
    filter.on('end', () => {
      const metaTagPattern = /<meta[^>]+http-equiv=["'](?:Content-Security-Policy(?:-Report-Only)?|X-Content-Security-Policy(?:-Report-Only)?)["'][^>]*>/ig;
      const metaTags = raw.match(metaTagPattern);
      
      if (metaTags) {
        console.log('🗑️ [CSP Debug] Found meta CSP tags to remove:', metaTags);
        testResults.metaTagsRemoved = true;
      }
      
      const cleaned = raw.replace(metaTagPattern, '');
      filter.write(encoder.encode(cleaned));
      filter.end();
      
      console.log('✅ [CSP Debug] HTML filtering complete for:', details.url);
    });
    
    callback({});
  });
}

async function runCSPTests() {
  console.log('\n🧪 [CSP Debug] Starting test sequence...\n');
  
  try {
    // Test 1: Load localhost integrations page
    console.log('1️⃣ [CSP Debug] Testing localhost:3000/integrations page...');
    await testWindow.loadURL('http://localhost:3000/integrations?service=gmail&action=connect&userId=test-user-id');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Check if Paragon SDK loaded
    console.log('2️⃣ [CSP Debug] Checking if Paragon SDK loaded...');
    const paragonSDKLoaded = await testWindow.webContents.executeJavaScript(`
      typeof window.paragon !== 'undefined' || 
      document.querySelector('script[src*="paragon"]') !== null ||
      document.querySelector('iframe[src*="connect.useparagon.com"]') !== null
    `);
    
    if (paragonSDKLoaded) {
      console.log('✅ [CSP Debug] Paragon SDK detected');
      testResults.paragonLoaded = true;
    } else {
      console.log('❌ [CSP Debug] Paragon SDK not detected');
    }
    
    // Test 3: Check for CSP errors in console
    console.log('3️⃣ [CSP Debug] Checking for CSP errors...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Try to create a blob URL to test blob: support
    console.log('4️⃣ [CSP Debug] Testing blob URL creation...');
    const blobTest = await testWindow.webContents.executeJavaScript(`
      try {
        const blob = new Blob(['console.log("blob test");'], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const script = document.createElement('script');
        script.src = blobUrl;
        document.head.appendChild(script);
        'blob-test-success';
      } catch (error) {
        'blob-test-failed: ' + error.message;
      }
    `);
    
    console.log('🧪 [CSP Debug] Blob test result:', blobTest);
    
    if (blobTest === 'blob-test-success') {
      testResults.blobUrlsAllowed = true;
    }
    
  } catch (error) {
    console.log('❌ [CSP Debug] Test error:', error);
    testResults.errors.push(error.message);
  }
  
  // Print final results
  printTestResults();
  
  // Keep window open for manual inspection if needed
  console.log('\n💡 [CSP Debug] Test window will remain open for manual inspection...');
  console.log('💡 [CSP Debug] Press Ctrl+C to exit when done.');
}

function printTestResults() {
  console.log('\n📊 [CSP Debug] Test Results:');
  console.log('=====================================');
  console.log('✅ CSP Headers Applied:', testResults.cspHeadersApplied ? 'YES' : 'NO');
  console.log('✅ Blob URLs Allowed:', testResults.blobUrlsAllowed ? 'YES' : 'NO');
  console.log('✅ Meta Tags Removed:', testResults.metaTagsRemoved ? 'YES' : 'NO');
  console.log('✅ Paragon SDK Loaded:', testResults.paragonLoaded ? 'YES' : 'NO');
  console.log('❌ Error Count:', testResults.errors.length);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 [CSP Debug] Errors Found:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\n🎯 [CSP Debug] Overall Status:', 
    testResults.cspHeadersApplied && testResults.blobUrlsAllowed && testResults.errors.length === 0 
      ? '✅ PASSING' : '❌ FAILING'
  );
  console.log('=====================================\n');
}

// Handle app termination
app.on('window-all-closed', () => {
  console.log('👋 [CSP Debug] Test completed, exiting...');
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    runCSPTests();
  }
});