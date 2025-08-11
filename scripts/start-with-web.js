#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');

console.log('🚀 Starting Leviousa with local dev server...\n');

// Start Next.js dev server
console.log('📦 Starting Next.js dev server on localhost:3000...');
const webDir = path.join(__dirname, '..', 'leviousa_web');
const webServer = spawn('npm', ['run', 'dev'], {
  cwd: webDir,
  stdio: ['inherit', 'pipe', 'pipe']
});

let webServerReady = false;

webServer.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(`[Next.js] ${output}`);
  
  // Check if the server is ready
  if (output.includes('Ready in') || output.includes('started server on')) {
    webServerReady = true;
  }
});

webServer.stderr.on('data', (data) => {
  process.stderr.write(`[Next.js Error] ${data}`);
});

// Wait for the web server to be ready
console.log('⏳ Waiting for Next.js dev server to be ready...');

waitOn({
  resources: ['http://localhost:3000'],
  delay: 1000,
  interval: 1000,
  timeout: 30000
}).then(() => {
  console.log('✅ Next.js dev server ready on http://localhost:3000\n');
  console.log('🔥 Starting Electron app...');
  console.log('📋 Frontend: http://localhost:3000');
  console.log('  API: http://localhost:9001\n');
  
  // Start Electron
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  // Handle process cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    electronProcess.kill('SIGINT');
    webServer.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    electronProcess.kill('SIGTERM');
    webServer.kill('SIGTERM');
    process.exit(0);
  });
  
  electronProcess.on('close', (code) => {
    console.log('🔴 Electron process closed, shutting down web server...');
    webServer.kill('SIGTERM');
    process.exit(code);
  });
  
}).catch((err) => {
  console.error('❌ Failed to start Next.js dev server:', err);
  webServer.kill('SIGTERM');
  process.exit(1);
});

webServer.on('error', (err) => {
  console.error('❌ Failed to start Next.js dev server:', err);
  process.exit(1);
});
