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

        // Make API call to check subscription access
        const response = await fetch('/api/subscription/check-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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

export function useIntegrationsAccess(): SubscriptionAccess {
  return useSubscriptionAccess('integrations')
}
