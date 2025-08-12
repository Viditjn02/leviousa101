/**
 * Validate OAuth Services Registry
 * Script to validate the OAuth services registry file
 */

const fs = require('fs').promises;
const path = require('path');
const OAuthRegistryValidator = require('../src/features/invisibility/auth/OAuthRegistryValidator');

async function validateRegistry() {
    console.log('OAuth Services Registry Validator\n');
    
    try {
        // Load the registry
        const registryPath = path.join(__dirname, '..', 'src', 'config', 'oauth-services-registry.json');
        console.log(`Loading registry from: ${registryPath}`);
        
        const registryContent = await fs.readFile(registryPath, 'utf-8');
        const registry = JSON.parse(registryContent);
        
        console.log(`Registry version: ${registry.version}`);
        console.log(`Total services: ${registry.metadata?.totalServices || 'unknown'}`);
        console.log(`Enabled services: ${registry.metadata?.enabledServices || 'unknown'}\n`);
        
        // Create validator
        const validator = new OAuthRegistryValidator();
        
        // Validate the registry
        console.log('Validating registry...\n');
        const result = validator.validateRegistry(registry);
        
        // Display results
        if (result.valid) {
            console.log('✅ Registry validation PASSED!\n');
        } else {
            console.log('❌ Registry validation FAILED!\n');
            console.log('Errors:');
            result.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
            console.log();
        }
        
        if (result.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            result.warnings.forEach(warning => {
                console.log(`  - ${warning}`);
            });
            console.log();
        }
        
        // If there are errors, suggest fixes
        if (!result.valid) {
            const suggestions = validator.suggestFixes(result.errors);
            if (suggestions.length > 0) {
                console.log('💡 Suggested fixes:');
                suggestions.forEach(({ error, suggestion, example }) => {
                    console.log(`\n  Error: ${error}`);
                    console.log(`  Fix: ${suggestion}`);
                    if (example) {
                        console.log(`  Example: ${example}`);
                    }
                });
                console.log();
            }
        }
        
        // Display service summary
        console.log('📊 Service Summary:');
        console.log('─'.repeat(80));
        console.log(`${'Service'.padEnd(20)} ${'Status'.padEnd(10)} ${'Priority'.padEnd(10)} ${'OAuth Provider'.padEnd(20)}`);
        console.log('─'.repeat(80));
        
        const sortedServices = Object.entries(registry.services)
            .sort(([,a], [,b]) => (a.priority || 999) - (b.priority || 999));
        
        for (const [key, service] of sortedServices) {
            const status = service.enabled ? '✅ Enabled' : '❌ Disabled';
            const priority = service.priority || 'N/A';
            const provider = service.oauth?.provider || 'N/A';
            console.log(`${key.padEnd(20)} ${status.padEnd(10)} ${priority.toString().padEnd(10)} ${provider.padEnd(20)}`);
        }
        console.log('─'.repeat(80));
        
        return result.valid ? 0 : 1;
        
    } catch (error) {
        console.error('Error validating registry:', error.message);
        return 1;
    }
}

// Run validation
validateRegistry().then(exitCode => {
    process.exit(exitCode);
}); 