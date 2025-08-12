// Debug script to check OAuth setup
// Run this in your Electron app's main process console or via Node.js

const path = require('path');
const fs = require('fs');

console.log('=== OAuth Setup Debug ===\n');

// Check environment variables
console.log('1. Environment Variables Check:');
const requiredEnvVars = [
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET',
    'GITHUB_CLIENT_ID', 
    'GITHUB_CLIENT_SECRET',
    'SLACK_CLIENT_ID',
    'SLACK_CLIENT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
];

requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 8)}...`);
    } else {
        console.log(`❌ ${varName}: NOT SET`);
    }
});

// Check MCP config directory
console.log('\n2. MCP Config Directory Check:');
const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.mcp-config');
console.log(`Config path: ${configPath}`);

try {
    if (fs.existsSync(configPath)) {
        console.log('✅ Config directory exists');
        
        // Check for config files
        const files = ['credentials.json', 'servers.json', 'oauth-states.json'];
        files.forEach(file => {
            const filePath = path.join(configPath, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.log(`✅ ${file}: ${stats.size} bytes`);
            } else {
                console.log(`❌ ${file}: NOT FOUND`);
            }
        });
    } else {
        console.log('❌ Config directory does not exist');
    }
} catch (error) {
    console.log('❌ Error checking config directory:', error.message);
}

// Check if invisibility service is available
console.log('\n3. Service Availability Check:');
if (global.invisibilityService) {
    console.log('✅ global.invisibilityService is available');
    
    if (global.invisibilityService.mcpClient) {
        console.log('✅ mcpClient is available');
        
        if (global.invisibilityService.mcpClient.configManager) {
            console.log('✅ configManager is available');
            
            // Check credentials in config manager
            const configManager = global.invisibilityService.mcpClient.configManager;
            console.log('\n4. Loaded Credentials:');
            const credsToCheck = [
                'notion_client_id',
                'github_client_id', 
                'slack_client_id'
            ];
            
            credsToCheck.forEach(cred => {
                const value = configManager.getCredential(cred);
                if (value) {
                    console.log(`✅ ${cred}: ${value.substring(0, 8)}...`);
                } else {
                    console.log(`❌ ${cred}: NOT LOADED`);
                }
            });
        } else {
            console.log('❌ configManager is NOT available');
        }
    } else {
        console.log('❌ mcpClient is NOT available');
    }
} else {
    console.log('❌ global.invisibilityService is NOT available');
}

console.log('\n=== End Debug ===');
