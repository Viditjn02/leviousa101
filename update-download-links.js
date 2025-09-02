#!/usr/bin/env node

/**
 * Update Website Download Links with GitHub Release URLs
 */

const fs = require('fs');

function updateDownloadAPI() {
    console.log('🔗 UPDATING DOWNLOAD LINKS');
    console.log('=' .repeat(40));
    
    const newUrls = {
        arm64: 'https://github.com/Viditjn02/leviousa101/releases/download/v1.0.0-1756625148/Leviousa-Latest-Apple-Silicon.dmg',
        intel: 'https://github.com/Viditjn02/leviousa101/releases/download/v1.0.0-1756625148/Leviousa-Latest-Intel.dmg'
    };
    
    // Update DMG API
    const dmgApiPath = 'leviousa_web/pages/api/downloads/dmg.ts';
    
    if (fs.existsSync(dmgApiPath)) {
        let apiContent = fs.readFileSync(dmgApiPath, 'utf8');
        
        // Update with GitHub release URLs
        const updatedContent = apiContent.replace(
            /downloadUrl: '.*?'/g,
            function(match) {
                if (match.includes('arm64') || match.includes('Apple')) {
                    return "downloadUrl: '" + newUrls.arm64 + "'";
                } else {
                    return "downloadUrl: '" + newUrls.intel + "'";
                }
            }
        );
        
        fs.writeFileSync(dmgApiPath, updatedContent);
        console.log('✅ Updated DMG API endpoints');
        return true;
    }
    
    return false;
}

function updateLatestAPI() {
    const latestApiPath = 'leviousa_web/pages/api/downloads/latest.ts';
    
    if (fs.existsSync(latestApiPath)) {
        let apiContent = fs.readFileSync(latestApiPath, 'utf8');
        
        // Update latest download info
        const timestamp = new Date().toISOString();
        const newLatestInfo = 
            'const LATEST_DOWNLOADS = {\\n' +
            '  version: "1.0.0-notarized",\\n' +
            '  releaseDate: "' + timestamp + '",\\n' +
            '  notarized: true,\\n' +
            '  codeSignedBy: "Developer ID Application: Vidit Jain (8LNUMP84V8)",\\n' +
            '  downloads: {\\n' +
            '    "macos-arm64": {\\n' +
            '      url: "https://github.com/Viditjn02/leviousa101/releases/download/v1.0.0-1756625148/Leviousa-Latest-Apple-Silicon.dmg",\\n' +
            '      size: "211 MB",\\n' +
            '      platform: "macOS",\\n' +
            '      architecture: "Apple Silicon (M1/M2/M3)",\\n' +
            '      notarized: true\\n' +
            '    },\\n' +
            '    "macos-intel": {\\n' +
            '      url: "https://github.com/Viditjn02/leviousa101/releases/download/v1.0.0-1756625148/Leviousa-Latest-Intel.dmg",\\n' +
            '      size: "218 MB",\\n' +
            '      platform: "macOS",\\n' +
            '      architecture: "Intel",\\n' +
            '      notarized: true\\n' +
            '    }\\n' +
            '  }\\n' +
            '};';
        
        const latestPattern = /const LATEST_DOWNLOADS = \{[\s\S]*?\};/;
        
        if (latestPattern.test(apiContent)) {
            apiContent = apiContent.replace(latestPattern, newLatestInfo);
            fs.writeFileSync(latestApiPath, apiContent);
            console.log('✅ Updated latest downloads API');
            return true;
        }
    }
    
    return false;
}

function main() {
    console.log('🔄 AUTONOMOUS DOWNLOAD LINK UPDATE');
    console.log('=' .repeat(50));
    
    let updated = 0;
    
    if (updateDownloadAPI()) updated++;
    if (updateLatestAPI()) updated++;
    
    console.log('\n📊 UPDATE SUMMARY');
    console.log('✅ Updated ' + updated + ' API endpoints');
    
    if (updated > 0) {
        console.log('\n🚀 Next: Deploy to Vercel');
        console.log('cd leviousa_web && vercel --prod --yes');
        
        console.log('\n🎯 New Download URLs:');
        console.log('ARM64: https://github.com/Viditjn02/leviousa101/releases/download/v1.0.0-1756625148/Leviousa-Latest-Apple-Silicon.dmg');
        console.log('Intel: https://github.com/Viditjn02/leviousa101/releases/download/v1.0.0-1756625148/Leviousa-Latest-Intel.dmg');
        
        console.log('\n✅ Benefits:');
        console.log('🔒 Apple notarized - No security warnings');
        console.log('🌍 GitHub CDN - Global distribution');
        console.log('📦 No file size limits');
        console.log('🚫 No malware scanning interference');
        
        return true;
    } else {
        console.log('⚠️ No APIs found to update');
        return false;
    }
}

main();
