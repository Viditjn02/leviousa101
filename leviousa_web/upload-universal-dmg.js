#!/usr/bin/env node

/**
 * Upload Universal DMG to Vercel Blob Storage
 */

const fs = require('fs');
const FormData = require('form-data');

async function uploadUniversalDMG() {
    console.log('🍎 UPLOADING UNIVERSAL NOTARIZED DMG TO VERCEL BLOB');
    console.log('=' .repeat(60));
    
    const dmgPath = '../dist/Leviousa-1.0.0-universal.dmg';
    
    if (!fs.existsSync(dmgPath)) {
        console.log(`❌ DMG not found: ${dmgPath}`);
        return false;
    }
    
    const stats = fs.statSync(dmgPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`📊 File: ${dmgPath}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`🚀 Starting upload to Vercel blob...`);
    
    try {
        const fetch = (await import('node-fetch')).default;
        
        // Create form data
        const form = new FormData();
        form.append('file', fs.createReadStream(dmgPath));
        form.append('platform', 'macos');
        form.append('architecture', 'universal');
        
        const startTime = Date.now();
        
        // Upload to Vercel blob via our API endpoint
        const response = await fetch('https://leviousa-vrovi9wm9-vidit-jains-projects-5fe154e9.vercel.app/api/downloads/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer leviousa-secure-upload-token-2024`,
                ...form.getHeaders()
            },
            body: form
        });
        
        const uploadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Upload successful in ${uploadTime}s`);
            console.log(`🔗 Download URL: ${result.file.downloadUrl}`);
            console.log(`📦 Blob URL: ${result.file.url}`);
            
            // Test the download
            console.log('\n🔒 Testing download...');
            const testResponse = await fetch(result.file.downloadUrl, { method: 'HEAD' });
            
            if (testResponse.status === 200) {
                console.log('✅ Download test passed');
                console.log(`📊 Content-Length: ${testResponse.headers.get('content-length')} bytes`);
                
                // Save the new URL for updating code
                const newUrl = result.file.url;
                console.log(`\n💾 New DMG Blob URL to use: ${newUrl}`);
                
                // Write to file for reference
                fs.writeFileSync('new-dmg-url.txt', `NEW_DMG_BLOB_URL=${newUrl}\nNEW_DMG_DOWNLOAD_URL=${result.file.downloadUrl}\nUPLOADED_AT=${result.uploadedAt}\n`);
                console.log('💾 URLs saved to new-dmg-url.txt');
                
                return {
                    blobUrl: newUrl,
                    downloadUrl: result.file.downloadUrl,
                    size: result.file.size,
                    uploadedAt: result.uploadedAt
                };
            } else {
                console.log(`❌ Download test failed: ${testResponse.status}`);
                return false;
            }
        } else {
            const errorText = await response.text();
            console.error(`❌ Upload failed (${response.status}):`, errorText.substring(0, 200));
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Upload error:`, error.message);
        return false;
    }
}

uploadUniversalDMG().then(result => {
    if (result) {
        console.log('\n🎉 UPLOAD COMPLETE!');
        console.log('Ready to update URLs in codebase...');
    } else {
        console.log('\n❌ Upload failed');
        process.exit(1);
    }
}).catch(console.error);
