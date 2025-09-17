'use client'

import React, { useState, useEffect, useRef } from 'react'
import useParagonGlobal from '../hooks/useParagonGlobal'
import { useParagonAuthContext } from '../context/ParagonAuthContext'
import { notifyParagonAuthentication } from '../utils/websocketClient'
import { generateParagonToken } from '../utils/paragonTokenGenerator'

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
          // Fallback to WebSocket if IPC not available (e.g., external domain)
          console.log(`🔌 Using WebSocket fallback to notify Electron of ${service} connection`)
          notifyParagonAuthentication(service, 'connected')
            .then(response => {
              if (response.success) {
                console.log(`✅ Successfully notified Electron of ${service} connection via WebSocket`)
              } else {
                console.warn(`⚠️ WebSocket notification failed:`, response)
              }
            })
            .catch((err: any) => {
              console.warn('Failed to notify Electron app via WebSocket:', err)
              console.log('Available APIs:', typeof window !== 'undefined' ? Object.keys((window as any).api || {}) : 'window undefined')
            })
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
          // Fallback to WebSocket if IPC not available (e.g., external domain)
          console.log(`🔌 Using WebSocket fallback to notify Electron of ${service} connection (install event)`)
          notifyParagonAuthentication(service, 'connected')
            .then(response => {
              if (response.success) {
                console.log(`✅ Successfully notified Electron of ${service} connection via WebSocket (install)`)
              } else {
                console.warn(`⚠️ WebSocket notification failed:`, response)
              }
            })
            .catch((err: any) => {
              console.warn('Failed to notify Electron app via WebSocket (install):', err)
            })
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
         
         try {
           const ipcResult = await (window as any).api.mcp.paragon.authenticate(service)
           console.log(`✅ [ParagonIntegration] IPC auth result for ${service}:`, ipcResult)
           return
         } catch (ipcError: any) {
           console.error(`❌ [ParagonIntegration] IPC auth failed for ${service}:`, ipcError)
           console.log(`[ParagonIntegration] 🔄 Falling back to browser mode due to IPC error`)
           // Fall through to browser mode
         }
       } else {
         console.log(`[ParagonIntegration] ⚠️ Using fallback paragon.connect() path for ${service}`)
         console.log(`[ParagonIntegration] 🔍 IPC debug:`, {
           hasWindow: typeof window !== 'undefined',
           hasApi: !!(window as any).api,
           hasMcp: !!(window as any).api?.mcp,  
           hasParagon: !!(window as any).api?.mcp?.paragon,
           hasAuthenticate: !!(window as any).api?.mcp?.paragon?.authenticate
         })
       }

       console.log(`🔐 Starting Paragon authentication for ${service} in browser mode`)
       
       // CRITICAL: Authenticate SDK with user token BEFORE calling connect()
       console.log(`🔑 [ParagonIntegration] Authenticating Paragon SDK first...`)
       try {
         const projectId = process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID || '270db720-6ead-460b-ae94-5ea9bec3f1e2'
         const userToken = await generateParagonToken(userId)
         
         console.log(`🔍 [ParagonIntegration] Using projectId: ${projectId}`)
         console.log(`🔍 [ParagonIntegration] Generated token length: ${userToken?.length || 0}`)
         
         await paragon.authenticate(projectId, userToken)
         console.log(`✅ [ParagonIntegration] Paragon SDK authenticated successfully`)
         
       } catch (authError: any) {
         console.error(`❌ [ParagonIntegration] SDK authentication failed:`, authError)
         throw new Error(`SDK authentication failed: ${authError.message}`)
       }
       
       // Now call connect() on the authenticated SDK
       // Use dynamic port detection for OAuth callback (same as API server)
       let redirectUri = 'http://127.0.0.1:54321/paragon/callback' // Fallback
       
       try {
         // Try to detect the actual API server port from WebSocket client
         const wsClient = (window as any).websocketClient
         if (wsClient?.wsUrl) {
           const wsUrl = wsClient.wsUrl
           const portMatch = wsUrl.match(/:(\d+)/)
           if (portMatch) {
             const actualPort = portMatch[1]
             redirectUri = `http://127.0.0.1:${actualPort}/paragon/callback`
             console.log(`🔍 [ParagonIntegration] Using dynamic port for OAuth callback: ${actualPort}`)
           }
         } else {
           // Alternative: try to detect from window.location if it's an Electron URL
           const electronUrl = (window as any).location?.href
           if (electronUrl?.includes('localhost:')) {
             const electronPortMatch = electronUrl.match(/localhost:(\d+)/)
             if (electronPortMatch) {
               const electronPort = electronPortMatch[1]
               redirectUri = `http://127.0.0.1:${electronPort}/paragon/callback`
               console.log(`🔍 [ParagonIntegration] Using Electron API port for OAuth callback: ${electronPort}`)
             }
           }
         }
       } catch (portError) {
         console.warn(`⚠️ [ParagonIntegration] Could not detect dynamic port, using fallback: 54321`)
       }
       
       console.log(`🔗 [ParagonIntegration] Final OAuth callback URI: ${redirectUri}`)
       const connectOptions: any = { redirectUri, popup }
       
       console.log(`🔍 [ParagonIntegration] Connect options for ${service}:`, connectOptions)
       
       // Test popup blocking before calling paragon.connect()
       console.log(`🧪 [ParagonIntegration] Testing popup capability...`)
       console.log(`🔍 [ParagonIntegration] Window debug info:`, {
         userAgent: navigator.userAgent,
         location: window.location.href,
         hasWindowOpen: typeof window.open,
         origin: window.location.origin,
         protocol: window.location.protocol,
         isInFrame: window.self !== window.top,
         frameElement: window.frameElement,
         webviewTag: document.querySelector('webview'),
         windowName: window.name,
         windowFeatures: window.outerHeight + 'x' + window.outerWidth
       })
       
       // GPT-5's webPreferences debugging
       if (typeof window !== 'undefined' && (window as any).electronAPI) {
         console.log(`🔍 [ParagonIntegration] ElectronAPI available - checking webPreferences...`)
         // Try to get webPreferences info if available
       } else {
         console.log(`🔍 [ParagonIntegration] No ElectronAPI - may be in webview or BrowserView`)
       }
       
       try {
         const testPopup = window.open('about:blank', '_blank', 'width=1,height=1')
         console.log(`🔍 [ParagonIntegration] window.open() returned:`, testPopup)
         
         if (testPopup) {
           testPopup.close()
           console.log(`✅ [ParagonIntegration] Popup test passed - popups allowed`)
         } else {
           console.error(`🚫 [ParagonIntegration] Popup test failed - window.open() returned null`)
           console.error(`🔍 [ParagonIntegration] This indicates Electron popup blocking at window level`)
         }
       } catch (popupTestError) {
         console.error(`🚫 [ParagonIntegration] Popup test error:`, popupTestError)
       }
       
       console.log(`🚀 [ParagonIntegration] Calling paragon.connect() for ${service}...`)
       
       try {
         // Add timeout to detect hanging
         const connectPromise = paragon.connect(service, connectOptions)
         const timeoutPromise = new Promise((_, reject) => 
           setTimeout(() => reject(new Error('OAuth popup timeout - may be blocked')), 10000)
         )
         
         const result = await Promise.race([connectPromise, timeoutPromise])
         console.log(`✅ [ParagonIntegration] Paragon.connect completed for ${service}:`, result)
         
         // Check if popup was actually opened
         console.log(`🔍 [ParagonIntegration] Popup status check - window focus events:`)
         setTimeout(() => {
           console.log(`🔍 [ParagonIntegration] Window focus state: focused=${document.hasFocus()}`)
         }, 1000)
         
       } catch (connectError: any) {
         console.error(`❌ [ParagonIntegration] Paragon.connect failed for ${service}:`, connectError)
         
         // Add specific error analysis
         if (connectError.message?.includes('timeout')) {
           console.error(`🚫 [ParagonIntegration] OAuth popup likely blocked or CSP issue for ${service}`)
         } else if (connectError.message?.includes('popup')) {
           console.error(`🚫 [ParagonIntegration] Popup blocker detected for ${service}`)
         }
         
         throw connectError
       }
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
          // Fallback to WebSocket if running in browser
          console.log(`🔌 Using WebSocket to notify Electron of ${service} disconnection`)
          notifyParagonAuthentication(service, 'disconnected')
            .then(response => {
              if (response.success) {
                console.log(`✅ Successfully notified Electron of ${service} disconnection via WebSocket`)
              } else {
                console.warn(`⚠️ WebSocket notification failed:`, response)
              }
            })
            .catch((err: any) => {
              console.warn('Failed to notify Electron app via WebSocket:', err)
              // Could add HTTP fallback here if needed
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
          // Fallback to WebSocket if running in browser
          console.log(`🔌 Using WebSocket to notify Electron of ${service} disconnection failure`)
          notifyParagonAuthentication(service, 'failed', error.message || 'Disconnect failed')
            .then(response => {
              if (response.success) {
                console.log(`✅ Successfully notified Electron of ${service} disconnection failure via WebSocket`)
              } else {
                console.warn(`⚠️ WebSocket notification failed:`, response)
              }
            })
            .catch((notifyErr: any) => {
              console.warn('Failed to notify Electron app via WebSocket:', notifyErr)
              // Could add HTTP fallback here if needed
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