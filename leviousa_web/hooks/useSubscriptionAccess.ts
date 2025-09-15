/**
 * Hook to check subscription access for features
 */

import { useState, useEffect } from 'react'

interface SubscriptionAccess {
  allowed: boolean
  plan: string
  message: string
  requiresUpgrade: boolean
  loading: boolean
  error?: string
}

export function useSubscriptionAccess(featureType: 'integrations' | 'cmd_l' | 'browser'): SubscriptionAccess {
  const [access, setAccess] = useState<SubscriptionAccess>({
    allowed: false,
    plan: 'unknown',
    message: 'Checking subscription...',
    requiresUpgrade: true,
    loading: true
  })

  useEffect(() => {
    async function checkAccess() {
      try {
        setAccess(prev => ({ ...prev, loading: true }))

        // Get Firebase auth token for user identification
        let authHeaders: HeadersInit = {
          'Content-Type': 'application/json'
        }

        // Try to get Firebase token if user is authenticated
        if (typeof window !== 'undefined') {
          try {
            const { auth } = await import('../utils/firebase')
            const currentUser = auth.currentUser
            if (currentUser) {
              const token = await currentUser.getIdToken()
              authHeaders['Authorization'] = `Bearer ${token}`
              console.log('🔑 [useSubscriptionAccess] Using Firebase auth token for user:', currentUser.uid)
            } else {
              console.log('⚠️ [useSubscriptionAccess] No Firebase user authenticated')
            }
          } catch (error) {
            console.log('⚠️ [useSubscriptionAccess] Firebase not available or user not logged in')
          }
        }

        // Make API call to check subscription access
        const response = await fetch('/api/subscription/check-access', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ featureType })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        
        setAccess({
          allowed: result.allowed || false,
          plan: result.plan || 'free',
          message: result.message || 'Access check completed',
          requiresUpgrade: result.requiresUpgrade || false,
          loading: false
        })

      } catch (error) {
        console.error('Subscription access check failed:', error)
        
        setAccess({
          allowed: false,
          plan: 'free', 
          message: 'Unable to verify subscription',
          requiresUpgrade: true,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    checkAccess()
  }, [featureType])

  return access
}

export function useIntegrationsAccess(providedToken?: string): SubscriptionAccess {
  const [access, setAccess] = useState<SubscriptionAccess>({
    allowed: false,
    plan: 'unknown',
    message: 'Checking subscription...',
    requiresUpgrade: true,
    loading: true
  })

  useEffect(() => {
    async function checkAccess() {
      try {
        setAccess(prev => ({ ...prev, loading: true }))

        // Get Firebase auth token for user identification
        let authHeaders: HeadersInit = {
          'Content-Type': 'application/json'
        }

        // Use provided token (from URL params) or get from Firebase auth
        let token = providedToken
        if (!token && typeof window !== 'undefined') {
          try {
            const { auth } = await import('../utils/firebase')
            
            // Wait for auth state to be ready
            await new Promise((resolve) => {
              const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe()
                resolve(user)
              })
            })
            
            const currentUser = auth.currentUser
            if (currentUser) {
              token = await currentUser.getIdToken()
              console.log('🔑 [useIntegrationsAccess] Using Firebase auth token for user:', currentUser.uid, currentUser.email)
            } else {
              console.log('⚠️ [useIntegrationsAccess] No Firebase user authenticated - will show free experience')
            }
          } catch (error) {
            console.log('⚠️ [useIntegrationsAccess] Firebase auth error:', error.message)
          }
        }

        if (token) {
          authHeaders['Authorization'] = `Bearer ${token}`
          console.log('🔑 [useIntegrationsAccess] Using auth token for subscription check')
        }

        // Make API call to check subscription access
        const response = await fetch('/api/subscription/check-access', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ featureType: 'integrations' })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        
        setAccess({
          allowed: result.allowed || false,
          plan: result.plan || 'free',
          message: result.message || 'Access check completed',
          requiresUpgrade: result.requiresUpgrade || false,
          loading: false
        })

      } catch (error) {
        console.error('Integrations subscription access check failed:', error)
        
        setAccess({
          allowed: false,
          plan: 'free', 
          message: 'Unable to verify subscription',
          requiresUpgrade: true,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    checkAccess()
  }, ['integrations', providedToken])

  return access
}
