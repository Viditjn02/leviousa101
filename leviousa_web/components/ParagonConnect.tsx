import React, { useState, useEffect } from 'react'
import { paragon } from '@useparagon/connect'

interface ParagonConnectProps {
  onSuccess?: (integration: string) => void
  onError?: (error: any) => void
}

const ParagonConnect: React.FC<ParagonConnectProps> = ({ onSuccess, onError }) => {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        console.log('Initializing Paragon authentication...')
        
        const projectId = process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID
        if (!projectId) {
          throw new Error('NEXT_PUBLIC_PARAGON_PROJECT_ID not configured')
        }

        const res = await fetch('/api/paragonToken')
        if (!res.ok) {
          throw new Error(`Failed to get token: ${res.status}`)
        }
        
        const { userToken } = await res.json()
        console.log('Got user token, authenticating with Paragon...')
        
        await paragon.authenticate(projectId, userToken)
        console.log('✅ Paragon authentication successful')
        
        setAuthenticated(true)
        setError(null)
      } catch (err) {
        console.error('❌ Paragon authentication failed:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        onError?.(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [onError])

  const handleConnect = (integration: string) => async () => {
    try {
      console.log(`Connecting to ${integration}...`)
      
      // Use paragon.connect with proper options for in-app display
      paragon.connect(integration, {
        onSuccess: () => {
          console.log(`✅ Successfully connected to ${integration}`)
          onSuccess?.(integration)
        },
        onError: (error) => {
          console.error(`❌ Failed to connect to ${integration}:`, error)
          onError?.(error)
        },
        onOpen: () => {
          console.log(`🚀 Connect Portal opened for ${integration}`)
        },
        onClose: () => {
          console.log(`Connect Portal closed for ${integration}`)
        }
      })
    } catch (err) {
      console.error(`Paragon connect failed for ${integration}:`, err)
      onError?.(err)
    }
  }

  if (loading) {
    return (
      <div className="paragon-connect">
        <p>🔄 Initializing Paragon...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="paragon-connect">
        <p style={{ color: 'red' }}>❌ Error: {error}</p>
        <p>Please check your Paragon configuration:</p>
        <ul>
          <li>Verify NEXT_PUBLIC_PARAGON_PROJECT_ID is set</li>
          <li>Verify PARAGON_SIGNING_KEY is configured</li>
          <li>Check redirect URLs in Paragon dashboard</li>
        </ul>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="paragon-connect">
        <p>⏳ Authentication in progress...</p>
      </div>
    )
  }

  return (
    <div className="paragon-connect">
      <h3>🚀 Connect Your Apps</h3>
      <p>Click below to connect your accounts:</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={handleConnect('gmail')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#d73502', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          📧 Connect Gmail
        </button>
        <button 
          onClick={handleConnect('slack')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#4a154b', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          💬 Connect Slack
        </button>
        <button 
          onClick={handleConnect('notion')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#000000', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          📝 Connect Notion
        </button>
      </div>
    </div>
  )
}

export default ParagonConnect