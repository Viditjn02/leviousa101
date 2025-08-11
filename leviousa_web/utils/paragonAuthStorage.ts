/**
 * Paragon Authentication Storage
 * Manages persistent storage of Paragon authentication state
 */

interface ParagonAuthState {
  userId: string;
  integrations: Record<string, {
    enabled: boolean;
    connectedAt: number;
    lastRefreshed: number;
    metadata?: any;
  }>;
  lastUpdated: number;
}

const STORAGE_KEY = 'paragon_auth_state';
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export class ParagonAuthStorage {
  private static instance: ParagonAuthStorage;
  private authState: ParagonAuthState | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadState();
    this.startRefreshTimer();
  }

  static getInstance(): ParagonAuthStorage {
    if (!ParagonAuthStorage.instance) {
      ParagonAuthStorage.instance = new ParagonAuthStorage();
    }
    return ParagonAuthStorage.instance;
  }

  /**
   * Load authentication state from localStorage
   */
  private loadState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.authState = JSON.parse(stored);
          console.log('[ParagonAuthStorage] Loaded auth state for user:', this.authState?.userId);
        }
      }
    } catch (error) {
      console.error('[ParagonAuthStorage] Failed to load auth state:', error);
    }
  }

  /**
   * Save authentication state to localStorage
   */
  private saveState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage && this.authState) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.authState));
        console.log('[ParagonAuthStorage] Saved auth state for user:', this.authState.userId);
      }
    } catch (error) {
      console.error('[ParagonAuthStorage] Failed to save auth state:', error);
    }
  }

  /**
   * Start automatic refresh timer
   */
  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.refreshIntegrations();
    }, REFRESH_INTERVAL);
  }

  /**
   * Update the authentication state for a user
   */
  updateUserAuth(userId: string, integrations: Record<string, any>): void {
    const now = Date.now();
    
    if (!this.authState || this.authState.userId !== userId) {
      // New user or different user
      this.authState = {
        userId,
        integrations: {},
        lastUpdated: now
      };
    }

    // Update integrations
    for (const [service, data] of Object.entries(integrations)) {
      const isEnabled = data.enabled === true || data.credentialStatus === 'VALID';
      
      if (isEnabled) {
        if (!this.authState.integrations[service]) {
          // New integration connected
          this.authState.integrations[service] = {
            enabled: true,
            connectedAt: now,
            lastRefreshed: now,
            metadata: data
          };
        } else {
          // Update existing integration
          this.authState.integrations[service].enabled = true;
          this.authState.integrations[service].lastRefreshed = now;
          this.authState.integrations[service].metadata = data;
        }
      } else if (this.authState.integrations[service]) {
        // Integration was disconnected
        this.authState.integrations[service].enabled = false;
        this.authState.integrations[service].lastRefreshed = now;
      }
    }

    this.authState.lastUpdated = now;
    this.saveState();
  }

  /**
   * Get authentication state for a user
   */
  getUserAuth(userId: string): ParagonAuthState | null {
    if (this.authState && this.authState.userId === userId) {
      return this.authState;
    }
    return null;
  }

  /**
   * Check if a specific integration is connected
   */
  isIntegrationConnected(userId: string, service: string): boolean {
    const state = this.getUserAuth(userId);
    return state?.integrations[service]?.enabled === true;
  }

  /**
   * Get list of connected integrations
   */
  getConnectedIntegrations(userId: string): string[] {
    const state = this.getUserAuth(userId);
    if (!state) return [];
    
    return Object.entries(state.integrations)
      .filter(([_, data]) => data.enabled)
      .map(([service]) => service);
  }

  /**
   * Mark an integration as disconnected
   */
  disconnectIntegration(userId: string, service: string): void {
    if (this.authState && this.authState.userId === userId) {
      if (this.authState.integrations[service]) {
        this.authState.integrations[service].enabled = false;
        this.authState.integrations[service].lastRefreshed = Date.now();
        this.saveState();
      }
    }
  }

  /**
   * Clear all authentication state
   */
  clearState(): void {
    this.authState = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[ParagonAuthStorage] Failed to clear auth state:', error);
    }
  }

  /**
   * Refresh integrations from Paragon API
   */
  private async refreshIntegrations(): Promise<void> {
    if (!this.authState) return;

    try {
      console.log('[ParagonAuthStorage] Refreshing integrations for user:', this.authState.userId);
      
      // This would call the Paragon API to refresh the integration status
      // For now, we'll just update the lastRefreshed timestamp
      const now = Date.now();
      for (const service in this.authState.integrations) {
        this.authState.integrations[service].lastRefreshed = now;
      }
      
      this.authState.lastUpdated = now;
      this.saveState();
    } catch (error) {
      console.error('[ParagonAuthStorage] Failed to refresh integrations:', error);
    }
  }

  /**
   * Check if integrations need refresh
   */
  needsRefresh(): boolean {
    if (!this.authState) return true;
    
    const now = Date.now();
    const timeSinceUpdate = now - this.authState.lastUpdated;
    
    return timeSinceUpdate > REFRESH_INTERVAL;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Export singleton instance
export const paragonAuthStorage = ParagonAuthStorage.getInstance();