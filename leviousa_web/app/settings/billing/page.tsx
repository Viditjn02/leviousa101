'use client'

import AuthenticatedLayout from '@/components/AuthenticatedLayout'

function BillingPageContent() {

  const tabs = [
    { id: 'profile', name: 'Personal profile', href: '/settings' },
    { id: 'privacy', name: 'Data & privacy', href: '/settings/privacy' },
    { id: 'billing', name: 'Billing', href: '/settings/billing' },
  ]

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="px-8 py-8">
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-1">Settings</p>
          <h1 className="text-3xl font-bold text-gray-900">Personal settings</h1>
        </div>
        
        <div className="mb-8">
          <nav className="flex space-x-10">
            {tabs.map((tab) => (
              <a
                key={tab.id}
                href={tab.href}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  tab.id === 'billing'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-center h-96">
          <h2 className="text-8xl font-black bg-gradient-to-r from-black to-gray-500 bg-clip-text text-transparent">
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