import { NextApiRequest, NextApiResponse } from 'next'
import { verifyIdToken } from '../../../utils/firebase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    
    const { referralType, successUrl, cancelUrl } = req.body

    if (referralType !== 'special') {
      return res.status(400).json({ error: 'Free trial only available for special referrals' })
    }

    // TODO: Call Electron main process to create Stripe checkout session with trial
    // This should use STRIPE_PRO_TRIAL_PRICE_ID (price_1RycBIDEhmkmCZeod8LhtLEY)
    // which has 1-day trial period built-in
    
    const mockTrialSession = {
      sessionId: 'cs_test_trial_session_id',
      url: 'https://checkout.stripe.com/c/pay/cs_test_trial_session_id'
    }

    res.status(200).json(mockTrialSession)
  } catch (error) {
    console.error('Error creating trial session:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

