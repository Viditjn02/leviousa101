const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

class ParagonJwtService {
    constructor() {
        this.signingKey = null;
        this.projectId = null;
        this.initialized = false;
    }

    initialize(config = {}) {
        try {
            // Get configuration from environment or config object
            this.projectId = config.projectId || process.env.PARAGON_PROJECT_ID;
            
            // Load signing key from string or file
            if (config.signingKey || process.env.PARAGON_SIGNING_KEY) {
                this.signingKey = config.signingKey || process.env.PARAGON_SIGNING_KEY;
                // Replace literal \n with actual newlines
                this.signingKey = this.signingKey.replace(/\\n/g, '\n');
            } else if (config.signingKeyPath || process.env.PARAGON_SIGNING_KEY_PATH) {
                const keyPath = config.signingKeyPath || process.env.PARAGON_SIGNING_KEY_PATH;
                this.signingKey = fs.readFileSync(keyPath, 'utf8');
            }

            if (!this.signingKey) {
                console.warn('[ParagonJWT] No signing key configured. JWT generation will fail.');
                return false;
            }

            if (!this.projectId) {
                console.warn('[ParagonJWT] No project ID configured. JWT generation may fail.');
                return false;
            }

            this.initialized = true;
            console.log('[ParagonJWT] JWT service initialized successfully');
            return true;
        } catch (error) {
            console.error('[ParagonJWT] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Generate a Paragon User Token for the given user
     * @param {string} userId - The unique user identifier
     * @param {Object} options - Additional options for token generation
     * @returns {string|null} The signed JWT token or null if generation fails
     */
    generateUserToken(userId, options = {}) {
        if (!this.initialized || !this.signingKey) {
            console.error('[ParagonJWT] Service not initialized or missing signing key');
            return null;
        }

        if (!userId) {
            console.error('[ParagonJWT] User ID is required for token generation');
            return null;
        }

        try {
            const currentTime = Math.floor(Date.now() / 1000);
            const expirationTime = options.expiresIn || 60 * 60; // Default 1 hour

            const payload = {
                // Subject - the user identifier
                sub: userId,
                
                // Audience - must match the project ID in SDK configuration
                aud: this.projectId ? `useparagon.com/${this.projectId}` : undefined,
                
                // Issued at timestamp
                iat: currentTime,
                
                // Expiration timestamp
                exp: currentTime + expirationTime,
                
                // Optional additional claims
                ...(options.additionalClaims || {})
            };

            // Remove undefined values
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined) {
                    delete payload[key];
                }
            });

            // Sign the JWT with RS256 algorithm
            const token = jwt.sign(payload, this.signingKey, {
                algorithm: 'RS256'
            });

            console.log('[ParagonJWT] Generated user token for user:', userId);
            return token;
        } catch (error) {
            console.error('[ParagonJWT] Failed to generate user token:', error);
            return null;
        }
    }

    /**
     * Verify a Paragon User Token
     * @param {string} token - The JWT token to verify
     * @returns {Object|null} The decoded token payload or null if verification fails
     */
    verifyUserToken(token) {
        if (!this.initialized || !this.signingKey) {
            console.error('[ParagonJWT] Service not initialized or missing signing key');
            return null;
        }

        try {
            const decoded = jwt.verify(token, this.signingKey, {
                algorithms: ['RS256']
            });
            return decoded;
        } catch (error) {
            console.error('[ParagonJWT] Failed to verify token:', error.message);
            return null;
        }
    }

    /**
     * Get the current configuration status
     * @returns {Object} Configuration status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            hasSigningKey: !!this.signingKey,
            hasProjectId: !!this.projectId,
            projectId: this.projectId
        };
    }
}

// Export a singleton instance
module.exports = new ParagonJwtService(); 