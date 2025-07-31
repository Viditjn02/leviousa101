'use client'

import React, { useState, useEffect } from 'react'
import useParagonGlobal from '../hooks/useParagonGlobal'
import useParagonAuth from '../hooks/useParagonAuth'

interface ParagonIntegrationProps {
  service: string
  displayName: string
  icon?: string
  onSuccess?: (service: string) => void
  onError?: (error: any) => void
  registerTrigger?: (service: string, triggerFn: () => void) => void
  autoConnect?: boolean
}

export default function ParagonIntegration({ 
  service, 
  displayName, 
  icon, 
  onSuccess, 
  onError,
  registerTrigger,
  autoConnect = false
}: ParagonIntegrationProps) {
  const paragon = useParagonGlobal()
  const { user, error: authError, isLoading: authLoading } = useParagonAuth()
  
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check initial integration status when user is authenticated
  useEffect(() => {
    if (user && user.authenticated && paragon) {
      const integrationEnabled = user.integrations?.[service]?.enabled
      setStatus(integrationEnabled ? 'connected' : 'disconnected')
    }
  }, [user, service, paragon])

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

    setIsLoading(true)
    setError(null)
    setStatus('connecting')

    try {
      console.log(`🔐 Starting Paragon authentication for ${service}`)
      
      // Use the headless connect approach with paragon.connect()
      await paragon.connect(service, {
        onInstall: () => {
          console.log(`✅ ${service} integration installed successfully`)
          setStatus('connected')
          onSuccess?.(service)
        },
        onError: (err: any) => {
          console.error(`❌ Paragon Connect Portal error for ${service}:`, err)
          setError(err.message || 'Connection failed')
          onError?.(err)
          setStatus('disconnected')
        },
        onClose: () => {
          console.log(`🔒 Paragon Connect Portal closed for ${service}`)
          // Check final status after close
          const finalUser = paragon.getUser()
          if (finalUser.authenticated && finalUser.integrations?.[service]?.enabled) {
            setStatus('connected')
          } else if (status === 'connecting') {
            setStatus('disconnected')
          }
        }
      })
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
    } catch (error: any) {
      console.error(`❌ Disconnect failed for ${service}:`, error)
      setError(error.message || 'Disconnect failed')
      onError?.(error)
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