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
      // Ensure SDK is available from npm package
      if (typeof paragon !== 'undefined' && paragon) {
        console.log('[ParagonSDK] NPM package SDK loaded successfully');
        
        // CRITICAL: Expose paragon to window for global access
        if (typeof window !== 'undefined') {
          (window as any).paragon = paragon;
          console.log('[ParagonSDK] Exposed paragon SDK to window.paragon');
        }
        
        // Don't call configureGlobal unless using on-premise
        // The default should work for the cloud version
        console.log('[ParagonSDK] Using default configuration (cloud)');
        
        setIsLoaded(true);
      } else {
        throw new Error('Paragon SDK not available from NPM package');
      }
    } catch (err) {
      console.error('[ParagonSDK] SDK loading failed:', err);
      setError(err as Error);
    }
  }, []);

  if (error) {
    console.error('[ParagonSDK] Error:', error);
    return undefined; // Don't throw, just return undefined
  }
  
  return isLoaded ? paragon : undefined;
}