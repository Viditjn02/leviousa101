#!/usr/bin/env node

/**
 * Test all possible redirect parameter variations for Paragon OAuth
 * This will help us find the exact parameter name Paragon expects
 */

const https = require('https');
const { URL } = require('url');

// Test configuration
const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
const service = 'gmail';
const redirectValue = 'https://passport.useparagon.com/oauth';

// Generate a test token (this would normally be from your auth system)
const testToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE3MzIwMDAwMDAsImV4cCI6MTczMjAwMzYwMH0.test';

// All possible parameter name variations to test
const parameterVariations = [
    // No redirect parameter at all
    { name: 'NO_REDIRECT', param: null },
    
    // Standard OAuth2 variations
    { name: 'redirect_uri', param: 'redirect_uri' },
    { name: 'redirect_url', param: 'redirect_url' },
    { name: 'callback_uri', param: 'callback_uri' },
    { name: 'callback_url', param: 'callback_url' },
    { name: 'return_url', param: 'return_url' },
    { name: 'return_uri', param: 'return_uri' },
    
    // CamelCase variations
    { name: 'redirectUri', param: 'redirectUri' },
    { name: 'redirectUrl', param: 'redirectUrl' },
    { name: 'redirectURL', param: 'redirectURL' },
    { name: 'redirectURI', param: 'redirectURI' },
    { name: 'callbackUrl', param: 'callbackUrl' },
    { name: 'callbackUri', param: 'callbackUri' },
    { name: 'returnUrl', param: 'returnUrl' },
    { name: 'returnUri', param: 'returnUri' },
    
    // PascalCase variations
    { name: 'RedirectUrl', param: 'RedirectUrl' },
    { name: 'RedirectUri', param: 'RedirectUri' },
    { name: 'RedirectURL', param: 'RedirectURL' },
    { name: 'RedirectURI', param: 'RedirectURI' },
    
    // Lowercase variations
    { name: 'redirecturl', param: 'redirecturl' },
    { name: 'redirecturi', param: 'redirecturi' },
    
    // Other possible variations
    { name: 'redirect', param: 'redirect' },
    { name: 'callback', param: 'callback' },
    { name: 'return', param: 'return' },
    { name: 'continue', param: 'continue' },
    { name: 'next', param: 'next' },
    { name: 'success_url', param: 'success_url' },
    { name: 'successUrl', param: 'successUrl' },
    { name: 'oauth_callback', param: 'oauth_callback' },
    { name: 'oauthCallback', param: 'oauthCallback' },
    
    // Paragon-specific possibilities
    { name: 'paragon_redirect', param: 'paragon_redirect' },
    { name: 'paragonRedirect', param: 'paragonRedirect' },
    { name: 'override_redirect_url', param: 'override_redirect_url' },
    { name: 'overrideRedirectUrl', param: 'overrideRedirectUrl' },
    { name: 'customRedirectUrl', param: 'customRedirectUrl' },
    { name: 'custom_redirect_url', param: 'custom_redirect_url' }
];

console.log('🔬 Testing Paragon OAuth Redirect Parameter Variations');
console.log('=' .repeat(60));
console.log(`Project ID: ${projectId}`);
console.log(`Service: ${service}`);
console.log(`Redirect Value: ${redirectValue}`);
console.log('=' .repeat(60));
console.log('');

function testUrl(variation) {
    return new Promise((resolve) => {
        let urlString = `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(testToken)}&integration=${service}`;
        
        if (variation.param) {
            urlString += `&${variation.param}=${encodeURIComponent(redirectValue)}`;
        }
        
        const url = new URL(urlString);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const result = {
                    variation: variation.name,
                    statusCode: res.statusCode,
                    url: urlString,
                    response: data.substring(0, 200) // First 200 chars of response
                };
                
                // Check if we got the redirect error
                if (data.includes('Redirect url is missing')) {
                    result.hasError = true;
                    result.errorType = 'MISSING_REDIRECT';
                } else if (res.statusCode === 302 || res.statusCode === 301) {
                    result.hasError = false;
                    result.errorType = 'REDIRECT_SUCCESS';
                    result.location = res.headers.location;
                } else if (res.statusCode === 200) {
                    result.hasError = false;
                    result.errorType = 'PAGE_LOADED';
                } else {
                    result.hasError = true;
                    result.errorType = 'OTHER_ERROR';
                }
                
                resolve(result);
            });
        });
        
        req.on('error', (err) => {
            resolve({
                variation: variation.name,
                statusCode: 0,
                hasError: true,
                errorType: 'REQUEST_FAILED',
                error: err.message
            });
        });
        
        req.end();
    });
}

async function runTests() {
    const results = [];
    
    for (const variation of parameterVariations) {
        process.stdout.write(`Testing ${variation.name.padEnd(25, '.')} `);
        
        const result = await testUrl(variation);
        results.push(result);
        
        if (result.hasError && result.errorType === 'MISSING_REDIRECT') {
            process.stdout.write('❌ Missing redirect error\n');
        } else if (!result.hasError && result.errorType === 'REDIRECT_SUCCESS') {
            process.stdout.write('✅ SUCCESS - Redirect worked!\n');
        } else if (!result.hasError && result.errorType === 'PAGE_LOADED') {
            process.stdout.write('✅ SUCCESS - Page loaded!\n');
        } else if (result.statusCode === 401) {
            process.stdout.write('🔐 Auth error (token invalid)\n');
        } else if (result.statusCode === 400 && !result.response.includes('Redirect url')) {
            process.stdout.write('⚠️  Different 400 error\n');
        } else {
            process.stdout.write(`🤷 Status: ${result.statusCode}\n`);
        }
        
        // Small delay between requests to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    const successful = results.filter(r => !r.hasError || r.errorType !== 'MISSING_REDIRECT');
    const failed = results.filter(r => r.hasError && r.errorType === 'MISSING_REDIRECT');
    
    if (successful.length > 0) {
        console.log('\n✅ WORKING PARAMETER NAMES:');
        successful.forEach(r => {
            console.log(`   - ${r.variation}: Status ${r.statusCode}`);
            if (r.url) {
                console.log(`     URL: ${r.url}`);
            }
        });
    } else {
        console.log('\n❌ No working parameter names found!');
        console.log('   This might mean:');
        console.log('   1. The redirect parameter has a different name entirely');
        console.log('   2. The token is invalid (check for 401 errors)');
        console.log('   3. The endpoint expects POST instead of GET');
        console.log('   4. Additional required parameters are missing');
    }
    
    if (failed.length > 0) {
        console.log(`\n❌ Failed with "Redirect url missing": ${failed.length} variations`);
    }
    
    // Show any unique error messages
    const uniqueErrors = {};
    results.forEach(r => {
        if (r.response && !uniqueErrors[r.response.substring(0, 100)]) {
            uniqueErrors[r.response.substring(0, 100)] = r.variation;
        }
    });
    
    if (Object.keys(uniqueErrors).length > 0) {
        console.log('\n📝 Unique responses:');
        Object.entries(uniqueErrors).forEach(([response, variation]) => {
            console.log(`   ${variation}: ${response}...`);
        });
    }
}

// Run the tests
console.log('🚀 Starting tests...\n');
runTests().then(() => {
    console.log('\n✅ All tests complete!');
}).catch(err => {
    console.error('\n❌ Test runner failed:', err);
});
