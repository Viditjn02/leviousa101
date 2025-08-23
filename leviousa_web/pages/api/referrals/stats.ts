import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserReferralData } from '../../../utils/repositories/referral'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Fetching referral stats from real database...')
    
    // Get the authorization token from the request
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)
    
    // Simple JWT decode for immediate testing
    let uid = 'test-uid'
    let email = 'test@test.com'
    
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        uid = payload.user_id || payload.sub || payload.uid || 'test-uid'
        email = payload.email || 'test@test.com'
        console.log('✅ Token decoded successfully for user:', uid, email)
      }
    } catch (error) {
      console.log('⚠️ Token decode failed, using defaults for testing')
    }

    console.log('🔍 Getting real referral stats for user:', uid)

    // Get actual referral data from Firestore
    const referralData = await getUserReferralData(uid)
    
    if (!referralData) {
      // User doesn't have referral data yet - return zeros
      const userReferralCode = `FRIEND-${uid.substring(0, 8).toUpperCase()}`
      const stats = {
        totalReferrals: 0, // ✅ FIXED: Start with 0, not 1!
        pendingReferrals: 0, 
        completedReferrals: 0,
        proUpgrades: 0,
        my_referral_code: userReferralCode,
        referral_link: `https://www.leviousa.com/login?promo=${userReferralCode}`,
        bonus_minutes_earned: {
          auto_answer: 0,
          browser: 0
        },
        has_referral_link: false // User needs to create their link first
      }
      
      console.log('📊 User has no referral data yet - returning zeros')
      return res.status(200).json({ stats })
    }

    // Return real data from Firestore
    const stats = {
      totalReferrals: referralData.total_referrals,
      pendingReferrals: referralData.pending_referrals,
      completedReferrals: referralData.completed_referrals,
      proUpgrades: referralData.pro_upgrades,
      my_referral_code: referralData.referral_code,
      referral_link: referralData.referral_link,
      bonus_minutes_earned: referralData.bonus_minutes_earned,
      has_referral_link: true,
      created_at: referralData.created_at
    }

    console.log('📊 Retrieved real referral stats from Firestore:', stats)
    console.log(`✅ Successfully fetched stats for user: ${uid}`)

    return res.status(200).json({ stats })
  } catch (error) {
    console.error('❌ Error fetching referral stats:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
