import React, { useState, useEffect } from 'react'
import { paragon } from '@useparagon/connect'

const ParagonConnect: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/paragonToken')
        const { userToken } = await res.json()
        await paragon.authenticate(
          process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID!,
          userToken
        )
        setAuthenticated(true)
      } catch (err) {
        console.error('Paragon authentication failed', err)
      }
    }
    init()
  }, [])

  const handleConnect = (integration: string) => async () => {
    try {
      await paragon.connect(integration)
    } catch (err) {
      console.error('Paragon connect failed', err)
    }
  }

  if (!authenticated) return null

  return (
    <div className="paragon-connect">
      <button onClick={handleConnect('gmail')}>Connect Gmail</button>
      <button onClick={handleConnect('slack')}>Connect Slack</button>
    </div>
  )
}

export default ParagonConnect