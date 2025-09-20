'use client'

import React, { useState, useEffect, useRef } from 'react'
import useParagonGlobal from '../hooks/useParagonGlobal'
import { useParagonAuthContext } from '../context/ParagonAuthContext'
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
            // Fallback to HTTP if IPC not available (e.g., external domain)
            console.log(`🌐 Using HTTP fallback to notify Electron of ${service} connection`)
            fetch('http://localhost:9001/api/auth/notify-completion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceKey: service,
                provider: 'paragon',
                success: true,
                userId: userId
              })
            }).then(response => response.json())
              .then(data => {
                if (data.success) {
                  console.log(`✅ Successfully notified Electron of ${service} connection via HTTP`)
                } else {
                  console.warn(`⚠️ HTTP notification failed:`, data)
                }
              })
              .catch((err: any) => {
                console.warn('Failed to notify Electron app via HTTP:', err)
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
            // Fallback to HTTP if IPC not available (e.g., external domain)
            console.log(`🌐 Using HTTP fallback to notify Electron of ${service} connection (install event)`)
            fetch('http://localhost:9001/api/auth/notify-completion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serviceKey: service,
                status: 'connected',
                userId: userId,
                timestamp: new Date().toISOString()
              })
            }).then(response => response.json())
              .then(data => {
                if (data.success) {
                  console.log(`✅ Successfully notified Electron of ${service} connection via HTTP (install)`)
                } else {
                  console.warn(`⚠️ HTTP notification failed:`, data)
                }
              })
              .catch((err: any) => {
                console.warn('Failed to notify Electron app via HTTP (install):', err)
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

     // Skip authentication check - we'll authenticate SDK ourselves in the function
     console.log(`[ParagonIntegration] 🔍 User context authenticated: ${user?.authenticated}, proceeding with SDK auth...`)

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
       
        // Check if we're already in a delegated BrowserWindow (prevent infinite loop!)
        const urlParams = new URLSearchParams(window.location.search)
        const isAlreadyDelegated = urlParams.has('authenticate') || urlParams.has('service')
        
        if (isAlreadyDelegated) {
          console.log(`[ParagonIntegration] 🖥️ Already in delegated BrowserWindow for ${service} - processing directly`)
          console.log(`[ParagonIntegration] 🔍 URL params:`, {
            authenticate: urlParams.get('authenticate'),
            service: urlParams.get('service'),
            action: urlParams.get('action')
          })
        } else if (typeof window !== 'undefined' && (window as any).api?.mcp?.paragon?.authenticate) {
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
          const projectId = process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID || 'ed25f59d-f4d2-40da-995f-87e875e40865'
          const userToken = await generateParagonToken(userId)
          
          console.log(`🔍 [ParagonIntegration] Using projectId: ${projectId}`)
          console.log(`🔍 [ParagonIntegration] Generated token length: ${userToken?.length || 0}`)
          
          await paragon.authenticate(projectId, userToken)
          console.log(`✅ [ParagonIntegration] Paragon SDK authenticated successfully`)
          
        } catch (authError: any) {
          console.error(`❌ [ParagonIntegration] SDK authentication failed:`, authError)
          throw new Error(`SDK authentication failed: ${authError.message}`)
        }
        
        // PURE PARAGON APPROACH - Let Paragon handle EVERYTHING
        console.log(`🎯 [ParagonIntegration] Using pure Paragon approach - let SDK handle OAuth flow`)
        
        // SET UP IFRAME WATCHER - Monitor DOM for Paragon iframe creation
        console.log(`🔍 [ParagonIntegration] Setting up MutationObserver to watch for iframe creation...`)
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element
                  
                  // Check if it's a Paragon iframe
                  if (element.tagName === 'IFRAME') {
                    console.log(`📱 [ParagonIntegration] IFRAME CREATED!`, {
                      id: element.id,
                      src: (element as HTMLIFrameElement).src,
                      display: (element as HTMLElement).style.display,
                      zIndex: (element as HTMLElement).style.zIndex,
                      position: (element as HTMLElement).style.position,
                      width: (element as HTMLElement).style.width,
                      height: (element as HTMLElement).style.height
                    })
                    
                    // Check if it's the Paragon Connect Portal iframe
                    if ((element as HTMLIFrameElement).src.includes('useparagon.com') || 
                        element.id.includes('paragon') || 
                        element.id.includes('connect')) {
                      console.log(`🎯 [ParagonIntegration] PARAGON IFRAME DETECTED!`)
                      console.log(`🔍 [ParagonIntegration] Style display: ${(element as HTMLElement).style.display}`)
                      
                      // Force show if hidden
                      if ((element as HTMLElement).style.display === 'none') {
                        console.log(`🔧 [ParagonIntegration] IFRAME IS HIDDEN - Forcing visibility...`)
                        ;(element as HTMLElement).style.display = 'block'
                        console.log(`✅ [ParagonIntegration] Forced iframe to display: block`)
                      }
                    }
                  }
                }
              })
            }
          })
        })
        
        // Start watching for DOM changes
        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'id']
        })
        
        try {
          // CRITICAL: Debug SDK state before connect() to understand validation
          console.log(`🔍 [ParagonIntegration] Pre-connect SDK state debug:`)
          try {
            const currentUser = paragon.getUser()
            console.log(`  - SDK user authenticated: ${currentUser.authenticated}`)
            console.log(`  - SDK integrations:`, Object.keys((currentUser as any).integrations || {}))
            
            const metadata = paragon.getIntegrationMetadata()
            console.log(`  - Available integrations:`, metadata.map(m => ({ type: m.type, name: m.name })))
            
            const gmailMeta = metadata.find(m => m.type === 'gmail')
            console.log(`  - Gmail integration metadata:`, gmailMeta)
            
          } catch (debugError) {
            console.log(`  - SDK state debug failed:`, debugError instanceof Error ? debugError.message : debugError)
          }
          
          console.log(`⏰ [ParagonIntegration] Calling paragon.connect('${service}') - watching for iframe creation`)
          
          // CRITICAL: Add timeout to catch hanging connect() calls
          const connectPromise = paragon.connect(service, {})
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('connect() timeout - likely hanging')), 15000)
          )
          
          await Promise.race([connectPromise, timeoutPromise])
          console.log(`✅ [ParagonIntegration] Paragon.connect completed successfully for ${service}`)
          
          // Stop observing after 5 seconds
          setTimeout(() => {
            observer.disconnect()
            console.log(`🔍 [ParagonIntegration] Stopped DOM watching for ${service}`)
          }, 5000)
          
        } catch (connectError: any) {
          console.error(`❌ [ParagonIntegration] Paragon.connect FAILED for ${service}:`, connectError)
          console.error(`❌ [ParagonIntegration] Error message: "${connectError.message}"`)
          
          // SPECIFIC ERROR ANALYSIS based on SDK source code
          if (connectError.message?.includes('not active in your Paragon project')) {
            console.error(`🚫 [ParagonIntegration] SOLUTION: Login to Paragon dashboard → ${service} → Click "Activate"`)
            console.error(`🔗 [ParagonIntegration] Dashboard: https://dashboard.useparagon.com`)
          } else if (connectError.message?.includes('has not been set up in your Paragon project')) {
            console.error(`🚫 [ParagonIntegration] SOLUTION: Add ${service} integration to your Paragon project`)
            console.error(`🔗 [ParagonIntegration] Dashboard: https://dashboard.useparagon.com`)
          } else if (connectError.message?.includes('timeout')) {
            console.error(`🚫 [ParagonIntegration] SOLUTION: OAuth popup blocked or CSP issue`)
          } else if (connectError.message?.includes('popup')) {
            console.error(`🚫 [ParagonIntegration] SOLUTION: Popup blocker detected`)
          } else {
            console.error(`🔍 [ParagonIntegration] Unexpected error - please check Paragon dashboard integration status`)
          }
          
          throw connectError
        }
        
        // Check for Connect Portal after successful connect
        setTimeout(() => {
          const iframes = document.querySelectorAll('iframe')
          console.log(`🔍 [ParagonIntegration] Portal check: Found ${iframes.length} iframes`)
          
          if (iframes.length === 0) {
            console.warn(`⚠️ [ParagonIntegration] No Connect Portal iframe found for ${service}`)
            console.warn(`💡 [ParagonIntegration] Check Paragon dashboard - integration may not be activated`)
          } else {
            iframes.forEach((iframe, i) => {
              console.log(`📱 [ParagonIntegration] Iframe ${i}: ${iframe.src}`)
            })
          }
        }, 1000)
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
            // Fallback to HTTP if running in browser
            console.log(`🌐 Using HTTP fallback to notify Electron of ${service} disconnection`)
            fetch('http://localhost:9001/api/auth/notify-completion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
                console.warn('Failed to notify Electron app via HTTP:', err)
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
            // Fallback to HTTP if running in browser
            console.log(`🌐 Using HTTP fallback to notify Electron of ${service} disconnection failure`)
            fetch('http://localhost:9001/api/auth/notify-completion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
                console.warn('Failed to notify Electron app via HTTP:', notifyErr)
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
              disabled={isLoading || status === 'connecting'}
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