import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'

/**
 * Paragon Token Generation API Route
 * Generates JWT tokens for Paragon SDK authentication in system browser
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    // Get Paragon configuration from environment
    const projectId = process.env.PARAGON_PROJECT_ID || process.env.NEXT_PUBLIC_PARAGON_PROJECT_ID
    const signingKey = process.env.PARAGON_SIGNING_KEY

    if (!projectId || !signingKey) {
      console.error('[ParagonToken] Missing environment variables:', {
        hasProjectId: !!projectId,
        hasSigningKey: !!signingKey
      })
      return res.status(500).json({ error: 'Paragon configuration missing' })
    }

    // Generate JWT token for Paragon
    const payload = {
      sub: userId,
      aud: `useparagon.com/${projectId}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (1 * 3600), // 1 hour expiry
    }

    // Process signing key (handle escaped newlines)
    const privateKey = signingKey.replace(/\\n/g, '\n')

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' })

    console.log('[ParagonToken] ✅ Token generated successfully for userId:', userId)

    return res.status(200).json({
      success: true,
      token: token,
      userId: userId,
      projectId: projectId,
      expiresAt: new Date((payload.exp) * 1000).toISOString()
    })

  } catch (error: any) {
    console.error('[ParagonToken] ❌ Token generation failed:', error)
    return res.status(500).json({ 
      error: 'Token generation failed',
      message: error.message 
    })
  }
}

