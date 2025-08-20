#!/usr/bin/env node

/**
 * Test Different JWT Formats
 * Try different audience formats to see which one works
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables from Paragon MCP
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🧪 JWT FORMAT TESTING');
console.log('=====================\n');

function generateUserToken(userId, audFormat) {
    const payload = {
        sub: userId,
        aud: audFormat,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 3600),
    };

    const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function testJWTFormat(formatName, audFormat) {
    console.log(`🔍 Testing ${formatName}`);
    console.log(`📋 Audience: "${audFormat}"`);
    
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId, audFormat);
    
    // Test with management API (simplest test)
    const url = `https://api.useparagon.com/projects/${PROJECT_ID}/integrations`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json',
            }
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        const responseText = await response.text();
        
        if (response.status === 200) {
            console.log('✅ SUCCESS! This format works!');
            console.log('📋 Response preview:', responseText.substring(0, 200));
        } else if (response.status === 401) {
            console.log('❌ 401 Unauthorized - JWT rejected');
        } else if (response.status === 403) {
            console.log('⚠️  403 Forbidden - JWT accepted but access denied');
        } else {
            console.log(`❓ Unexpected status: ${response.status}`);
        }
        
    } catch (error) {
        console.log('💥 Network error:', error.message);
    }
    
    console.log('');
}

async function runTests() {
    const formats = [
        {
            name: 'Format 1: useparagon.com/{project-id}',
            aud: `useparagon.com/${PROJECT_ID}`
        },
        {
            name: 'Format 2: https://useparagon.com/{project-id}',
            aud: `https://useparagon.com/${PROJECT_ID}`
        },
        {
            name: 'Format 3: api.useparagon.com/{project-id}',
            aud: `api.useparagon.com/${PROJECT_ID}`
        },
        {
            name: 'Format 4: https://api.useparagon.com/{project-id}',
            aud: `https://api.useparagon.com/${PROJECT_ID}`
        },
        {
            name: 'Format 5: proxy.useparagon.com/{project-id}',
            aud: `proxy.useparagon.com/${PROJECT_ID}`
        },
        {
            name: 'Format 6: Just project ID',
            aud: PROJECT_ID
        },
        {
            name: 'Format 7: useparagon.com (no project)',
            aud: 'useparagon.com'
        },
        {
            name: 'Format 8: https://useparagon.com (no project)',
            aud: 'https://useparagon.com'
        }
    ];
    
    for (const format of formats) {
        await testJWTFormat(format.name, format.aud);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('🏁 JWT format testing completed');
}

runTests().catch(error => {
    console.log('💥 Test failed:', error.message);
});