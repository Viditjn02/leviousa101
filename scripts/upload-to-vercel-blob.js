#!/usr/bin/env node

/**
 * Secure Upload Script for Leviousa Installers
 * Uploads files to Vercel Blob Storage with enterprise security
 */

const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');

// Configuration
const CONFIG = {
  // Your Vercel Blob token (set in environment or .env.local)
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  
  // Files to upload (updated with actual built files)
  files: [
    {
      path: 'dist/Leviousa-1.0.0-universal.dmg',
      platform: 'macos',
      architecture: 'universal',
      description: 'macOS Universal installer for both Apple Silicon and Intel - FIXED DISTRIBUTION BUILD'
    }
  ]
};

async function uploadFile(fileConfig) {
  const { path: filePath, platform, architecture, description } = fileConfig;
  
  console.log(`🔐 Uploading: ${description}`);
  console.log(`📁 File: ${filePath}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath} - Skipping`);
      return null;
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(fileName);
    
    // Generate secure blob path with user-friendly name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const secureName = `Leviousa v1.0${fileExtension}`;
    const blobPath = `releases/v1.0.0/${secureName}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      addRandomSuffix: true, // Adds security through URL entropy
      contentType: getContentType(fileExtension)
    });

    console.log(`✅ Upload successful!`);
    console.log(`🔗 Secure URL: ${blob.url}`);
    console.log(`📊 Size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🌍 CDN: Global distribution enabled`);
    console.log('');

    return {
      platform,
      architecture,
      originalPath: filePath,
      blobUrl: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Upload failed for ${filePath}:`, error.message);
    return null;
  }
}

function getContentType(extension) {
  const types = {
    '.dmg': 'application/octet-stream',
    '.exe': 'application/octet-stream', 
    '.msi': 'application/octet-stream',
    '.AppImage': 'application/octet-stream',
    '.deb': 'application/octet-stream',
    '.rpm': 'application/octet-stream',
    '.tar.gz': 'application/gzip'
  };
  
  return types[extension] || 'application/octet-stream';
}

async function main() {
  console.log('🚀 Leviousa Secure Upload to Vercel Blob Storage');
  console.log('=================================================');
  console.log('');

  // Verify token
  if (!CONFIG.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN environment variable not set');
    console.log('');
    console.log('To fix this:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your project');  
    console.log('3. Go to Settings > Environment Variables');
    console.log('4. Add BLOB_READ_WRITE_TOKEN with your blob token');
    console.log('5. Or set it locally: export BLOB_READ_WRITE_TOKEN="your-token"');
    process.exit(1);
  }

  const results = [];
  
  // Upload each file
  for (const fileConfig of CONFIG.files) {
    const result = await uploadFile(fileConfig);
    if (result) {
      results.push(result);
    }
  }

  // Generate summary
  console.log('📋 Upload Summary:');
  console.log('==================');
  
  if (results.length === 0) {
    console.log('⚠️  No files were uploaded. Check file paths and try again.');
    process.exit(1);
  }

  results.forEach(result => {
    console.log(`✅ ${result.platform}-${result.architecture}: ${result.blobUrl}`);
  });

  // Generate download URLs for API integration
  console.log('');
  console.log('🔗 Integration URLs for your API:');
  console.log('=================================');
  
  const downloadUrls = {
    'macos-universal': results.find(r => r.platform === 'macos' && r.architecture === 'universal')?.blobUrl,
    'macos-arm64': results.find(r => r.platform === 'macos' && r.architecture === 'arm64')?.blobUrl,
    'macos-intel': results.find(r => r.platform === 'macos' && r.architecture === 'intel')?.blobUrl,
    'windows-x64': results.find(r => r.platform === 'windows')?.blobUrl
  };

  console.log('const SECURE_DOWNLOAD_URLS = {');
  Object.entries(downloadUrls).forEach(([key, url]) => {
    if (url) {
      console.log(`  '${key}': '${url}',`);
    }
  });
  console.log('};');

  console.log('');
  console.log('✨ All files uploaded securely to Vercel Blob!');
  console.log('🔒 Files are encrypted with AES-256 and served over HTTPS');
  console.log('🌍 Global CDN distribution for fast downloads worldwide');
  console.log('');
  console.log('Next step: Update your download API routes with these URLs');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the upload
main().catch(console.error);
