'use client'

import React, { useState, useEffect } from 'react'

interface ParagonIntegrationProps {
  service: string
  displayName: string
  icon?: string
  onSuccess?: (service: string) => void
  onError?: (error: any) => void
}

declare global {
  interface Window {
    api?: {
      paragon?: {
        authenticate: (service: string) => Promise<any>
        disconnect: (service: string) => Promise<any>
        getStatus: (service: string) => Promise<any>
      }
    }
  }
}

export default function ParagonIntegration({ 
  service, 
  displayName, 
  icon, 
  onSuccess, 
  onError 
}: ParagonIntegrationProps) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check initial status
    checkServiceStatus()
    
    // Listen for authentication status updates
    if (typeof window !== 'undefined' && window.api) {
      // Listen for Paragon auth updates
      const handleAuthUpdate = (event: any) => {
        console.log('🔄 Paragon auth status update:', event)
        if (event.detail?.service === service) {
          if (event.detail.success) {
            setStatus('connected')
            setError(null)
            onSuccess?.(service)
          } else {
            setStatus('disconnected')
            setError(event.detail.error || 'Authentication failed')
            onError?.(event.detail.error)
          }
        }
      }

      // Listen for disconnect events
      const handleDisconnect = (event: any) => {
        console.log('🔌 Paragon service disconnected:', event)
        if (event.detail?.service === service) {
          setStatus('disconnected')
          setError(null)
        }
      }

      window.addEventListener('paragon:auth-status-updated', handleAuthUpdate)
      window.addEventListener('paragon:service-disconnected', handleDisconnect)

      return () => {
        window.removeEventListener('paragon:auth-status-updated', handleAuthUpdate)
        window.removeEventListener('paragon:service-disconnected', handleDisconnect)
      }
    }
  }, [service, onSuccess, onError])

  const checkServiceStatus = async () => {
    try {
      if (window.api?.paragon?.getStatus) {
        const result = await window.api.paragon.getStatus(service)
        if (result.success) {
          setStatus(result.status || 'disconnected')
        }
      }
    } catch (error) {
      console.error('Error checking service status:', error)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)
    setStatus('connecting')

    try {
      if (!window.api?.paragon?.authenticate) {
        throw new Error('Paragon API not available - make sure you\'re running in Electron')
      }

      console.log(`🔐 Starting Paragon authentication for ${service}`)
      const result = await window.api.paragon.authenticate(service)
      
      if (result.success) {
        console.log(`✅ Paragon authentication initiated for ${service}`)
        // Status will be updated via event listener when OAuth completes
      } else {
        throw new Error(result.error || 'Authentication failed')
      }
    } catch (error: any) {
      console.error(`❌ Paragon authentication failed for ${service}:`, error)
      setStatus('disconnected')
      setError(error.message || 'Authentication failed')
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!window.api?.paragon?.disconnect) {
        throw new Error('Paragon API not available')
      }

      console.log(`🔌 Disconnecting Paragon service: ${service}`)
      const result = await window.api.paragon.disconnect(service)
      
      if (result.success) {
        setStatus('disconnected')
        console.log(`✅ ${service} disconnected successfully`)
      } else {
        throw new Error(result.error || 'Disconnect failed')
      }
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
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}