import type { NextApiRequest, NextApiResponse } from 'next'

type SubscriptionResponse = {
  allowed: boolean
  plan: string
  message: string
  requiresUpgrade: boolean
  usage?: number
  limit?: number
  remaining?: number
  specialEmail?: boolean
  testMode?: boolean
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubscriptionResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      allowed: false,
      plan: 'unknown',
      message: 'Method not allowed',
      requiresUpgrade: true,
      error: 'Only POST requests allowed'
    })
  }

  try {
    const { featureType } = req.body

    if (!featureType) {
      return res.status(400).json({
        allowed: false,
        plan: 'unknown',
        message: 'Feature type is required',
        requiresUpgrade: true,
        error: 'Missing featureType parameter'
      })
    }

    // Get Firebase auth token and decode it
    let userId = 'guest-user'
    let email: string | null = null
    
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        // Simple JWT decode for user info (same as backend_node logic)
        const tokenParts = token.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'))
          userId = payload.user_id || payload.sub || payload.uid || 'guest-user'
          email = payload.email || null
          console.log(`[API] 🔑 Subscription check for authenticated user: ${userId} (${email})`)
        }
      } catch (error) {
        console.log('[API] ⚠️ Token decode failed, using guest access')
      }
    } else {
      console.log('[API] ⚠️ No auth token provided, using guest access')
    }

    // Check if this is a special email (gets Pro access)
    const specialEmails = ['viditjn02@gmail.com', 'viditjn@berkeley.edu', 'shreyabhatia63@gmail.com']
    const isSpecialEmail = email && specialEmails.includes(email)
    
    console.log(`[API] 🧪 Checking access for user: ${userId}, email: ${email}, featureType: ${featureType}, isSpecial: ${isSpecialEmail}`)

    // 🧪 SIMPLIFIED TEST: Check if this is the Pro user or special email
    if (userId === 'vqLrzGnqajPGlX9Wzq89SgqVPsN2' || isSpecialEmail) {
      console.log('[API] ✅ Pro user detected (viditjn02@gmail.com)')
      
      if (featureType === 'integrations') {
        // Grant Pro user full integration access
        return res.json({
          allowed: true,
          plan: 'pro',
          message: 'Pro user - integration access granted',
          requiresUpgrade: false,
          specialEmail: isSpecialEmail,
          testMode: true
        })
      } else {
        // Grant unlimited usage for other features
        return res.json({
          allowed: true,
          plan: 'pro', 
          message: 'Pro user - unlimited access',
          requiresUpgrade: false,
          usage: 0,
          limit: -1,
          remaining: -1,
          testMode: true
        })
      }
    } else {
      console.log('[API] 🆓 Free user detected')
      
      if (featureType === 'integrations') {
        // Block free users from integrations
        return res.json({
          allowed: false,
          plan: 'free',
          message: 'Integration access requires Leviousa Pro',
          requiresUpgrade: true,
          testMode: true
        })
      } else {
        // Free users get limited usage
        return res.json({
          allowed: true,
          plan: 'free',
          message: 'Limited access - upgrade for unlimited',
          requiresUpgrade: false,
          usage: 0,
          limit: 10,
          remaining: 10,
          testMode: true
        })
      }
    }

  } catch (error) {
    console.error('[API] Subscription access check error:', error)
    
    return res.status(500).json({
      allowed: false,
      plan: 'unknown',
      message: 'Internal server error',
      requiresUpgrade: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
