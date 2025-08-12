#!/usr/bin/env node

/**
 * Quick CSP header test - checks if our CSP patches are working
 */

const https = require('https');
const http = require('http');

console.log('🔍 Testing CSP headers and blob support...\n');

async function testURL(url, description) {
  return new Promise((resolve) => {
    console.log(`📡 Testing ${description}: ${url}`);
    
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, (res) => {
      const headers = res.headers;
      const csp = headers['content-security-policy'];
      
      console.log(`📋 Status: ${res.statusCode}`);
      if (csp) {
        console.log(`🔒 CSP Header: ${csp}`);
        const allowsBlob = csp.includes('blob:');
        const allowsUnsafeInline = csp.includes("'unsafe-inline'");
        const allowsUnsafeEval = csp.includes("'unsafe-eval'");
        
        console.log(`   • Allows blob: URLs: ${allowsBlob ? '✅' : '❌'}`);
        console.log(`   • Allows unsafe-inline: ${allowsUnsafeInline ? '✅' : '❌'}`);
        console.log(`   • Allows unsafe-eval: ${allowsUnsafeEval ? '✅' : '❌'}`);
        
        resolve({
          url,
          status: res.statusCode,
          csp,
          allowsBlob,
          allowsUnsafeInline,
          allowsUnsafeEval
        });
      } else {
        console.log('🔒 CSP Header: None found');
        resolve({
          url,
          status: res.statusCode,
          csp: null,
          allowsBlob: false,
          allowsUnsafeInline: false,
          allowsUnsafeEval: false
        });
      }
      console.log('');
    });
    
    req.on('error', (err) => {
      console.log(`❌ Error: ${err.message}\n`);
      resolve({
        url,
        error: err.message,
        status: 0,
        csp: null,
        allowsBlob: false,
        allowsUnsafeInline: false,
        allowsUnsafeEval: false
      });
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ Timeout for ${url}\n`);
      req.destroy();
      resolve({
        url,
        error: 'timeout',
        status: 0,
        csp: null,
        allowsBlob: false,
        allowsUnsafeInline: false,
        allowsUnsafeEval: false
      });
    });
  });
}

async function runTests() {
  const tests = [
    { 
      url: 'http://localhost:3000/integrations', 
      description: 'Localhost integrations page' 
    },
    { 
      url: 'https://connect.useparagon.com/ui', 
      description: 'Paragon Connect UI' 
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testURL(test.url, test.description);
    results.push(result);
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log('=====================================');
  
  let allGood = true;
  results.forEach((result, index) => {
    const status = result.error ? '❌ ERROR' : 
                   result.status === 200 ? '✅ OK' : 
                   `⚠️  ${result.status}`;
    
    console.log(`${index + 1}. ${result.url}`);
    console.log(`   Status: ${status}`);
    
    if (result.csp) {
      const requirements = result.allowsBlob && result.allowsUnsafeInline && result.allowsUnsafeEval;
      console.log(`   CSP Requirements Met: ${requirements ? '✅' : '❌'}`);
      if (!requirements) allGood = false;
    } else {
      console.log(`   CSP Requirements Met: ❌ (No CSP header)`);
      allGood = false;
    }
    console.log('');
  });
  
  console.log(`🎯 Overall Status: ${allGood ? '✅ All CSP requirements met' : '❌ CSP issues detected'}`);
  console.log('=====================================');
  
  if (!allGood) {
    console.log('\n🔧 Recommended fixes:');
    console.log('1. Ensure Electron app is running with CSP interception');
    console.log('2. Check that our CSP header modifications are being applied');
    console.log('3. Verify blob: URLs are allowed in script-src directive');
    console.log('4. Confirm unsafe-inline and unsafe-eval are permitted');
  }
}

runTests().catch(console.error);