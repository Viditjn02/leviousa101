import type { NextApiHandler } from 'next'
import jwt from 'jsonwebtoken'

const handler: NextApiHandler = async (req, res) => {
  let signingKey = process.env.PARAGON_SIGNING_KEY || process.env.SIGNING_KEY
  const projectId = process.env.PARAGON_PROJECT_ID || process.env.PROJECT_ID
  
  if (!signingKey || !projectId) {
    return res.status(500).json({ error: 'Paragon not configured' })
  }
  
  // Process the signing key - remove quotes and fix newlines
  if (signingKey.startsWith('"') && signingKey.endsWith('"')) {
    signingKey = signingKey.slice(1, -1)
  }
  signingKey = signingKey.replace(/\\n/g, '\n')
  
  const userId = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId || 'default-user'
  const now = Math.floor(Date.now() / 1000)
  
  try {
    const token = jwt.sign(
      {
        sub: userId,
        aud: `useparagon.com/${projectId}`, // Required audience for Paragon headless connect portal
        iat: now,
        exp: now + (24 * 60 * 60), // 24 hours for better persistence
      },
      signingKey,
      { algorithm: 'RS256' }
    )
    
    console.log(`[ParagonToken API] Generated token for user: ${userId}`)
    return res.status(200).json({ userToken: token })
  } catch (err) {
    console.error('[ParagonToken API] Failed to generate token:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: 'Failed to generate token', details: errorMessage })
  }
}

export default handler