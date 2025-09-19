#!/usr/bin/env node

/**
 * CLI test for Paragon Connect functionality
 * Compares direct API calls vs our implementation
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Paragon Connect CLI Test\n');

// Test Configuration
const CONFIG = {
    PROJECT_ID: 'ed25f59d-f4d2-40da-995f-87e875e40865',
    USER_ID: 'test-user-cli',
    BASE_URL: 'http://localhost:3000',
    TEST_SERVICE: 'gmail'
};

console.log('📋 Test Configuration:');
console.log(`  Project ID: ${CONFIG.PROJECT_ID}`);
console.log(`  User ID: ${CONFIG.USER_ID}`);
console.log(`  Base URL: ${CONFIG.BASE_URL}`);
console.log(`  Test Service: ${CONFIG.TEST_SERVICE}\n`);

// Test Token Generation
async function testTokenGeneration() {
    console.log('🔑 Testing Token Generation...');
    
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/paragonToken?userId=${CONFIG.USER_ID}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.userToken) {
            console.log('✅ Token generated successfully');
            console.log(`   Token preview: ${data.userToken.substring(0, 50)}...`);
            
            // Decode token
            try {
                const payload = JSON.parse(Buffer.from(data.userToken.split('.')[1], 'base64').toString());
                console.log('📋 Token payload:');
                console.log(`   Subject: ${payload.sub}`);
                console.log(`   Audience: ${payload.aud}`);
                console.log(`   Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
                console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
                
                return data.userToken;
            } catch (decodeErr) {
                console.log('⚠️  Could not decode token payload');
                return data.userToken;
            }
        } else {
            throw new Error('No userToken in response');
        }
    } catch (error) {
        console.log(`❌ Token generation failed: ${error.message}`);
        return null;
    }
}

// Test Direct Paragon API
async function testDirectParagonAPI(token) {
    console.log('\n🌐 Testing Direct Paragon API...');
    
    try {
        // Test authentication endpoint
        const authResponse = await fetch('https://api.useparagon.com/connect/authenticate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                projectId: CONFIG.PROJECT_ID,
                userToken: token
            })
        });
        
        console.log(`   Auth response status: ${authResponse.status}`);
        
        if (authResponse.ok) {
            const authData = await authResponse.json();
            console.log('✅ Direct API authentication successful');
            console.log(`   Response: ${JSON.stringify(authData, null, 2)}`);
        } else {
            const errorData = await authResponse.text();
            console.log(`❌ Direct API authentication failed: ${errorData}`);
        }
        
        // Test integration metadata
        const metadataResponse = await fetch(`https://api.useparagon.com/projects/${CONFIG.PROJECT_ID}/integrations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`   Metadata response status: ${metadataResponse.status}`);
        
        if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            console.log('✅ Integration metadata retrieved');
            console.log(`   Available integrations: ${metadata.map(m => m.type).join(', ')}`);
        } else {
            console.log('❌ Could not retrieve integration metadata');
        }
        
    } catch (error) {
        console.log(`❌ Direct API test failed: ${error.message}`);
    }
}

// Test Our Implementation
async function testOurImplementation() {
    console.log('\n🔧 Testing Our Implementation...');
    
    try {
        // Check if our paragon services are loaded
        const paragonServicesPath = path.join(__dirname, 'leviousa_web', 'utils', 'paragonServices.ts');
        if (fs.existsSync(paragonServicesPath)) {
            console.log('✅ Paragon services file found');
            const content = fs.readFileSync(paragonServicesPath, 'utf8');
            
            // Check for key patterns
            const patterns = {
                'paragon import': /import.*paragon.*from.*@useparagon\/connect/,
                'configureGlobal': /configureGlobal/,
                'authenticate call': /\.authenticate\(/,
                'connect call': /\.connect\(/
            };
            
            console.log('   Code analysis:');
            for (const [name, pattern] of Object.entries(patterns)) {
                if (pattern.test(content)) {
                    console.log(`   ✅ ${name} found`);
                } else {
                    console.log(`   ❌ ${name} missing`);
                }
            }
        } else {
            console.log('❌ Paragon services file not found');
        }
        
        // Check ParagonIntegration component
        const integrationPath = path.join(__dirname, 'leviousa_web', 'components', 'ParagonIntegration.tsx');
        if (fs.existsSync(integrationPath)) {
            console.log('✅ ParagonIntegration component found');
            const content = fs.readFileSync(integrationPath, 'utf8');
            
            const issues = [];
            if (!content.includes('paragon.connect(')) {
                issues.push('Missing paragon.connect() call');
            }
            if (!content.includes('onSuccess')) {
                issues.push('Missing onSuccess callback');
            }
            if (!content.includes('onError')) {
                issues.push('Missing onError callback');
            }
            
            if (issues.length === 0) {
                console.log('   ✅ Component implementation looks correct');
            } else {
                console.log('   ⚠️  Potential issues found:');
                issues.forEach(issue => console.log(`      - ${issue}`));
            }
        } else {
            console.log('❌ ParagonIntegration component not found');
        }
        
    } catch (error) {
        console.log(`❌ Implementation test failed: ${error.message}`);
    }
}

// Generate Test Report
function generateTestReport() {
    console.log('\n📊 Test Report Generated');
    console.log('=====================================');
    console.log('');
    console.log('To run the comprehensive web test:');
    console.log(`1. Open: ${CONFIG.BASE_URL}/test-paragon-comprehensive.html`);
    console.log('2. Click "Run Full Test Suite"');
    console.log('3. Check console and DOM for iframe detection');
    console.log('');
    console.log('Expected Behavior:');
    console.log('✅ SDK loads successfully');
    console.log('✅ Authentication completes');
    console.log('✅ Connect Portal iframe appears');
    console.log('✅ OAuth flow can be completed');
    console.log('');
    console.log('Common Issues:');
    console.log('❌ Integration not Active in Paragon dashboard');
    console.log('❌ CSP blocking iframe creation');
    console.log('❌ Popup blocker preventing portal');
    console.log('❌ Wrong integration type identifier');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Run web test to identify specific issue');
    console.log('2. Check Paragon dashboard for integration status');
    console.log('3. Verify CSP allows all required domains');
    console.log('4. Test in different browsers/environments');
}

// Main Test Runner
async function runCLITest() {
    console.log('🚀 Starting CLI Test Suite...\n');
    
    // Test 1: Token Generation
    const token = await testTokenGeneration();
    
    if (token) {
        // Test 2: Direct API
        await testDirectParagonAPI(token);
    }
    
    // Test 3: Our Implementation
    await testOurImplementation();
    
    // Generate Report
    generateTestReport();
    
    console.log('\n🏁 CLI Test Suite Complete!');
}

// Run if called directly
if (require.main === module) {
    runCLITest().catch(console.error);
}

module.exports = {
    runCLITest,
    testTokenGeneration,
    testDirectParagonAPI,
    testOurImplementation,
    CONFIG
};