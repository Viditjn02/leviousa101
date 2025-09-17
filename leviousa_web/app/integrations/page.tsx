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
  const firebaseToken = searchParams?.get('token') // Get Firebase token from URL
  const integrationsAccess = useIntegrationsAccess(firebaseToken || undefined)
  // Handle Electron app authentication requests
  const authenticateService = searchParams?.get('authenticate')
  const connectService = searchParams?.get('connect')
  const triggerAuthRef = useRef<{ [key: string]: () => void }>({})

  // Debug logging for user ID and token
  useEffect(() => {
    console.log('🔍 [IntegrationsContent] URL params debug:')
    console.log('  serviceToConnect:', serviceToConnect)
    console.log('  action:', action)
    console.log('  userId:', userId)
    console.log('  firebaseToken:', firebaseToken ? 'Present' : 'Missing')
    console.log('  authenticateService:', authenticateService)
    console.log('  connectService:', connectService)
    
    if (userId) {
      console.log('✅ [IntegrationsContent] User ID received from Electron:', userId)
    } else {
      console.warn('⚠️ [IntegrationsContent] No user ID received - authentication will use default-user')
    }

    if (firebaseToken) {
      console.log('🔑 [IntegrationsContent] Firebase token received from Electron for auth')
    } else {
      console.warn('⚠️ [IntegrationsContent] No Firebase token received - will try local auth')
    }
  }, [serviceToConnect, action, userId, firebaseToken, authenticateService, connectService])

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
    // Disable auto-connect to ensure OAuth popups are user-initiated (fixes popup blocking)
    // Following GPT-5's recommendation for OAuth popup reliability
    return false
    
    // Original logic (commented out):
    // return (
    //   (serviceToConnect === service && action === 'connect') ||
    //   authenticateService === service ||
    //   connectService === service
    // )
  }

  // Check if user has access to integrations
  if (integrationsAccess.loading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center" style={{background: 'linear-gradient(135deg, #905151 0%, #f2e9e9 100%)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{borderTop: '3px solid #905151', borderRight: '3px solid transparent'}}></div>
          <p className="text-xl text-white/90">Checking subscription access...</p>
        </div>
      </div>
    )
  }

  // Show upgrade prompt for free users
  if (!integrationsAccess.allowed) {
    return (
      <div className="min-h-screen py-8" style={{background: 'linear-gradient(135deg, #905151 0%, #f2e9e9 100%)'}}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Premium Integrations</h1>
            <p className="text-xl text-white/90">
              130+ SaaS integrations available with Leviousa Pro
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 text-center border border-white/30">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{background: 'linear-gradient(45deg, #905151, #f2e9e9)'}}>
              <span className="text-3xl text-white">🔗</span>
            </div>

            <h2 className="text-2xl font-bold mb-4" style={{color: '#905151'}}>
              Unlock Premium Integrations
            </h2>
            
            <p className="text-gray-700 mb-6 leading-relaxed">
              Connect Gmail, Google Calendar, Notion, LinkedIn, Slack, Salesforce, HubSpot and 130+ other services with Leviousa Pro.
            </p>

            <div className="rounded-lg p-6 mb-6" style={{background: 'linear-gradient(135deg, rgba(144, 81, 81, 0.1), rgba(242, 233, 233, 0.3))'}}>
              <h3 className="font-semibold mb-3" style={{color: '#905151'}}>🚀 What you get with Pro:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm" style={{color: '#724040'}}>
                <div className="flex items-center gap-2">
                  <span style={{color: '#905151'}}>✓</span>
                  <span>130+ Premium Integrations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{color: '#905151'}}>✓</span>
                  <span>Unlimited Auto Answer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{color: '#905151'}}>✓</span>
                  <span>Unlimited Browser Automation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{color: '#905151'}}>✓</span>
                  <span>Priority Support</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={async () => {
                  try {
                    console.log('🚀 Upgrade button clicked')
                    
                    // Get Firebase token (from URL or current auth)
                    let token = firebaseToken
                    if (!token && typeof window !== 'undefined') {
                      try {
                        const { auth } = await import('../../utils/firebase')
                        
                        // Wait for auth state
                        await new Promise((resolve) => {
                          const unsubscribe = auth.onAuthStateChanged((user) => {
                            unsubscribe()
                            resolve(user)
                          })
                        })
                        
                        const currentUser = auth.currentUser
                        if (currentUser) {
                          token = await currentUser.getIdToken()
                          console.log('🔑 Got Firebase token for checkout:', currentUser.email)
                        }
                      } catch (error) {
                        console.warn('Could not get Firebase token for checkout:', error)
                      }
                    }

                    if (!token) {
                      // Redirect to login if no token
                      console.log('❌ No auth token - redirecting to login')
                      window.location.href = '/login?redirect=/integrations'
                      return
                    }

                    console.log('💳 Creating Stripe checkout session...')

                    // Create Stripe checkout session
                    const response = await fetch('/api/subscription/checkout', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_1Rya4tDEhmkmCZeoBT9nutJR',
                        successUrl: `${window.location.origin}/integrations?success=true`,
                        cancelUrl: `${window.location.origin}/integrations?canceled=true`,
                      }),
                    })

                    console.log('📊 Checkout response status:', response.status)

                    if (response.ok) {
                      const data = await response.json()
                      console.log('✅ Checkout session created:', data)
                      if (data.url) {
                        console.log('🔗 Redirecting to Stripe checkout...')
                        window.location.href = data.url  // Same window instead of new tab
                      } else {
                        alert('Failed to create checkout session - no URL received')
                      }
                    } else {
                      const errorText = await response.text()
                      console.error('❌ Checkout failed:', response.status, errorText)
                      alert(`Failed to create checkout session: ${response.status}`)
                    }
                  } catch (error) {
                    console.error('❌ Error creating checkout session:', error)
                    alert('Failed to create checkout session - please try again')
                  }
                }}
                className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                style={{background: 'linear-gradient(45deg, #905151, #724040)', boxShadow: '0 4px 20px rgba(144, 81, 81, 0.3)'}}
              >
                🚀 Upgrade to Pro - $18/month
              </button>
              
              <p className="text-xs" style={{color: '#905151'}}>
                Current plan: {integrationsAccess.plan} • {integrationsAccess.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8" style={{background: 'linear-gradient(135deg, #905151 0%, #f2e9e9 100%)'}}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Premium Integrations</h1>
          <p className="text-xl text-white/90">
            Connect 130+ services with your invisible AI assistant
          </p>
        </div>

        <div className="space-y-8">
          {/* Available Now Section */}
          <div className="bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✅</span>
              <h2 className="text-xl font-semibold" style={{color: '#905151'}}>Available Now</h2>
              <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{background: '#905151'}}>
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
          <div className="bg-white/90 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏢</span>
              <h2 className="text-xl font-semibold" style={{color: '#905151'}}>Enterprise Services</h2>
              <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{background: 'linear-gradient(45deg, #905151, #724040)'}}>
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
                  background: '#905151',
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
                  background: '#905151',
                  color: '#fff'
                }}>
                  Enterprise
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Section - 130+ Integrations */}
          <div className="bg-white/85 backdrop-blur-sm border-2 border-white/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">⏳</span>
              <h2 className="text-xl font-semibold" style={{color: '#905151'}}>Coming Soon</h2>
              <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{background: 'linear-gradient(45deg, #905151, #724040)'}}>
                130+ Integrations
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 text-sm">
              {/* Communication & Email */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>Communication</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Microsoft Outlook</div>
                  <div>Slack</div>
                  <div>Microsoft Teams</div>
                  <div>Discord</div>
                  <div>Telegram</div>
                  <div>WhatsApp Business</div>
                  <div>Zoom</div>
                  <div>Skype</div>
                  <div>Signal</div>
                  <div>Intercom</div>
                  <div>Zendesk Chat</div>
                  <div>LiveChat</div>
                  <div>Drift</div>
                  <div>Crisp</div>
                  <div>Front</div>
                </div>
              </div>
              
              {/* Cloud Storage */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>Cloud Storage</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Google Drive</div>
                  <div>Dropbox</div>
                  <div>OneDrive</div>
                  <div>Box</div>
                  <div>iCloud</div>
                  <div>Amazon S3</div>
                  <div>Azure Blob</div>
                  <div>Mega</div>
                  <div>pCloud</div>
                  <div>Sync.com</div>
                  <div>SpiderOak</div>
                  <div>Tresorit</div>
                  <div>Backblaze B2</div>
                  <div>Wasabi</div>
                  <div>DigitalOcean Spaces</div>
                </div>
              </div>

              {/* CRM & Sales */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>CRM & Sales</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Salesforce</div>
                  <div>HubSpot</div>
                  <div>Pipedrive</div>
                  <div>Zoho CRM</div>
                  <div>Monday.com</div>
                  <div>Airtable</div>
                  <div>Copper</div>
                  <div>Freshsales</div>
                  <div>Insightly</div>
                  <div>Nutshell</div>
                  <div>Zendesk Sell</div>
                  <div>Close</div>
                  <div>ActiveCampaign</div>
                  <div>Keap</div>
                  <div>Ontraport</div>
                </div>
              </div>

              {/* Project Management */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>Project Mgmt</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Notion</div>
                  <div>Asana</div>
                  <div>Trello</div>
                  <div>Jira</div>
                  <div>ClickUp</div>
                  <div>Linear</div>
                  <div>Height</div>
                  <div>Basecamp</div>
                  <div>Wrike</div>
                  <div>Smartsheet</div>
                  <div>Teamwork</div>
                  <div>Workzone</div>
                  <div>Clarizen</div>
                  <div>ProWorkflow</div>
                  <div>Clubhouse</div>
                </div>
              </div>

              {/* Marketing & Analytics */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>Marketing</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Mailchimp</div>
                  <div>ConvertKit</div>
                  <div>Constant Contact</div>
                  <div>Campaign Monitor</div>
                  <div>SendGrid</div>
                  <div>Klaviyo</div>
                  <div>Pardot</div>
                  <div>Marketo</div>
                  <div>Google Analytics</div>
                  <div>Mixpanel</div>
                  <div>Amplitude</div>
                  <div>Segment</div>
                  <div>Hotjar</div>
                  <div>Crazy Egg</div>
                  <div>Optimizely</div>
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>Social Media</h4>
                <div className="space-y-1 text-gray-700">
                  <div>LinkedIn</div>
                  <div>Twitter/X</div>
                  <div>Facebook</div>
                  <div>Instagram</div>
                  <div>YouTube</div>
                  <div>TikTok</div>
                  <div>Pinterest</div>
                  <div>Snapchat</div>
                  <div>Reddit</div>
                  <div>Buffer</div>
                  <div>Hootsuite</div>
                  <div>Sprout Social</div>
                  <div>Later</div>
                  <div>SocialBee</div>
                  <div>Agorapulse</div>
                </div>
              </div>

              {/* E-commerce */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>E-commerce</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Shopify</div>
                  <div>WooCommerce</div>
                  <div>BigCommerce</div>
                  <div>Magento</div>
                  <div>Squarespace</div>
                  <div>Wix</div>
                  <div>Amazon</div>
                  <div>eBay</div>
                  <div>Etsy</div>
                  <div>Stripe</div>
                  <div>PayPal</div>
                  <div>Square</div>
                  <div>QuickBooks</div>
                  <div>Xero</div>
                  <div>FreshBooks</div>
                </div>
              </div>

              {/* Productivity */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wide" style={{color: '#905151'}}>Productivity</h4>
                <div className="space-y-1 text-gray-700">
                  <div>Microsoft 365</div>
                  <div>Google Workspace</div>
                  <div>Evernote</div>
                  <div>OneNote</div>
                  <div>Bear</div>
                  <div>Obsidian</div>
                  <div>Roam Research</div>
                  <div>LogSeq</div>
                  <div>Craft</div>
                  <div>Ulysses</div>
                  <div>Scapple</div>
                  <div>MindMeister</div>
                  <div>Lucidchart</div>
                  <div>Miro</div>
                  <div>Figma</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm font-medium" style={{color: '#905151'}}>
                + Many more popular services in development
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Can't find your service? <span className="font-medium" style={{color: '#905151'}}>Contact us</span> to prioritize development
              </p>
            </div>
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
      <div className="min-h-screen py-8 flex items-center justify-center" style={{background: 'linear-gradient(135deg, #905151 0%, #f2e9e9 100%)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{borderTop: '3px solid #905151', borderRight: '3px solid transparent'}}></div>
          <h1 className="text-2xl font-bold text-white mb-2">Loading Integrations...</h1>
          <p className="text-white/80">
            Checking your subscription access
          </p>
        </div>
      </div>
    }>
      <ParagonAuthProvider userId={userIdParam}>
      <IntegrationsContentInner />
    </ParagonAuthProvider>
    </Suspense>
  )
}