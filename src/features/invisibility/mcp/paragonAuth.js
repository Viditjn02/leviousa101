class ParagonAuth {
    constructor() {
        this.projectId = 'db5e019e-0558-4378-93de-f212a73e0606'; // Your project ID from env
        this.authenticated = false;
        this.paragon = null;
    }

    async initialize() {
        if (typeof window === 'undefined') {
            console.warn('[ParagonAuth] Running in non-browser environment, skipping initialization');
            return { success: false, error: 'Not in browser environment' };
        }

        try {
            // Import paragon dynamically for browser environment
            const { paragon } = await import('@useparagon/connect');
            this.paragon = paragon;
            console.log('[ParagonAuth] Paragon SDK imported successfully');
            return { success: true };
        } catch (error) {
            console.error('[ParagonAuth] Failed to import Paragon SDK:', error);
            return { success: false, error: error.message };
        }
    }

    async authenticate() {
        try {
            if (!this.paragon) {
                const initResult = await this.initialize();
                if (!initResult.success) {
                    throw new Error('Failed to initialize Paragon SDK');
                }
            }

            // Get JWT token from backend
            const response = await window.electronAPI.invoke('paragon:getJWT');
            if (!response.success || !response.token) {
                throw new Error(`Failed to get Paragon JWT: ${response.error || 'Unknown error'}`);
            }

            console.log('[ParagonAuth] Got JWT token, authenticating with Paragon...');

            // Authenticate with Paragon
            await this.paragon.authenticate(this.projectId, response.token);
            this.authenticated = true;
            
            console.log('[ParagonAuth] Successfully authenticated with Paragon');
            return { success: true };
        } catch (error) {
            console.error('[ParagonAuth] Authentication failed:', error);
            this.authenticated = false;
            return { success: false, error: error.message };
        }
    }

    async connectIntegration(integrationName) {
        if (!this.authenticated) {
            console.log('[ParagonAuth] Not authenticated, attempting to authenticate first...');
            const authResult = await this.authenticate();
            if (!authResult.success) {
                return authResult;
            }
        }

        try {
            console.log(`[ParagonAuth] Connecting integration: ${integrationName}`);
            
            // Show Connect Portal for specific integration
            await this.paragon.connect(integrationName);
            
            console.log(`[ParagonAuth] Successfully connected integration: ${integrationName}`);
            return { success: true };
        } catch (error) {
            console.error(`[ParagonAuth] Failed to connect integration ${integrationName}:`, error);
            return { success: false, error: error.message };
        }
    }

    async connectAllIntegrations() {
        if (!this.authenticated) {
            console.log('[ParagonAuth] Not authenticated, attempting to authenticate first...');
            const authResult = await this.authenticate();
            if (!authResult.success) {
                return authResult;
            }
        }

        try {
            console.log('[ParagonAuth] Opening Connect Portal for all integrations...');
            
            // Show Connect Portal without specifying integration (shows all available)
            await this.paragon.connect();
            
            console.log('[ParagonAuth] Successfully opened Connect Portal');
            return { success: true };
        } catch (error) {
            console.error('[ParagonAuth] Failed to open Connect Portal:', error);
            return { success: false, error: error.message };
        }
    }

    async getConnectedIntegrations() {
        if (!this.authenticated) {
            console.log('[ParagonAuth] Not authenticated, cannot get connected integrations');
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Get the authenticated user info from Paragon
            const user = await this.paragon.getUser();
            return { success: true, user };
        } catch (error) {
            console.error('[ParagonAuth] Failed to get user info:', error);
            return { success: false, error: error.message };
        }
    }

    isAuthenticated() {
        return this.authenticated;
    }

    getProjectId() {
        return this.projectId;
    }
}

// Export a singleton instance
export default new ParagonAuth(); 