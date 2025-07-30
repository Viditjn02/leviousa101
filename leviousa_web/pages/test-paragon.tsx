import React from 'react'
import ParagonConnect from '../components/ParagonConnect'

export default function TestParagon() {
  const handleSuccess = (integration: string) => {
    alert(`✅ Successfully connected to ${integration}!`)
  }

  const handleError = (error: any) => {
    alert(`❌ Connection failed: ${error.message || error}`)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Paragon Connect Portal Test</h1>
      <p>This page tests the Paragon Connect Portal integration.</p>
      
      <div style={{ 
        border: '2px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px', 
        marginTop: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <ParagonConnect 
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <h3>📝 Expected Behavior:</h3>
        <ul>
          <li>✅ Connect Portal should appear as overlay within this page</li>
          <li>✅ No redirect URL errors (7105)</li>
          <li>✅ OAuth flow completes successfully</li>
          <li>✅ Success/error callbacks work properly</li>
        </ul>

        <h3>🔧 If you see errors:</h3>
        <ol>
          <li>Check browser console for detailed error messages</li>
          <li>Verify environment variables are configured in .env.local</li>
          <li>Ensure redirect URLs are configured in Paragon dashboard</li>
          <li>Make sure integrations are marked as "Active"</li>
        </ol>

        <h3>🌐 Required Redirect URLs in Paragon Dashboard:</h3>
        <ul>
          <li><code>https://passport.useparagon.com/oauth</code></li>
          <li><code>http://localhost:3000</code></li>
          <li><code>https://leviousa-101.web.app</code></li>
        </ul>
      </div>
    </div>
  )
}