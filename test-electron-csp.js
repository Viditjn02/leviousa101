#!/usr/bin/env node

/**
 * Test Electron CSP interception in real environment
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Testing Electron CSP interception...\n');

// Start Electron app with logging
const electronProcess = spawn('npx', ['electron', '.'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let cspPatchDetected = false;
let localhostPatchDetected = false;
let paragonPatchDetected = false;
let metaTagRemovalDetected = false;

// Monitor stdout for CSP patch messages
electronProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  
  // Look for our CSP patch messages
  if (text.includes('[CSPPatch]')) {
    console.log('📡 CSP Activity:', text.trim());
    cspPatchDetected = true;
    
    if (text.includes('localhost:3000')) {
      localhostPatchDetected = true;
    }
    if (text.includes('connect.useparagon.com')) {
      paragonPatchDetected = true;
    }
    if (text.includes('Removed meta CSP tags')) {
      metaTagRemovalDetected = true;
    }
  }
  
  // Show other relevant logs
  if (text.includes('[') && (
    text.includes('Error') || 
    text.includes('ParagonBridge') ||
    text.includes('Refused to') ||
    text.includes('blob:')
  )) {
    console.log('📋 App Log:', text.trim());
  }
});

electronProcess.stderr.on('data', (data) => {
  const text = data.toString();
  if (text.includes('CSP') || text.includes('blob:') || text.includes('Refused')) {
    console.log('❌ Error:', text.trim());
  }
});

// Test for 15 seconds
console.log('⏱️  Testing for 15 seconds...');
console.log('💡 You can manually trigger Paragon connection in the Electron window\n');

setTimeout(() => {
  console.log('\n🔍 Test Results:');
  console.log('=====================================');
  console.log('✅ CSP Patch System Active:', cspPatchDetected ? 'YES' : 'NO');
  console.log('✅ Localhost Patch Detected:', localhostPatchDetected ? 'YES' : 'NO');
  console.log('✅ Paragon Patch Detected:', paragonPatchDetected ? 'YES' : 'NO');
  console.log('✅ Meta Tag Removal:', metaTagRemovalDetected ? 'YES' : 'NO');
  
  const allWorking = cspPatchDetected && localhostPatchDetected && paragonPatchDetected;
  console.log('\n🎯 CSP Interception Status:', allWorking ? '✅ WORKING' : '❌ NOT WORKING');
  
  if (!allWorking) {
    console.log('\n🔧 Issues Detected:');
    if (!cspPatchDetected) console.log('• CSP patch system not activating');
    if (!localhostPatchDetected) console.log('• localhost:3000 requests not intercepted');
    if (!paragonPatchDetected) console.log('• connect.useparagon.com requests not intercepted');
    
    console.log('\n💡 Possible fixes:');
    console.log('• Check if Electron app is using the correct session');
    console.log('• Verify CSP filter URLs are correct');
    console.log('• Ensure webRequest interception is set up before requests');
  }
  
  console.log('=====================================\n');
  
  // Kill the Electron process
  electronProcess.kill('SIGTERM');
  
  setTimeout(() => {
    if (!electronProcess.killed) {
      electronProcess.kill('SIGKILL');
    }
    process.exit(0);
  }, 2000);
  
}, 15000);

electronProcess.on('exit', (code) => {
  console.log(`🔚 Electron process exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted');
  electronProcess.kill('SIGTERM');
  process.exit(0);
});