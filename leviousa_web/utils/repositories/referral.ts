import { db } from '../firebase-admin'

export interface ReferralData {
  uid: string
  referral_code: string
  referral_link: string
  stripe_promo_id?: string
  created_at: number
  total_referrals: number
  pending_referrals: number
  completed_referrals: number
  pro_upgrades: number
  bonus_minutes_earned: {
    auto_answer: number
    browser: number
  }
}

export async function getUserReferralData(uid: string): Promise<ReferralData | null> {
  try {
    const userDoc = await db.collection('users').doc(uid).get()
    if (userDoc.exists) {
      const data = userDoc.data()
      if (data?.referral_data) {
        return data.referral_data as ReferralData
      }
    }
    return null
  } catch (error) {
    console.error('Error getting user referral data:', error)
    return null
  }
}

export async function createUserReferralData(uid: string, referralData: Partial<ReferralData>): Promise<ReferralData> {
  const newReferralData: ReferralData = {
    uid,
    referral_code: referralData.referral_code!,
    referral_link: referralData.referral_link!,
    stripe_promo_id: referralData.stripe_promo_id,
    created_at: Date.now(),
    total_referrals: 0, // Start with 0, not 1!
    pending_referrals: 0,
    completed_referrals: 0,
    pro_upgrades: 0,
    bonus_minutes_earned: {
      auto_answer: 0,
      browser: 0
    }
  }

  try {
    await db.collection('users').doc(uid).update({
      referral_data: newReferralData,
      updated_at: Date.now()
    })
    
    console.log('✅ Created referral data for user:', uid)
    return newReferralData
  } catch (error) {
    console.error('Error creating user referral data:', error)
    throw error
  }
}

export async function updateUserReferralStats(uid: string, updates: Partial<ReferralData>): Promise<void> {
  try {
    const updateData: any = {}
    
    // Only update specific referral data fields
    Object.keys(updates).forEach(key => {
      if (key !== 'uid') {
        updateData[`referral_data.${key}`] = (updates as any)[key]
      }
    })
    
    updateData.updated_at = Date.now()
    
    await db.collection('users').doc(uid).update(updateData)
    console.log('✅ Updated referral stats for user:', uid)
  } catch (error) {
    console.error('Error updating user referral stats:', error)
    throw error
  }
}

// Track when someone uses a referral code
export async function trackReferralUsage(referrerUid: string, refereeUid: string, type: 'normal' | 'special' = 'normal'): Promise<void> {
  try {
    const referralData = await getUserReferralData(referrerUid)
    if (!referralData) return
    
    // Update referrer's stats
    await updateUserReferralStats(referrerUid, {
      total_referrals: referralData.total_referrals + 1,
      pending_referrals: referralData.pending_referrals + 1,
      bonus_minutes_earned: {
        auto_answer: referralData.bonus_minutes_earned.auto_answer + (type === 'normal' ? 60 : 0),
        browser: referralData.bonus_minutes_earned.browser + (type === 'normal' ? 60 : 0)
      }
    })
    
    console.log('✅ Tracked referral usage:', { referrerUid, refereeUid, type })
  } catch (error) {
    console.error('Error tracking referral usage:', error)
  }
}

