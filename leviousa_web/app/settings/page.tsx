'use client'

import { useState, useEffect } from 'react'
import { Check, ExternalLink, Cloud, HardDrive } from 'lucide-react'
import { useAuth } from '@/utils/auth'
import { 
  UserProfile,
  getUserProfile,
  updateUserProfile,
  deleteAccount,
  logout
} from '@/utils/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

declare global {
  interface Window {
    ipcRenderer?: any;
  }
}

type Tab = 'profile' | 'billing' | 'referrals'
type BillingCycle = 'monthly' | 'annually'

function SettingsPageContent() {
  const { user: userInfo, mode } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userProfile = await getUserProfile()
        setProfile(userProfile)
        setDisplayNameInput(userProfile.display_name)
      } catch (error) {
        console.error("Failed to fetch profile data:", error)
      }
    }
    
    if (userInfo) {
      fetchProfileData()
    }
  }, [userInfo])

  const isFirebaseMode = mode === 'firebase'

  const tabs = [
    { id: 'profile' as Tab, name: 'Profile', href: '/settings' },
    { id: 'billing' as Tab, name: 'Billing', href: '/settings/billing' },
    { id: 'referrals' as Tab, name: 'Referrals', href: '/settings/referrals' },
  ]

  const handleUpdateDisplayName = async () => {
    if (!profile || displayNameInput === profile.display_name) return;
    setIsSaving(true);
    try {
        await updateUserProfile({ displayName: displayNameInput });
        setProfile(prev => prev ? { ...prev, display_name: displayNameInput } : null);
    } catch (error) {
        console.error("Failed to update display name:", error);
    } finally {
        setIsSaving(false);
    }
  }

  const handleDeleteAccount = async () => {
    const confirmMessage = isFirebaseMode
      ? "Are you sure you want to delete your account? This action cannot be undone and all data stored in Firebase will be deleted."
      : "Are you sure you want to delete your account? This action cannot be undone and all data will be deleted."
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteAccount()
        router.push('/login');
      } catch (error) {
        console.error("Failed to delete account:", error)
      }
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const renderBillingContent = () => (
    <div className="space-y-8">
      {/* Removed Firebase Hosting Mode banner */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-300 rounded-lg p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Free</h3>
          <p className="text-gray-600 text-sm mb-4 flex-1">Perfect for getting started with basic features</p>
          <div className="text-2xl font-bold text-gray-900 mb-4">$0<span className="text-sm font-normal text-gray-500">/month</span></div>
          <button className="w-full py-2 px-4 bg-gray-900 text-white rounded-md font-medium">
            Current Plan
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-60">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro</h3>
            <div className="text-3xl font-bold text-gray-900">
              $25<span className="text-lg font-normal text-gray-600">/month</span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">
            Use latest models, get full response output, and work with custom prompts.
          </p>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700">Unlimited pro responses</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700">Unlimited access to latest models</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700">Full access to conversation dashboard</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700">Priority support</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700">All features from free plan</span>
            </li>
          </ul>
          
          <button className="w-full py-2 px-4 bg-cyan-400 text-white rounded-md font-medium">
            Coming Soon
          </button>
        </div>

        <div className="bg-gray-800 text-white rounded-lg p-6 opacity-60">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
            <div className="text-xl font-semibold">Custom</div>
          </div>
          
          <p className="text-gray-300 mb-6">
            Specially crafted for teams that need complete customization.
          </p>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">Custom integrations</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">User provisioning & role-based access</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">Advanced post-call analytics</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">Single sign-on</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">Advanced security features</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">Centralized billing</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-300">Usage analytics & reporting dashboard</span>
            </li>
          </ul>
          
          <button className="w-full py-2 px-4 bg-gray-600 text-white rounded-md font-medium">
            Coming Soon
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Check className="h-6 w-6 text-green-600" />
          <div>
            <h4 className="font-semibold text-green-900">All features are currently free!</h4>
            <p className="text-green-700 text-sm">
              {isFirebaseMode 
                ? 'Enjoy all Leviousa features for free in Firebase hosting mode. Pro and Enterprise plans will be released soon with additional premium features.'
: 'Enjoy all Leviousa features for free in local mode. You can use personal API keys or continue using the free system.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'billing':
        return renderBillingContent()
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Removed Firebase Hosting Mode banner */}
            
            <div className="glass-card rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text)'}}>Display Name</h3>
              <div className="space-y-4">
                  <div>
                  <label htmlFor="displayName" className="block text-sm font-medium mb-1" style={{color: 'var(--muted)'}}>
                    Display Name
                  </label>
                 <input
                    type="text"
                    id="displayName"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text)',
                      borderColor: 'var(--border)',
                      border: '1px solid',
                    }}
                    placeholder="Enter your display name"
                  />
              </div>
                <div className="flex justify-end">
                <button
                    onClick={handleUpdateDisplayName}
                    disabled={isSaving || !displayNameInput || displayNameInput === profile?.display_name}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isSaving || !displayNameInput || displayNameInput === profile?.display_name
                        ? 'cursor-not-allowed opacity-50'
                        : 'btn-brand'
                    }`}
                    style={{
                      backgroundColor: isSaving || !displayNameInput || displayNameInput === profile?.display_name 
                        ? 'var(--bg-card)' : undefined,
                      color: isSaving || !displayNameInput || displayNameInput === profile?.display_name 
                        ? 'var(--muted)' : undefined,
                      border: isSaving || !displayNameInput || displayNameInput === profile?.display_name 
                        ? '1px solid var(--border)' : undefined
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-red-300 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                {isFirebaseMode 
                  ? 'Permanently remove your Firebase account and all content. This action cannot be undone, so please proceed carefully.'
                  : 'Permanently remove your personal account and all content from the Leviousa platform. This action cannot be undone, so please proceed carefully.'
                }
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                 <button
                     onClick={handleDeleteAccount}
                     className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                 >
                     Delete
                 </button>
              </div>
            </div>
          </div>
        )
      default:
        return renderBillingContent()
    }
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
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors`}
                style={{
                  borderBottomColor: activeTab === tab.id ? 'var(--brand-start)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)'
                }}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        {renderTabContent()}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AuthenticatedLayout>
      <SettingsPageContent />
    </AuthenticatedLayout>
  )
} 