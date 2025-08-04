#!/usr/bin/env node

/**
 * Test Paragon API directly to see what's happening
 */

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testParagonAPI() {
    console.log('🔍 Testing Paragon API Directly\n');
    
    try {
        // Load environment variables properly (handling multi-line values)
        require('dotenv').config({ path: './services/paragon-mcp/.env' });
        
        const envVars = {
            PARAGON_PROJECT_ID: process.env.PARAGON_PROJECT_ID,
            PARAGON_JWT_SECRET: process.env.PARAGON_JWT_SECRET
        };
        
        console.log('📋 Configuration:');
        console.log(`   Project ID: ${envVars.PARAGON_PROJECT_ID}`);
        console.log(`   JWT Secret Length: ${envVars.PARAGON_JWT_SECRET ? envVars.PARAGON_JWT_SECRET.length : 0}`);
        console.log(`   Has private key markers: ${envVars.PARAGON_JWT_SECRET ? envVars.PARAGON_JWT_SECRET.includes('-----BEGIN') : false}\n`);
        
        // Generate JWT token
        const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
        const payload = {
            sub: userId,
            aud: `useparagon.com/${envVars.PARAGON_PROJECT_ID}`,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        };
        
        let formattedPrivateKey = envVars.PARAGON_JWT_SECRET;
        if (formattedPrivateKey.includes('\\n')) {
            formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
        }
        
        const token = jwt.sign(payload, formattedPrivateKey, { algorithm: 'RS256' });
        console.log('✅ JWT Token Generated');
        console.log(`📏 Token Length: ${token.length}\n`);
        
        // Test 1: Check user credentials (this should return user's authenticated services)
        console.log('📡 TEST 1: Check user credentials');
        const credentialsUrl = `https://api.useparagon.com/projects/${envVars.PARAGON_PROJECT_ID}/sdk/credentials`;
        
        const credentialsResponse = await fetch(credentialsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Status: ${credentialsResponse.status}`);
        const credentialsData = await credentialsResponse.text();
        console.log(`Response: ${credentialsData}\n`);
        
        // Test 2: Check project integrations (this returns what integrations are available in project)
        console.log('📡 TEST 2: Check project integrations');
        const integrationsUrl = `https://api.useparagon.com/projects/${envVars.PARAGON_PROJECT_ID}/sdk/integrations`;
        
        const integrationsResponse = await fetch(integrationsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Status: ${integrationsResponse.status}`);
        const integrationsData = await integrationsResponse.text();
        console.log(`Response: ${integrationsData}\n`);
        
        // Test 3: Try ActionKit API directly
        console.log('📡 TEST 3: ActionKit API (real service calls)');
        const actionKitUrl = `https://actionkit.useparagon.com/projects/${envVars.PARAGON_PROJECT_ID}/actions`;
        
        const actionKitPayload = {
            integration: 'gmail',
            action: 'list_emails',
            user_id: userId,
            parameters: {
                max_results: 5
            }
        };
        
        const actionKitResponse = await fetch(actionKitUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(actionKitPayload)
        });
        
        console.log(`Status: ${actionKitResponse.status}`);
        const actionKitData = await actionKitResponse.text();
        console.log(`Response: ${actionKitData.slice(0, 500)}\n`);
        
        // Conclusions
        console.log('🎯 CONCLUSIONS:');
        console.log('='.repeat(50));
        
        if (credentialsResponse.status === 200) {
            console.log('✅ User credentials API works');
            try {
                const parsed = JSON.parse(credentialsData);
                if (Array.isArray(parsed) && parsed.length === 0) {
                    console.log('❌ User has NO authenticated services in Paragon');
                    console.log('💡 This explains why get_authenticated_services returns empty array');
                } else {
                    console.log('✅ User has authenticated services:', parsed);
                }
            } catch (e) {
                console.log('❌ Could not parse credentials response');
            }
        } else {
            console.log('❌ User credentials API failed');
        }
        
        if (actionKitResponse.status === 401 || actionKitResponse.status === 403) {
            console.log('❌ User not authenticated for Gmail - this is expected');
        } else if (actionKitResponse.status === 200) {
            console.log('✅ User is authenticated for Gmail');
        } else {
            console.log(`⚠️ Unexpected ActionKit response: ${actionKitResponse.status}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testParagonAPI().catch(console.error);