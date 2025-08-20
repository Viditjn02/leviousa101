#!/usr/bin/env node

/**
 * Debug Calendly Integration - Test /users/me endpoint directly
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

// Load environment variables
dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔍 CALENDLY DEBUG TEST');
console.log('======================\n');

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

async function testCalendlyEndpoints() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('👤 User ID:', userId);
    console.log('🔑 Token Generated: Yes');
    console.log('');

    // Test 1: Direct /users/me endpoint
    console.log('📅 Test 1: Calendly /users/me endpoint');
    console.log('=======================================');
    try {
        const meUrl = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/users/me`;
        console.log(`📍 URL: ${meUrl}`);
        
        const response = await fetch(meUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        const responseText = await response.text();
        if (response.ok) {
            console.log('✅ SUCCESS!');
            const data = JSON.parse(responseText);
            console.log('\n🔍 User Data:');
            console.log(JSON.stringify(data, null, 2));
            
            // Extract important URIs
            const userUri = data.resource?.uri || data.uri;
            const orgUri = data.resource?.current_organization || data.current_organization || data.organization;
            
            console.log('\n📌 Extracted Values:');
            console.log(`User URI: ${userUri || 'NOT FOUND'}`);
            console.log(`Organization URI: ${orgUri || 'NOT FOUND'}`);
            
            // If we got organization URI, test event_types
            if (orgUri) {
                console.log('\n📅 Test 2: Event Types with Organization URI');
                console.log('=============================================');
                
                const eventTypesUrl = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/event_types?organization=${encodeURIComponent(orgUri)}`;
                console.log(`📍 URL: ${eventTypesUrl}`);
                
                const eventResponse = await fetch(eventTypesUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`📊 Status: ${eventResponse.status} ${eventResponse.statusText}`);
                
                if (eventResponse.ok) {
                    const eventData = await eventResponse.json();
                    console.log('✅ Event Types Retrieved!');
                    console.log(`Found ${eventData.collection?.length || 0} event types`);
                    if (eventData.collection && eventData.collection.length > 0) {
                        console.log('\nFirst Event Type:');
                        console.log(JSON.stringify(eventData.collection[0], null, 2));
                    }
                } else {
                    const errorText = await eventResponse.text();
                    console.log('❌ Event Types Failed:', errorText);
                }
            }
            
            // Test with user URI if available
            if (userUri && !orgUri) {
                console.log('\n📅 Test 3: Event Types with User URI (fallback)');
                console.log('================================================');
                
                const eventTypesUrl = `https://proxy.useparagon.com/projects/${PROJECT_ID}/sdk/proxy/calendly/event_types?user=${encodeURIComponent(userUri)}`;
                console.log(`📍 URL: ${eventTypesUrl}`);
                
                const eventResponse = await fetch(eventTypesUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`📊 Status: ${eventResponse.status} ${eventResponse.statusText}`);
                
                if (eventResponse.ok) {
                    const eventData = await eventResponse.json();
                    console.log('✅ Event Types Retrieved with User URI!');
                    console.log(`Found ${eventData.collection?.length || 0} event types`);
                } else {
                    const errorText = await eventResponse.text();
                    console.log('❌ Event Types with User URI Failed:', errorText);
                }
            }
            
        } else {
            console.log('❌ ERROR');
            console.log('Response:', responseText);
        }
        
    } catch (error) {
        console.log('❌ NETWORK ERROR:', error.message);
    }
    
    console.log('\n🎯 SUMMARY');
    console.log('===========');
    console.log('• Check if Calendly integration is enabled in Paragon dashboard');
    console.log('• Ensure the user has connected Calendly in Paragon');
    console.log('• Verify OAuth scopes include user and organization access');
    console.log('\n📚 Required Paragon Dashboard Configuration:');
    console.log('1. Go to Paragon Dashboard > Integrations > Calendly');
    console.log('2. Ensure Calendly is enabled');
    console.log('3. Check that OAuth credentials are configured');
    console.log('4. Verify the user has authenticated with Calendly');
}

// Run the test
testCalendlyEndpoints().then(() => {
    console.log('\n🏁 Debug test completed');
}).catch(error => {
    console.log('💥 Test failed:', error.message);
});