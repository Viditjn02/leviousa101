import type { NextApiHandler } from 'next'
import jwt from 'jsonwebtoken'

const handler: NextApiHandler = async (req, res) => {
  const signingKey = process.env.PARAGON_SIGNING_KEY
  const projectId = process.env.PARAGON_PROJECT_ID
  
  if (!signingKey || !projectId) {
    console.error('Paragon environment variables not configured:', { 
      hasSigningKey: !!signingKey, 
      hasProjectId: !!projectId 
    })
    return res.status(500).json({ error: 'Paragon not configured' })
  }

  // Get user ID from request or session - for now using a dynamic default
  const userId = req.headers['x-user-id'] || `user-${Date.now()}`
  
  const now = Math.floor(Date.now() / 1000)
  const token = jwt.sign(
    {
      sub: userId,
      aud: `useparagon.com/${projectId}`,
      iat: now,
      exp: now + 60 * 60, // 1 hour
    },
    signingKey,
    { algorithm: 'RS256' }
  )
  
  console.log('Generated Paragon token for user:', userId)
  res.status(200).json({ userToken: token })
}

export default handler