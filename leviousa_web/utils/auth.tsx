'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, setUserInfo, findOrCreateUser } from './api'
import { auth as firebaseAuth, authPersistenceReady } from './firebase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import logger from './productionLogger'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  mode: 'firebase' | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<'firebase' | null>(null)
  
  useEffect(() => {
    logger.debug('🔍 AuthProvider: Setting up single auth state listener');
    let mounted = true; // Track if component is still mounted
    
    // Check if we're on the integrations page with a userId parameter (Electron context)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const userIdFromUrl = urlParams.get('userId');
      
      if (window.location.pathname === '/integrations' && userIdFromUrl) {
        logger.debug('🔗 AuthProvider: Integrations page detected with userId, creating temporary auth context');
        
        // Create a temporary user profile for the integrations page
        const tempProfile: UserProfile = {
          uid: userIdFromUrl,
          display_name: 'Electron User',
          email: 'electron-user@leviousa.com',
        };
        
        setUser(tempProfile);
        setUserInfo(tempProfile);
        setIsLoading(false);
        setMode('firebase'); // Set mode to avoid auth loops
        
        logger.debug('✅ AuthProvider: Temporary auth context created for integrations page');
        
        // Return cleanup function but don't set up Firebase auth listener
        return () => {
          if (mounted) {
            mounted = false;
          }
        };
      }
    }
    
    // Add overall timeout to prevent AuthProvider from hanging forever
    const authProviderTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ AuthProvider: Auth state initialization timeout, forcing loading to false');
        setIsLoading(false);
      }
    }, 12000); // 12 second timeout for the entire auth provider
    
    // CRITICAL: Wait for Firebase persistence before setting up auth state listener
    // This prevents the auth state reset issue during OAuth flows
    let unsubscribe: (() => void) | undefined;
    
    authPersistenceReady
      .then(() => {
        if (!mounted) return; // Component unmounted before persistence ready
        
        logger.debug('✅ AuthProvider: Firebase persistence ready, setting up auth listener');
        
        unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      logger.debug('🔔 Auth state changed:', firebaseUser ? `User ${firebaseUser.email}` : 'No user');
      
      try {
        if (firebaseUser) {
          logger.debug('🔥 Firebase authentication successful:', firebaseUser.uid);
          setMode('firebase');
          
          let profile: UserProfile = {
            uid: firebaseUser.uid,
            display_name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || 'no-email@example.com',
          };
          
          try {
            // Add timeout protection to findOrCreateUser call
            logger.debug('🔍 AuthProvider: Creating/verifying user in Firestore...');
            const userPromise = findOrCreateUser(profile);
            const timeoutPromise = new Promise<UserProfile>((_, reject) => 
              setTimeout(() => reject(new Error('findOrCreateUser timeout')), 8000)
            );
            
            profile = await Promise.race([userPromise, timeoutPromise]);
            logger.debug('✅ Firestore user created/verified:', profile);
          } catch (error) {
            console.error('❌ Firestore user creation/verification failed or timed out:', error);
            logger.debug('📋 Continuing with Firebase profile as fallback');
            // Continue with Firebase profile even if Firestore fails or times out
          }

          setUser(profile);
          setUserInfo(profile);
        } else {
          logger.debug('🔓 No authenticated user - Firebase authentication required');
          setMode(null);
          setUser(null);
          setUserInfo(null);
        }
      } catch (error) {
        console.error('❌ AuthProvider: Error in auth state change handler:', error);
        // Set fallback state to prevent hanging
        setMode(null);
        setUser(null);
        setUserInfo(null);
             } finally {
         // ALWAYS set loading to false, regardless of what happens above
         if (mounted) {
           logger.debug('✅ AuthProvider: Setting isLoading to false');
           setIsLoading(false);
           clearTimeout(authProviderTimeout);
         }
       }
     }, (error) => {
       console.error('❌ Auth state change error:', error);
       // Even on auth state change error, make sure we stop loading
       if (mounted) {
         setIsLoading(false);
         clearTimeout(authProviderTimeout);
       }
     });
        
        // Check current auth state immediately after persistence is ready
        const currentUser = firebaseAuth.currentUser;
        logger.debug('🔑 Current auth state on mount:', currentUser ? currentUser.email : 'No user');
      })
      .catch((error) => {
        console.error('❌ AuthProvider: Failed to initialize Firebase persistence:', error);
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      logger.debug('🚪 AuthProvider: Cleaning up auth state listener');
      mounted = false; // Mark as unmounted
      clearTimeout(authProviderTimeout);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []) // Empty dependency array - don't re-run when isLoading changes

  return (
    <AuthContext.Provider value={{ user, isLoading, mode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const useRedirectIfNotAuth = () => {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if we're done loading and there's no authenticated user
    if (!isLoading && !user) {
      logger.debug('🚫 No authenticated user, redirecting to login');
      router.push('/login');
    }
  }, [user, isLoading, router])

  return user
} 