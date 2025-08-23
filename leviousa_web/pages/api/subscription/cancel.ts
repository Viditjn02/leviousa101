import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyIdToken } from '@/utils/firebase'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization token from the request
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)
    
    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(token)
    const uid = decodedToken.uid

    // In a real implementation, you would:
    // 1. Look up the user's subscription in your database
    // 2. Get their Stripe subscription ID
    // 3. Cancel the subscription in Stripe
    // 4. Update your database

    // For now, we'll return a mock response
    console.log(`Canceling subscription for user: ${uid}`)

    return res.status(200).json({
      success: true,
      message: 'Subscription canceled successfully',
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}




