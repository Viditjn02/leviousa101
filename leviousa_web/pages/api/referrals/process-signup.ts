import { NextApiRequest, NextApiResponse } from 'next'
import { verifyIdToken } from '../../../utils/firebase'

// Special referral emails that get enhanced bonuses
const SPECIAL_REFERRAL_EMAILS = [
  'viditjn02@gmail.com',
  'viditjn@berkeley.edu', 
  'shreyabhatia63@gmail.com'
]

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
    
    const { referralCode, userEmail } = req.body

    if (!referralCode || !userEmail) {
      return res.status(400).json({ error: 'Referral code and email are required' })
    }

    // TODO: Call Electron main process to:
    // 1. Find referral by code
    // 2. Verify email matches referred_email
    // 3. Determine if this is special or normal referral
    // 4. Apply appropriate bonuses
    // 5. Update referral status

    // Mock implementation for now
    const mockReferral = {
      id: 'ref_123',
      referrer_email: 'referrer@example.com',
      referred_email: userEmail,
      referral_type: SPECIAL_REFERRAL_EMAILS.includes(userEmail.toLowerCase()) ? 'special' : 'normal'
    }

    // Return the referral type so the frontend knows what to show
    res.status(200).json({
      success: true,
      referralType: mockReferral.referral_type,
      referrerEmail: mockReferral.referrer_email,
      message: mockReferral.referral_type === 'special' 
        ? 'Special referral detected! You qualify for a 3-day free trial.'
        : 'Referral processed! Bonus usage time has been added to your account.'
    })
  } catch (error) {
    console.error('Error processing referral signup:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
