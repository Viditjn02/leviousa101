#!/usr/bin/env node

/**
 * Test Paragon OAuth with a properly generated token
 */

const https = require('https');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load the signing key
const envPath = path.join(__dirname, 'leviousa_web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Extract signing key
const signingKeyMatch = envContent.match(/PARAGON_SIGNING_KEY="([^"]+)"/s);
if (!signingKeyMatch) {
    console.error('❌ Could not find PARAGON_SIGNING_KEY');
    process.exit(1);
}

const signingKey = signingKeyMatch[1].replace(/\\n/g, '\n');
const projectId = 'ed25f59d-f4d2-40da-995f-87e875e40865';
const userId = '7J1iNQy1GSTH0iyJWXHOIfI2D6G2';

// Generate token with correct format
function generateToken() {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenData = {
        sub: userId,
        aud: `useparagon.com/${projectId}`, // CRITICAL: Correct audience format
        iat: now,
        exp: now + 3600 // 1 hour
    };
    
    console.log('📝 Token payload:', tokenData);
    
    const token = jwt.sign(tokenData, signingKey, { algorithm: 'RS256' });
    return token;
}

const token = generateToken();
console.log('🔐 Generated token (first 100 chars):', token.substring(0, 100) + '...\n');

// Test URLs with the /callback path since that fixed the redirect error
const testUrls = [
    {
        name: 'With redirectUrl=/callback',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(token)}&integration=gmail&redirectUrl=${encodeURIComponent('https://passport.useparagon.com/callback')}`
    },
    {
        name: 'With redirect_url=/callback',  
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(token)}&integration=gmail&redirect_url=${encodeURIComponent('https://passport.useparagon.com/callback')}`
    },
    {
        name: 'With redirectUri=/callback',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(token)}&integration=gmail&redirectUri=${encodeURIComponent('https://passport.useparagon.com/callback')}`
    },
    {
        name: 'With redirect_uri=/callback',
        url: `https://passport.useparagon.com/oauth?projectId=${projectId}&userToken=${encodeURIComponent(token)}&integration=gmail&redirect_uri=${encodeURIComponent('https://passport.useparagon.com/callback')}`
    }
];

function testUrl(name, urlString) {
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
                
                if (res.statusCode === 403) {
                    console.log(`   ❌ 403 Forbidden - Token authentication failed`);
                    console.log(`   Response: ${data.substring(0, 200)}`);
                } else if (res.statusCode === 400 && data.includes('Redirect url is missing')) {
                    console.log(`   ❌ Redirect url is missing error`);
                } else if (res.statusCode === 302 || res.statusCode === 301) {
                    console.log(`   ✅ SUCCESS: Redirects to ${res.headers.location}`);
                } else if (res.statusCode === 200) {
                    const title = data.match(/<title>([^<]+)<\/title>/);
                    console.log(`   ✅ SUCCESS: Page loaded - ${title ? title[1] : 'OAuth page'}`);
                    
                    // Check if it's the Google OAuth consent screen
                    if (data.includes('accounts.google.com') || data.includes('Sign in with Google')) {
                        console.log(`   🎯 PERFECT! Google OAuth consent screen reached!`);
                    }
                } else {
                    console.log(`   🤷 Unexpected status: ${res.statusCode}`);
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

async function runTests() {
    console.log('🚀 Testing with properly formatted token...\n');
    console.log('=' .repeat(60));
    
    for (const test of testUrls) {
        await testUrl(test.name, test.url);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n💡 DIAGNOSIS:');
    console.log('If you get 403 Forbidden, the token format is wrong.');
    console.log('If you get 200/302, the authentication worked!');
    console.log('\nToken should have:');
    console.log('  - sub: userId');
    console.log('  - aud: "useparagon.com/{projectId}"');
    console.log('  - Valid RS256 signature with your signing key');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
});
