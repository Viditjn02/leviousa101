import { useEffect, useState } from 'react';

/**
 * Hook to mount the enhanced Paragon SDK globally
 * Loads our enhanced SDK with debugging instead of npm package
 */
export default function useParagonGlobal() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    // Check if SDK is already loaded
    if ((window as any).paragon) {
      console.log('🔍 [useParagonGlobal] Enhanced SDK already loaded');
      setIsLoaded(true);
      return;
    }

    console.log('🔄 [useParagonGlobal] Loading enhanced Paragon SDK...');
    
    // Load our enhanced SDK instead of npm package
    const script = document.createElement('script');
    script.src = '/build/paragonSDK.js';
    script.async = true;
    
    script.onload = () => {
      try {
        const paragon = (window as any).paragon;
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
          console.log('✅ [useParagonGlobal] Enhanced SDK loaded successfully');
          setIsLoaded(true);
        } else {
          throw new Error('Enhanced Paragon SDK not available after loading');
        }
      } catch (err) {
        console.error('❌ [useParagonGlobal] Enhanced SDK loading failed:', err);
        setError(err as Error);
      }
    };
    
    script.onerror = (err) => {
      console.error('❌ [useParagonGlobal] Enhanced SDK script loading failed:', err);
      setError(new Error('Failed to load enhanced Paragon SDK script'));
    };
    
    document.head.appendChild(script);
    
    // Cleanup function
    return () => {
      // Remove script on unmount
      const existingScript = document.querySelector('script[src="/build/paragonSDK.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  if (error) throw error;
  
  return isLoaded ? (window as any).paragon : undefined;
}