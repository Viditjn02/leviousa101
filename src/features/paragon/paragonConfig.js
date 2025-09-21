/**
 * Robust Paragon configuration loader for both development and packaged apps
 * Handles environment variable loading with multiple fallback strategies
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ParagonConfig {
    constructor() {
        this.config = null;
        this.initialized = false;
    }

    /**
     * Initialize Paragon configuration with multiple fallback strategies
     */
    initialize() {
        if (this.initialized) {
            return this.config;
        }

        console.log('[ParagonConfig] Initializing Paragon configuration...');

        // Strategy 1: Use dotenv to load .env file first (before checking process.env)
        this.loadDotenvConfig();

        // Strategy 2: Load from environment variables (now loaded by dotenv)
        let projectId = process.env.PARAGON_PROJECT_ID || process.env.PROJECT_ID;
        let signingKey = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY;

        if (projectId && signingKey) {
            console.log('[ParagonConfig] ✅ Loaded from environment variables');
            this.config = {
                projectId,
                signingKey: signingKey.replace(/\\n/g, '\n'),
                source: 'environment'
            };
            this.initialized = true;
            return this.config;
        }

        // Strategy 2: Load from .env file with multiple path attempts
        const possibleEnvPaths = this.getEnvFilePaths();
        
        for (const envPath of possibleEnvPaths) {
            console.log(`[ParagonConfig] Trying .env file: ${envPath}`);
            
            if (fs.existsSync(envPath)) {
                try {
                    const envConfig = this.loadEnvFile(envPath);
                    if (envConfig.projectId && envConfig.signingKey) {
                        console.log(`[ParagonConfig] ✅ Loaded from .env file: ${envPath}`);
                        this.config = {
                            ...envConfig,
                            source: `env_file:${envPath}`
                        };
                        this.initialized = true;
                        return this.config;
                    }
                } catch (error) {
                    console.warn(`[ParagonConfig] Failed to load .env from ${envPath}:`, error.message);
                    continue;
                }
            } else {
                console.log(`[ParagonConfig] .env file not found: ${envPath}`);
            }
        }

        // Strategy 3: Load from a dedicated config file in app data (for packaged apps)
        const configPath = this.getAppConfigPath();
        if (fs.existsSync(configPath)) {
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (configData.projectId && configData.signingKey) {
                    console.log(`[ParagonConfig] ✅ Loaded from app config: ${configPath}`);
                    this.config = {
                        ...configData,
                        source: `config_file:${configPath}`
                    };
                    this.initialized = true;
                    return this.config;
                }
            } catch (error) {
                console.warn(`[ParagonConfig] Failed to load app config from ${configPath}:`, error.message);
            }
        }

        // All strategies failed
        console.error('[ParagonConfig] ❌ Failed to load Paragon configuration from all sources');
        throw new Error('Paragon configuration not found. Please check PROJECT_ID and SIGNING_KEY are available.');
    }

    /**
     * Load .env file using dotenv with proper path resolution for packaged apps
     */
    loadDotenvConfig() {
        try {
            const dotenv = require('dotenv');
            
            // Get the correct path for .env file (packaged vs development)
            const envPaths = this.getEnvFilePaths();
            
            for (const envPath of envPaths) {
                if (fs.existsSync(envPath)) {
                    console.log(`[ParagonConfig] 📁 Loading dotenv from: ${envPath}`);
                    
                    const result = dotenv.config({ path: envPath });
                    
                    if (!result.error) {
                        console.log(`[ParagonConfig] ✅ Dotenv loaded successfully from: ${envPath}`);
                        return true;
                    } else {
                        console.warn(`[ParagonConfig] ⚠️ Dotenv load failed:`, result.error.message);
                    }
                } else {
                    console.log(`[ParagonConfig] 📂 Env file not found: ${envPath}`);
                }
            }
            
            console.warn(`[ParagonConfig] ⚠️ No .env file found in any expected location`);
            return false;
            
        } catch (error) {
            console.error(`[ParagonConfig] ❌ Error loading dotenv:`, error.message);
            return false;
        }
    }

    /**
     * Get possible paths for the .env file
     */
    getEnvFilePaths() {
        const possiblePaths = [];

        // Path 1: Relative to current module (development)
        possiblePaths.push(path.join(__dirname, '../../../services/paragon-mcp/.env'));
        
        // Path 2: Relative to app root (packaged apps)
        if (app && app.getAppPath) {
            possiblePaths.push(path.join(app.getAppPath(), 'services/paragon-mcp/.env'));
            possiblePaths.push(path.join(app.getAppPath(), '../services/paragon-mcp/.env'));
        }

        // Path 3: Relative to process.cwd() 
        possiblePaths.push(path.join(process.cwd(), 'services/paragon-mcp/.env'));
        
        // Path 4: In app resources directory (for packaged apps)
        if (process.resourcesPath) {
            possiblePaths.push(path.join(process.resourcesPath, 'services/paragon-mcp/.env'));
            possiblePaths.push(path.join(process.resourcesPath, 'app/services/paragon-mcp/.env'));
        }

        return possiblePaths;
    }

    /**
     * Load and parse .env file manually
     */
    loadEnvFile(filePath) {
        const envContent = fs.readFileSync(filePath, 'utf8');
        const config = {};

        const lines = envContent.split('\n');
        let multilineKey = null;
        let multilineValue = [];
        let inQuotes = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Handle multiline values (like private keys)
            if (multilineKey) {
                multilineValue.push(line);
                
                // Check if we're ending a quoted multiline value
                if (inQuotes && line.trim().endsWith('"')) {
                    // Remove closing quote from last line
                    const lastLine = multilineValue[multilineValue.length - 1];
                    multilineValue[multilineValue.length - 1] = lastLine.replace(/"$/, '');
                    config[multilineKey] = multilineValue.join('\n');
                    multilineKey = null;
                    multilineValue = [];
                    inQuotes = false;
                } else if (!inQuotes && line.includes('-----END')) {
                    config[multilineKey] = multilineValue.join('\n');
                    multilineKey = null;
                    multilineValue = [];
                }
                continue;
            }

            // Skip empty lines and comments
            if (!line.trim() || line.startsWith('#')) {
                continue;
            }

            const [key, ...valueParts] = line.split('=');
            if (!key || valueParts.length === 0) {
                continue;
            }

            let value = valueParts.join('=');
            
            // Handle quoted multiline values (like private keys in quotes)
            if (value.startsWith('"') && !value.endsWith('"')) {
                // Start of quoted multiline value
                multilineKey = key.trim();
                multilineValue = [value.substring(1)]; // Remove opening quote
                inQuotes = true;
                continue;
            }
            
            // Remove surrounding quotes for single-line values
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Handle unquoted private key start (multiline)
            if (value.includes('-----BEGIN')) {
                multilineKey = key.trim();
                multilineValue = [value];
                if (value.includes('-----END')) {
                    // Single line private key
                    config[multilineKey] = value;
                    multilineKey = null;
                    multilineValue = [];
                }
                continue;
            }

            config[key.trim()] = value;
        }

        // Handle case where multiline value doesn't end properly
        if (multilineKey && multilineValue.length > 0) {
            config[multilineKey] = multilineValue.join('\n');
        }

        // Map environment variable names
        return {
            projectId: config.PARAGON_PROJECT_ID || config.PROJECT_ID,
            signingKey: (config.PARAGON_SIGNING_KEY || config.SIGNING_KEY || '').replace(/\\n/g, '\n')
        };
    }

    /**
     * Get app-specific config file path
     */
    getAppConfigPath() {
        if (app && app.getPath) {
            return path.join(app.getPath('userData'), 'paragon-config.json');
        }
        return path.join(process.cwd(), 'paragon-config.json');
    }

    /**
     * Save configuration to app config file (for packaged apps)
     */
    saveConfig(config) {
        try {
            const configPath = this.getAppConfigPath();
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`[ParagonConfig] Configuration saved to: ${configPath}`);
            return true;
        } catch (error) {
            console.error('[ParagonConfig] Failed to save configuration:', error);
            return false;
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        if (!this.initialized) {
            this.initialize();
        }
        return this.config;
    }

    /**
     * Check if configuration is valid
     */
    isValid() {
        const config = this.getConfig();
        return config && config.projectId && config.signingKey;
    }

    /**
     * Get configuration status for debugging
     */
    getStatus() {
        return {
            initialized: this.initialized,
            hasConfig: !!this.config,
            hasProjectId: !!(this.config?.projectId),
            hasSigningKey: !!(this.config?.signingKey),
            source: this.config?.source || 'none'
        };
    }
}

// Export singleton instance
module.exports = new ParagonConfig();
