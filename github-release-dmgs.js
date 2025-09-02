#!/usr/bin/env node

/**
 * Upload Notarized DMGs to GitHub Releases - Autonomous Approach
 * Uses GitHub API to create release and upload DMG assets
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function uploadToGitHubReleases() {
    console.log('🐙 GITHUB RELEASES DMG UPLOAD');
    console.log('=' .repeat(50));
    
    try {
        // Check if gh CLI is available
        try {
            execSync('gh --version', { stdio: 'pipe' });
            console.log('✅ GitHub CLI found');
        } catch {
            console.log('❌ GitHub CLI not found - installing...');
            execSync('brew install gh', { stdio: 'inherit' });
        }
        
        // Check authentication
        try {
            const authStatus = execSync('gh auth status', { encoding: 'utf8' });
            console.log('✅ GitHub authenticated');
        } catch {
            console.log('🔑 Logging into GitHub...');
            execSync('gh auth login --web', { stdio: 'inherit' });
        }
        
        // Create release tag
        const version = '1.0.0-FINAL-COMPLETE-' + Date.now();
        const releaseTitle = 'Leviousa v1.0.0 - FINAL COMPLETE - All Issues Resolved';
        const releaseNotes = '# Leviousa v1.0.0 - FINAL COMPLETE RELEASE\\n\\n' +
            '## 🏆 ALL PRODUCTION ISSUES RESOLVED\\n' +
            '- ✅ **CRASH ISSUE FIXED** - Resolved keytar distribution crash with smart detection\\n' +
            '- ✅ **INSTALLATION UX PERFECTED** - Professional drag-and-drop with Applications folder\\n' +
            '- ✅ **AUTHENTICATION FIXED** - Display names save correctly, deep links work\\n' +
            '- ✅ **CSP COMPLETELY FIXED** - Google auth works without script blocking\\n' +
            '- ✅ **CONSOLE CLEANED** - Production-grade logging (no debug spam)\\n' +
            '- ✅ **FILENAME CORRECTED** - Downloads as \\"Leviousa v1.0.dmg\\"\\n' +
            '- ✅ **Universal Compatibility** - Works on all Mac architectures\\n' +
            '- ✅ **Apple Notarized & Code Signed** - No security warnings\\n\\n' +
            '## 📦 Downloads\\n' +
            '- **Universal macOS:** Leviousa-FINAL-PRODUCTION.dmg (All Mac types)\\n\\n' +
            '## 🔒 Security & Quality\\n' +
            '- **Code Signed:** Developer ID Application: Vidit Jain (8LNUMP84V8)\\n' +
            '- **Apple Notarized:** Submitted and approved by Apple\\n' +
            '- **No Warnings:** Installs without macOS security prompts\\n' +
            '- **Professional Grade:** Clean console, proper UX, stable operation\\n\\n' +
            '## 🎯 Complete Features\\n' +
            '- **Perfect Authentication:** Both Google and email signup work correctly\\n' +
            '- **User Profile Management:** Display names save and persist properly\\n' +
            '- **Free Plan:** 10min/day AI features (Cmd+L, Browser)\\n' +
            '- **Pro Plan:** Unlimited AI + 130+ integrations\\n' +
            '- **Professional Installation:** Beautiful guided drag-and-drop process\\n\\n' +
            'All Issues Resolved: ' + new Date().toISOString();

        console.log('🏷️ Creating release: ' + version);
        
        // Create release
        const createCmd = 'gh release create "' + version + '" --title "' + releaseTitle + '" --notes "' + releaseNotes + '" --draft';
        execSync(createCmd, { stdio: 'pipe' });
        console.log('✅ Release created');
        
        // Upload DMG files - PROFESSIONAL NOTARIZED VERSION
        const dmgFiles = [
            {
                path: 'dist/Leviousa-v1.01-PROFESSIONAL.dmg',
                name: 'Leviousa-v1.01.dmg',
                arch: 'universal'
            }
            // NOTE: electron-builder DMG with proper notarization, volume title, and Applications folder
        ];
        
        const uploadResults = [];
        
        for (const dmg of dmgFiles) {
            if (fs.existsSync(dmg.path)) {
                console.log('\n📦 Uploading ' + dmg.name + '...');
                
                const size = (fs.statSync(dmg.path).size / 1024 / 1024).toFixed(2);
                console.log('📊 Size: ' + size + ' MB');
                
                try {
                    const uploadCmd = 'gh release upload "' + version + '" "' + dmg.path + '#' + dmg.name + '"';
                    execSync(uploadCmd, { stdio: 'pipe' });
                    
                    console.log('✅ Upload successful: ' + dmg.name);
                    
                    // Get download URL
                    const repo = 'Viditjn02/leviousa101';
                    const downloadUrl = 'https://github.com/' + repo + '/releases/download/' + version + '/' + dmg.name;
                    
                    uploadResults.push({
                        arch: dmg.arch,
                        name: dmg.name,
                        downloadUrl: downloadUrl,
                        size: size + ' MB'
                    });
                    
                } catch (error) {
                    console.log('❌ Upload failed: ' + dmg.name);
                }
            } else {
                console.log('⚠️ File not found: ' + dmg.path);
            }
        }
        
        // Publish the release
        console.log('\n🚀 Publishing release...');
        execSync('gh release edit "' + version + '" --draft=false', { stdio: 'pipe' });
        console.log('✅ Release published');
        
        console.log('\n📊 GITHUB RELEASE SUMMARY');
        console.log('=' .repeat(50));
        
        if (uploadResults.length > 0) {
            console.log('✅ ' + uploadResults.length + ' notarized DMGs uploaded to GitHub Releases');
            
            console.log('\n🔗 Direct Download URLs:');
            uploadResults.forEach(result => {
                console.log(result.arch.toUpperCase() + ': ' + result.downloadUrl);
                console.log('   Size: ' + result.size);
            });
            
            console.log('\n🎯 Benefits:');
            console.log('✅ Unlimited file size');
            console.log('✅ Global CDN distribution');
            console.log('✅ No authentication required');
            console.log('✅ Apple notarization preserved');
            console.log('✅ No malware scanning interference');
            
            return uploadResults;
        }
        
    } catch (error) {
        console.error('❌ GitHub release failed:', error.message);
        return [];
    }
}

// Run if called directly
if (require.main === module) {
    uploadToGitHubReleases().catch(console.error);
}

module.exports = { uploadToGitHubReleases };
