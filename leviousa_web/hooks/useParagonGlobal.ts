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