// src/ui/utils/paragonSDK.js
// Paragon SDK loader utility for Electron renderer process
// This handles loading the @useparagon/connect SDK in the browser-compatible way

class ParagonSDKLoader {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.sdk = null;
        this.loadPromise = null;
    }

    /**
     * Load the Paragon SDK dynamically in the renderer process
     * @returns {Promise<Object>} The loaded Paragon SDK
     */
    async loadSDK() {
        console.log('[ParagonSDK] 🔄 Loading Paragon SDK...');
        
        if (this.isLoaded && this.sdk) {
            console.log('[ParagonSDK] ✅ SDK already loaded');
            return this.sdk;
        }

        if (this.isLoading) {
            console.log('[ParagonSDK] ⏳ SDK already loading, waiting...');
            return await this.loadPromise;
        }

        this.isLoading = true;
        this.loadPromise = this._loadSDKInternal();
        
        try {
            this.sdk = await this.loadPromise;
            this.isLoaded = true;
            console.log('[ParagonSDK] ✅ SDK loaded successfully');
            return this.sdk;
        } catch (error) {
            console.error('[ParagonSDK] ❌ Failed to load SDK:', error);
            this.isLoading = false;
            throw error;
        }
    }

    /**
     * Internal method to load the SDK
     * @private
     */
    async _loadSDKInternal() {
        try {
            // Method 1: Try dynamic import (modern approach)
            console.log('[ParagonSDK] 📦 Attempting dynamic import...');
            const module = await import('@useparagon/connect');
            const sdk = module.paragon || module.default || module;
            
            if (sdk) {
                console.log('[ParagonSDK] ✅ Loaded via dynamic import');
                return sdk;
            }
        } catch (error) {
            console.warn('[ParagonSDK] ⚠️ Dynamic import failed:', error.message);
        }

        try {
            // Method 2: Try webpack require (if available)
            console.log('[ParagonSDK] 📦 Attempting webpack require...');
            if (typeof __webpack_require__ !== 'undefined') {
                const module = __webpack_require__('@useparagon/connect');
                const sdk = module.paragon || module.default || module;
                
                if (sdk) {
                    console.log('[ParagonSDK] ✅ Loaded via webpack require');
                    return sdk;
                }
            }
        } catch (error) {
            console.warn('[ParagonSDK] ⚠️ Webpack require failed:', error.message);
        }

        try {
            // Method 3: Try loading from the built file directly
            console.log('[ParagonSDK] 📦 Attempting direct file load...');
            const script = document.createElement('script');
            script.src = '../node_modules/@useparagon/connect/dist/src/index.js';
            
            return new Promise((resolve, reject) => {
                script.onload = () => {
                    // Check if paragon is available on window
                    if (window.paragon) {
                        console.log('[ParagonSDK] ✅ Loaded via script tag');
                        resolve(window.paragon);
                    } else {
                        reject(new Error('Paragon SDK loaded but not found on window object'));
                    }
                };
                
                script.onerror = (error) => {
                    reject(new Error(`Failed to load Paragon SDK script: ${error.message}`));
                };
                
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('[ParagonSDK] ❌ Direct file load failed:', error.message);
        }

        throw new Error('All Paragon SDK loading methods failed');
    }

    /**
     * Get the loaded SDK instance
     * @returns {Object|null} The SDK instance or null if not loaded
     */
    getSDK() {
        return this.sdk;
    }

    /**
     * Check if SDK is loaded
     * @returns {boolean} True if SDK is loaded
     */
    isSDKLoaded() {
        return this.isLoaded && this.sdk !== null;
    }

    /**
     * Initialize the SDK with authentication
     * @param {string} projectId - The Paragon project ID
     * @param {string} userToken - The user authentication token
     */
    async authenticate(projectId, userToken) {
        if (!this.isSDKLoaded()) {
            await this.loadSDK();
        }

        if (this.sdk && this.sdk.authenticate) {
            return await this.sdk.authenticate(projectId, userToken);
        } else {
            throw new Error('Paragon SDK not loaded or authenticate method not available');
        }
    }
}

// Create singleton instance
const paragonLoader = new ParagonSDKLoader();

// Export for use in other renderer files
window.ParagonSDKLoader = ParagonSDKLoader;
window.paragonLoader = paragonLoader;

// Also expose via module exports if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParagonSDKLoader, paragonLoader };
}

console.log('[ParagonSDK] 🔧 Paragon SDK loader initialized');
