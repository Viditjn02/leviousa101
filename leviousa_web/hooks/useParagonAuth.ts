import { useEffect, useState } from 'react';
import { paragon, AuthenticatedConnectUser, SDK_EVENT } from '@useparagon/connect';

import { generateParagonToken, clearExpiredTokens } from '../utils/paragonTokenGenerator';
import { authPersistenceReady } from '../utils/firebase';
import { paragonAuthStorage } from '../utils/paragonAuthStorage';

/**
 * Hook for Paragon authentication
 * Based on the Paragon documentation tutorial
 */
export default function useParagonAuth(userId?: string): { 
  user?: AuthenticatedConnectUser; 
  error?: Error; 
  isLoading: boolean;
} {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedConnectUser | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Hook initialized for Paragon authentication

  // Get token on mount - but wait for Firebase persistence first
  useEffect(() => {
    // Generating token for authentication
    
    // CRITICAL: Wait for Firebase auth persistence to be ready
    // This prevents auth state loss during OAuth flows
    authPersistenceReady
      .then(() => {
        // Firebase persistence ready
        // Clear any expired tokens first
        clearExpiredTokens();
        return generateParagonToken(userId);
      })
      .then((token) => {
        // Token generated successfully
        setToken(token)
      })
      .catch((err) => {
        // Token generation failed
        setError(err)
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  // Get authentication status from Electron app via IPC
  useEffect(() => {
    const checkElectronAuthStatus = async () => {
      if (typeof window !== 'undefined' && (window as any).api?.mcp?.getAuthenticatedServices) {
        try {
          // Getting auth status from Electron app
          const services = await (window as any).api.mcp.getAuthenticatedServices(userId || 'default-user');
          // Received auth status from Electron
          
          if (services && services.authenticated_services) {
            // Convert Electron auth status to Paragon user format
            const integrations: any = {};
            
            // Mark all authenticated services as enabled
            services.authenticated_services.forEach((service: string) => {
              integrations[service] = { enabled: true };
            });
            
            const mockUser: AuthenticatedConnectUser = {
              authenticated: true,
              integrations: integrations
            };
            
            // Created user from Electron status
            setUser(mockUser);
          }
        } catch (error) {
          // Failed to get Electron auth status
        }
      } else {
        // Electron IPC API not available, using browser SDK
      }
    };

    // Check status immediately and then periodically
    checkElectronAuthStatus();
    const interval = setInterval(checkElectronAuthStatus, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [userId]);

  // Authenticate when token is available
  useEffect(() => {
    if (token && !error) {
      // CRITICAL FIX: Use IPC to get runtime config instead of process.env (which doesn't work in static export)
      const initializeParagon = async () => {
        try {
          let projectId;
          
          // Try to get project ID from runtime config via IPC (packaged app)
          if (typeof window !== 'undefined' && window.api?.getRuntimeConfig) {
            console.log('[useParagonAuth] 🔍 Getting runtime config via IPC...');
            const config = await window.api.getRuntimeConfig();
            projectId = config.PARAGON_PROJECT_ID;
            console.log('[useParagonAuth] ✅ Got project ID from runtime config:', projectId);
          } else {
            // Fallback for development or if IPC not available
            projectId = process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID || "270db720-6ead-460b-ae94-5ea9bec3f1e2";
            console.log('[useParagonAuth] 🔄 Using fallback project ID:', projectId);
          }
          
          if (!projectId) {
            throw new Error('PARAGON_PROJECT_ID not available via runtime config or environment');
          }

          console.log('[useParagonAuth] 🚀 Authenticating with Paragon...', { projectId: projectId.substring(0, 20) + '...', hasToken: !!token });
          
          await paragon.authenticate(projectId, token);
          
          const authedUser = paragon.getUser();
          if (authedUser.authenticated) {
            console.log('[useParagonAuth] ✅ Paragon authentication successful');
            setUser(authedUser);
            
            // Persist the authentication state
            if (userId && authedUser.integrations) {
              paragonAuthStorage.updateUserAuth(userId, authedUser.integrations);
            }
          } else {
            console.warn('[useParagonAuth] ⚠️ Paragon authenticate() succeeded but user not authenticated');
          }
        } catch (authError) {
          console.error('[useParagonAuth] ❌ Paragon authentication failed:', authError);
          setError(authError as Error);
        }
      };
      
      initializeParagon();
    }
  }, [token, error, userId]);

  // Check for persisted auth state on mount
  useEffect(() => {
    if (userId) {
      const persistedAuth = paragonAuthStorage.getUserAuth(userId);
      if (persistedAuth && persistedAuth.integrations) {
        console.log('[useParagonAuth] Found persisted auth state for user:', userId);
        console.log('[useParagonAuth] Connected integrations:', 
          paragonAuthStorage.getConnectedIntegrations(userId));
        
        // If we need to refresh, trigger it
        if (paragonAuthStorage.needsRefresh()) {
          console.log('[useParagonAuth] Auth state needs refresh, will refresh after authentication');
        }
      }
    }
  }, [userId]);

  return { user, error, isLoading };
}