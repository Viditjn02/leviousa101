import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)
    
    // Simple JWT decode for immediate testing
    console.log('🔐 Decoding Firebase token...')
    let uid: string = 'test-uid'
    let email: string = 'test@test.com'
    
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        const userIdFromToken = payload.user_id || payload.sub || payload.uid || 'test-uid'
        const emailFromToken = payload.email || 'test@test.com'
        uid = userIdFromToken.toString()
        email = emailFromToken.toString()
        console.log('✅ Token decoded successfully for user:', uid, email)
      }
    } catch (error) {
      console.log('⚠️ Token decode failed, using defaults for testing')
    }

    console.log('📊 Getting usage status for user:', uid)

    // Check if this is a special email (gets unlimited access)
    const specialEmails = ['viditjn02@gmail.com', 'viditjn@berkeley.edu', 'shreyabhatia63@gmail.com']
    const isSpecialEmail = specialEmails.includes(email)
    
    // Get today's date for usage tracking
    const today: string = new Date().toISOString().split('T')[0];
    
    // Get real usage data from database
    const { findUsageByUserAndDate, getOrCreateTodayUsage } = await import('../../../utils/repositories/usageTracking')
    const { findSubscriptionByUserId } = await import('../../../utils/repositories/subscription')
    const { calculateDailyBonusLimits } = await import('../../../utils/repositories/referralBonus')
    
    // Get user's subscription and upgrade special emails to Pro automatically
    const { createSubscription, updateSubscription } = await import('../../../utils/repositories/subscription')
    let subscription = await findSubscriptionByUserId(uid)
    
    // For special emails, ensure they have a Pro subscription in the database
    if (isSpecialEmail) {
      console.log('👑 Special email detected, ensuring Pro subscription exists')
      
      if (!subscription) {
        // Create Pro subscription for special email
        subscription = await createSubscription(uid, {
          plan: 'pro',
          status: 'active',
          trial_start: Date.now(),
          trial_end: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year permanent access
        })
        console.log('✨ Created permanent Pro subscription for special email')
      } else if (subscription.plan !== 'pro') {
        // Upgrade to Pro
        subscription = await updateSubscription(subscription.id!, {
          plan: 'pro',
          status: 'active',
          trial_start: Date.now(),
          trial_end: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year permanent access
        })
        console.log('⬆️ Upgraded to Pro for special email')
      }
    }
    
    // Determine Pro status
    let isPro = subscription?.plan === 'pro' && subscription?.status === 'active'
    
    // Special emails are guaranteed Pro
    isPro = isPro || isSpecialEmail
    
    // Get today's usage record (creates if doesn't exist)
    let todayUsage = await getOrCreateTodayUsage(uid)
    
    // Calculate daily bonus limits from referrals
    const bonusLimits = await calculateDailyBonusLimits(uid, today)
    
    // Calculate final limits (base + bonus)
    const baseLimits = isPro ? -1 : 10
    const finalAutoAnswerLimit = baseLimits === -1 ? -1 : baseLimits + bonusLimits.auto_answer_bonus
    const finalBrowserLimit = baseLimits === -1 ? -1 : baseLimits + bonusLimits.browser_bonus
    
    const usageData = {
      auto_answer_used: todayUsage.cmd_l_usage_minutes || 0,
      browser_used: todayUsage.browser_usage_minutes || 0,
      auto_answer_limit: finalAutoAnswerLimit,
      browser_limit: finalBrowserLimit,
      auto_answer_remaining: finalAutoAnswerLimit === -1 ? -1 : Math.max(0, finalAutoAnswerLimit - (todayUsage.cmd_l_usage_minutes || 0)),
      browser_remaining: finalBrowserLimit === -1 ? -1 : Math.max(0, finalBrowserLimit - (todayUsage.browser_usage_minutes || 0)),
      date: today,
      subscription_plan: isPro ? 'pro' : 'free',
      is_special_email: isSpecialEmail,
      referral_bonus: bonusLimits
    };
    
    console.log('📊 Current usage for user:', usageData);

    console.log('✅ Successfully retrieved usage status');

    return res.status(200).json({ usage: usageData });
  } catch (error) {
    console.error('❌ Error fetching usage status:', error);
    return res.status(500).json({ 
      error: 'Error fetching usage status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}