'use client'

import Link from 'next/link'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

function BillingPageContent() {

  const tabs = [
    { id: 'profile', name: 'Personal profile', href: '/settings' },
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
                  borderBottomColor: tab.id === 'billing' ? 'var(--brand-start)' : 'transparent',
                  color: tab.id === 'billing' ? 'var(--text)' : 'var(--muted)'
                }}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-center h-96">
          <h2 className="text-8xl font-black brand-gradient">
            Cl*ely For Free
          </h2>
        </div>
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