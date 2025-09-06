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
    { id: 'profile', name: 'Profile', href: '/settings' },
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
              Share this link to give friends 50% off and earn 60 min daily bonus yourself!
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
                      className="btn-brand px-4 py-2 rounded-r-lg transition-colors disabled:opacity-50"
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
