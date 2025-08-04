#!/usr/bin/env node

/**
 * Test and fix JWT generation for Paragon
 */

require('dotenv').config({ path: './services/paragon-mcp/.env' });
const jwt = require('jsonwebtoken');

console.log('🔑 Testing Paragon JWT Generation\n');

const projectId = process.env.PARAGON_PROJECT_ID;
const jwtSecret = process.env.PARAGON_JWT_SECRET;

console.log(`📋 Configuration:
   Project ID: ${projectId}
   JWT Secret Length: ${jwtSecret ? jwtSecret.length : 'NOT LOADED'}
   Has BEGIN marker: ${jwtSecret ? jwtSecret.includes('-----BEGIN PRIVATE KEY-----') : false}
   Has END marker: ${jwtSecret ? jwtSecret.includes('-----END PRIVATE KEY-----') : false}
`);

if (!projectId || !jwtSecret) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

// Test JWT generation with different key formatting approaches
async function testJWTGenerations() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const payload = {
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
    };

    console.log(`🧪 Testing JWT generation for user: ${userId}\n`);

    // Test 1: Raw key as loaded
    try {
        console.log('🔧 Test 1: Raw key as loaded from environment');
        const token1 = jwt.sign(payload, jwtSecret, { algorithm: 'RS256' });
        console.log('✅ Token generated successfully (raw key)');
        await testAPICall(token1, 'Raw Key');
    } catch (error) {
        console.log('❌ Failed with raw key:', error.message);
    }

    // Test 2: Replace \n with actual newlines
    try {
        console.log('\n🔧 Test 2: Convert \\n to newlines');
        const fixedKey1 = jwtSecret.replace(/\\n/g, '\n');
        const token2 = jwt.sign(payload, fixedKey1, { algorithm: 'RS256' });
        console.log('✅ Token generated successfully (\\n converted)');
        await testAPICall(token2, 'Converted \\n');
    } catch (error) {
        console.log('❌ Failed with \\n conversion:', error.message);
    }

    // Test 3: Ensure trailing newline
    try {
        console.log('\n🔧 Test 3: Ensure trailing newline');
        let fixedKey2 = jwtSecret.replace(/\\n/g, '\n');
        if (!fixedKey2.endsWith('\n')) {
            fixedKey2 += '\n';
        }
        const token3 = jwt.sign(payload, fixedKey2, { algorithm: 'RS256' });
        console.log('✅ Token generated successfully (with trailing newline)');
        await testAPICall(token3, 'With Trailing Newline');
    } catch (error) {
        console.log('❌ Failed with trailing newline:', error.message);
    }

    // Test 4: Clean whitespace and format properly
    try {
        console.log('\n🔧 Test 4: Clean formatting');
        let cleanKey = jwtSecret
            .replace(/\\n/g, '\n')  // Convert escaped newlines
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\r/g, '\n')   // Handle old Mac line endings
            .trim();                // Remove leading/trailing whitespace
        
        if (!cleanKey.endsWith('\n')) {
            cleanKey += '\n';
        }
        
        const token4 = jwt.sign(payload, cleanKey, { algorithm: 'RS256' });
        console.log('✅ Token generated successfully (clean formatting)');
        await testAPICall(token4, 'Clean Formatting');
    } catch (error) {
        console.log('❌ Failed with clean formatting:', error.message);
    }
}

async function testAPICall(token, testName) {
    try {
        console.log(`📡 Testing API call for: ${testName}`);
        const response = await fetch(`https://api.useparagon.com/projects/${projectId}/sdk/integrations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   📈 Response Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ SUCCESS! API call worked`);
            console.log(`   📊 Response:`, data);
            return true;
        } else {
            const errorText = await response.text();
            console.log(`   ❌ API Error: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log(`   💥 Request failed: ${error.message}`);
        return false;
    }
}

// Run the tests
testJWTGenerations().then(() => {
    console.log('\n✅ JWT testing completed!');
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});