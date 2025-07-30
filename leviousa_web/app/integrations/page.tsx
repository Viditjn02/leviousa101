'use client'

import React from 'react'
import ParagonIntegration from '../../components/ParagonIntegration'

export default function IntegrationsPage() {
  const handleSuccess = (service: string) => {
    console.log(`✅ ${service} connected successfully!`)
    // You could add toast notifications or other success handling here
  }

  const handleError = (error: any) => {
    console.error('❌ Integration error:', error)
    // You could add error notifications here
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-2 text-gray-600">
            Connect your favorite services with Leviousa
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Email & Communication</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ParagonIntegration
                service="gmail"
                displayName="Gmail"
                onSuccess={handleSuccess}
                onError={handleError}
              />
              <ParagonIntegration
                service="outlook"
                displayName="Microsoft Outlook"
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">CRM & Sales</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ParagonIntegration
                service="salesforce"
                displayName="Salesforce"
                onSuccess={handleSuccess}
                onError={handleError}
              />
              <ParagonIntegration
                service="hubspot"
                displayName="HubSpot"
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Productivity</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ParagonIntegration
                service="slack"
                displayName="Slack"
                onSuccess={handleSuccess}
                onError={handleError}
              />
              <ParagonIntegration
                service="notion"
                displayName="Notion"
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cloud Storage</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ParagonIntegration
                service="googledrive"
                displayName="Google Drive"
                onSuccess={handleSuccess}
                onError={handleError}
              />
              <ParagonIntegration
                service="dropbox"
                displayName="Dropbox"
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🔗 How Integrations Work
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>• Click "Connect" to authenticate with your desired service</p>
            <p>• You'll be redirected to the service's login page</p>
            <p>• After authorization, you'll return to Leviousa automatically</p>
            <p>• Your connected services will appear in the AI assistant context</p>
          </div>
        </div>
      </div>
    </div>
  )
}