/**
 * Add OAuth Service Script
 * Demonstrates how to add a new OAuth service to the registry
 */

const fs = require('fs').promises;
const path = require('path');
const OAuthRegistryValidator = require('../src/features/invisibility/auth/OAuthRegistryValidator');

async function addNewOAuthService() {
    console.log('Adding New OAuth Service to Registry\n');
    
    try {
        // Load the existing registry
        const registryPath = path.join(__dirname, '..', 'src', 'config', 'oauth-services-registry.json');
        const registryContent = await fs.readFile(registryPath, 'utf-8');
        const registry = JSON.parse(registryContent);
        
        // Define the new service (Trello as an example)
        const newService = {
            "name": "Trello",
            "description": "Connect to Trello for board management, cards, and lists",
            "enabled": false,
            "priority": 11,
            "serverConfig": {
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-trello"],
                "envMapping": {
                    "apiKey": "TRELLO_API_KEY",
                    "token": "TRELLO_OAUTH_TOKEN"
                }
            },
            "oauth": {
                "provider": "trello",
                "authUrl": "https://trello.com/1/authorize",
                "tokenUrl": "https://trello.com/1/OAuthGetAccessToken",
                "scopes": {
                    "required": ["read", "write"],
                    "default": ["read", "write", "account"]
                },
                "pkce": false,
                "customParams": {
                    "expiration": "never",
                    "name": "MCP Trello Integration"
                }
            },
            "capabilities": ["boards", "cards", "lists", "members", "organizations"],
            "documentation": "https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/",
            "icon": "https://trello.com/favicon.ico"
        };
        
        // Check if service already exists
        if (registry.services.trello) {
            console.log('⚠️  Service "trello" already exists in the registry');
            return;
        }
        
        // Validate the new service
        const validator = new OAuthRegistryValidator();
        const validation = validator.validateNewService('trello', newService);
        
        if (!validation.valid) {
            console.log('❌ Service validation failed:');
            validation.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
            return;
        }
        
        console.log('✅ Service validation passed!');
        
        // Add the service to the registry
        registry.services.trello = newService;
        
        // Update metadata
        registry.metadata.totalServices = Object.keys(registry.services).length;
        registry.metadata.enabledServices = Object.values(registry.services).filter(s => s.enabled).length;
        registry.metadata.lastUpdated = new Date().toISOString().split('T')[0];
        
        // Save the updated registry
        await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
        
        console.log('\n✅ Successfully added Trello to the OAuth services registry!');
        
        // Display the new service summary
        console.log('\n📋 New Service Details:');
        console.log('─'.repeat(50));
        console.log(`Name: ${newService.name}`);
        console.log(`Provider: ${newService.oauth.provider}`);
        console.log(`Priority: ${newService.priority}`);
        console.log(`Status: ${newService.enabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`Capabilities: ${newService.capabilities.join(', ')}`);
        console.log('─'.repeat(50));
        
        // Show updated registry stats
        console.log('\n📊 Updated Registry Statistics:');
        console.log(`Total Services: ${registry.metadata.totalServices}`);
        console.log(`Enabled Services: ${registry.metadata.enabledServices}`);
        console.log(`Last Updated: ${registry.metadata.lastUpdated}`);
        
    } catch (error) {
        console.error('❌ Error adding service:', error.message);
        return 1;
    }
}

// Run the script
addNewOAuthService().then(() => {
    console.log('\n✨ Done!');
}); 