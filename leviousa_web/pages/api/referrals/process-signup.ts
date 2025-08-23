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

    const { grantNormalReferralBonuses, grantSpecialEmailTrial } = await import('../../../utils/repositories/referralBonus')
    const { createSubscription, findSubscriptionByUserId } = await import('../../../utils/repositories/subscription')
    
    console.log(`🔍 Processing referral signup for ${userEmail} with code ${referralCode}`)
    
    // Determine referral type
    const referralType = SPECIAL_REFERRAL_EMAILS.includes(userEmail.toLowerCase()) ? 'special' : 'normal'
    
    // Extract referrer UID from referral code (format: FRIEND-XXXXXXXX)
    let referrerUid: string | null = null
    if (referralCode.startsWith('FRIEND-')) {
      // This is a user-specific referral code - extract referrer UID
      const codePrefix = referralCode.replace('FRIEND-', '')
      
      // In a real implementation, you'd look this up in your referral database
      // For now, we'll log it for tracking
      console.log(`👥 User-specific referral code detected: ${codePrefix}`)
      referrerUid = `referrer_from_${codePrefix}` // Placeholder
    }
    
    if (referralType === 'special') {
      console.log('⭐ Processing special email referral')
      
      // Grant 3-day Pro trial to special email user
      await grantSpecialEmailTrial(decodedToken.uid, `referral_${Date.now()}`)
      
      // Create Pro trial subscription
      let subscription = await findSubscriptionByUserId(decodedToken.uid)
      const trialEnd = Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days
      
      if (subscription) {
        const { updateSubscription } = await import('../../../utils/repositories/subscription')
        await updateSubscription(subscription.id!, {
          plan: 'pro',
          status: 'trialing',
          trial_start: Date.now(),
          trial_end: trialEnd
        })
      } else {
        await createSubscription(decodedToken.uid, {
          plan: 'pro',
          status: 'trialing',
          trial_start: Date.now(),
          trial_end: trialEnd
        })
      }
      
      return res.status(200).json({
        success: true,
        referralType: 'special',
        message: 'Special referral processed! You now have a 3-day Pro trial with unlimited usage.',
        trial_end: trialEnd
      })
      
    } else {
      console.log('👥 Processing normal referral')
      
      // Grant normal referral bonuses (30 min to referred, 60 min to referrer daily)
      if (referrerUid) {
        await grantNormalReferralBonuses(referrerUid, decodedToken.uid, `referral_${Date.now()}`)
        console.log('✅ Granted normal referral bonuses to both users')
      }
      
      return res.status(200).json({
        success: true,
        referralType: 'normal',
        message: 'Referral processed! You now get +30 minutes daily for Auto Answer and Browser features. Your referrer gets +60 minutes daily.',
        bonus_minutes: {
          auto_answer: 30,
          browser: 30,
          daily: true
        }
      })
    }
  } catch (error) {
    console.error('Error processing referral signup:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
