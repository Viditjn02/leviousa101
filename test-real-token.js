#!/usr/bin/env node

/**
 * Test Paragon OAuth with a REAL token generated from the system
 */

const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load the actual signing key from .env.local
const envPath = path.join(__dirname, 'leviousa_web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const signingKeyMatch = envContent.match(/PARAGON_SIGNING_KEY="([^"]+)"/s);

if (!signingKeyMatch) {
    console.error('❌ Could not find PARAGON_SIGNING_KEY in .env.local');
    process.exit(1);
}

const signingKey = signingKeyMatch[1].replace(/\\n/g, '\n');

// Generate a real Paragon token
function generateRealToken(userId = 'test-user-123') {
    const token = jwt.sign(
        {
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
        },
        signingKey,
        { algorithm: 'RS256' }
    );
    return token;
}

const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
const service = 'gmail';
const redirectValue = 'https://passport.useparagon.com/oauth';
const realToken = generateRealToken('7J1iNQy1GSTH0iyJWXHOIfI2D6G2');

console.log('🔐 Generated REAL Paragon token');
console.log('Token (first 50 chars):', realToken.substring(0, 50) + '...');
console.log('');

// Test specific variations with the real token
const criticalTests = [
    { name: 'NO_PARAM', url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(realToken)}&integration=${service}` },
    { name: 'redirectUrl', url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(realToken)}&integration=${service}&redirectUrl=${encodeURIComponent(redirectValue)}` },
    { name: 'redirect_url', url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(realToken)}&integration=${service}&redirect_url=${encodeURIComponent(redirectValue)}` },
    { name: 'redirectUri', url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(realToken)}&integration=${service}&redirectUri=${encodeURIComponent(redirectValue)}` },
    { name: 'redirect_uri', url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(realToken)}&integration=${service}&redirect_uri=${encodeURIComponent(redirectValue)}` }
];

function testRealUrl(name, urlString) {
    return new Promise((resolve) => {
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
                console.log(`\n📍 Test: ${name}`);
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   URL: ${urlString.substring(0, 100)}...`);
                
                if (data.includes('Redirect url is missing')) {
                    console.log(`   ❌ ERROR: Redirect url is missing`);
                } else if (res.statusCode === 302 || res.statusCode === 301) {
                    console.log(`   ✅ SUCCESS: Redirect to ${res.headers.location}`);
                } else if (res.statusCode === 200) {
                    const title = data.match(/<title>([^<]+)<\/title>/);
                    console.log(`   ✅ SUCCESS: Page loaded - ${title ? title[1] : 'No title'}`);
                } else {
                    console.log(`   Response: ${data.substring(0, 200)}`);
                }
                
                resolve({ name, statusCode: res.statusCode, data });
            });
        });
        
        req.on('error', (err) => {
            console.log(`\n📍 Test: ${name}`);
            console.log(`   ❌ Request failed: ${err.message}`);
            resolve({ name, error: err.message });
        });
        
        req.end();
    });
}

async function runRealTests() {
    console.log('🚀 Testing with REAL token...\n');
    console.log('=' .repeat(60));
    
    for (const test of criticalTests) {
        await testRealUrl(test.name, test.url);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('💡 RECOMMENDATIONS:');
    console.log('1. If all tests fail with "Redirect url missing", the parameter name is different');
    console.log('2. If you get 401/403, the token might be invalid');
    console.log('3. If you get 200 with HTML, check what the page says');
    console.log('4. If you get 302 redirect, that parameter works!');
}

runRealTests().catch(err => {
    console.error('❌ Test failed:', err);
});
