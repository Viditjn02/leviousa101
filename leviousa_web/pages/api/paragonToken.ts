import type { NextApiHandler } from 'next'
import jwt from 'jsonwebtoken'

const handler: NextApiHandler = async (req, res) => {
  const signingKey = process.env.PARAGON_SIGNING_KEY
  const projectId = process.env.PARAGON_PROJECT_ID
  if (!signingKey || !projectId) {
    return res.status(500).json({ error: 'Paragon not configured' })
  }
  const userId = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId || 'default-user'
  const now = Math.floor(Date.now() / 1000)
  try {
    const token = jwt.sign(
      {
        sub: userId,
        aud: `useparagon.com/${projectId}`,
        iat: now,
        exp: now + 60 * 60,
      },
      signingKey,
      { algorithm: 'RS256' }
    )
    return res.status(200).json({ userToken: token })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate token' })
  }
}

export default handler