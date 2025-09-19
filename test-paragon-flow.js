#!/usr/bin/env node

/**
 * Quick test of Paragon integration flow via dev server
 */

const puppeteer = require('puppeteer');

async function testParagonFlow() {
  console.log('🔍 Testing Paragon integration flow via localhost:3000...');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, 
      devtools: true,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('ParagonIntegration') || msg.text().includes('serviceToConnect')) {
        console.log('🔍 Browser log:', msg.text());
      }
    });
    
    // Navigate to integrations page with Gmail connect parameters
    const testUrl = 'http://localhost:3000/integrations?service=gmail&action=connect&userId=7J1iNQy1GSTH0iyJWXHOIfI2D6G2';
    console.log('🌐 Navigating to:', testUrl);
    
    await page.goto(testUrl, { waitUntil: 'networkidle0' });
    
    // Wait for page to load and check serviceToConnect
    await page.waitForTimeout(3000);
    
    // Check if connect button is clickable
    const connectButtons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({ 
        text: btn.textContent.trim(), 
        disabled: btn.disabled,
        className: btn.className
      })).filter(btn => btn.text.toLowerCase().includes('connect'))
    );
    
    console.log('🔍 Connect buttons found:', connectButtons);
    
    if (connectButtons.length > 0) {
      const gmailButton = connectButtons.find(btn => !btn.disabled);
      if (gmailButton) {
        console.log('✅ Gmail connect button is clickable!');
        
        // Try to click the button
        await page.click('button:not([disabled])');
        console.log('🚀 Clicked Gmail connect button');
        
        // Wait for paragon.connect() to be called
        await page.waitForTimeout(5000);
        
      } else {
        console.log('❌ Gmail connect button is disabled:', connectButtons[0]);
      }
    } else {
      console.log('❌ No connect buttons found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      // Keep browser open for manual inspection
      console.log('🔍 Browser left open for manual inspection. Close manually when done.');
    }
  }
}

// Check if dev server is running first
const http = require('http');
const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path: '/' }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => resolve(false));
    req.end();
  });
};

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Dev server not running. Please start with: npm start');
    return;
  }
  
  console.log('✅ Dev server detected on localhost:3000');
  await testParagonFlow();
}

main().catch(console.error);

