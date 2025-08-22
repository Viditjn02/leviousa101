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
  activeBonuses: {
    cmd_l: number
    browser: number
  }
}

function ReferralsPageContent() {
  const [user] = useAuthState(auth)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [newReferralEmail, setNewReferralEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)

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
      // TODO: Replace with actual API call
      const mockReferrals = [
        {
          id: 'ref_1',
          referred_email: 'friend@example.com',
          referral_code: 'abc123',
          referral_type: 'normal',
          referred_uid: 'user_123',
          referred_joined_pro: true,
          discount_code: 'FRIEND50',
          discount_expires_at: Date.now() + (14 * 24 * 60 * 60 * 1000),
          discount_claimed: false,
          created_at: Date.now() - (7 * 24 * 60 * 60 * 1000),
          referral_link: 'https://www.leviousa.com/login?ref=abc123'
        }
      ]
      setReferrals(mockReferrals)
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // TODO: Replace with actual API call
      const mockStats = {
        totalReferrals: 3,
        pendingReferrals: 1,
        completedReferrals: 2,
        proUpgrades: 1,
        activeBonuses: {
          cmd_l: 60,
          browser: 30
        }
      }
      setStats(mockStats)
    } catch (error) {
      console.error('Error fetching referral stats:', error)
    }
  }

  const createReferral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReferralEmail.trim()) return

    setIsCreating(true)
    try {
      // TODO: Replace with actual API call
      const mockReferral = {
        id: 'ref_' + Math.random().toString(36).substring(2, 15),
        referred_email: newReferralEmail.trim(),
        referral_code: Math.random().toString(36).substring(2, 15),
        referral_type: 'normal',
        referred_uid: undefined,
        referred_joined_pro: false,
        discount_code: undefined,
        discount_expires_at: undefined,
        discount_claimed: false,
        created_at: Date.now(),
        referral_link: `https://www.leviousa.com/login?ref=${Math.random().toString(36).substring(2, 15)}`
      }
      
      setReferrals([mockReferral, ...referrals])
      setNewReferralEmail('')
      await fetchStats()
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Total Referrals</h3>
                <p className="text-2xl font-bold brand-gradient">{stats.totalReferrals}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Pending</h3>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Completed</h3>
                <p className="text-2xl font-bold text-green-600">{stats.completedReferrals}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium" style={{color: 'var(--muted)'}}>Pro Upgrades</h3>
                <p className="text-2xl font-bold text-purple-600">{stats.proUpgrades}</p>
              </div>
            </div>
          )}

          {stats?.activeBonuses && (stats.activeBonuses.cmd_l > 0 || stats.activeBonuses.browser > 0) && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h3 className="font-medium mb-2 text-green-800 dark:text-green-200">Active Bonuses</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm" style={{color: 'var(--muted)'}}>Cmd+L Bonus:</span>
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
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
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
                <li>• <strong>Normal referrals:</strong> Referred person gets 30 min, you get 60 min (daily, resets in 24h)</li>
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
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700"
                        />
                        <button
                          onClick={() => copyToClipboard(referral.referral_link)}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
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
