'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, setUserInfo, findOrCreateUser } from './api'
import { auth as firebaseAuth } from './firebase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'

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
    console.log('🔍 AuthProvider: Setting up single auth state listener');
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔔 Auth state changed:', firebaseUser ? `User ${firebaseUser.email}` : 'No user');
      
      if (firebaseUser) {
        console.log('🔥 Firebase authentication successful:', firebaseUser.uid);
        setMode('firebase');
        
        let profile: UserProfile = {
          uid: firebaseUser.uid,
          display_name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || 'no-email@example.com',
        };
        
        try {
          profile = await findOrCreateUser(profile);
          console.log('✅ Firestore user created/verified:', profile);
        } catch (error) {
          console.error('❌ Firestore user creation/verification failed:', error);
          // Continue with Firebase profile even if Firestore fails
        }

        setUser(profile);
        setUserInfo(profile);
      } else {
        console.log('🔓 No authenticated user - Firebase authentication required');
        setMode(null);
        setUser(null);
        setUserInfo(null);
      }
      setIsLoading(false);
    });

    // Check current auth state immediately
    const currentUser = firebaseAuth.currentUser;
    console.log('🔑 Current auth state on mount:', currentUser ? currentUser.email : 'No user');

    return () => {
      console.log('🚪 AuthProvider: Cleaning up auth state listener');
      unsubscribe();
    };
  }, [])

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
      console.log('🚫 No authenticated user, redirecting to login');
      router.push('/login');
    }
  }, [user, isLoading, router])

  return user
} 