'use client'

import { useState, useEffect } from 'react'
import { Crown, CreditCard, Clock, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/utils/auth'
import { auth } from '@/utils/firebase'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

function BillingPageContent() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<any>(null)
  const [usageStatus, setUsageStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const tabs = [
    { id: 'profile', name: 'Profile', href: '/settings' },
    { id: 'billing', name: 'Billing', href: '/settings/billing' },
    { id: 'referrals', name: 'Referrals', href: '/settings/referrals' },
  ]

  useEffect(() => {
    const fetchBillingData = async () => {
      if (!user) return
      
      try {
        const firebaseUser = auth.currentUser
        if (!firebaseUser) {
          console.log('❌ No Firebase user found')
          return
        }
        
        const idToken = await firebaseUser.getIdToken()
        console.log('🔑 Using Firebase ID token for API calls')
        
        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : ''
        
        const [subscriptionResponse, usageResponse] = await Promise.all([
          fetch(`${baseUrl}/api/subscription/current`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          }),
          fetch(`${baseUrl}/api/usage/status`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
            },
          })
        ])

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          setSubscription(subscriptionData.subscription)
        }

        if (usageResponse.ok) {
          const usageData = await usageResponse.json()
          console.log('📊 Raw usage data from API:', usageData)
          
          // Transform the new API format to match the frontend expectations
          const transformedUsage = {
            cmd_l_usage_minutes: usageData.usage?.auto_answer_used || 0,
            browser_usage_minutes: usageData.usage?.browser_used || 0,
            cmd_l_limit_minutes: usageData.usage?.auto_answer_limit || 10,
            browser_limit_minutes: usageData.usage?.browser_limit || 10,
            subscription_plan: usageData.usage?.subscription_plan || 'free',
            referral_bonus: usageData.usage?.referral_bonus || { auto_answer_bonus: 0, browser_bonus: 0 },
            remaining: {
              auto_answer: usageData.usage?.auto_answer_remaining,
              browser: usageData.usage?.browser_remaining
            }
          }
          
          console.log('📊 Transformed usage data for UI:', transformedUsage)
          setUsageStatus(transformedUsage)
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
        // Set mock data for testing
        setSubscription({
          plan: 'free',
          status: 'active',
          current_period_end: Date.now() + (30 * 24 * 60 * 60 * 1000),
          cancel_at_period_end: false
        })
        setUsageStatus({
          cmd_l_usage_minutes: 5,
          browser_usage_minutes: 3,
          cmd_l_limit_minutes: 10,
          browser_limit_minutes: 10
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [user])

  const handleUpgradeToPro = async () => {
    if (!user) {
      alert('Please login first')
      return
    }

    try {
      console.log('Starting upgrade process...')
      
      const firebaseUser = auth.currentUser
      if (!firebaseUser) {
        alert('Authentication error. Please login again.')
        return
      }
      
      const idToken = await firebaseUser.getIdToken()
      console.log('🔑 Got Firebase ID token for checkout:', idToken.substring(0, 20) + '...')
      
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : ''
      
      const response = await fetch(`${baseUrl}/api/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_1Rya4tDEhmkmCZeoBT9nutJR',
          successUrl: `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/settings/billing?canceled=true`,
        }),
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Checkout session data:', data)
        
        if (data.url) {
          console.log('Redirecting to Stripe checkout:', data.url)
          window.location.href = data.url
        } else {
          console.error('No checkout URL received')
          alert('Failed to create checkout session - no URL received')
        }
      } else {
        const errorData = await response.text()
        console.error('Failed to create checkout session:', response.status, errorData)
        alert(`Failed to create checkout session: ${response.status}`)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error creating checkout session. Please try again.')
    }
  }

  const handleCancelSubscription = async () => {
    if (!user) {
      alert('Please login first')
      return
    }

    if (!confirm('Are you sure you want to cancel your subscription?')) return

    try {
      const firebaseUser = auth.currentUser
      if (!firebaseUser) {
        alert('Authentication error. Please login again.')
        return
      }
      
      const idToken = await firebaseUser.getIdToken()
      console.log('🔑 Canceling subscription with Firebase ID token')
      
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : ''
      
      const response = await fetch(`${baseUrl}/api/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        // Refresh subscription data
        window.location.reload()
      } else {
        console.error('Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
    }
  }

  const isProUser = subscription?.plan === 'pro'

  return (
    <div className="min-h-screen" style={{background: 'var(--bg)'}}>
      <div className="px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold brand-gradient">Personal Settings</h1>
        </div>
        
        <div className="mb-8">
          <nav className="flex space-x-10">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors`}
                style={{
                  borderBottomColor: tab.id === 'billing' ? 'var(--brand-start)' : 'transparent',
                  color: tab.id === 'billing' ? 'var(--text)' : 'var(--muted)'
                }}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: 'var(--brand-start)'}}></div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Current Plan Section */}
            <div className="glass-card rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold" style={{color: 'var(--text)'}}>
                      Current Plan
                    </h2>
                    {isProUser && (
                      <div className="flex items-center gap-1 px-3 py-1 brand-gradient text-black text-sm font-bold rounded-full">
                        <Crown className="h-4 w-4" />
                        Pro
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-2 brand-gradient">
                    {isProUser ? 'Pro Plan' : 'Free Plan'}
                  </p>
                  <p className="text-sm mt-1" style={{color: 'var(--muted)'}}>
                    {isProUser ? '$18/month • Everything unlimited' : 'Limited daily usage • Perfect to get started'}
                  </p>
                </div>
                <div className="text-right">
                  {isProUser ? (
                    <div className="space-y-2">
                      <button
                        onClick={handleCancelSubscription}
                        className="px-4 py-2 border text-red-400 hover:bg-red-950 rounded-md text-sm font-medium transition-colors"
                        style={{borderColor: 'var(--border)'}}
                      >
                        Cancel Subscription
                      </button>
                      <p className="text-xs" style={{color: 'var(--muted)'}}>
                        {subscription?.cancel_at_period_end ? 'Cancels at period end' : 'Active subscription'}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleUpgradeToPro}
                      className="btn-brand flex items-center gap-2 px-6 py-3 font-medium rounded-lg"
                    >
                      <Crown className="h-5 w-5" />
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Section for Free Users */}
            {!isProUser && usageStatus && (
              <div className="glass-card rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 brand-gradient">
                  Daily Usage
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{color: 'var(--text)'}}>Auto Answer</span>
                      <span className="text-sm" style={{color: 'var(--muted)'}}>
                        {usageStatus.cmd_l_limit_minutes === -1 ? 'Unlimited' : `${usageStatus.cmd_l_usage_minutes}/${usageStatus.cmd_l_limit_minutes} minutes`}
                        {usageStatus.referral_bonus?.auto_answer_bonus > 0 && (
                          <span className="text-green-400 ml-1">+{usageStatus.referral_bonus.auto_answer_bonus} bonus</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{backgroundColor: 'var(--border)'}}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          background: 'linear-gradient(45deg, var(--brand-start), var(--brand-end))',
                          width: usageStatus.cmd_l_limit_minutes === -1 ? '100%' : `${Math.min((usageStatus.cmd_l_usage_minutes / usageStatus.cmd_l_limit_minutes) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{color: 'var(--text)'}}>Browser Usage</span>
                      <span className="text-sm" style={{color: 'var(--muted)'}}>
                        {usageStatus.browser_limit_minutes === -1 ? 'Unlimited' : `${usageStatus.browser_usage_minutes}/${usageStatus.browser_limit_minutes} minutes`}
                        {usageStatus.referral_bonus?.browser_bonus > 0 && (
                          <span className="text-green-400 ml-1">+{usageStatus.referral_bonus.browser_bonus} bonus</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{backgroundColor: 'var(--border)'}}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          background: 'linear-gradient(45deg, var(--brand-start), var(--brand-end))',
                          width: usageStatus.browser_limit_minutes === -1 ? '100%' : `${Math.min((usageStatus.browser_usage_minutes / usageStatus.browser_limit_minutes) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs mt-4" style={{color: 'var(--muted)'}}>
                  <Clock className="h-4 w-4 inline mr-1" />
                  Usage resets every 24 hours
                </p>
              </div>
            )}

            {/* Plans Comparison */}
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-6 brand-gradient">
                Plans & Features
              </h3>
              <div className="grid grid-cols-2 gap-6">
                
                {/* Free Plan */}
                <div className={`glass-card rounded-lg p-6 ${!isProUser ? 'ring-2 ring-orange-400' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold brand-gradient">Free Plan</h4>
                    {!isProUser && <div className="text-xs font-medium px-2 py-1 rounded brand-gradient">Current</div>}
                  </div>
                  <p className="text-2xl font-bold mb-4 brand-gradient">$0</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>10 min daily Auto Answer</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>10 min daily browser</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>Default model only</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-400" />
                      <span style={{color: 'var(--muted)'}}>No integrations</span>
                    </li>
                  </ul>
                </div>

                {/* Pro Plan */}
                <div className={`glass-card rounded-lg p-6 ${isProUser ? 'ring-2 ring-orange-400' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold brand-gradient">Pro Plan</h4>
                      <Crown className="h-5 w-5" style={{color: 'var(--brand-start)'}} />
                    </div>
                    {isProUser && <div className="text-xs font-medium px-2 py-1 rounded brand-gradient">Current</div>}
                  </div>
                  <p className="text-2xl font-bold mb-4 brand-gradient">
                    $18 <span className="text-sm font-normal" style={{color: 'var(--muted)'}}>/month</span>
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>Unlimited Auto Answer</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>Unlimited browser</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>All models</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>All integrations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4" style={{color: 'var(--brand-start)'}} />
                      <span style={{color: 'var(--text)'}}>Priority support</span>
                    </li>
                  </ul>
                  {!isProUser && (
                    <button
                      onClick={handleUpgradeToPro}
                      className="btn-brand w-full mt-4 px-4 py-2 font-medium rounded-lg"
                    >
                      Upgrade Now
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <AuthenticatedLayout>
      <BillingPageContent />
    </AuthenticatedLayout>
  )
} 