import { useEffect, useState } from 'react';
import { paragon, AuthenticatedConnectUser, SDK_EVENT } from '@useparagon/connect';

import { generateParagonToken } from '../utils/paragonTokenGenerator';

/**
 * Hook for Paragon authentication
 * Based on the Paragon documentation tutorial
 */
export default function useParagonAuth(): { 
  user?: AuthenticatedConnectUser; 
  error?: Error; 
  isLoading: boolean;
} {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedConnectUser | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Get token on mount
  useEffect(() => {
    generateParagonToken()
      .then(setToken)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

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