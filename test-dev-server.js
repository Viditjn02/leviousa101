#!/usr/bin/env node

/**
 * Simple test to verify dev server and URL parameters
 */

const http = require('http');

async function testDevServer() {
  console.log('🔍 Testing dev server and URL parameters...');
  
  // Test if dev server is running
  const serverCheck = () => {
    return new Promise((resolve, reject) => {
      const req = http.request({ 
        hostname: 'localhost', 
        port: 3000, 
        path: '/',
        timeout: 3000
      }, (res) => {
        console.log('✅ Dev server running on localhost:3000');
        resolve(true);
      });
      req.on('error', (err) => {
        console.log('❌ Dev server not running:', err.message);
        resolve(false);
      });
      req.setTimeout(3000, () => {
        console.log('❌ Dev server timeout');
        resolve(false);
      });
      req.end();
    });
  };
  
  const isRunning = await serverCheck();
  if (!isRunning) {
    console.log('🚀 Start dev server with: cd leviousa_web && npm start');
    return;
  }
  
  // Test the integrations URL with correct parameters
  const testUrl = '/integrations?service=gmail&action=connect&userId=7J1iNQy1GSTH0iyJWXHOIfI2D6G2';
  console.log('🔍 Testing URL parameters fix...');
  
  const testRequest = () => {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: testUrl,
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Check if HTML contains correct serviceToConnect value
          if (data.includes('serviceToConnect')) {
            console.log('✅ serviceToConnect found in response');
            
            // Extract the serviceToConnect value (basic parsing)
            const match = data.match(/serviceToConnect[^,]*gmail/);
            if (match) {
              console.log('✅ serviceToConnect should be gmail:', match[0]);
            } else {
              console.log('❌ serviceToConnect not set to gmail');
            }
          }
          resolve(data);
        });
      });
      req.on('error', (err) => {
        console.log('❌ Request failed:', err.message);
        resolve(null);
      });
      req.setTimeout(5000);
      req.end();
    });
  };
  
  await testRequest();
  
  console.log('\n🚀 Manual test instructions:');
  console.log('1. Open browser to: http://localhost:3000' + testUrl);
  console.log('2. Check console for: "serviceToConnect: gmail" (should NOT be null)');
  console.log('3. Check if Connect button is clickable (should not be disabled)');
  console.log('4. Click Connect button and see if paragon.connect() is called');
}

testDevServer().catch(console.error);

