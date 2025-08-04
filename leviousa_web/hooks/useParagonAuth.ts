import { useEffect, useState } from 'react';
import { paragon, AuthenticatedConnectUser, SDK_EVENT } from '@useparagon/connect';

import { generateParagonToken, clearExpiredTokens } from '../utils/paragonTokenGenerator';
import { authPersistenceReady } from '../utils/firebase';

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

  // Debug logging for userId
  useEffect(() => {
    console.log('🔍 [useParagonAuth] Hook initialized with userId:', userId || 'undefined')
  }, []);

  // Get token on mount - but wait for Firebase persistence first
  useEffect(() => {
    console.log('🔍 [useParagonAuth] Generating token with userId:', userId || 'undefined')
    
    // CRITICAL: Wait for Firebase auth persistence to be ready
    // This prevents auth state loss during OAuth flows
    authPersistenceReady
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

  // Listen for account state changes
  useEffect(() => {
    const listener = () => {
      if (paragon) {
        const authedUser = paragon.getUser();
        if (authedUser.authenticated) {
          setUser(authedUser);
        }
      }
    };

    if (typeof paragon !== 'undefined') {
      paragon.subscribe(SDK_EVENT.ON_INTEGRATION_INSTALL, listener);
      paragon.subscribe(SDK_EVENT.ON_INTEGRATION_UNINSTALL, listener);
      
      return () => {
        paragon.unsubscribe(SDK_EVENT.ON_INTEGRATION_INSTALL, listener);
        paragon.unsubscribe(SDK_EVENT.ON_INTEGRATION_UNINSTALL, listener);
      };
    }
  }, []);

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
          }
        })
        .catch(setError);
    }
  }, [token, error]);

  return { user, error, isLoading };
}