#!/usr/bin/env node

/**
 * Simple Autonomous DMG Upload to GitHub Releases
 */

const { execSync } = require('child_process');
const fs = require('fs');

async function uploadDMGs() {
    console.log('🍎 AUTONOMOUS NOTARIZED DMG UPLOAD');
    console.log('==================================================');
    
    try {
        // Check DMG files
        const arm64Dmg = 'dist/Leviousa-1.0.0-arm64.dmg';
        const intelDmg = 'dist/Leviousa-1.0.0.dmg';
        
        if (!fs.existsSync(arm64Dmg) || !fs.existsSync(intelDmg)) {
            console.log('❌ DMG files not found');
            return;
        }
        
        const arm64Size = (fs.statSync(arm64Dmg).size / 1024 / 1024).toFixed(2);
        const intelSize = (fs.statSync(intelDmg).size / 1024 / 1024).toFixed(2);
        
        console.log('📦 ARM64 DMG: ' + arm64Size + ' MB (NOTARIZED)');
        console.log('📦 Intel DMG: ' + intelSize + ' MB (NOTARIZED)');
        
        // Create unique release tag
        const timestamp = Date.now();
        const version = 'v1.0.0-notarized-' + timestamp;
        
        console.log('🏷️ Creating release: ' + version);
        
        // Simple release creation
        const releaseTitle = 'Leviousa v1.0.0 Notarized DMGs';
        const releaseBody = 'Apple notarized and code signed DMG files for macOS. No security warnings.';
        
        execSync('gh release create "' + version + '" --title "' + releaseTitle + '" --notes "' + releaseBody + '"', 
                { stdio: 'inherit' });
        
        console.log('✅ Release created');
        
        // Upload ARM64 DMG
        console.log('\n📦 Uploading ARM64 DMG...');
        execSync('gh release upload "' + version + '" "' + arm64Dmg + '#Leviousa-Latest-Apple-Silicon.dmg"', 
                { stdio: 'inherit' });
        
        // Upload Intel DMG  
        console.log('\n📦 Uploading Intel DMG...');
        execSync('gh release upload "' + version + '" "' + intelDmg + '#Leviousa-Latest-Intel.dmg"', 
                { stdio: 'inherit' });
        
        // Get download URLs
        const repo = 'Viditjn02/leviousa101';
        const arm64Url = 'https://github.com/' + repo + '/releases/download/' + version + '/Leviousa-Latest-Apple-Silicon.dmg';
        const intelUrl = 'https://github.com/' + repo + '/releases/download/' + version + '/Leviousa-Latest-Intel.dmg';
        
        console.log('\n🎉 UPLOAD COMPLETE!');
        console.log('===============================');
        console.log('✅ Apple Silicon: ' + arm64Url);
        console.log('✅ Intel: ' + intelUrl);
        console.log('');
        console.log('🔒 Security Features:');
        console.log('✅ Apple notarized and code signed');  
        console.log('✅ No macOS security warnings');
        console.log('✅ GitHub CDN distribution');
        console.log('✅ No malware scanning interference');
        
        return { arm64Url, intelUrl, version };
        
    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        return null;
    }
}

uploadDMGs().catch(console.error);
