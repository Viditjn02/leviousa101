let puppeteer = null;
try {
    puppeteer = require('puppeteer');
} catch (e) {
    // Puppeteer not available
}
const fs = require('fs');

/**
 * Autonomous Paragon Connect Test
 * Uses Puppeteer to test the actual functionality
 */

const CONFIG = {
    PROJECT_ID: 'ed25f59d-f4d2-40da-995f-87e875e40865',
    BASE_URL: 'https://www.leviousa.com',
    TEST_TIMEOUT: 30000
};

console.log('🤖 Starting Autonomous Paragon Test...\n');

async function runAutonomousTest() {
    let browser = null;
    
    try {
        // Launch browser
        console.log('🌐 Launching browser...');
        browser = await puppeteer.launch({
            headless: false,  // Show browser for debugging
            devtools: true,   // Open DevTools
            args: [
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--no-sandbox'
            ]
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.log(`❌ Browser Error: ${text}`);
            } else if (text.includes('Paragon') || text.includes('✅') || text.includes('❌')) {
                console.log(`📋 Browser: ${text}`);
            }
        });
        
        // Go to simple test page
        console.log('📄 Loading test page...');
        await page.goto(`${CONFIG.BASE_URL}/test-paragon-simple.html`, {
            waitUntil: 'networkidle0',
            timeout: CONFIG.TEST_TIMEOUT
        });
        
        console.log('✅ Test page loaded');
        
        // Wait for auto-tests to complete
        console.log('⏱️ Waiting for auto-tests to complete...');
        await page.waitForTimeout(15000);
        
        // Check final status
        const sdkStatus = await page.$eval('#sdk-status', el => el.textContent);
        const authStatus = await page.$eval('#auth-status', el => el.textContent);
        const connectStatus = await page.$eval('#connect-status', el => el.textContent);
        
        console.log('\n📊 Test Results:');
        console.log(`   SDK Status: ${sdkStatus}`);
        console.log(`   Auth Status: ${authStatus}`);
        console.log(`   Connect Status: ${connectStatus}`);
        
        // Check for iframes
        const iframes = await page.$$eval('iframe', iframes => 
            iframes.map(iframe => ({
                src: iframe.src,
                width: iframe.width || iframe.style.width,
                height: iframe.height || iframe.style.height,
                display: iframe.style.display,
                visibility: iframe.style.visibility
            }))
        );
        
        console.log(`\n🖼️ Found ${iframes.length} iframes:`);
        iframes.forEach((iframe, i) => {
            console.log(`   Iframe ${i}: ${iframe.src} (${iframe.width}x${iframe.height})`);
        });
        
        // Check for Paragon elements
        const paragonElements = await page.$$eval('[class*="paragon"], [id*="paragon"]', elements =>
            elements.map(el => ({
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                display: el.style.display
            }))
        );
        
        console.log(`\n📦 Found ${paragonElements.length} Paragon elements:`);
        paragonElements.forEach((el, i) => {
            console.log(`   Element ${i}: ${el.tagName}.${el.className}#${el.id}`);
        });
        
        // Get console logs from the page
        const logs = await page.evaluate(() => {
            return window.testLogs || [];
        });
        
        // Analysis
        console.log('\n🔍 Analysis:');
        
        if (sdkStatus.includes('✅')) {
            console.log('   ✅ SDK loading works');
        } else {
            console.log('   ❌ SDK loading failed');
        }
        
        if (authStatus.includes('✅')) {
            console.log('   ✅ Authentication works');
        } else {
            console.log('   ❌ Authentication failed');
        }
        
        if (connectStatus.includes('✅') && (iframes.length > 0 || paragonElements.length > 0)) {
            console.log('   ✅ Connect Portal works - iframe/popup appeared!');
        } else if (connectStatus.includes('No Portal') || connectStatus.includes('⚠️')) {
            console.log('   ❌ MAIN ISSUE: Connect Portal not appearing');
            console.log('   🔍 DIAGNOSIS: paragon.connect() works but no UI shows');
            console.log('   💡 SOLUTION NEEDED: Check Paragon dashboard integration status');
        } else {
            console.log('   ❌ Connect failed completely');
        }
        
        // Take a screenshot
        console.log('\n📸 Taking screenshot...');
        await page.screenshot({ 
            path: 'paragon-test-screenshot.png',
            fullPage: true 
        });
        console.log('   Saved: paragon-test-screenshot.png');
        
        return {
            sdkStatus,
            authStatus,
            connectStatus,
            iframes: iframes.length,
            paragonElements: paragonElements.length,
            success: sdkStatus.includes('✅') && authStatus.includes('✅')
        };
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        return { error: error.message };
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Also test with Node.js direct API calls
async function testDirectAPI() {
    console.log('\n🔧 Testing Direct API Calls...');
    
    try {
        // Test token generation
        console.log('🔑 Testing token generation...');
        
        const fetch = global.fetch || require('https').request;
        const response = await fetch(`${CONFIG.BASE_URL}/api/paragonToken?userId=direct-test`);
        
        if (!response.ok) {
            throw new Error(`Token API failed: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.userToken) {
            throw new Error('No token received');
        }
        
        console.log('✅ Token generated successfully');
        
        // Try to validate token structure
        const tokenParts = data.userToken.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log(`   Token valid until: ${new Date(payload.exp * 1000).toISOString()}`);
            console.log(`   Project ID: ${payload.aud.split('/')[1]}`);
        }
        
        return { tokenValid: true, token: data.userToken };
        
    } catch (error) {
        console.error(`❌ Direct API test failed: ${error.message}`);
        return { tokenValid: false, error: error.message };
    }
}

// Main runner
async function main() {
    console.log('🚀 Starting Comprehensive Autonomous Test...\n');
    
    // Test 1: Direct API
    const apiResult = await testDirectAPI();
    
    // Test 2: Browser automation  
    const browserResult = await runAutonomousTest();
    
    // Generate final report
    console.log('\n📋 FINAL AUTONOMOUS TEST REPORT');
    console.log('==========================================');
    
    console.log('\n🔧 Backend API:');
    console.log(`   Token Generation: ${apiResult.tokenValid ? '✅ Working' : '❌ Failed'}`);
    
    console.log('\n🌐 Frontend Browser:');
    if (browserResult.error) {
        console.log(`   Test Execution: ❌ Failed (${browserResult.error})`);
    } else {
        console.log(`   SDK Loading: ${browserResult.sdkStatus}`);
        console.log(`   Authentication: ${browserResult.authStatus}`);
        console.log(`   Connect Portal: ${browserResult.connectStatus}`);
        console.log(`   Iframes Found: ${browserResult.iframes}`);
        console.log(`   Paragon Elements: ${browserResult.paragonElements}`);
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    if (apiResult.tokenValid && browserResult.success) {
        if (browserResult.iframes === 0 && browserResult.paragonElements === 0) {
            console.log('   ❌ ISSUE: Connect Portal not appearing despite successful SDK calls');
            console.log('   💡 MOST LIKELY CAUSE: Gmail integration not Active in Paragon dashboard');
            console.log('   🔧 SOLUTION: Login to Paragon dashboard and activate the Gmail integration');
        } else {
            console.log('   ✅ Everything working correctly!');
        }
    } else {
        console.log('   ❌ Basic functionality issues - check SDK loading and authentication');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Check Paragon dashboard for integration status');
    console.log('   2. Verify project configuration');
    console.log('   3. Test with different services (googleCalendar, linkedin)');
    console.log('   4. Check browser console for additional errors');
    
    console.log('\n✅ Autonomous test complete!');
}

// Check if puppeteer is available, otherwise run simpler version
async function checkAndRun() {
    if (puppeteer) {
        await main();
    } else {
        console.log('⚠️ Puppeteer not available, running API-only test...');
        const apiResult = await testDirectAPI();
        
        console.log('\n📋 SIMPLIFIED TEST REPORT');
        console.log('============================');
        console.log(`Token Generation: ${apiResult.tokenValid ? '✅ Working' : '❌ Failed'}`);
        
        if (apiResult.tokenValid) {
            console.log('\n✅ Backend API working - issue likely in frontend Connect Portal');
            console.log('💡 Run browser test manually at: https://www.leviousa.com/test-paragon-simple.html');
            console.log('💡 Or install puppeteer: npm install puppeteer');
        }
    }
}

if (require.main === module) {
    checkAndRun().catch(console.error);
}

module.exports = { runAutonomousTest, testDirectAPI };