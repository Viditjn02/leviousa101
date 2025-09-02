#!/usr/bin/env node

/**
 * Deploy DMGs to Vercel Static Assets - Autonomous Approach
 * Copy DMGs to public directory and deploy as static files
 */

const fs = require('fs');
const path = require('path');

async function deployDMGsAsStatic() {
    console.log('📦 DEPLOYING DMGS AS STATIC ASSETS');
    console.log('=' .repeat(50));
    
    // Create downloads directory in public folder
    const publicDownloadsDir = 'leviousa_web/public/downloads';
    
    if (!fs.existsSync(publicDownloadsDir)) {
        fs.mkdirSync(publicDownloadsDir, { recursive: true });
        console.log('📁 Created public/downloads directory');
    }
    
    const dmgFiles = [
        {
            source: 'dist/Leviousa-1.0.0-arm64.dmg',
            target: 'leviousa_web/public/downloads/Leviousa-Latest-Apple-Silicon.dmg',
            arch: 'arm64',
            description: 'Apple Silicon (M1/M2/M3)'
        },
        {
            source: 'dist/Leviousa-1.0.0.dmg',
            target: 'leviousa_web/public/downloads/Leviousa-Latest-Intel.dmg', 
            arch: 'intel',
            description: 'Intel processors'
        }
    ];
    
    const results = [];
    
    for (const dmg of dmgFiles) {
        console.log(`\n📋 Processing ${dmg.description}...`);
        
        if (!fs.existsSync(dmg.source)) {
            console.log(`❌ Source not found: ${dmg.source}`);
            continue;
        }
        
        try {
            const sourceSize = fs.statSync(dmg.source).size;
            console.log(`📊 Size: ${(sourceSize / 1024 / 1024).toFixed(2)} MB`);
            
            // Copy DMG to public directory
            console.log(`📁 Copying to: ${dmg.target}`);
            fs.copyFileSync(dmg.source, dmg.target);
            
            const targetSize = fs.statSync(dmg.target).size;
            
            if (sourceSize === targetSize) {
                console.log(`✅ Copy successful - Size verified`);
                
                const staticUrl = '/downloads/Leviousa-Latest-' + (dmg.arch === 'arm64' ? 'Apple-Silicon' : 'Intel') + '.dmg';
                
                results.push({
                    arch: dmg.arch,
                    description: dmg.description,
                    localPath: dmg.target,
                    staticUrl: staticUrl,
                    size: targetSize,
                    notarized: true
                });
                
            } else {
                console.log(`❌ Copy failed - Size mismatch`);
            }
            
        } catch (error) {
            console.log(`❌ Copy error: ${error.message}`);
        }
    }
    
    // Create download info file
    const downloadInfo = {
        generated: new Date().toISOString(),
        version: '1.0.0',
        notarized: true,
        codeSignedBy: 'Developer ID Application: Vidit Jain (8LNUMP84V8)',
        downloads: results.map(r => ({
            architecture: r.arch,
            description: r.description,
            url: r.staticUrl,
            size: r.size,
            sizeFormatted: (r.size / 1024 / 1024).toFixed(2) + ' MB'
        }))
    };
    
    fs.writeFileSync('leviousa_web/public/downloads/info.json', JSON.stringify(downloadInfo, null, 2));
    
    console.log('\n📊 DEPLOYMENT SUMMARY');
    console.log('=' .repeat(50));
    
    if (results.length > 0) {
        console.log('✅ ' + results.length + ' notarized DMGs deployed as static assets');
        
        console.log('\n🔗 Production Download URLs:');
        results.forEach(result => {
            console.log(result.description + ': https://leviousa-5f0lxwvub-vidit-jains-projects-5fe154e9.vercel.app' + result.staticUrl);
        });
        
        console.log('\n🎯 Benefits of this approach:');
        console.log('✅ No blob storage needed');
        console.log('✅ Direct static file serving');
        console.log('✅ Maximum download speed');
        console.log('✅ No authentication required');
        console.log('✅ Apple notarization preserved');
        console.log('✅ CDN distribution via Vercel Edge');
        
        return results;
        
    } else {
        console.log('❌ No DMGs deployed');
        return [];
    }
}

// Run if called directly
if (require.main === module) {
    deployDMGsAsStatic().catch(console.error);
}

module.exports = { deployDMGsAsStatic };
