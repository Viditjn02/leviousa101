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

    // Get today's date for usage tracking
    const today = new Date().toISOString().split('T')[0]
    
    // Get user's subscription from database to determine usage limits
    const { findSubscriptionByUserId } = await import('../../../utils/repositories/subscription')
    let subscription = await findSubscriptionByUserId(uid)
    const isPro = subscription?.plan === 'pro' && subscription?.status === 'active'
    
    // Usage data based on subscription plan
    let usageData = {
      auto_answer: 0,
      browser: 0,
      auto_answer_limit: isPro ? -1 : 10, // Unlimited for Pro users
      browser_limit: isPro ? -1 : 10      // Unlimited for Pro users
    }

    // Return subscription data from database
    if (subscription) {
      console.log(`✅ Found subscription - Plan: ${subscription.plan}, Status: ${subscription.status}`)
      return res.status(200).json({ subscription, usage: usageData })
    }

    // For regular users, return default free subscription
    const defaultSubscription = {
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

    return res.status(200).json({ subscription: defaultSubscription, usage: usageData })
  } catch (error) {
    console.error('❌ Error fetching subscription:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}