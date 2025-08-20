#!/usr/bin/env node

/**
 * Test Direct Paragon API Calls
 * Make direct HTTP calls to Paragon to debug the 404 issue
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables from Paragon MCP
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🌐 DIRECT PARAGON API TEST');
console.log('===========================\n');

function generateUserToken(userId) {
    const payload = {
        sub: userId,
        aud: `useparagon.com/${PROJECT_ID}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 3600),
    };

    const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function testParagonAPI() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('🔑 Generated JWT token length:', userToken.length);
    console.log('');

    // Test different endpoints to see which ones work
    const tests = [
        {
            name: 'Test 1: Get authenticated services',
            url: `https://api.useparagon.com/projects/${PROJECT_ID}/integrations`,
            method: 'GET'
        },
        {
            name: 'Test 2: Gmail proxy - list messages (old format)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/messages`,
            method: 'GET',
            params: '?maxResults=5&labelIds=INBOX'
        },
        {
            name: 'Test 3: Gmail proxy - list messages (with users/me)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/users/me/messages`,
            method: 'GET',
            params: '?maxResults=5&labelIds=INBOX'
        },
        {
            name: 'Test 4: Gmail proxy - send message',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/users/me/messages/send`,
            method: 'POST',
            body: {
                raw: Buffer.from('To: test@example.com\r\nSubject: Test\r\n\r\nTest body').toString('base64')
            }
        },
        {
            name: 'Test 5: Base proxy URL check',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail`,
            method: 'GET'
        }
    ];

    for (const test of tests) {
        console.log(`🧪 ${test.name}`);
        console.log(`📍 URL: ${test.url}${test.params || ''}`);
        
        try {
            const requestOptions = {
                method: test.method,
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json',
                }
            };

            if (test.body) {
                requestOptions.body = JSON.stringify(test.body);
            }

            const fullUrl = test.url + (test.params || '');
            const response = await fetch(fullUrl, requestOptions);
            
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            const responseText = await response.text();
            console.log(`📄 Response length: ${responseText.length} characters`);
            
            if (response.status < 300) {
                console.log('✅ SUCCESS');
                if (responseText.length < 1000) {
                    console.log('📋 Response:', responseText);
                } else {
                    console.log('📋 Response preview:', responseText.substring(0, 200) + '...');
                }
            } else {
                console.log('❌ ERROR');
                if (responseText.includes('<!DOCTYPE html>')) {
                    console.log('📋 Got HTML error page (404/403)');
                    // Extract meaningful error from HTML
                    const match = responseText.match(/<title>(.*?)<\/title>/);
                    if (match) {
                        console.log('📋 Error title:', match[1]);
                    }
                } else {
                    console.log('📋 Error response:', responseText.substring(0, 300));
                }
            }
            
        } catch (error) {
            console.log('❌ NETWORK ERROR:', error.message);
        }
        
        console.log('');
    }
}

// Run the test
testParagonAPI().then(() => {
    console.log('🏁 Direct API test completed');
}).catch(error => {
    console.log('💥 Test failed:', error.message);
});