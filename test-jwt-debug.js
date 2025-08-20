#!/usr/bin/env node

/**
 * Debug JWT Token Generation
 * Test JWT token generation to see what's being produced
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables from Paragon MCP
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔑 JWT TOKEN DEBUG');
console.log('==================\n');

console.log('📋 Environment Variables:');
console.log('Project ID:', PROJECT_ID ? `${PROJECT_ID.substring(0, 8)}...` : 'MISSING');
console.log('Signing Key:', SIGNING_KEY ? `Present (${SIGNING_KEY.length} chars)` : 'MISSING');
console.log('');

if (!PROJECT_ID || !SIGNING_KEY) {
    console.log('❌ Missing required environment variables');
    process.exit(1);
}

function generateUserToken(userId) {
    try {
        console.log(`🚀 Generating JWT for user: ${userId}`);
        
        const payload = {
            sub: userId,
            aud: `useparagon.com/${PROJECT_ID}`,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 3600), // 24 hours
        };

        console.log('📦 JWT Payload:');
        console.log(JSON.stringify(payload, null, 2));
        console.log('');

        const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
        console.log('🔐 Private Key Format Check:');
        console.log('Starts with BEGIN:', privateKey.startsWith('-----BEGIN'));
        console.log('Ends with END:', privateKey.endsWith('-----'));
        console.log('Length:', privateKey.length);
        console.log('');

        const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
        
        console.log('✅ JWT Token Generated Successfully');
        console.log('Token length:', token.length);
        console.log('Token preview:', token.substring(0, 100) + '...');
        console.log('');

        // Try to verify the token
        console.log('🔍 Verifying JWT Token...');
        try {
            const publicKey = privateKey; // In testing, we can use same key
            const decoded = jwt.verify(token, publicKey, { algorithm: 'RS256' });
            console.log('✅ JWT Verification Successful');
            console.log('Decoded payload:');
            console.log(JSON.stringify(decoded, null, 2));
        } catch (verifyError) {
            console.log('❌ JWT Verification Failed:', verifyError.message);
        }
        
        return token;
    } catch (error) {
        console.log('❌ JWT Generation Failed:', error.message);
        console.log('Error details:', error);
        throw error;
    }
}

// Test JWT generation
const testUserId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
const token = generateUserToken(testUserId);

console.log('');
console.log('🧪 Testing with Paragon-like validation...');

// Test the specific format Paragon might expect
try {
    const decoded = jwt.decode(token, { complete: true });
    console.log('📋 Decoded Header:');
    console.log(JSON.stringify(decoded.header, null, 2));
    console.log('');
    console.log('📋 Decoded Payload:');
    console.log(JSON.stringify(decoded.payload, null, 2));
    
    // Check if the audience format is correct
    const expectedAud = `useparagon.com/${PROJECT_ID}`;
    if (decoded.payload.aud === expectedAud) {
        console.log('✅ Audience format is correct');
    } else {
        console.log('❌ Audience format mismatch');
        console.log('Expected:', expectedAud);
        console.log('Actual:', decoded.payload.aud);
    }
    
    // Check timing
    const now = Math.floor(Date.now() / 1000);
    console.log('');
    console.log('⏰ Timing Check:');
    console.log('Current time:', now);
    console.log('Issued at (iat):', decoded.payload.iat);
    console.log('Expires at (exp):', decoded.payload.exp);
    console.log('Is token current?', decoded.payload.iat <= now && now < decoded.payload.exp);
    
} catch (decodeError) {
    console.log('❌ Failed to decode JWT:', decodeError.message);
}

console.log('');
console.log('🔚 JWT Debug Complete');