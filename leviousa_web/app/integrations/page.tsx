'use client'

import React, { useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ParagonIntegration from '../../components/ParagonIntegration'
import { useIntegrationsAccess } from '../../hooks/useSubscriptionAccess'
import { ParagonAuthProvider } from '../../context/ParagonAuthContext'

function IntegrationsContentInner() {
  const searchParams = useSearchParams()
  const serviceToConnect = searchParams?.get('service')
  const action = searchParams?.get('action')
  const userId = searchParams?.get('userId') // Get user ID from URL
  const integrationsAccess = useIntegrationsAccess()
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

  // Check if user has access to integrations
  if (integrationsAccess.loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking subscription access...</p>
        </div>
      </div>
    )
  }

  // Show upgrade prompt for free users
  if (!integrationsAccess.allowed) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Premium Integrations</h1>
            <p className="mt-2 text-gray-600">
              130+ SaaS integrations available with Leviousa Pro
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl text-white">🔗</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Unlock Premium Integrations
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Connect Gmail, Google Calendar, Notion, LinkedIn, Slack, Salesforce, HubSpot and 130+ other services with Leviousa Pro.
            </p>

            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">🚀 What you get with Pro:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>130+ Premium Integrations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Unlimited Auto Answer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Unlimited Browser Automation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Priority Support</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => window.open('https://www.leviousa.com/settings/billing', '_blank')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                🚀 Upgrade to Pro - $18/month
              </button>
              
              <p className="text-xs text-gray-500">
                Current plan: {integrationsAccess.plan} • {integrationsAccess.message}
              </p>
            </div>
          </div>
        </div>
      </div>
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

        <div className="space-y-8">
          {/* Available Now Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-600 text-xl">✅</span>
              <h2 className="text-xl font-semibold text-green-900">Available Now</h2>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Ready to use
              </span>
            </div>
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
                service="googleCalendar"
                displayName="Google Calendar"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('googleCalendar')}
                userId={userId || undefined}
              />
              <ParagonIntegration
                service="calendly"
                displayName="Calendly"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('calendly')}
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
              <ParagonIntegration
                service="notion"
                displayName="Notion"
                onSuccess={handleSuccess}
                onError={handleError}
                registerTrigger={registerTrigger}
                autoConnect={shouldAutoConnect('notion')}
                userId={userId || undefined}
              />
            </div>
          </div>

          {/* Enterprise Services Section */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-purple-600 text-xl">🏢</span>
              <h2 className="text-xl font-semibold text-purple-900">Enterprise Services</h2>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Enterprise Plan Required
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <ParagonIntegration
                  service="salesforce"
                  displayName="Salesforce"
                  onSuccess={handleSuccess}
                  onError={handleError}
                  registerTrigger={registerTrigger}
                  autoConnect={shouldAutoConnect('salesforce')}
                  userId={userId || undefined}
                />
                <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded" style={{
                  background: '#9333ea',
                  color: '#fff'
                }}>
                  Enterprise
                </div>
              </div>
              <div className="relative">
                <ParagonIntegration
                  service="hubspot"
                  displayName="HubSpot"
                  onSuccess={handleSuccess}
                  onError={handleError}
                  registerTrigger={registerTrigger}
                  autoConnect={shouldAutoConnect('hubspot')}
                  userId={userId || undefined}
                />
                <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded" style={{
                  background: '#9333ea',
                  color: '#fff'
                }}>
                  Enterprise
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-600 text-xl">⏳</span>
              <h2 className="text-xl font-semibold text-gray-900">Coming Soon</h2>
              <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                In development
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="relative opacity-60">
                <ParagonIntegration
                  service="outlook"
                  displayName="Microsoft Outlook"
                  onSuccess={handleSuccess}
                  onError={handleError}
                  registerTrigger={registerTrigger}
                  autoConnect={false}
                  userId={userId || undefined}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{
                  background: 'rgba(26, 26, 26, 0.8)'
                }}>
                  <span className="font-medium" style={{color: 'var(--muted)'}}>Coming Soon</span>
                </div>
              </div>
              <div className="relative opacity-60">
                <ParagonIntegration
                  service="slack"
                  displayName="Slack"
                  onSuccess={handleSuccess}
                  onError={handleError}
                  registerTrigger={registerTrigger}
                  autoConnect={false}
                  userId={userId || undefined}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{
                  background: 'rgba(26, 26, 26, 0.8)'
                }}>
                  <span className="font-medium" style={{color: 'var(--muted)'}}>Coming Soon</span>
                </div>
              </div>
              <div className="relative opacity-60">
                <ParagonIntegration
                  service="googledrive"
                  displayName="Google Drive"
                  onSuccess={handleSuccess}
                  onError={handleError}
                  registerTrigger={registerTrigger}
                  autoConnect={false}
                  userId={userId || undefined}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{
                  background: 'rgba(26, 26, 26, 0.8)'
                }}>
                  <span className="font-medium" style={{color: 'var(--muted)'}}>Coming Soon</span>
                </div>
              </div>
              <div className="relative opacity-60">
                <ParagonIntegration
                  service="dropbox"
                  displayName="Dropbox"
                  onSuccess={handleSuccess}
                  onError={handleError}
                  registerTrigger={registerTrigger}
                  autoConnect={false}
                  userId={userId || undefined}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{
                  background: 'rgba(26, 26, 26, 0.8)'
                }}>
                  <span className="font-medium" style={{color: 'var(--muted)'}}>Coming Soon</span>
                </div>
              </div>
              <div className="relative opacity-60">
                <ParagonIntegration
                  service="onedrive"
                  displayName="OneDrive"
                  onSuccess={handleSuccess}
                  onError={handleError}
                  registerTrigger={registerTrigger}
                  autoConnect={false}
                  userId={userId || undefined}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{
                  background: 'rgba(26, 26, 26, 0.8)'
                }}>
                  <span className="font-medium" style={{color: 'var(--muted)'}}>Coming Soon</span>
                </div>
              </div>
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