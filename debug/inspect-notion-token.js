#!/usr/bin/env node

const path = require('path');
const MCPConfigManager = require('../src/config/mcpConfig');

async function inspectNotionToken() {
    console.log('🔍 Inspecting stored Notion token...\n');
    
    const configManager = new MCPConfigManager();
    await configManager.initialize();
    
    // Check what's stored for notion_read_token
    const tokenKey = 'notion_read_token';
    const rawToken = configManager.getCredential(tokenKey);
    
    console.log(`Raw stored token (${tokenKey}):`, rawToken);
    
    if (rawToken) {
        try {
            const parsedToken = JSON.parse(rawToken);
            console.log('\nParsed token structure:');
            console.log('- access_token:', parsedToken.access_token?.substring(0, 20) + '...');
            console.log('- refresh_token:', parsedToken.refresh_token?.substring(0, 20) + '...');
            console.log('- expires_at:', new Date(parsedToken.expires_at));
            console.log('- scope:', parsedToken.scope);
            
            // Test what getValidAccessToken returns
            const accessToken = await configManager.getValidAccessToken('notion', 'read');
            console.log('\ngetValidAccessToken result:', accessToken?.substring(0, 20) + '...');
            console.log('Token type:', typeof accessToken);
            
        } catch (error) {
            console.error('Error parsing token:', error.message);
        }
    } else {
        console.log('❌ No token found!');
    }
}

inspectNotionToken().catch(console.error);
