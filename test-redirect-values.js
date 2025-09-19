#!/usr/bin/env node

/**
 * Test different redirect URL VALUES (not just parameter names)
 * The error might be that we're using the wrong redirect URL value!
 */

const https = require('https');
const { URL } = require('url');

const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
const service = 'gmail';
const testToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE3MzIwMDAwMDAsImV4cCI6MTczMjAwMzYwMH0.test';

// Different redirect URL VALUES to try (not parameter names)
const redirectValues = [
    'https://passport.useparagon.com/callback',
    'https://passport.useparagon.com/oauth/callback',
    'https://passport.useparagon.com/oauth',
    'https://passport.useparagon.com/',
    'https://connect.useparagon.com/callback',
    'https://connect.useparagon.com/oauth/callback',
    'https://api.useparagon.com/callback',
    'https://api.useparagon.com/oauth/callback',
    'https://www.leviousa.com/integrations',
    'http://localhost:3000/integrations',
    'leviousa://paragon/callback',
    'https://localhost:54321/callback',
    'http://localhost:54321/callback',
    'http://127.0.0.1:54321/callback'
];

// Different parameter names to try
const paramNames = [
    'redirectUrl',
    'redirect_url',
    'redirectUri', 
    'redirect_uri',
    'callbackUrl',
    'callback_url',
    'returnUrl',
    'return_url'
];

console.log('🔬 Testing Different Redirect URL VALUES with Paragon OAuth');
console.log('=' .repeat(70));
console.log('Theory: Maybe the parameter name is right but the VALUE is wrong!');
console.log('=' .repeat(70));
console.log('');

function testUrl(paramName, redirectValue) {
    return new Promise((resolve) => {
        const urlString = `https://passport.useparagon.com/oauth?` +
            `projectId=${projectId}&` +
            `userToken=${encodeURIComponent(testToken)}&` +
            `integration=${service}&` +
            `${paramName}=${encodeURIComponent(redirectValue)}`;
        
        const url = new URL(urlString);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 5000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const hasRedirectError = data.includes('Redirect url is missing');
                const hasOtherError = data.includes('error') || data.includes('Error');
                
                resolve({
                    paramName,
                    redirectValue,
                    statusCode: res.statusCode,
                    hasRedirectError,
                    hasOtherError,
                    location: res.headers.location,
                    response: data.substring(0, 150)
                });
            });
        });
        
        req.on('error', (err) => {
            resolve({
                paramName,
                redirectValue,
                statusCode: 0,
                error: err.message
            });
        });
        
        req.setTimeout(5000, () => {
            req.abort();
            resolve({
                paramName,
                redirectValue,
                statusCode: 0,
                error: 'Timeout'
            });
        });
        
        req.end();
    });
}

async function runTests() {
    const results = [];
    let workingCombos = [];
    
    console.log('Testing all combinations...\n');
    
    // Test each combination
    for (const paramName of paramNames) {
        for (const redirectValue of redirectValues) {
            process.stdout.write(`Testing ${paramName} = ${redirectValue.substring(8, 40)}... `);
            
            const result = await testUrl(paramName, redirectValue);
            results.push(result);
            
            if (result.hasRedirectError) {
                process.stdout.write('❌ Missing redirect\n');
            } else if (result.statusCode === 302 || result.statusCode === 301) {
                process.stdout.write('✅ REDIRECT SUCCESS!\n');
                workingCombos.push(result);
            } else if (result.statusCode === 200 && !result.hasOtherError) {
                process.stdout.write('✅ PAGE LOADED!\n');
                workingCombos.push(result);
            } else if (result.statusCode === 401) {
                process.stdout.write('🔐 Auth error\n');
            } else if (result.error) {
                process.stdout.write(`⚠️  ${result.error}\n`);
            } else {
                process.stdout.write(`🤷 Status ${result.statusCode}\n`);
            }
            
            // Small delay to be nice to the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('📊 RESULTS SUMMARY');
    console.log('=' .repeat(70));
    
    if (workingCombos.length > 0) {
        console.log('\n✅ WORKING COMBINATIONS:');
        workingCombos.forEach(combo => {
            console.log(`\n   Parameter: ${combo.paramName}`);
            console.log(`   Value: ${combo.redirectValue}`);
            console.log(`   Status: ${combo.statusCode}`);
            if (combo.location) {
                console.log(`   Redirects to: ${combo.location}`);
            }
        });
        
        console.log('\n🎯 RECOMMENDED SOLUTION:');
        const best = workingCombos[0];
        console.log(`Use: ${best.paramName}=${best.redirectValue}`);
        
    } else {
        console.log('\n❌ No working combinations found!');
        
        // Check if all failed with same error
        const allHaveRedirectError = results.every(r => r.hasRedirectError);
        
        if (allHaveRedirectError) {
            console.log('\n🤔 All combinations failed with "Redirect url is missing"');
            console.log('This means either:');
            console.log('1. The parameter name is completely different');
            console.log('2. Multiple parameters are required');
            console.log('3. The request should be POST instead of GET');
            console.log('4. Authentication token is the issue');
        }
    }
    
    // Show unique error messages
    const uniqueErrors = new Set();
    results.forEach(r => {
        if (r.response && !r.hasRedirectError) {
            const errorMsg = r.response.substring(0, 100);
            if (!uniqueErrors.has(errorMsg)) {
                uniqueErrors.add(errorMsg);
            }
        }
    });
    
    if (uniqueErrors.size > 0) {
        console.log('\n📝 Other responses seen:');
        uniqueErrors.forEach(err => {
            console.log(`   ${err}...`);
        });
    }
}

console.log('🚀 Starting comprehensive redirect URL value tests...\n');
runTests().then(() => {
    console.log('\n✅ All tests complete!');
    
    // Now test without any redirect parameter at all
    console.log('\n🧪 BONUS TEST: Trying with NO redirect parameter...');
    
    const noRedirectUrl = `https://passport.useparagon.com/oauth?` +
        `projectId=${projectId}&` +
        `userToken=${encodeURIComponent(testToken)}&` +
        `integration=${service}`;
    
    console.log(`URL: ${noRedirectUrl}`);
    
    testUrl('NONE', 'NONE').then(result => {
        if (result.hasRedirectError) {
            console.log('❌ Still says "Redirect url is missing"');
        } else {
            console.log(`Result: Status ${result.statusCode}`);
            if (result.response) {
                console.log(`Response: ${result.response}`);
            }
        }
    });
    
}).catch(err => {
    console.error('\n❌ Test runner failed:', err);
});
