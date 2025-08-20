#!/usr/bin/env node

/**
 * Test Correct Paragon API Endpoints
 * Using the proper documented Paragon API endpoints
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔍 CORRECT PARAGON API TEST');
console.log('============================\n');

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

async function testCorrectParagonAPI() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('🔑 Generated JWT token length:', userToken.length);
    console.log('👤 User ID:', userId);
    console.log('');

    // Test the correct Paragon API endpoints
    const tests = [
        {
            name: 'Test 1: Get User Info (SDK/me endpoint)',
            url: `https://api.useparagon.com/projects/${PROJECT_ID}/sdk/me`,
            method: 'GET'
        },
        {
            name: 'Test 2: Get User Credentials (SDK credentials)',
            url: `https://api.useparagon.com/projects/${PROJECT_ID}/sdk/credentials`,
            method: 'GET'
        },
        {
            name: 'Test 3: Get Available Integrations',
            url: `https://api.useparagon.com/projects/${PROJECT_ID}/sdk/integrations`,
            method: 'GET'
        },
        {
            name: 'Test 4: Gmail API - List Messages (correct proxy format)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/gmail/users/me/messages`,
            method: 'GET',
            params: '?maxResults=5'
        },
        {
            name: 'Test 5: LinkedIn API - Get Profile (correct proxy format)',
            url: `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/linkedin/v2/people/~`,
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

            const fullUrl = test.url + (test.params || '');
            const response = await fetch(fullUrl, requestOptions);
            
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            const responseText = await response.text();
            console.log(`📄 Response length: ${responseText.length} characters`);
            
            if (response.status < 300) {
                console.log('✅ SUCCESS');
                try {
                    const jsonResponse = JSON.parse(responseText);
                    if (test.name.includes('Credentials')) {
                        console.log('📋 Connected Integrations:', jsonResponse.length);
                        jsonResponse.forEach((cred, index) => {
                            console.log(`   ${index + 1}. Integration ID: ${cred.integrationId}`);
                            console.log(`      Provider ID: ${cred.providerId}`);
                            console.log(`      Config: ${JSON.stringify(cred.config.configuredWorkflows || {})}`);
                        });
                    } else if (test.name.includes('User Info')) {
                        console.log('📋 User Info:', {
                            authenticated: jsonResponse.authenticated,
                            userId: jsonResponse.userId,
                            integrations: Object.keys(jsonResponse.integrations || {}),
                            meta: jsonResponse.meta
                        });
                    } else if (responseText.length < 500) {
                        console.log('📋 Response:', responseText);
                    } else {
                        console.log('📋 Response preview:', responseText.substring(0, 200) + '...');
                    }
                } catch (e) {
                    console.log('📋 Raw response:', responseText.substring(0, 200));
                }
            } else {
                console.log('❌ ERROR');
                if (responseText.includes('<!DOCTYPE html>')) {
                    console.log('📋 Got HTML error page');
                    const match = responseText.match(/<title>(.*?)<\/title>/);
                    if (match) {
                        console.log('📋 Error title:', match[1]);
                    }
                } else {
                    try {
                        const errorJson = JSON.parse(responseText);
                        console.log('📋 Error response:', errorJson);
                    } catch (e) {
                        console.log('📋 Error response:', responseText.substring(0, 300));
                    }
                }
            }
            
        } catch (error) {
            console.log('❌ NETWORK ERROR:', error.message);
        }
        
        console.log('');
    }
}

// Run the test
testCorrectParagonAPI().then(() => {
    console.log('🏁 Correct API test completed');
}).catch(error => {
    console.log('💥 Test failed:', error.message);
});