#!/usr/bin/env node

/**
 * Get Vercel Blob Token Programmatically
 */

const { execSync } = require('child_process');

async function getBlobToken() {
    try {
        console.log('🔑 Getting Vercel auth token...');
        
        // Get Vercel auth token
        const authToken = execSync('vercel auth show', { encoding: 'utf8' }).trim();
        console.log(`✅ Auth token: ${authToken.substring(0, 20)}...`);
        
        // Try to get team info
        const fetch = (await import('node-fetch')).default;
        
        console.log('🏢 Getting team info...');
        const teamResponse = await fetch('https://api.vercel.com/v2/teams', {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (teamResponse.ok) {
            const teams = await teamResponse.json();
            console.log(`✅ Found ${teams.teams?.length || 0} teams`);
            
            // Use first team or personal account
            const teamId = teams.teams?.[0]?.id;
            console.log(`🎯 Using team: ${teamId || 'personal'}`);
            
            // Try to create/get blob store
            console.log('📦 Setting up blob storage...');
            
            const storeUrl = teamId 
                ? `https://api.vercel.com/v1/blob/stores?teamId=${teamId}`
                : 'https://api.vercel.com/v1/blob/stores';
                
            const storeResponse = await fetch(storeUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'leviousa-dmg-storage-' + Date.now()
                })
            });
            
            if (storeResponse.ok) {
                const store = await storeResponse.json();
                console.log('✅ Blob store created:', store.id);
                
                // Generate blob token
                const tokenUrl = teamId
                    ? `https://api.vercel.com/v1/blob/stores/${store.id}/tokens?teamId=${teamId}`
                    : `https://api.vercel.com/v1/blob/stores/${store.id}/tokens`;
                    
                const tokenResponse = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: 'leviousa-dmg-upload-token'
                    })
                });
                
                if (tokenResponse.ok) {
                    const tokenData = await tokenResponse.json();
                    console.log('🎉 Blob token generated successfully!');
                    return tokenData.token;
                } else {
                    const error = await tokenResponse.text();
                    console.error('❌ Token generation failed:', error);
                }
            } else {
                const error = await storeResponse.text();
                console.error('❌ Store creation failed:', error);
            }
        } else {
            const error = await teamResponse.text();
            console.error('❌ Team fetch failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    return null;
}

// If called directly, run the function
if (require.main === module) {
    getBlobToken().then(token => {
        if (token) {
            console.log(`\n🔑 BLOB_READ_WRITE_TOKEN=${token}`);
            console.log('\n✅ Use this token for uploads!');
        } else {
            console.log('\n❌ Could not generate blob token');
            console.log('💡 Alternative: Manual Vercel dashboard setup');
        }
    });
}

module.exports = { getBlobToken };
