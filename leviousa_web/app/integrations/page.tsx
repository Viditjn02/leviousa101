'use client'

import React, { useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ParagonIntegration from '../../components/ParagonIntegration'

import { ParagonAuthProvider } from '../../context/ParagonAuthContext'

function IntegrationsContentInner() {
  const searchParams = useSearchParams()
  const serviceToConnect = searchParams?.get('service')
  const action = searchParams?.get('action')
  const userId = searchParams?.get('userId') // Get user ID from URL
  // Handle Electron app authentication requests
  const authenticateService = searchParams?.get('authenticate')
  const connectService = searchParams?.get('connect')
  const triggerAuthRef = useRef<{ [key: string]: () => void }>({})

  // Debug logging for user ID
  useEffect(() => {
    console.log('🔍 [IntegrationsContent] URL params debug:')
    console.log('  serviceToConnect:', serviceToConnect)
    console.log('  action:', action)
    console.log('  userId:', userId)
    console.log('  authenticateService:', authenticateService)
    console.log('  connectService:', connectService)
    
    if (userId) {
      console.log('✅ [IntegrationsContent] User ID received from Electron:', userId)
    } else {
      console.warn('⚠️ [IntegrationsContent] No user ID received - authentication will use default-user')
    }
  }, [serviceToConnect, action, userId, authenticateService, connectService])

  const handleSuccess = (service: string) => {
    console.log(`✅ ${service} connected successfully!`)
    // You could add toast notifications or other success handling here
    
    // Clear URL parameters after successful connection
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('service')
      url.searchParams.delete('action')
      url.searchParams.delete('authenticate')
      url.searchParams.delete('connect')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleError = (error: any) => {
    console.error('❌ Integration error:', error)
    // You could add error notifications here
  }

  // Auto-trigger authentication if service is specified in URL
  useEffect(() => {
    const targetService = serviceToConnect || authenticateService || connectService
    const shouldTrigger = 
      (serviceToConnect && action === 'connect') ||
      authenticateService ||
      connectService
    
    if (targetService && shouldTrigger && triggerAuthRef.current[targetService]) {
      console.log(`🚀 Auto-triggering authentication for ${targetService} (from Electron app)`)
      // Small delay to ensure components are mounted
      setTimeout(() => {
        triggerAuthRef.current[targetService]?.()
      }, 1000)
    }
  }, [serviceToConnect, action, authenticateService, connectService])

  const registerTrigger = (service: string, triggerFn: () => void) => {
    triggerAuthRef.current[service] = triggerFn
  }

  const shouldAutoConnect = (service: string) => {
    return (
      (serviceToConnect === service && action === 'connect') ||
      authenticateService === service ||
      connectService === service
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-2 text-gray-600">
            Connect your favorite services with Leviousa
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Email & Communication</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ParagonIntegration
                service="gmail"
                displayName="Gmail"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('gmail')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="outlook"
                displayName="Microsoft Outlook"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('outlook')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="slack"
                displayName="Slack"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('slack')}
                userId={userId || undefined}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">CRM & Sales</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ParagonIntegration
                service="salesforce"
                displayName="Salesforce"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('salesforce')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="hubspot"
                displayName="HubSpot"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('hubspot')}
                userId={userId || undefined}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Productivity</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ParagonIntegration
                service="notion"
                displayName="Notion"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('notion')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="googlecalendar"
                displayName="Google Calendar"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('googlecalendar')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="linkedin"
                displayName="LinkedIn"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('linkedin')}
                userId={userId || undefined}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cloud Storage</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ParagonIntegration
                service="googledrive"
                displayName="Google Drive"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('googledrive')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="dropbox"
                displayName="Dropbox"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('dropbox')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="onedrive"
                displayName="OneDrive"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('onedrive')}
                userId={userId || undefined}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🔗 How Integrations Work
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>• Click "Connect" to authenticate with your desired service</p>
            <p>• You'll be redirected to the service's login page</p>
            <p>• After authorization, you'll return to Leviousa automatically</p>
            <p>• Your connected services will appear in the AI assistant context</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams?.get('userId') || undefined;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            <p className="mt-2 text-gray-600">
              Loading integrations...
            </p>
          </div>
        </div>
      </div>
    }>
      <ParagonAuthProvider userId={userIdParam}>
      <IntegrationsContentInner />
    </ParagonAuthProvider>
    </Suspense>
  )
}