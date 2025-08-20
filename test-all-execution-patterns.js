#!/usr/bin/env node

/**
 * TEST ALL POSSIBLE EXECUTION PATTERNS
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config({ path: join(__dirname, 'services/paragon-mcp/.env') });

const PROJECT_ID = process.env.PARAGON_PROJECT_ID;
const SIGNING_KEY = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

console.log('🔍 TESTING ALL POSSIBLE EXECUTION PATTERNS');
console.log('==========================================\n');

function generateUserToken(userId) {
    const payload = {
        sub: userId,
        aud: `useparagon.com/${PROJECT_ID}`,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (1 * 3600),
    };

    const privateKey = SIGNING_KEY.replace(/\\n/g, '\n');
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function testAllExecutionPatterns() {
    const userId = 'vqLrzGnqajPGlX9Wzq89SgqVPsN2';
    const userToken = generateUserToken(userId);
    
    console.log('🎯 Testing different execution patterns for workflows...');
    console.log('👤 User ID:', userId);
    console.log('');

    const workflowId = 'b3722478-58db-4d18-a75a-043664ead1f7';
    
    // Test all possible execution patterns
    const executionPatterns = [
        {
            name: '1. Trigger with /execute suffix',
            url: `https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/triggers/${workflowId}/execute`
        },
        {
            name: '2. Workflows with /run suffix',
            url: `https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/workflows/${workflowId}/run`
        },
        {
            name: '3. Direct trigger URL (original)',
            url: `https://zeus.useparagon.com/projects/${PROJECT_ID}/sdk/triggers/${workflowId}`
        },
        {
            name: '4. API execution endpoint',
            url: `https://api.useparagon.com/projects/${PROJECT_ID}/workflows/${workflowId}/execute`
        },
        {
            name: '5. Zeus execution endpoint',
            url: `https://zeus.useparagon.com/projects/${PROJECT_ID}/workflows/${workflowId}/execute`
        }
    ];

    const simplePayload = {
        calendarId: 'primary',
        maxResults: 5
    };

    let workingPattern = null;

    for (const pattern of executionPatterns) {
        console.log(`🧪 ${pattern.name}`);
        console.log(`📍 URL: ${pattern.url}`);
        
        try {
            const response = await fetch(pattern.url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(simplePayload)
            });
            
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            const responseText = await response.text();
            
            if (response.status >= 200 && response.status < 300) {
                console.log('🎉 SUCCESS! This execution pattern works!');
                workingPattern = pattern;
                
                try {
                    const jsonResponse = JSON.parse(responseText);
                    console.log('✅ Response keys:', Object.keys(jsonResponse).join(', '));
                } catch (e) {
                    console.log('📋 Response received');
                }
            } else if (response.status === 400 && responseText.includes('already enabled')) {
                console.log('❌ Management endpoint (not execution)');
            } else if (response.status === 404) {
                console.log('❌ Endpoint not found');
            } else {
                console.log('❌ Other error');
                try {
                    const errorJson = JSON.parse(responseText);
                    console.log('📋 Error:', errorJson.message);
                } catch (e) {
                    console.log('📋 Error text:', responseText.substring(0, 150));
                }
            }
            
        } catch (error) {
            console.log('❌ Network error:', error.message);
        }
        
        console.log('');
    }

    console.log('📊 EXECUTION PATTERN TEST RESULTS');
    console.log('==================================');
    
    if (workingPattern) {
        console.log(`🎉 FOUND WORKING EXECUTION PATTERN!`);
        console.log(`✅ Pattern: ${workingPattern.name}`);
        console.log(`✅ URL: ${workingPattern.url}`);
        console.log('');
        console.log('🔧 NEXT: Update MCP server with correct execution pattern');
    } else {
        console.log('❌ NO WORKING EXECUTION PATTERNS FOUND');
        console.log('');
        console.log('💡 ALTERNATIVE SOLUTIONS:');
        console.log('1. 🔧 Use Connect Portal SDK integration');
        console.log('2. 🔄 Use original proxy API pattern (like Gmail)');
        console.log('3. 🚀 Investigate Paragon SDK libraries');
        console.log('4. 📱 Implement Connect Portal iframe integration');
    }
    
    return workingPattern;
}

testAllExecutionPatterns().then((pattern) => {
    console.log('\n🏁 All execution patterns tested');
    if (pattern) {
        console.log('🚀 Ready to implement working execution pattern!');
    } else {
        console.log('🔧 Need alternative approach to workflow execution');
    }
}).catch(error => {
    console.log('💥 Test failed:', error.message);
});
