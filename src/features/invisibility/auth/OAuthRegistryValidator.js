/**
 * OAuth Registry Validator
 * Validates OAuth service registry entries to ensure they have all required fields
 * Helps maintain data quality and catch configuration errors
 */

const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[OAuthRegistryValidator] ${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class OAuthRegistryValidator {
    constructor() {
        // Define required fields for each service entry
        this.requiredServiceFields = {
            name: { type: 'string', description: 'Human-readable service name' },
            description: { type: 'string', description: 'Service description' },
            enabled: { type: 'boolean', description: 'Whether the service is enabled' },
            priority: { type: 'number', description: 'Display priority (lower = higher priority)' },
            serverConfig: { type: 'object', description: 'Server configuration' },
            oauth: { type: 'object', description: 'OAuth configuration' },
            capabilities: { type: 'array', description: 'List of service capabilities' }
        };

        this.requiredServerConfigFields = {
            command: { type: 'string', description: 'Command to run the server' },
            args: { type: 'array', description: 'Arguments for the command' }
        };

        this.requiredOAuthFields = {
            provider: { type: 'string', description: 'OAuth provider identifier' },
            authUrl: { type: 'string', description: 'OAuth authorization URL' },
            tokenUrl: { type: 'string', description: 'OAuth token exchange URL' },
            scopes: { type: 'object', description: 'OAuth scopes configuration' }
        };

        this.requiredScopesFields = {
            required: { type: 'array', description: 'Required OAuth scopes' },
            default: { type: 'array', description: 'Default OAuth scopes' }
        };

        logger.info('OAuthRegistryValidator initialized');
    }

    /**
     * Validate the entire OAuth services registry
     */
    validateRegistry(registry) {
        const errors = [];
        const warnings = [];

        // Check top-level structure
        if (!registry.version) {
            errors.push('Registry missing version field');
        }

        if (!registry.services || typeof registry.services !== 'object') {
            errors.push('Registry missing or invalid services object');
            return { valid: false, errors, warnings };
        }

        if (!registry.metadata || typeof registry.metadata !== 'object') {
            warnings.push('Registry missing metadata object');
        }

        // Validate each service
        for (const [serviceKey, service] of Object.entries(registry.services)) {
            const serviceErrors = this.validateService(serviceKey, service);
            errors.push(...serviceErrors.map(err => `[${serviceKey}] ${err}`));
        }

        // Validate metadata if present
        if (registry.metadata) {
            const metadataErrors = this.validateMetadata(registry.metadata, registry.services);
            errors.push(...metadataErrors.map(err => `[metadata] ${err}`));
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate a single service entry
     */
    validateService(serviceKey, service) {
        const errors = [];

        // Check required fields
        for (const [field, config] of Object.entries(this.requiredServiceFields)) {
            if (!(field in service)) {
                errors.push(`Missing required field: ${field}`);
            } else {
                // Special handling for arrays since typeof array === 'object'
                if (config.type === 'array') {
                    if (!Array.isArray(service[field])) {
                        errors.push(`Invalid type for ${field}: expected array, got ${Array.isArray(service[field]) ? 'array' : typeof service[field]}`);
                    }
                } else if (typeof service[field] !== config.type) {
                    errors.push(`Invalid type for ${field}: expected ${config.type}, got ${typeof service[field]}`);
                }
            }
        }

        // Validate serverConfig
        if (service.serverConfig) {
            const serverConfigErrors = this.validateServerConfig(service.serverConfig);
            errors.push(...serverConfigErrors.map(err => `serverConfig.${err}`));
        }

        // Validate OAuth configuration
        if (service.oauth) {
            const oauthErrors = this.validateOAuthConfig(service.oauth);
            errors.push(...oauthErrors.map(err => `oauth.${err}`));
        }

        // Validate capabilities array
        if (service.capabilities && !Array.isArray(service.capabilities)) {
            errors.push('capabilities must be an array');
        }

        // Validate priority
        if (service.priority !== undefined && (typeof service.priority !== 'number' || service.priority < 0)) {
            errors.push('priority must be a non-negative number');
        }

        // Validate URLs
        if (service.documentation && !this.isValidUrl(service.documentation)) {
            errors.push('documentation must be a valid URL');
        }

        if (service.icon && !this.isValidUrl(service.icon)) {
            errors.push('icon must be a valid URL');
        }

        return errors;
    }

    /**
     * Validate server configuration
     */
    validateServerConfig(serverConfig) {
        const errors = [];

        for (const [field, config] of Object.entries(this.requiredServerConfigFields)) {
            if (!(field in serverConfig)) {
                errors.push(`Missing required field: ${field}`);
            } else {
                // Special handling for arrays since typeof array === 'object'
                if (config.type === 'array') {
                    if (!Array.isArray(serverConfig[field])) {
                        errors.push(`Invalid type for ${field}: expected array, got ${Array.isArray(serverConfig[field]) ? 'array' : typeof serverConfig[field]}`);
                    }
                } else if (typeof serverConfig[field] !== config.type) {
                    errors.push(`Invalid type for ${field}: expected ${config.type}, got ${typeof serverConfig[field]}`);
                }
            }
        }

        // Validate envMapping if present
        if (serverConfig.envMapping && typeof serverConfig.envMapping !== 'object') {
            errors.push('envMapping must be an object');
        }

        // Validate args array
        if (serverConfig.args && !Array.isArray(serverConfig.args)) {
            errors.push('args must be an array');
        } else if (serverConfig.args) {
            serverConfig.args.forEach((arg, index) => {
                if (typeof arg !== 'string') {
                    errors.push(`args[${index}] must be a string`);
                }
            });
        }

        return errors;
    }

    /**
     * Validate OAuth configuration
     */
    validateOAuthConfig(oauthConfig) {
        const errors = [];

        for (const [field, config] of Object.entries(this.requiredOAuthFields)) {
            if (!(field in oauthConfig)) {
                errors.push(`Missing required field: ${field}`);
            } else {
                // Special handling for arrays since typeof array === 'object'
                if (config.type === 'array') {
                    if (!Array.isArray(oauthConfig[field])) {
                        errors.push(`Invalid type for ${field}: expected array, got ${Array.isArray(oauthConfig[field]) ? 'array' : typeof oauthConfig[field]}`);
                    }
                } else if (typeof oauthConfig[field] !== config.type) {
                    errors.push(`Invalid type for ${field}: expected ${config.type}, got ${typeof oauthConfig[field]}`);
                }
            }
        }

        // Validate URLs
        if (oauthConfig.authUrl && !this.isValidUrl(oauthConfig.authUrl)) {
            errors.push('authUrl must be a valid URL');
        }

        if (oauthConfig.tokenUrl && !this.isValidUrl(oauthConfig.tokenUrl)) {
            errors.push('tokenUrl must be a valid URL');
        }

        // Validate scopes
        if (oauthConfig.scopes) {
            const scopesErrors = this.validateScopes(oauthConfig.scopes);
            errors.push(...scopesErrors.map(err => `scopes.${err}`));
        }

        // Validate PKCE flag
        if ('pkce' in oauthConfig && typeof oauthConfig.pkce !== 'boolean') {
            errors.push('pkce must be a boolean');
        }

        // Validate customParams
        if (oauthConfig.customParams && typeof oauthConfig.customParams !== 'object') {
            errors.push('customParams must be an object');
        }

        return errors;
    }

    /**
     * Validate OAuth scopes configuration
     */
    validateScopes(scopes) {
        const errors = [];

        for (const [field, config] of Object.entries(this.requiredScopesFields)) {
            if (!(field in scopes)) {
                errors.push(`Missing required field: ${field}`);
            } else if (!Array.isArray(scopes[field])) {
                errors.push(`${field} must be an array`);
            } else {
                scopes[field].forEach((scope, index) => {
                    if (typeof scope !== 'string') {
                        errors.push(`${field}[${index}] must be a string`);
                    }
                });
            }
        }

        return errors;
    }

    /**
     * Validate registry metadata
     */
    validateMetadata(metadata, services) {
        const errors = [];

        // Check metadata consistency
        if (metadata.totalServices !== undefined) {
            const actualTotal = Object.keys(services).length;
            if (metadata.totalServices !== actualTotal) {
                errors.push(`totalServices (${metadata.totalServices}) doesn't match actual count (${actualTotal})`);
            }
        }

        if (metadata.enabledServices !== undefined) {
            const actualEnabled = Object.values(services).filter(s => s.enabled).length;
            if (metadata.enabledServices !== actualEnabled) {
                errors.push(`enabledServices (${metadata.enabledServices}) doesn't match actual count (${actualEnabled})`);
            }
        }

        return errors;
    }

    /**
     * Check if a string is a valid URL
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Validate a single service before adding it to the registry
     */
    validateNewService(serviceKey, service) {
        const errors = this.validateService(serviceKey, service);
        
        if (errors.length > 0) {
            logger.error('Service validation failed', { serviceKey, errors });
            return {
                valid: false,
                errors
            };
        }

        logger.info('Service validation passed', { serviceKey });
        return {
            valid: true,
            errors: []
        };
    }

    /**
     * Suggest fixes for common validation errors
     */
    suggestFixes(errors) {
        const suggestions = [];

        for (const error of errors) {
            if (error.includes('Missing required field')) {
                const field = error.match(/Missing required field: (\w+)/)?.[1];
                if (field && this.requiredServiceFields[field]) {
                    suggestions.push({
                        error,
                        suggestion: `Add '${field}' field with type ${this.requiredServiceFields[field].type}`,
                        example: this.getFieldExample(field)
                    });
                }
            } else if (error.includes('must be a valid URL')) {
                suggestions.push({
                    error,
                    suggestion: 'Ensure the URL includes the protocol (http:// or https://)',
                    example: 'https://example.com'
                });
            }
        }

        return suggestions;
    }

    /**
     * Get example value for a field
     */
    getFieldExample(field) {
        const examples = {
            name: '"My Service"',
            description: '"Connect to My Service for data access"',
            enabled: 'true',
            priority: '5',
            capabilities: '["read", "write", "delete"]',
            authUrl: '"https://api.example.com/oauth/authorize"',
            tokenUrl: '"https://api.example.com/oauth/token"',
            provider: '"myservice"',
            command: '"npx"',
            args: '["-y", "@example/mcp-server"]'
        };

        return examples[field] || 'null';
    }
}

module.exports = OAuthRegistryValidator; 