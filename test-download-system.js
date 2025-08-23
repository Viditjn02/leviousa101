#!/usr/bin/env node

/**
 * Test script for the Leviousa DMG Distribution System
 * Tests API endpoints and GitHub integration
 */

const https = require('https');
const http = require('http');

// Test configuration
const GITHUB_REPO = 'Viditjn02/leviousa101';
const TEST_HOST = 'localhost:3000'; // For local testing
const PROD_HOST = 'leviousa-101.web.app'; // For production testing

/**
 * Make HTTP request and return response
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Test GitHub API connectivity
 */
async function testGitHubAPI() {
  console.log('\n🔍 Testing GitHub API connectivity...');
  
  try {
    const response = await makeRequest(`https://api.github.com/repos/${GITHUB_REPO}/releases`);
    
    if (response.statusCode === 200) {
      const releases = JSON.parse(response.data);
      console.log(`✅ GitHub API accessible`);
      console.log(`   📊 Found ${releases.length} releases`);
      
      if (releases.length > 0) {
        const latest = releases.find(r => !r.draft && !r.prerelease);
        if (latest) {
          console.log(`   📦 Latest stable release: ${latest.tag_name}`);
          console.log(`   💾 Assets: ${latest.assets.length}`);
          
          // Check for DMG and EXE assets
          const dmg = latest.assets.find(a => a.name.toLowerCase().includes('.dmg'));
          const exe = latest.assets.find(a => a.name.toLowerCase().includes('.exe'));
          
          console.log(`   🍎 DMG available: ${dmg ? '✅ ' + dmg.name : '❌'}`);
          console.log(`   🪟 EXE available: ${exe ? '✅ ' + exe.name : '❌'}`);
        } else {
          console.log(`   ⚠️  No stable releases found`);
        }
      }
    } else {
      console.log(`❌ GitHub API error: ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ GitHub API connection failed: ${error.message}`);
  }
}

/**
 * Test download API endpoints (simulation)
 */
async function testDownloadEndpoints(host) {
  console.log(`\n🌐 Testing download endpoints on ${host}...`);
  
  const endpoints = [
    '/api/downloads/latest',
    '/api/downloads/stats', 
    '/api/downloads/dmg',
    '/api/downloads/exe'
  ];
  
  for (const endpoint of endpoints) {
    const url = `${host.includes('localhost') ? 'http' : 'https'}://${host}${endpoint}`;
    
    try {
      console.log(`\n   Testing: ${endpoint}`);
      const response = await makeRequest(url);
      
      console.log(`   Status: ${response.statusCode}`);
      
      if (endpoint.includes('latest') || endpoint.includes('stats')) {
        // These should return JSON
        try {
          const json = JSON.parse(response.data);
          console.log(`   ✅ Valid JSON response`);
          if (json.error) {
            console.log(`   ⚠️  API Error: ${json.error}`);
          }
        } catch {
          console.log(`   ❌ Invalid JSON response`);
        }
      } else {
        // DMG/EXE endpoints should redirect
        if (response.statusCode === 302) {
          console.log(`   ✅ Redirect successful`);
          console.log(`   📍 Location: ${response.headers.location}`);
        } else if (response.statusCode === 404) {
          console.log(`   ⚠️  No releases available yet`);
        } else {
          console.log(`   ❌ Unexpected response`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }
}

/**
 * Test landing page download button configuration
 */
function testLandingPageConfig() {
  console.log('\n📄 Testing landing page configuration...');
  
  // Check if main.js contains the updated download URLs
  const fs = require('fs');
  const path = require('path');
  
  try {
    const mainJsPath = path.join(__dirname, 'leviousa_web/public/main.js');
    const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
    
    if (mainJsContent.includes('/api/downloads/dmg')) {
      console.log('   ✅ Download button configured for DMG API');
    } else {
      console.log('   ❌ Download button not updated for DMG API');
    }
    
    if (mainJsContent.includes('/api/downloads/exe')) {
      console.log('   ✅ Download button configured for EXE API');
    } else {
      console.log('   ❌ Download button not updated for EXE API');
    }
    
    if (mainJsContent.includes('Preparing...')) {
      console.log('   ✅ Enhanced UX with loading state');
    } else {
      console.log('   ❌ Missing enhanced UX features');
    }
    
  } catch (error) {
    console.log(`   ❌ Could not read main.js: ${error.message}`);
  }
}

/**
 * Check CI/CD configuration
 */
function testCICDConfig() {
  console.log('\n⚙️  Testing CI/CD configuration...');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Check build workflow
    const buildWorkflowPath = path.join(__dirname, '.github/workflows/build.yml');
    const buildWorkflow = fs.readFileSync(buildWorkflowPath, 'utf8');
    
    if (buildWorkflow.includes('Domain')) {
      console.log('   ✅ Build workflow configured for Domain branch');
    } else {
      console.log('   ❌ Build workflow missing Domain branch');
    }
    
    if (buildWorkflow.includes('upload-artifact@v4')) {
      console.log('   ✅ Artifact upload configured');
    } else {
      console.log('   ❌ Missing artifact upload');
    }
    
    // Check release workflow
    const releaseWorkflowPath = path.join(__dirname, '.github/workflows/release.yml');
    if (fs.existsSync(releaseWorkflowPath)) {
      console.log('   ✅ Release workflow created');
      
      const releaseWorkflow = fs.readFileSync(releaseWorkflowPath, 'utf8');
      if (releaseWorkflow.includes('firebase deploy')) {
        console.log('   ✅ Firebase deployment configured');
      }
    } else {
      console.log('   ❌ Release workflow missing');
    }
    
    // Check electron-builder config
    const electronBuilderPath = path.join(__dirname, 'electron-builder.yml');
    const electronBuilder = fs.readFileSync(electronBuilderPath, 'utf8');
    
    if (electronBuilder.includes('Viditjn02/leviousa101')) {
      console.log('   ✅ Electron builder repo configuration updated');
    } else {
      console.log('   ❌ Electron builder repo configuration incorrect');
    }
    
  } catch (error) {
    console.log(`   ❌ Could not read CI/CD files: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Leviousa DMG Distribution System Test\n');
  console.log('='.repeat(50));
  
  // Test GitHub API
  await testGitHubAPI();
  
  // Test CI/CD configuration
  testCICDConfig();
  
  // Test landing page configuration
  testLandingPageConfig();
  
  // Test download endpoints (if server is running)
  console.log('\n📝 Note: To test API endpoints, start the development server:');
  console.log('   cd leviousa_web && npm run dev');
  console.log('   Then visit: http://localhost:3000/api/downloads/latest');
  
  console.log('\n✅ Test complete!');
  console.log('\n🎯 Next steps:');
  console.log('   1. Create a GitHub release with DMG/EXE files');
  console.log('   2. Test the download flow on the live site');
  console.log('   3. Monitor download analytics');
  console.log('   4. Set up custom domain (www.leviousa.com)');
}

// Run tests
runTests().catch(console.error);
