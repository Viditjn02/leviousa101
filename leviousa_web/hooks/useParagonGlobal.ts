import { useEffect, useState } from 'react';
import { paragon } from '@useparagon/connect';

/**
 * Hook to mount the Paragon SDK globally
 * Based on the Paragon documentation tutorial
 */
export default function useParagonGlobal() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    try {
      // Ensure SDK is available
      if (typeof paragon !== 'undefined' && paragon) {
        // Force production hosts when running inside Electron (file:// or localhost)
        try {
          if (!(paragon as any)._configuredElectron) {
            paragon.configureGlobal({
              host: 'useparagon.com'
            });
            (paragon as any)._configuredElectron = true;
            console.log('[ParagonSDK] configureGlobal applied for Electron runtime');
          }
        } catch (cfgErr) {
          console.warn('[ParagonSDK] Failed to apply configureGlobal:', (cfgErr as Error).message);
        }
        setIsLoaded(true);
      } else {
        throw new Error('Paragon SDK not available');
      }
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  if (error) throw error;
  
  return isLoaded ? paragon : undefined;
}