'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/utils/firebase'

interface AuthHandlerProps {
  onAuthSuccess: (user: any) => void
}

export default function AuthHandler({ onAuthSuccess }: AuthHandlerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Use direct browser URL parsing as fallback since Next.js static export fails
  const [actualMode, setActualMode] = React.useState<string | null>(null)
  const [isInitialized, setIsInitialized] = React.useState(false)
  
  React.useEffect(() => {
    // More robust mode detection with multiple fallbacks
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const browserMode = urlParams.get('mode') || hashParams.get('mode')
    
    // Check multiple storage locations for persisted mode
    const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
    const localMode = localStorage.getItem('leviousa_auth_mode')
    
    // Use the most recent/reliable source
    const detectedMode = browserMode || sessionMode || localMode
    
    // Store mode in BOTH storages for maximum persistence
    if (browserMode) {
      sessionStorage.setItem('leviousa_auth_mode', browserMode)
      localStorage.setItem('leviousa_auth_mode', browserMode)
      // Also add to URL hash for additional persistence through redirects
      if (!window.location.hash.includes('mode=')) {
        window.location.hash = `mode=${browserMode}`
      }
    }
    
    setActualMode(detectedMode)
    setIsInitialized(true)
    
    if (detectedMode) {
      console.log(`🔍 AuthHandler detected mode: ${detectedMode}`)
    }
  }, [searchParams])
  
  const isElectronMode = actualMode === 'electron'
  const isServerMode = actualMode === 'server'

  // Check if already authenticated and handle accordingly - but only after mode is initialized
  React.useEffect(() => {
    if (!isInitialized) {
      return
    }

    const checkExistingAuth = () => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser && isElectronMode) {
          // User is already authenticated and this is Electron mode - generate deep link immediately
          console.log('✅ User already authenticated, generating Electron deep link')
          // Clear stored modes after successful use
          sessionStorage.removeItem('leviousa_auth_mode')
          localStorage.removeItem('leviousa_auth_mode')
          // Clear hash
          if (window.location.hash.includes('mode=')) {
            window.location.hash = ''
          }
          onAuthSuccess(currentUser)
        } else if (currentUser && isServerMode) {
          // User is already authenticated and this is server mode - generate server deep link immediately  
          console.log('✅ User already authenticated, generating server deep link')
          // Clear stored modes after successful use
          sessionStorage.removeItem('leviousa_auth_mode')
          localStorage.removeItem('leviousa_auth_mode')
          onAuthSuccess(currentUser)
        } else if (currentUser && !isElectronMode && !isServerMode) {
          console.log('✅ User already authenticated, redirecting to activity')
          router.push('/activity')
        }
      })
      
      // Cleanup
      return () => unsubscribe()
    }
    
    return checkExistingAuth()
  }, [router, isElectronMode, isServerMode, actualMode, onAuthSuccess, isInitialized])

  // Return null as this component only handles auth logic
  return null
} 