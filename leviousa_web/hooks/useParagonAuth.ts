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
  forceRefresh: () => void;
} {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedConnectUser | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Debug logging for userId
  useEffect(() => {
    console.log('🔍 [useParagonAuth] Hook initialized with userId:', userId || 'undefined')
  }, []);

  // Get token on mount - but wait for Firebase persistence first
  useEffect(() => {
    console.log('🔍 [useParagonAuth] Generating token with userId:', userId || 'undefined')
    
    // CRITICAL: Wait for Firebase auth persistence to be ready
    // This prevents auth state loss during OAuth flows
    authPersistenceReady()
      .then(() => {
        console.log('✅ [useParagonAuth] Firebase persistence ready, generating token...')
        // Clear any expired tokens first
        clearExpiredTokens();
        return generateParagonToken(userId);
      })
      .then((token) => {
        console.log('✅ [useParagonAuth] Token generated successfully')
        console.log('🔍 [useParagonAuth] Token payload (decoded):', 
          JSON.parse(atob(token.split('.')[1])))
        setToken(token)
      })
      .catch((err) => {
        console.error('❌ [useParagonAuth] Token generation failed:', err)
        setError(err)
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  // Listen for account state changes and persist them
  useEffect(() => {
    const listener = () => {
      if (paragon) {
        const authedUser = paragon.getUser();
        if (authedUser.authenticated) {
          setUser(authedUser);
          
          // Persist the authentication state
          if (userId && authedUser.integrations) {
            paragonAuthStorage.updateUserAuth(userId, authedUser.integrations);
          }
        }
      }
    };

    // Global subscription to Paragon SDK events
    if (typeof paragon !== 'undefined') {
      paragon.subscribe(SDK_EVENT.ON_INTEGRATION_INSTALL, listener);
      paragon.subscribe(SDK_EVENT.ON_INTEGRATION_UNINSTALL, listener);
      
      return () => {
        paragon.unsubscribe(SDK_EVENT.ON_INTEGRATION_INSTALL, listener);
        paragon.unsubscribe(SDK_EVENT.ON_INTEGRATION_UNINSTALL, listener);
      };
    }
  }, [userId]);


  // Authenticate when token is available
  useEffect(() => {
    if (token && !error) {
      const projectId = process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID;
      if (!projectId) {
        setError(new Error('NEXT_PUBLIC_PARAGON_PROJECT_ID not configured'));
        return;
      }

      paragon
        .authenticate(projectId, token)
        .then(() => {
          const authedUser = paragon.getUser();
          if (authedUser.authenticated) {
            setUser(authedUser);
            
            // Persist the authentication state
            if (userId && authedUser.integrations) {
              paragonAuthStorage.updateUserAuth(userId, authedUser.integrations);
            }
          }
        })
        .catch(setError);
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

  // Force refresh function to manually check auth state
  const forceRefresh = () => {
    console.log('[useParagonAuth] Force refresh triggered');
    if (paragon) {
      try {
        const currentUser = paragon.getUser();
        console.log('[useParagonAuth] Force refresh - current user:', currentUser);
        
        if (currentUser.authenticated) {
          setUser(currentUser);
          
          // Persist the updated authentication state
          if (userId && currentUser.integrations) {
            paragonAuthStorage.updateUserAuth(userId, currentUser.integrations);
          }
        }
      } catch (error) {
        console.error('[useParagonAuth] Error in force refresh:', error);
      }
    }
  };

  // Responsive periodic check to ensure we have the latest auth state
  useEffect(() => {
    if (!paragon || !token) return;

    const periodicCheck = () => {
      try {
        const currentUser = paragon.getUser();
        if (currentUser.authenticated) {
          const currentIntegrations = Object.keys(currentUser.integrations || {}).filter(
            service => currentUser.integrations[service]?.enabled
          );
          const storedIntegrations = Object.keys(user?.integrations || {}).filter(
            service => user.integrations[service]?.enabled
          );
          
          // Only update if there's a difference
          if (JSON.stringify(currentIntegrations.sort()) !== JSON.stringify(storedIntegrations.sort())) {
            console.log('[useParagonAuth] Periodic check: Auth state changed, updating...', {
              current: currentIntegrations,
              stored: storedIntegrations
            });
            setUser(currentUser);
            
            // Persist the updated authentication state
            if (userId && currentUser.integrations) {
              paragonAuthStorage.updateUserAuth(userId, currentUser.integrations);
            }
          }
        }
      } catch (error) {
        console.error('[useParagonAuth] Error in periodic check:', error);
      }
    };

    // Initial check immediately
    periodicCheck();
    
    // Then check every 2 seconds for more responsive updates
    const interval = setInterval(periodicCheck, 2000);
    
    return () => clearInterval(interval);
  }, [paragon, token, user, userId]);

  // Enhanced final auth state listener that also triggers immediate check
  useEffect(() => {
    const handleFinalAuthState = (data: any) => {
      console.log('[useParagonAuth] Received final auth state event:', data);
      
      // Trigger immediate check
      if (paragon) {
        try {
          const currentUser = paragon.getUser();
          console.log('[useParagonAuth] Immediate check after final auth state:', currentUser);
          
          if (currentUser.authenticated) {
            setUser(currentUser);
            
            // Persist the updated authentication state
            if (userId && currentUser.integrations) {
              paragonAuthStorage.updateUserAuth(userId, currentUser.integrations);
            }
          }
        } catch (error) {
          console.error('[useParagonAuth] Error in immediate final auth check:', error);
        }
      }
    };

    // Listen for Electron IPC events (if in Electron)
    if (typeof window !== 'undefined' && (window as any).api?.mcp?.paragon?.onFinalAuthState) {
      const cleanup1 = (window as any).api.mcp.paragon.onFinalAuthState(handleFinalAuthState);
      const cleanup2 = (window as any).api.mcp.paragon.onForceRefresh(() => {
        console.log('[useParagonAuth] Force refresh event received');
        forceRefresh();
      });
      
      return () => {
        cleanup1();
        cleanup2();
      };
    }
  }, [userId, paragon, forceRefresh]);

  return { user, error, isLoading, forceRefresh };
}