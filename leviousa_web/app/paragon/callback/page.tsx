'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// Force dynamic rendering to avoid SSG issues with useSearchParams
export const dynamic = 'force-dynamic'

/**
 * Paragon OAuth Callback Handler
 * Handles OAuth completion and forwards to Electron backend
 */
export default function ParagonCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing OAuth callback...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams?.get('code')
        const state = searchParams?.get('state') 
        const error = searchParams?.get('error')
        const serviceKey = searchParams?.get('integration_key') || 'gmail' // Default to gmail for testing

        console.log('[ParagonCallback] 📨 Received OAuth callback:', {
          code: code ? 'present' : 'missing',
          state: state ? 'present' : 'missing', 
          error: error || 'none',
          serviceKey
        })

        if (error) {
          throw new Error(`OAuth error: ${error}`)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        console.log('[ParagonCallback] ✅ Valid OAuth callback received')
        
        // Try to notify Electron backend about successful authentication
        const electronNotificationUrls = [
          'http://127.0.0.1:64451/api/auth/notify-completion',  // Current actual port
          'http://localhost:64451/api/auth/notify-completion',   
          'http://127.0.0.1:61933/api/auth/notify-completion',
          'http://127.0.0.1:9001/api/auth/notify-completion',
          'http://127.0.0.1:3001/api/auth/notify-completion'
        ]

        const notificationPayload = {
          serviceKey,
          status: 'connected', 
          userId: 'external-oauth-user',
          timestamp: new Date().toISOString(),
          source: 'hosted-https-callback',
          oauthCode: code,
          oauthState: state
        }

        let notificationSent = false
        
        // Try to notify Electron backend
        for (const url of electronNotificationUrls) {
          try {
            console.log(`[ParagonCallback] 🔄 Trying Electron notification: ${url}`)
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(notificationPayload)
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log(`[ParagonCallback] ✅ Electron notified successfully:`, result)
              notificationSent = true
              break
            }
          } catch (error) {
            console.log(`[ParagonCallback] ❌ Failed ${url}:`, error)
          }
        }

        if (notificationSent) {
          setStatus('success')
          setMessage(`✅ ${serviceKey} connected successfully! You can close this window.`)
        } else {
          console.log('[ParagonCallback] ⚠️ Could not reach Electron - OAuth completed but notification failed')
          setStatus('success')
          setMessage(`✅ ${serviceKey} OAuth completed! Please return to Leviousa app.`)
        }

      } catch (error) {
        console.error('[ParagonCallback] ❌ Callback handling failed:', error)
        setStatus('error')
        setMessage(`❌ OAuth callback failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Small delay to ensure params are loaded
    setTimeout(handleCallback, 500)
  }, [searchParams])

  const getStatusIcon = () => {
    switch (status) {
      case 'processing': return '🔄'
      case 'success': return '✅'
      case 'error': return '❌'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing': return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'success': return 'bg-green-50 border-green-200 text-green-800'
      case 'error': return 'bg-red-50 border-red-200 text-red-800'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #905151 0%, #f2e9e9 100%)'}}>
      <div className="max-w-md mx-auto p-8">
        <div className={`p-6 rounded-lg border-2 ${getStatusColor()}`}>
          <div className="text-center">
            <div className="text-4xl mb-4">{getStatusIcon()}</div>
            <h1 className="text-xl font-bold mb-4">OAuth Callback</h1>
            <p className="text-sm">{message}</p>
            
            {status === 'success' && (
              <div className="mt-6">
                <button
                  onClick={() => window.close()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
