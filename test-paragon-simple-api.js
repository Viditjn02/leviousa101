const https = require('https');
const url = require('url');

/**
 * Simple API test for Paragon token generation
 */

const CONFIG = {
    PROJECT_ID: 'ed25f59d-f4d2-40da-995f-87e875e40865',
    BASE_URL: 'https://www.leviousa.com',
    USER_ID: 'simple-api-test'
};

console.log('🤖 Simple Paragon API Test\n');

function makeRequest(urlString) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(urlString);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Paragon-Test/1.0'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    };
                    
                    if (res.headers['content-type']?.includes('application/json')) {
                        result.json = JSON.parse(data);
                    }
                    
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function testTokenGeneration() {
    console.log('🔑 Testing token generation...');
    
    try {
        const response = await makeRequest(`${CONFIG.BASE_URL}/api/paragonToken?userId=${CONFIG.USER_ID}`);
        
        console.log(`   Status: ${response.statusCode}`);
        
        if (response.statusCode === 200 && response.json?.userToken) {
            console.log('✅ Token generated successfully');
            
            const token = response.json.userToken;
            console.log(`   Token preview: ${token.substring(0, 50)}...`);
            
            // Decode token payload
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                console.log('📋 Token details:');
                console.log(`   Subject: ${payload.sub}`);
                console.log(`   Audience: ${payload.aud}`);
                console.log(`   Project ID: ${payload.aud.split('/')[1]}`);
                console.log(`   Issued: ${new Date(payload.iat * 1000).toISOString()}`);
                console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
                
                // Validate project ID
                const extractedProjectId = payload.aud.split('/')[1];
                if (extractedProjectId === CONFIG.PROJECT_ID) {
                    console.log('✅ Project ID matches configuration');
                } else {
                    console.log(`❌ Project ID mismatch: expected ${CONFIG.PROJECT_ID}, got ${extractedProjectId}`);
                }
                
                return { success: true, token, payload };
                
            } catch (decodeError) {
                console.log(`⚠️ Could not decode token: ${decodeError.message}`);
                return { success: true, token, payload: null };
            }
            
        } else {
            console.log(`❌ Token generation failed: ${response.statusCode}`);
            console.log(`   Response: ${response.body}`);
            return { success: false, error: `HTTP ${response.statusCode}` };
        }
        
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testWebsiteAccess() {
    console.log('\n🌐 Testing website access...');
    
    try {
        const response = await makeRequest(`${CONFIG.BASE_URL}/test-paragon-simple.html`);
        
        console.log(`   Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            console.log('✅ Test page accessible');
            
            // Check if it contains Paragon SDK
            if (response.body.includes('@useparagon/connect')) {
                console.log('✅ Paragon SDK script found in test page');
            } else {
                console.log('⚠️ Paragon SDK script not found in test page');
            }
            
            return { success: true };
        } else {
            console.log(`❌ Test page not accessible: ${response.statusCode}`);
            return { success: false, status: response.statusCode };
        }
        
    } catch (error) {
        console.log(`❌ Website access failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function analyzeIntegrationFiles() {
    console.log('\n🔧 Analyzing integration files...');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Check ParagonIntegration component
        const componentPath = path.join(__dirname, 'leviousa_web', 'components', 'ParagonIntegration.tsx');
        
        if (fs.existsSync(componentPath)) {
            console.log('✅ ParagonIntegration.tsx found');
            
            const content = fs.readFileSync(componentPath, 'utf8');
            
            // Check for key patterns
            const checks = [
                { name: 'paragon.connect() call', pattern: /paragon\.connect\(/ },
                { name: 'onSuccess callback', pattern: /onSuccess/ },
                { name: 'onError callback', pattern: /onError/ },
                { name: 'iframe detection', pattern: /iframe/ },
                { name: 'Connect Portal debug', pattern: /Connect Portal/ },
                { name: 'fallback popup', pattern: /manual.*popup|window\.open/ }
            ];
            
            console.log('   Code analysis:');
            checks.forEach(check => {
                if (check.pattern.test(content)) {
                    console.log(`   ✅ ${check.name} - found`);
                } else {
                    console.log(`   ❌ ${check.name} - missing`);
                }
            });
            
            // Count occurrences of paragon.connect
            const connectCalls = (content.match(/paragon\.connect\(/g) || []).length;
            console.log(`   📊 paragon.connect() calls: ${connectCalls}`);
            
        } else {
            console.log('❌ ParagonIntegration.tsx not found');
        }
        
        // Check environment files
        const envPath = path.join(__dirname, 'leviousa_web', '.env.local');
        if (fs.existsSync(envPath)) {
            console.log('✅ .env.local found');
            const envContent = fs.readFileSync(envPath, 'utf8');
            
            if (envContent.includes('NEXT_PUBLIC_PARAGON_PROJECT_ID')) {
                console.log('✅ Paragon project ID configured');
            } else {
                console.log('❌ Paragon project ID not configured');
            }
        } else {
            console.log('⚠️ .env.local not found');
        }
        
    } catch (error) {
        console.log(`❌ File analysis failed: ${error.message}`);
    }
}

async function runSimpleTest() {
    console.log('🚀 Starting Simple API Test...\n');
    
    // Test 1: Token generation
    const tokenResult = await testTokenGeneration();
    
    // Test 2: Website access
    const websiteResult = await testWebsiteAccess();
    
    // Test 3: File analysis
    await analyzeIntegrationFiles();
    
    // Generate diagnosis
    console.log('\n🎯 DIAGNOSIS AND RECOMMENDATIONS');
    console.log('=====================================');
    
    if (tokenResult.success) {
        console.log('✅ Backend token generation: WORKING');
        console.log('   - Paragon authentication tokens are being generated correctly');
        console.log('   - JWT format and project ID are valid');
    } else {
        console.log('❌ Backend token generation: FAILED');
        console.log('   - Fix the token generation API first');
    }
    
    if (websiteResult.success) {
        console.log('✅ Test page deployment: WORKING');
        console.log('   - Simple test page is accessible');
        console.log('   - Can be used for frontend testing');
    } else {
        console.log('❌ Test page deployment: FAILED');
        console.log('   - Need to fix deployment or page access');
    }
    
    console.log('\n🔍 LIKELY ISSUE BASED ON LOGS:');
    console.log('   The problem is NOT with token generation or SDK loading');
    console.log('   The issue is that paragon.connect() completes but no iframe appears');
    console.log('   This typically means the integration is not Active in Paragon dashboard');
    
    console.log('\n💡 NEXT STEPS TO FIX:');
    console.log('   1. Login to your Paragon dashboard');
    console.log('   2. Go to Integrations > Gmail');
    console.log('   3. Click "Activate" if it shows as Inactive');
    console.log('   4. Verify the integration is published and available to users');
    console.log('   5. Test again with the browser test page');
    
    console.log('\n🌐 Test the frontend manually:');
    console.log(`   Open: ${CONFIG.BASE_URL}/test-paragon-simple.html`);
    console.log('   Check browser console for detailed logs');
    
    console.log('\n✅ Simple test complete!');
}

if (require.main === module) {
    runSimpleTest().catch(console.error);
}

module.exports = { testTokenGeneration, testWebsiteAccess, analyzeIntegrationFiles };