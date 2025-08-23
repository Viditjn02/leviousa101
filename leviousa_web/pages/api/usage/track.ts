import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)
    
    // Simple JWT decode for immediate testing
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

    const { usage_type, minutes_used } = req.body // 'auto_answer' or 'browser'

    if (!usage_type || !minutes_used) {
      return res.status(400).json({ error: 'usage_type and minutes_used are required' })
    }

    // Get today's date as string
    const today: string = new Date().toISOString().split('T')[0]

    console.log('⏱️ Tracking usage:', { uid, usage_type, minutes_used, date: today })

    // Use real database for usage tracking
    const { findUsageByUserAndDate, updateUsage, getOrCreateTodayUsage } = await import('../../../utils/repositories/usageTracking')
    const { findSubscriptionByUserId } = await import('../../../utils/repositories/subscription')
    
    // Special emails get automatic Pro subscription
    const specialEmails = ['viditjn02@gmail.com', 'viditjn@berkeley.edu', 'shreyabhatia63@gmail.com']
    const isSpecial = specialEmails.includes(email)
    
    // For special emails, ensure they have Pro subscription
    const { createSubscription, updateSubscription } = await import('../../../utils/repositories/subscription')
    let subscription = await findSubscriptionByUserId(uid)
    
    if (isSpecial && (!subscription || subscription.plan !== 'pro')) {
      console.log('👑 Auto-upgrading special email to Pro during usage tracking')
      
      if (!subscription) {
        subscription = await createSubscription(uid, {
          plan: 'pro',
          status: 'active',
          trial_start: Date.now(),
          trial_end: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year permanent access
        })
      } else {
        subscription = await updateSubscription(subscription.id!, {
          plan: 'pro',
          status: 'active',
          trial_start: Date.now(),
          trial_end: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year permanent access
        })
      }
    }
    
    const isPro = subscription?.plan === 'pro' && subscription?.status === 'active'
    const hasUnlimited = isPro || isSpecial
    
    // Ensure today's usage record exists
    await getOrCreateTodayUsage(uid)
    
    // Map usage_type to database field names
    const usageTypeMap = {
      'auto_answer': 'cmd_l',
      'browser': 'browser'
    }
    
    const dbUsageType = usageTypeMap[usage_type as keyof typeof usageTypeMap]
    if (!dbUsageType) {
      return res.status(400).json({ error: 'Invalid usage_type. Must be auto_answer or browser' })
    }
    
    // Update usage in database
    const updatedUsage = await updateUsage(uid, today, dbUsageType as 'cmd_l' | 'browser', minutes_used)
    
    if (!updatedUsage) {
      return res.status(500).json({ error: 'Failed to update usage' })
    }
    
    console.log('📊 Updated usage data in database:', updatedUsage)

    return res.status(200).json({
      success: true,
      message: 'Usage tracked successfully',
      usage: {
        date: today,
        auto_answer_used: updatedUsage.cmd_l_usage_minutes,
        browser_used: updatedUsage.browser_usage_minutes,
        auto_answer_limit: hasUnlimited ? -1 : 10,
        browser_limit: hasUnlimited ? -1 : 10,
        subscription_plan: hasUnlimited ? 'pro' : 'free'
      }
    })

  } catch (error) {
    console.error('❌ Error tracking usage:', error)
    return res.status(500).json({ 
      error: 'Error tracking usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
