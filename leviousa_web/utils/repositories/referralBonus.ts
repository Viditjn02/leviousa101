// Referral bonus tracking repository
import { getSimpleFirestore } from './simple-firestore'
import { v4 as uuidv4 } from 'uuid'

interface ReferralBonus {
  id?: string
  uid: string
  referral_type: 'normal' | 'special'
  bonus_minutes_auto_answer: number
  bonus_minutes_browser: number
  expiry_date?: string // YYYY-MM-DD format, null for daily bonuses
  is_daily_bonus: boolean // true for normal referrals (resets daily), false for one-time bonuses
  granted_by_referral_id?: string
  created_at?: number
  updated_at?: number
}

const COLLECTION_NAME = 'referral_bonuses'

export async function createReferralBonus(uid: string, bonusData: Partial<ReferralBonus>): Promise<ReferralBonus> {
  const firestore = getSimpleFirestore()
  const id = uuidv4()
  const now = Date.now()
  
  const bonus: ReferralBonus = {
    id,
    uid,
    referral_type: bonusData.referral_type || 'normal',
    bonus_minutes_auto_answer: bonusData.bonus_minutes_auto_answer || 0,
    bonus_minutes_browser: bonusData.bonus_minutes_browser || 0,
    expiry_date: bonusData.expiry_date || null,
    is_daily_bonus: bonusData.is_daily_bonus ?? true,
    granted_by_referral_id: bonusData.granted_by_referral_id,
    created_at: now,
    updated_at: now
  }

  await firestore.collection(COLLECTION_NAME).doc(id).set(bonus)
  console.log('✨ Created referral bonus:', bonus)
  
  return bonus
}

export async function getUserReferralBonuses(uid: string): Promise<ReferralBonus[]> {
  console.log(`🔍 Getting referral bonuses for user: ${uid}`)
  
  // For development, return empty array
  // In production, this would query the real database
  return []
}

export async function calculateDailyBonusLimits(uid: string, today: string): Promise<{
  auto_answer_bonus: number,
  browser_bonus: number
}> {
  console.log(`🧮 Calculating daily bonus limits for user ${uid} on ${today}`)
  
  const bonuses = await getUserReferralBonuses(uid)
  
  let auto_answer_bonus = 0
  let browser_bonus = 0
  
  for (const bonus of bonuses) {
    if (bonus.is_daily_bonus) {
      // Daily bonuses are applied every day
      auto_answer_bonus += bonus.bonus_minutes_auto_answer
      browser_bonus += bonus.bonus_minutes_browser
    } else if (bonus.expiry_date && bonus.expiry_date >= today) {
      // One-time bonuses that haven't expired
      auto_answer_bonus += bonus.bonus_minutes_auto_answer
      browser_bonus += bonus.bonus_minutes_browser
    }
  }
  
  console.log(`📈 Daily bonus calculated: auto_answer +${auto_answer_bonus}min, browser +${browser_bonus}min`)
  
  return {
    auto_answer_bonus,
    browser_bonus
  }
}

// Referral reward definitions
export const REFERRAL_REWARDS = {
  normal: {
    referred_user: {
      auto_answer_bonus: 30, // 30 min daily
      browser_bonus: 30,     // 30 min daily
      is_daily: true
    },
    referrer_user: {
      auto_answer_bonus: 60, // 60 min daily  
      browser_bonus: 60,     // 60 min daily
      is_daily: true
    }
  },
  special: {
    referred_user: {
      // Gets 3 day Pro trial instead of bonus minutes
      trial_days: 3
    },
    referrer_user: {
      // Gets 50% off when referred user converts to Pro
      // This is handled via Stripe promotion codes
      stripe_discount: 50
    }
  }
}

export async function grantNormalReferralBonuses(referrerUid: string, referredUid: string, referralId: string) {
  console.log('🎁 Granting normal referral bonuses')
  
  // Grant bonus to referred user (30 min daily)
  await createReferralBonus(referredUid, {
    referral_type: 'normal',
    bonus_minutes_auto_answer: REFERRAL_REWARDS.normal.referred_user.auto_answer_bonus,
    bonus_minutes_browser: REFERRAL_REWARDS.normal.referred_user.browser_bonus,
    is_daily_bonus: true,
    granted_by_referral_id: referralId
  })
  
  // Grant bonus to referrer (60 min daily)
  await createReferralBonus(referrerUid, {
    referral_type: 'normal',
    bonus_minutes_auto_answer: REFERRAL_REWARDS.normal.referrer_user.auto_answer_bonus,
    bonus_minutes_browser: REFERRAL_REWARDS.normal.referrer_user.browser_bonus,
    is_daily_bonus: true,
    granted_by_referral_id: referralId
  })
  
  console.log('✅ Normal referral bonuses granted successfully')
}

export async function grantSpecialEmailTrial(referredUid: string, referralId: string) {
  console.log('⭐ Granting special email 3-day Pro trial')
  
  // The trial is handled via Stripe subscription, but we can track it here too
  await createReferralBonus(referredUid, {
    referral_type: 'special',
    bonus_minutes_auto_answer: 0, // Unlimited during trial
    bonus_minutes_browser: 0,     // Unlimited during trial
    is_daily_bonus: false,
    expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
    granted_by_referral_id: referralId
  })
  
  console.log('✅ Special email trial bonus granted successfully')
}


