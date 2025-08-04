'use client'

import React from 'react'
import ParagonIntegration from '../../components/ParagonIntegration'

export default function TestParagonPage() {
  const handleSuccess = (service: string) => {
    console.log(`✅ ${service} connected successfully!`)
    alert(`${service} connected successfully!`)
  }

  const handleError = (error: any) => {
    console.error('❌ Integration error:', error)
    alert(`Error: ${error.message}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Paragon Integration Test</h1>
          <p className="mt-2 text-gray-600">
            Test the Paragon integration components
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Integration</h2>
          <div className="max-w-md">
            <ParagonIntegration
              service="gmail"
              displayName="Gmail (Test)"
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🧪 Test Instructions
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>• This page tests the Paragon integration in isolation</p>
            <p>• Check the browser console for detailed logs</p>
            <p>• The component should show "Loading..." then "Disconnected"</p>
            <p>• Click "Connect" to test the OAuth flow</p>
          </div>
        </div>
      </div>
    </div>
  )
}