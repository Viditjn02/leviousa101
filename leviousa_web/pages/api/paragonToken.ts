import type { NextApiHandler } from 'next'
import jwt from 'jsonwebtoken'

const handler: NextApiHandler = async (req, res) => {
  const signingKey = process.env.PARAGON_SIGNING_KEY
  const projectId = process.env.PARAGON_PROJECT_ID
  if (!signingKey || !projectId) {
    return res.status(500).json({ error: 'Paragon not configured' })
  }
  const now = Math.floor(Date.now() / 1000)
  const token = jwt.sign(
    {
      sub: 'default-user',
      aud: `useparagon.com/${projectId}`,
      iat: now,
      exp: now + 60 * 60,
    },
    signingKey,
    { algorithm: 'RS256' }
  )
  res.status(200).json({ userToken: token })
}

export default handler