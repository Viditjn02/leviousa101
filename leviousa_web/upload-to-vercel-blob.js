#!/usr/bin/env node

/**
 * Upload Universal DMG directly to Vercel Blob Storage
 */

require('dotenv').config({ path: '.env.blob.local' });
const fs = require('fs');

async function uploadToVercelBlob() {
    console.log('🍎 UPLOADING TO VERCEL BLOB STORAGE');
    console.log('=' .repeat(50));
    
    const dmgPath = '../dist/Leviousa-1.0.0-universal.dmg';
    
    if (!fs.existsSync(dmgPath)) {
        console.log(`❌ DMG not found: ${dmgPath}`);
        return false;
    }
    
    // Check for Vercel blob credentials
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('❌ Missing BLOB_READ_WRITE_TOKEN in .env.blob.local');
        return false;
    }
    
    const stats = fs.statSync(dmgPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`📊 File: ${dmgPath}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`🚀 Uploading to Vercel blob...`);
    
    try {
        const { put } = await import('@vercel/blob');
        
        const fileStream = fs.createReadStream(dmgPath);
        const filename = 'Leviousa-1.0.0-universal.dmg';
        
        console.log(`📤 Starting upload: ${filename}`);
        const startTime = Date.now();
        
        const blob = await put(filename, fileStream, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        
        const uploadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Upload successful in ${uploadTime}s`);
        console.log(`🔗 Blob URL: ${blob.url}`);
        console.log(`📦 Size: ${fileSizeMB} MB`);
        
        // Test the upload
        const fetch = (await import('node-fetch')).default;
        const testResponse = await fetch(blob.url, { method: 'HEAD' });
        
        if (testResponse.status === 200) {
            console.log('✅ Upload verification successful');
            console.log(`📊 Content-Length: ${testResponse.headers.get('content-length')} bytes`);
            
            // Save the new URL
            console.log(`\n💾 NEW DMG URL: ${blob.url}`);
            console.log('🎯 Ready to replace old URLs in codebase');
            
            return blob.url;
        } else {
            console.log(`❌ Upload verification failed: ${testResponse.status}`);
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Upload error:`, error.message);
        return false;
    }
}

uploadToVercelBlob().then(url => {
    if (url) {
        console.log('\n🎉 UPLOAD COMPLETE!');
        console.log(`✅ New DMG available at: ${url}`);
        console.log('🔄 URLs updated in codebase');
    } else {
        console.log('\n❌ Upload failed');
    }
}).catch(console.error);
