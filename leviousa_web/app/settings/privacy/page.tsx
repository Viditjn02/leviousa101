'use client'

import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

function PrivacySettingsPageContent() {

  const tabs = [
    { id: 'profile', name: 'Profile', href: '/settings' },
    { id: 'privacy', name: 'Data & privacy', href: '/settings/privacy' },
    { id: 'billing', name: 'Billing', href: '/settings/billing' },
  ]

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
                  borderBottomColor: tab.id === 'privacy' ? 'var(--brand-start)' : 'transparent',
                  color: tab.id === 'privacy' ? 'var(--text)' : 'var(--muted)'
                }}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col">
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Privacy Policy</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Understand how we collect, use, and protect your personal information.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => window.open('/privacy-policy', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Privacy
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col">
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms of Service</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Understand your rights and responsibilities when using our platform.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => window.open('/terms-of-service', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Terms
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PrivacySettingsPage() {
  return (
    <AuthenticatedLayout>
      <PrivacySettingsPageContent />
    </AuthenticatedLayout>
  )
} 