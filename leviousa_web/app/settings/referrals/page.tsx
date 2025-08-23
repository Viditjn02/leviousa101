'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/utils/firebase'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

interface Referral {
  id: string
  referred_email: string
  referral_code: string
  referral_type: string
  referred_uid?: string
  referred_joined_pro: boolean
  discount_code?: string
  discount_expires_at?: number
  discount_claimed: boolean
  created_at: number
  referral_link: string
}

interface ReferralStats {
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  proUpgrades: number
  my_referral_code: string
  referral_link: string
  bonus_minutes_earned: {
    auto_answer: number
    browser: number
  }
  has_referral_link?: boolean
}

function ReferralsPageContent() {
  const [user] = useAuthState(auth)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [newReferralEmail, setNewReferralEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const tabs = [
    { id: 'profile', name: 'Personal Profile', href: '/settings' },
    { id: 'privacy', name: 'Data & Privacy', href: '/settings/privacy' },
    { id: 'billing', name: 'Billing', href: '/settings/billing' },
    { id: 'referrals', name: 'Referrals', href: '/settings/referrals' },
  ]

  useEffect(() => {
    if (user) {
      fetchReferrals()
      fetchStats()
    }
  }, [user])

  const fetchReferrals = async () => {
    try {
      const idToken = await user?.getIdToken()
      const response = await fetch('/api/referrals/list', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setReferrals(data.referrals || [])
      } else {
        console.error('Failed to fetch referrals:', response.status)
        setReferrals([])
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
      setReferrals([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const idToken = await user?.getIdToken()
      const response = await fetch('/api/referrals/stats', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        console.error('Failed to fetch referral stats:', response.status)
        setStats(null)
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error)
      setStats(null)
    }
  }

  // Generate or retrieve user's unique referral link
  const generateReferralLink = async () => {
    if (!user) return
    
    try {
      setIsGenerating(true)
      
      const idToken = await user.getIdToken()
      
      console.log('🔗 Getting or creating referral link...')
      const response = await fetch('/api/referrals/generate-unique', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Got referral link:', data.referral_link)
        
        // Update stats to show the new referral link
        await fetchStats()
        
        return data.referral_link
      } else {
        console.error('Failed to generate referral link:', response.status)
        return null
      }
    } catch (error) {
      console.error('Error generating referral link:', error)
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const copyReferralLink = async () => {
    if (stats?.referral_link) {
      try {
        await navigator.clipboard.writeText(stats.referral_link)
        alert('Referral link copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy:', error)
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = stats.referral_link
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        alert('Referral link copied to clipboard!')
      }
    } else {
      await generateReferralLink()
      if (stats?.referral_link) {
        await copyReferralLink()
      }
    }
  }

  const createReferral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReferralEmail.trim()) return

    setIsCreating(true)
    try {
      const idToken = await user?.getIdToken()
      
      // First generate unique referral link
      const uniqueResponse = await fetch('/api/referrals/generate-unique', {
        method: 'GET', // ✅ CHANGED: Now GET since we're just retrieving/creating once
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      })

      if (uniqueResponse.ok) {
        const uniqueData = await uniqueResponse.json()
        
        // Create referral with the unique link
        const response = await fetch('/api/referrals/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            referred_email: newReferralEmail.trim(),
            unique_code: uniqueData.referral_code
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setReferrals([data.referral, ...referrals])
          setNewReferralEmail('')
          await fetchStats()
          
          // Show the unique link
          alert(`Referral created! Share this link: ${uniqueData.referral_link}`)
        } else {
          const errorData = await response.text()
          console.error('Failed to create referral:', response.status, errorData)
          alert('Failed to create referral')
        }
      } else {
        console.error('Failed to generate unique code:', uniqueResponse.status)
        alert('Failed to generate unique referral link')
      }
    } catch (error) {
      console.error('Error creating referral:', error)
      alert('Failed to create referral')
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Link copied to clipboard!')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const getStatusBadge = (referral: Referral) => {
    if (referral.referred_uid) {
      if (referral.referred_joined_pro) {
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Pro Member</span>
      }
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Joined</span>
    }
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>
  }

  return (
    <div className="min-h-screen" style={{background: 'var(--bg)'}}>
      <div className="px-8 py-8">
        <div className="mb-6">
          <p className="text-xs mb-1" style={{color: 'var(--muted)'}}>Settings</p>
          <h1 className="text-3xl font-bold brand-gradient">Personal settings</h1>
        </div>
        
        <div className="mb-8">
          <nav className="flex space-x-10">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors`}
                style={{
                  borderBottomColor: tab.id === 'referrals' ? 'var(--brand-start)' : 'transparent',
                  color: tab.id === 'referrals' ? 'var(--text)' : 'var(--muted)'
                }}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Referral Program Content */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold brand-gradient mb-2">Referral Program</h2>
            <p className="text-sm" style={{color: 'var(--muted)'}}>
              Invite friends and earn bonus usage time. Special emails get enhanced bonuses!
            </p>
          </div>

          {stats && (
            <div className="space-y-6">
              {/* My Referral Code */}
              {(stats as any).my_referral_code && (
                <div className="glass-card rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 brand-gradient">Your Unique Referral Link</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={(stats as any).referral_link || `https://www.leviousa.com/login?promo=${(stats as any).my_referral_code}`}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-l-lg"
                      style={{
                        backgroundColor: 'var(--card)',
                        color: 'var(--text)',
                        borderColor: 'var(--border)'
                      }}
                    />
                    <button
                      onClick={stats?.referral_link ? copyReferralLink : generateReferralLink}
                      className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating...' : stats?.referral_link ? 'Copy Link' : 'Generate Link'}
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{color: 'var(--muted)'}}>
                    Share this link to give friends 50% off and earn 60 min daily bonus yourself!
                  </p>
                </div>
              )}
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card rounded-lg p-4">
                  <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Total Referrals</h3>
                  <p className="text-2xl font-bold brand-gradient">{stats.totalReferrals}</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Pending</h3>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Completed</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.completedReferrals}</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                  <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Pro Upgrades</h3>
                  <p className="text-2xl font-bold text-purple-600">{stats.proUpgrades}</p>
                </div>
              </div>
            </div>
          )}

          {stats?.activeBonuses && (stats.activeBonuses.cmd_l > 0 || stats.activeBonuses.browser > 0) && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h3 className="font-medium mb-2 text-green-800 dark:text-green-200">Active Bonuses</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm" style={{color: 'var(--muted)'}}>Auto Answer Bonus:</span>
                  <span className="ml-2 font-medium text-green-600">+{stats.activeBonuses.cmd_l} minutes</span>
                </div>
                <div>
                  <span className="text-sm" style={{color: 'var(--muted)'}}>Browser Bonus:</span>
                  <span className="ml-2 font-medium text-blue-600">+{stats.activeBonuses.browser} minutes</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--text)'}}>Create New Referral</h3>
            
            <form onSubmit={createReferral} className="flex gap-4 mb-4">
              <input
                type="email"
                value={newReferralEmail}
                onChange={(e) => setNewReferralEmail(e.target.value)}
                placeholder="Enter email address to refer"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: 'var(--card)',
                  color: 'var(--text)',
                  borderColor: 'var(--border)'
                }}
                disabled={isCreating}
                required
              />
              <button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Referral'}
              </button>
            </form>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Referral Rewards</h4>
              <ul className="text-sm space-y-1" style={{color: 'var(--muted)'}}>
                <li>• <strong>Normal referrals:</strong> Referred person gets 30 min Auto Answer + Browser, you get 60 min (daily, resets in 24h)</li>
                <li>• <strong>Special emails:</strong> Referred person gets 3 day free trial of Pro with Stripe setup</li>
                <li>• <strong>Pro upgrade:</strong> When referred person joins Pro, you get 50% off first month (14 days to claim)</li>
              </ul>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--text)'}}>Your Referrals</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-lg" style={{color: 'var(--muted)'}}>Loading...</div>
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-lg" style={{color: 'var(--muted)'}}>No referrals yet</div>
                <p className="text-sm mt-2" style={{color: 'var(--muted)'}}>Create your first referral above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div key={referral.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium" style={{color: 'var(--text)'}}>{referral.referred_email}</h4>
                        <p className="text-sm" style={{color: 'var(--muted)'}}>
                          Created {formatDate(referral.created_at)}
                          {referral.referral_type === 'special' && (
                            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Special</span>
                          )}
                        </p>
                      </div>
                      {getStatusBadge(referral)}
                    </div>

                    <div className="mb-3">
                      <label className="text-sm font-medium" style={{color: 'var(--muted)'}}>Referral Link:</label>
                      <div className="flex mt-1">
                        <input
                          type="text"
                          value={referral.referral_link}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm border rounded-l-lg"
                          style={{
                            backgroundColor: 'var(--card)',
                            color: 'var(--text)',
                            borderColor: 'var(--border)'
                          }}
                        />
                        <button
                          onClick={() => copyToClipboard(referral.referral_link)}
                          className="px-4 py-2 border border-l-0 rounded-r-lg transition-colors"
                          style={{
                            backgroundColor: 'var(--card)',
                            color: 'var(--text)',
                            borderColor: 'var(--border)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card)'}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {referral.referred_joined_pro && referral.discount_code && !referral.discount_claimed && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                          🎉 Your referral joined Pro! You earned a 50% discount.
                        </p>
                        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          Claim Discount Code
                        </button>
                        {referral.discount_expires_at && (
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Expires {formatDate(referral.discount_expires_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReferralsPage() {
  return (
    <AuthenticatedLayout>
      <ReferralsPageContent />
    </AuthenticatedLayout>
  )
}
