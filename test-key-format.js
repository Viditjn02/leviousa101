#!/usr/bin/env node

/**
 * Test Private Key Format
 * Check if the private key is valid and can generate valid JWTs
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables from Paragon MCP
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔐 PRIVATE KEY FORMAT TEST');
console.log('==========================\n');

console.log('📋 Environment Check:');
console.log('Project ID:', PROJECT_ID ? 'Present' : 'MISSING');
console.log('Signing Key:', SIGNING_KEY ? `Present (${SIGNING_KEY.length} chars)` : 'MISSING');
console.log('');

if (!SIGNING_KEY) {
    console.log('❌ No signing key found');
    process.exit(1);
}

// Test the private key format
const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');

console.log('🔍 Private Key Analysis:');
console.log('Length after newline replacement:', privateKey.length);
console.log('Starts with BEGIN PRIVATE KEY:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
console.log('Ends with END PRIVATE KEY:', privateKey.endsWith('-----END PRIVATE KEY-----'));
console.log('Contains RSA markers:', privateKey.includes('RSA'));
console.log('');

// Try to load the key using Node.js crypto
try {
    console.log('🧪 Testing key with Node.js crypto...');
    const keyObject = crypto.createPrivateKey(privateKey);
    console.log('✅ Private key is valid');
    console.log('Key type:', keyObject.asymmetricKeyType);
    console.log('Key size:', keyObject.asymmetricKeySize);
    console.log('');
} catch (error) {
    console.log('❌ Private key is invalid:', error.message);
    console.log('');
}

// Test JWT generation with minimal payload
try {
    console.log('🧪 Testing JWT generation...');
    
    const minimalPayload = {
        sub: 'test-user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const token = jwt.sign(minimalPayload, privateKey, { algorithm: 'RS256' });
    console.log('✅ JWT generation successful');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 100) + '...');
    console.log('');
    
    // Try to verify the token
    try {
        const decoded = jwt.verify(token, privateKey, { algorithm: 'RS256' });
        console.log('✅ JWT verification successful');
        console.log('Decoded payload:', decoded);
    } catch (verifyError) {
        console.log('❌ JWT verification failed:', verifyError.message);
    }
    
} catch (signError) {
    console.log('❌ JWT generation failed:', signError.message);
}

console.log('');

// Test with different algorithm
try {
    console.log('🧪 Testing with different algorithms...');
    
    const testPayload = {
        sub: 'test-user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const algorithms = ['RS256', 'RS384', 'RS512'];
    
    for (const alg of algorithms) {
        try {
            const token = jwt.sign(testPayload, privateKey, { algorithm: alg });
            console.log(`✅ ${alg}: Token generated (${token.length} chars)`);
        } catch (error) {
            console.log(`❌ ${alg}: Failed - ${error.message}`);
        }
    }
    
} catch (error) {
    console.log('❌ Algorithm test failed:', error.message);
}

console.log('');

// Check if the key has the right format for RS256
console.log('🔍 Key Content Analysis:');
const lines = privateKey.split('\n');
console.log('Number of lines:', lines.length);
console.log('First line:', lines[0]);
console.log('Last line:', lines[lines.length - 1] || lines[lines.length - 2]);

// Check for common key issues
if (privateKey.includes('\\n')) {
    console.log('⚠️  Warning: Key still contains literal \\n sequences');
}

if (privateKey.includes(' ')) {
    console.log('⚠️  Warning: Key contains spaces (might be formatting issue)');
}

console.log('');
console.log('🔚 Key format test completed');