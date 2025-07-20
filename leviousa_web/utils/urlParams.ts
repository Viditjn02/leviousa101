/**
 * URL Parameter Preservation Utility
 * Handles parameter preservation through Firebase hosting rewrites and authentication flow
 */

export interface OverlayParams {
  [key: string]: string;
}

export class UrlParamPreserver {
  private static readonly STORAGE_KEY = 'leviousa_preserved_params';
  private static readonly OVERLAY_PARAMS_KEY = 'leviousa_overlay_params';

  /**
   * Preserve URL parameters before navigation/authentication
   */
  static preserveCurrentParams(): void {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    const params: OverlayParams = {};

    // Extract query parameters
    currentUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Extract hash parameters  
    if (currentUrl.hash) {
      const hashParams = new URLSearchParams(currentUrl.hash.substring(1));
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    // Store in both session and local storage for maximum persistence
    if (Object.keys(params).length > 0) {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(params));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(params));
      
      console.log('🔗 URL parameters preserved:', params);
    }
  }

  /**
   * Restore preserved parameters
   */
  static restoreParams(): OverlayParams {
    if (typeof window === 'undefined') return {};

    try {
      // Try session storage first, then local storage
      const stored = sessionStorage.getItem(this.STORAGE_KEY) || 
                    localStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        const params = JSON.parse(stored);
        console.log('🔗 URL parameters restored:', params);
        return params;
      }
    } catch (error) {
      console.error('❌ Failed to restore URL parameters:', error);
    }

    return {};
  }

  /**
   * Get overlay-specific parameters (filtering out auth-related ones)
   */
  static getOverlayParams(): OverlayParams {
    const allParams = this.restoreParams();
    const overlayParams: OverlayParams = {};

    // Filter out authentication parameters
    const authParams = ['mode', 'platform', 't', 'session', 'token', 'uid', 'email'];
    
    Object.entries(allParams).forEach(([key, value]) => {
      if (!authParams.includes(key)) {
        overlayParams[key] = value;
      }
    });

    return overlayParams;
  }

  /**
   * Clear preserved parameters
   */
  static clearParams(): void {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ URL parameters cleared');
  }

  /**
   * Add parameters to current URL
   */
  static addParamsToUrl(params: OverlayParams, useHash = false): void {
    if (typeof window === 'undefined' || Object.keys(params).length === 0) return;

    const url = new URL(window.location.href);

    if (useHash) {
      // Add to hash parameters
      const hashParams = new URLSearchParams(url.hash.substring(1));
      Object.entries(params).forEach(([key, value]) => {
        hashParams.set(key, value);
      });
      url.hash = hashParams.toString();
    } else {
      // Add to query parameters
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    // Update URL without reloading page
    window.history.replaceState({}, '', url.toString());
    console.log('🔗 Parameters added to URL:', params);
  }

  /**
   * Initialize parameter preservation on page load
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    // Preserve parameters immediately on page load
    this.preserveCurrentParams();

    // Also preserve before page unload
    window.addEventListener('beforeunload', () => {
      this.preserveCurrentParams();
    });

    console.log('🔗 URL parameter preserver initialized');
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  UrlParamPreserver.initialize();
} 