'use client'

import React, { useState, useEffect, useRef } from 'react'
import useParagonGlobal from '../hooks/useParagonGlobal'
import { useParagonAuthContext } from '../context/ParagonAuthContext'

interface ParagonIntegrationProps {
  service: string
  displayName: string
  icon?: string
  onSuccess?: (service: string) => void
  onError?: (error: any) => void
  registerTrigger?: (service: string, triggerFn: () => void) => void
  autoConnect?: boolean
  userId?: string
  popup?: boolean
}

export default function ParagonIntegration({ 
  service, 
  displayName, 
  icon, 
  onSuccess, 
  onError,
  registerTrigger,
  autoConnect = false,
  userId,
  popup = true
}: ParagonIntegrationProps) {
  const paragon = useParagonGlobal()
  const { user, error: authError, isLoading: authLoading } = useParagonAuthContext()

  // Debug logging for userId
  useEffect(() => {
    console.log(`🔍 [ParagonIntegration:${service}] Props debug:`)
    console.log(`  userId prop: "${userId}"`)
    console.log(`  autoConnect: ${autoConnect}`)
    
    if (userId) {
      console.log(`✅ [ParagonIntegration:${service}] Using userId: "${userId}"`)
    } else {
      console.warn(`⚠️ [ParagonIntegration:${service}] No userId provided - will use default-user`)
    }
  }, [service, userId, autoConnect])
  
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Track integration enablement and call onSuccess once
  const prevEnabledRef = useRef<boolean>(false)
  useEffect(() => {
    if (user && user.authenticated && paragon) {
      const isEnabled = !!user.integrations?.[service]?.enabled
      console.log(`🔍 [ParagonIntegration:${service}] Status check - isEnabled: ${isEnabled}, integrations:`, user.integrations)
      setStatus(isEnabled ? 'connected' : 'disconnected')
      if (isEnabled && !prevEnabledRef.current) {
        console.log(`✅ [ParagonIntegration:${service}] Service detected as connected, calling onSuccess`)
        onSuccess?.(service)
        
        // Notify the main process that a service was connected (for MCP refresh)
        if (typeof window !== 'undefined' && (window as any).api?.mcp?.notifyAuthenticationComplete) {
          console.log(`[ParagonIntegration] 🔄 Notifying main process of ${service} connection (status check)`)
          ;(window as any).api.mcp.notifyAuthenticationComplete({
            serviceKey: service,
            provider: 'paragon',
            success: true,
            userId: userId
          }).then((result: any) => {
            console.log(`[ParagonIntegration] ✅ Main process notified successfully for ${service}:`, result)
          }).catch((err: any) => {
            console.warn('Failed to notify main process:', err)
          })
        } else {
          console.log(`[ParagonIntegration] ❌ Cannot notify main process - API not available for ${service}`)
          console.log('Available APIs:', typeof window !== 'undefined' ? Object.keys((window as any).api || {}) : 'window undefined')
        }
      }
      prevEnabledRef.current = isEnabled
    }
  }, [user, service, paragon, onSuccess, userId])

  // Register trigger function for external calls
  useEffect(() => {
    if (registerTrigger && paragon) {
      registerTrigger(service, handleConnect)
    }
  }, [service, registerTrigger, paragon])

  // Auto-connect if requested and SDK is ready
  useEffect(() => {
    if (autoConnect && paragon && user && user.authenticated && !user.integrations?.[service]?.enabled) {
      console.log(`🚀 Auto-connecting ${service} via Paragon SDK`)
      setTimeout(() => handleConnect(), 500)
    }
  }, [autoConnect, service, paragon, user])

  // Listen for integration status changes from Paragon SDK
  useEffect(() => {
    if (!paragon) return

    // Use the correct Paragon SDK method for subscribing to integration events
    const unsubscribe = paragon.subscribe('onIntegrationInstall' as any, (event: any, user: any) => {
      console.log(`✅ ${event.integrationType} connected successfully!`, event)
      if (event.integrationType === service) {
        setStatus('connected')
        setIsLoading(false)
        onSuccess?.(service)
        
        // Notify the main process that a service was connected (for MCP refresh)
        if (typeof window !== 'undefined' && (window as any).api?.mcp?.notifyAuthenticationComplete) {
          console.log(`[ParagonIntegration] 🔄 Notifying main process of ${service} connection (install event)`)
          ;(window as any).api.mcp.notifyAuthenticationComplete({
            serviceKey: service,
            provider: 'paragon',
            success: true,
            userId: userId
          }).then((result: any) => {
            console.log(`[ParagonIntegration] ✅ Main process notified successfully for ${service} (install):`, result)
          }).catch((err: any) => {
            console.warn('Failed to notify main process:', err)
          })
        } else {
          console.log(`[ParagonIntegration] ❌ Cannot notify main process - API not available for ${service} (install event)`)
        }
      }
    })

    return () => {
      // Note: Paragon subscribe returns undefined, so we can't unsubscribe
      // This is a global subscription that persists across component lifecycle
    }
  }, [paragon, service, onSuccess, userId])

  const handleConnect = async () => {
    if (!paragon) {
      const errorMsg = 'Paragon SDK not available'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
      return
    }

    if (!user?.authenticated) {
      const errorMsg = 'User not authenticated with Paragon'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
      return
    }

    console.log(`[ParagonIntegration] 🔑 Connecting ${service} with user ID: ${userId || 'default-user'}`)
    if (!userId) console.warn(`[ParagonIntegration] ⚠️ No userId provided for ${service}`)

    setIsLoading(true)
    setError(null)
    setStatus('connecting')

    try {
       // Debug: Check what APIs are available and force the right path
       console.log(`[ParagonIntegration] 🔍 Debugging API availability for ${service}:`, {
         hasWindow: typeof window !== 'undefined',
         hasApi: !!(window as any).api,
         hasMcp: !!(window as any).api?.mcp,
         hasParagon: !!(window as any).api?.mcp?.paragon,
         hasAuthenticate: !!(window as any).api?.mcp?.paragon?.authenticate,
         userAgent: navigator.userAgent,
         isElectron: navigator.userAgent.includes('Electron'),
         fullApiStructure: (window as any).api
       })
       
       // FORCE the electron path if we're in electron
       const isElectron = navigator.userAgent.includes('Electron')
       if (isElectron) {
         console.log(`[ParagonIntegration] 🎯 ELECTRON DETECTED - Forcing Electron path for ${service}`)
       }
       
       // If running inside Electron, delegate to main process so it opens
       // a dedicated window that already has CSP patches (quick-debug flow)
       if (typeof window !== 'undefined' && (window as any).api?.mcp?.paragon?.authenticate) {
         console.log(`[ParagonIntegration] 🚀 Delegating ${service} auth to main process window`)
         await (window as any).api.mcp.paragon.authenticate(service)
         // main window will update status via SDK events when auth completes
         return
       } else {
         console.log(`[ParagonIntegration] ⚠️ Using fallback paragon.connect() path for ${service}`)
       }

       console.log(`🔐 Starting Paragon authentication for ${service} in browser mode`)
       const redirectUri = 'http://127.0.0.1:54321/paragon/callback'
       const connectOptions: any = { redirectUri, popup }
       await paragon.connect(service, connectOptions)
    } catch (err: any) {
      console.error(`❌ Paragon authentication failed for ${service}:`, err)
      setStatus('disconnected')
      setError(err.message || 'Connection failed')
      onError?.(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!paragon) {
      const errorMsg = 'Paragon SDK not available'
      setError(errorMsg)
      onError?.(new Error(errorMsg))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔌 Disconnecting Paragon service: ${service}`)
      await paragon.uninstallIntegration(service)
      setStatus('disconnected')
      
      // Notify Electron app of successful disconnection
      if (typeof window !== 'undefined') {
        if ((window as any).api?.mcp?.notifyAuthenticationComplete) {
          // Use direct IPC if running in Electron
          (window as any).api.mcp.notifyAuthenticationComplete({
            serviceKey: service,
            status: 'disconnected',
            timestamp: new Date().toISOString()
          }).catch((err: any) => {
            console.warn('Failed to notify Electron app via IPC:', err)
          })
        } else {
          // Fallback to HTTP API if running in browser
          console.log(`🌐 Using HTTP API fallback to notify Electron of ${service} disconnection`)
          fetch('http://localhost:9001/api/auth/notify-completion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serviceKey: service,
              status: 'disconnected',
              timestamp: new Date().toISOString()
            })
          }).then(response => response.json())
            .then(data => {
              if (data.success) {
                console.log(`✅ Successfully notified Electron of ${service} disconnection via HTTP`)
              } else {
                console.warn(`⚠️ HTTP notification failed:`, data)
              }
            })
            .catch((err: any) => {
              console.warn('Failed to notify Electron app via HTTP API:', err)
            })
        }
      }
    } catch (error: any) {
      console.error(`❌ Disconnect failed for ${service}:`, error)
      setError(error.message || 'Disconnect failed')
      onError?.(error)
      
      // Notify Electron app of disconnection failure
      if (typeof window !== 'undefined') {
        if ((window as any).api?.mcp?.notifyAuthenticationFailed) {
          // Use direct IPC if running in Electron
          (window as any).api.mcp.notifyAuthenticationFailed({
            serviceKey: service,
            error: error.message || 'Disconnect failed',
            timestamp: new Date().toISOString()
          }).catch((notifyErr: any) => {
            console.warn('Failed to notify Electron app via IPC:', notifyErr)
          })
        } else {
          // Fallback to HTTP API if running in browser
          console.log(`🌐 Using HTTP API fallback to notify Electron of ${service} disconnection failure`)
          fetch('http://localhost:9001/api/auth/notify-completion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serviceKey: service,
              status: 'failed',
              error: error.message || 'Disconnect failed',
              timestamp: new Date().toISOString()
            })
          }).then(response => response.json())
            .then(data => {
              if (data.success) {
                console.log(`✅ Successfully notified Electron of ${service} disconnection failure via HTTP`)
              } else {
                console.warn(`⚠️ HTTP notification failed:`, data)
              }
            })
            .catch((notifyErr: any) => {
              console.warn('Failed to notify Electron app via HTTP API:', notifyErr)
            })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'disconnected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'disconnected': return 'Disconnected'
      default: return 'Unknown'
    }
  }

  // Show loading state while authentication is in progress
  if (authLoading || !paragon) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <img src={icon} alt={displayName} className="w-8 h-8" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-sm text-gray-600">
                  {!paragon ? 'Initialization failed: Paragon SDK not available' : 'Loading...'}
                </span>
              </div>
            </div>
          </div>
        </div>
        {authError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{authError.message}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon && (
            <img src={icon} alt={displayName} className="w-8 h-8" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <span className="text-sm text-gray-600">{getStatusText()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {status === 'connected' ? (
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading || status === 'connecting' || !user?.authenticated}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>
      
      {(error || authError) && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error || authError?.message}</p>
        </div>
      )}
    </div>
  )
}