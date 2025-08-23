import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyIdToken } from '@/utils/firebase'
// Temporarily disabled while using Stripe native referrals
// import { createReferral, findReferralsByReferrer, findReferralByEmail } from '@/utils/repositories/referral'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Creating referral in real database...')
    
    // Get the authorization token from the request
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)
    
    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(token)
    const uid = decodedToken.uid

    const { referred_email } = req.body

    if (!referred_email || !referred_email.trim()) {
      return res.status(400).json({ error: 'Referred email is required' })
    }

    const cleanEmail = referred_email.trim().toLowerCase()

    console.log('🔍 Creating referral for:', cleanEmail)

    // Determine if this is a special email
    const specialEmails = ['viditjn02@gmail.com', 'viditjn@berkeley.edu', 'shreyabhatia63@gmail.com']
    const isSpecial = specialEmails.includes(cleanEmail)
    
    // Use Stripe's native promotion codes instead of custom referral system
    const promotionCode = isSpecial ? 'VIDIT3DAYS' : 'FRIEND50'
    const discount = isSpecial ? 'Automatic Pro access' : '50% off first month'
    
    console.log('🎫 Using Stripe promotion code:', promotionCode)

    // Create referral response with Stripe promotion code
    const responseReferral = {
      id: `stripe_promo_${Date.now()}`,
      referred_email: cleanEmail,
      referral_type: isSpecial ? 'special' : 'normal',
      promotion_code: promotionCode,
      discount_description: discount,
      created_at: Date.now(),
      referral_link: `https://www.leviousa.com/login?promo=${promotionCode}`,
      status: 'active',
      instructions: isSpecial 
        ? `${cleanEmail} will automatically get Pro access when they sign up - no payment required!`
        : `Share this link with ${cleanEmail}. They can use promotion code "${promotionCode}" at checkout for ${discount}.`
    }

    console.log('✅ Successfully created Stripe-based referral')

    return res.status(200).json({
      referral: responseReferral,
    })
  } catch (error) {
    console.error('❌ Error creating referral:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
