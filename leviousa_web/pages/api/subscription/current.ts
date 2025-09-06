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
    let uid = 'test-uid'
    let email = 'test@test.com'
    
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        // Use Buffer for better base64 decoding (more reliable than atob)
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'))
        uid = payload.user_id || payload.sub || payload.uid || 'test-uid'
        email = payload.email || 'test@test.com'
        console.log('✅ Token decoded successfully for user:', uid, email)
      }
    } catch (error) {
      console.log('⚠️ Token decode failed, using defaults for testing:', error)
    }
    
    const decodedToken = { uid, email }

    console.log('🔍 Getting subscription for user:', uid)

    // Check if this is a special email (gets Pro access)
    const specialEmails = ['viditjn02@gmail.com', 'viditjn@berkeley.edu', 'shreyabhatia63@gmail.com']
    const isSpecialEmail = specialEmails.includes(email)
    
    // Get today's date for usage tracking
    const today = new Date().toISOString().split('T')[0]
    
    // Simple usage data for immediate testing
    let usageData = {
      auto_answer: 0,
      browser: 0,
      auto_answer_limit: isSpecialEmail ? -1 : 10, // Unlimited for special emails
      browser_limit: isSpecialEmail ? -1 : 10      // Unlimited for special emails
    }

    // For special emails, return Pro subscription immediately
    if (isSpecialEmail) {
      console.log('👑 Special email detected:', email, '- returning Pro subscription')
      
      // Create/update Pro subscription in database
      try {
        const { createSubscription, findSubscriptionByUserId, updateSubscription } = await import('../../../utils/repositories/subscription')
        
        let subscription = await findSubscriptionByUserId(uid)
        
        if (!subscription) {
          // Create new Pro subscription for special email
          subscription = await createSubscription(uid, {
            plan: 'pro',
            status: 'active',
            trial_start: Date.now(),
            trial_end: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year trial for special emails
          })
          console.log('✨ Created permanent Pro subscription for special email')
        } else if (subscription.plan !== 'pro') {
          // Update existing subscription to Pro
          subscription = await updateSubscription(subscription.id!, {
            plan: 'pro',
            status: 'active',
            trial_start: Date.now(),
            trial_end: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year trial for special emails
          })
          console.log('⬆️ Upgraded existing subscription to Pro for special email')
        }

        return res.status(200).json({ 
          subscription: {
            ...subscription,
            plan: 'pro', // Ensure plan is explicitly set to pro
            is_special_email: true
          }, 
          usage: usageData 
        })
      } catch (dbError) {
        console.error('⚠️ Database error for special email, returning inline Pro subscription:', dbError)
        
        // Fallback: Return Pro subscription without database (for immediate UI fix)
        const proSubscription = {
          uid,
          plan: 'pro', // ← This is the key fix
          status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_start: undefined,
          current_period_end: undefined,
          trial_start: Date.now(),
          trial_end: Date.now() + (365 * 24 * 60 * 60 * 1000),
          created_at: Date.now(),
          updated_at: Date.now(),
          is_special_email: true
        }

        return res.status(200).json({ subscription: proSubscription, usage: usageData })
      }
    }

    // For regular users, return default free subscription
    const subscription = {
      uid,
      plan: 'free',
      status: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_start: undefined,
      current_period_end: undefined,
      trial_start: undefined,
      trial_end: undefined,
      created_at: Date.now(),
      updated_at: Date.now()
    }

    console.log('✅ Successfully retrieved subscription status and usage')

    return res.status(200).json({ subscription, usage: usageData })
  } catch (error) {
    console.error('❌ Error fetching subscription:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}