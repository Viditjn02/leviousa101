#!/usr/bin/env node

/**
 * Upload update files to Vercel Blob for auto-updater
 * This script runs after electron-builder creates the update files
 */

const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');

async function uploadUpdates() {
    console.log('🚀 Starting update file upload to Vercel Blob...\n');
    
    const distDir = path.join(__dirname, '../dist');
    const packageJson = require('../package.json');
    const version = packageJson.version;
    
    console.log(`📦 Current version: ${version}`);
    console.log(`📁 Distribution directory: ${distDir}\n`);
    
    // Check if BLOB_READ_WRITE_TOKEN is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('❌ BLOB_READ_WRITE_TOKEN environment variable is required');
        process.exit(1);
    }
    
    // Files to upload
    const filesToUpload = [
        {
            local: path.join(distDir, 'latest-mac.yml'),
            remote: 'latest-mac.yml',
            contentType: 'text/yaml'
        },
        {
            local: path.join(distDir, `Leviousa-${version}-mac.zip`),
            remote: `Leviousa-${version}-mac.zip`,
            contentType: 'application/zip'
        },
        {
            local: path.join(distDir, `Leviousa-${version}-mac.zip.blockmap`),
            remote: `Leviousa-${version}-mac.zip.blockmap`,
            contentType: 'application/octet-stream'
        }
    ];
    
    console.log('🔍 Checking for update files...');
    
    // Check if all files exist
    for (const file of filesToUpload) {
        if (!fs.existsSync(file.local)) {
            console.error(`❌ Required file not found: ${file.local}`);
            console.log('\n💡 Make sure you run this script after building with: npm run build\n');
            process.exit(1);
        }
        
        const stats = fs.statSync(file.local);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   ✅ ${path.basename(file.local)} (${sizeMB} MB)`);
    }
    
    console.log('\n📤 Uploading files to Vercel Blob...\n');
    
    // Upload each file
    for (const file of filesToUpload) {
        try {
            console.log(`   🔄 Uploading ${file.remote}...`);
            
            const fileBuffer = fs.readFileSync(file.local);
            
            const blob = await put(file.remote, fileBuffer, {
                access: 'public',
                contentType: file.contentType,
                // Add cache headers for different file types
                cacheControlMaxAge: file.remote.includes('latest-mac.yml') ? 0 : 31536000 // 1 year for versioned files, no cache for latest.yml
            });
            
            console.log(`   ✅ Uploaded: ${blob.url}`);
            
            // Store the URLs in environment variables for the API routes
            if (file.remote === 'latest-mac.yml') {
                console.log(`\n📝 Set this environment variable:`);
                console.log(`   BLOB_LATEST_MAC_YML=${blob.url}`);
            } else if (file.remote.endsWith('.zip')) {
                console.log(`   BLOB_BASE_URL=${blob.url.replace(`/${file.remote}`, '')}`);
            }
            
        } catch (error) {
            console.error(`   ❌ Failed to upload ${file.remote}:`, error.message);
            process.exit(1);
        }
    }
    
    console.log('\n🎉 All update files uploaded successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your Vercel environment variables with the URLs above');
    console.log('   2. Deploy your Vercel app: cd leviousa_web && npx vercel --prod');
    console.log('   3. Test the auto-updater by installing the new build\n');
}

// Handle command line execution
if (require.main === module) {
    uploadUpdates().catch(error => {
        console.error('💥 Upload failed:', error);
        process.exit(1);
    });
}

module.exports = { uploadUpdates };
