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

        // 🎯 ELECTRON DETECTION: Check if running in Electron environment
        const isElectron = typeof window !== 'undefined' && 
                          (window as any).api && 
                          (window as any).api.settingsView && 
                          (window as any).api.settingsView.getSubscription

        if (isElectron) {
          console.log('🖥️ [useSubscriptionAccess] Electron environment detected - using native subscription service')
          
          try {
            // Use Electron-native subscription service
            const subscriptionData = await (window as any).api.settingsView.getSubscription()
            console.log('📊 [useSubscriptionAccess] Electron subscription data:', subscriptionData)
            
            // Convert Electron subscription format to web format
            const isPro = subscriptionData?.plan === 'pro'
            let allowed = false
            
            // Check access based on feature type and plan
            if (featureType === 'integrations') {
              allowed = isPro
            } else {
              // For cmd_l and browser, assume unlimited for pro, limited for free
              allowed = true // Both plans get access, just different limits
            }
            
            setAccess({
              allowed,
              plan: subscriptionData?.plan || 'free',
              message: isPro 
                ? `Pro subscription - ${featureType} access granted` 
                : `Limited ${featureType} access - upgrade for unlimited`,
              requiresUpgrade: featureType === 'integrations' ? !isPro : false,
              loading: false
            })
            
            console.log(`✅ [useSubscriptionAccess] Electron ${featureType} check: ${isPro ? 'PRO ACCESS' : 'FREE USER'}`)
            return
            
          } catch (electronError) {
            console.error('❌ [useSubscriptionAccess] Electron subscription check failed:', electronError)
            // Fall through to web API as fallback
          }
        }

        console.log('🌐 [useSubscriptionAccess] Using web API for subscription check')

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

        // 🎯 ELECTRON DETECTION: Check if running in Electron environment
        const isElectron = typeof window !== 'undefined' && 
                          ((window as any).api || 
                           (window as any).electronAPI || 
                           navigator.userAgent.includes('Electron'))

        if (isElectron) {
          console.log('🖥️ [useIntegrationsAccess] Electron environment detected - using native subscription service')
          
          try {
            // Use Electron-native subscription service - try multiple APIs
            let subscriptionData = null
            
            if ((window as any).api?.settingsView?.getSubscription) {
              console.log('📞 [useIntegrationsAccess] Using api.settingsView.getSubscription')
              subscriptionData = await (window as any).api.settingsView.getSubscription()
            } else if ((window as any).api?.subscription?.getCurrentUser) {
              console.log('📞 [useIntegrationsAccess] Using api.subscription.getCurrentUser')
              subscriptionData = await (window as any).api.subscription.getCurrentUser()
            } else if ((window as any).electronAPI) {
              console.log('📞 [useIntegrationsAccess] Using electronAPI fallback')
              // Try a generic IPC call
              subscriptionData = await (window as any).electronAPI.invoke('subscription:getCurrentUser')
            }
            
            console.log('📊 [useIntegrationsAccess] Electron subscription data:', subscriptionData)
            
            if (subscriptionData) {
              // Convert Electron subscription format to web format
              const isPro = subscriptionData?.plan === 'pro'
              
              setAccess({
                allowed: isPro,
                plan: subscriptionData?.plan || 'free',
                message: isPro ? 'Pro subscription - integrations access granted' : 'Integration access requires Leviousa Pro',
                requiresUpgrade: !isPro,
                loading: false
              })
              
              console.log(`✅ [useIntegrationsAccess] Electron subscription check: ${isPro ? 'PRO ACCESS' : 'FREE USER'}`)
              return
            } else {
              console.log('⚠️ [useIntegrationsAccess] No subscription data from Electron APIs, falling back to web API')
            }
            
          } catch (electronError) {
            console.error('❌ [useIntegrationsAccess] Electron subscription check failed:', electronError)
            // Fall through to web API as fallback
          }
        }

        console.log('🌐 [useIntegrationsAccess] Using web API for subscription check')

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
            console.log('⚠️ [useIntegrationsAccess] Firebase auth error:', error instanceof Error ? error.message : 'Unknown error')
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
