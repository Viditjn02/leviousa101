import type { NextApiRequest, NextApiResponse } from 'next'

// For testing purposes, we'll use simple JWT decode instead of Firebase Admin
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔥 Checkout API called with method:', req.method)
  
  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔑 Checking environment variables...')
    console.log('Stripe secret key exists:', !!process.env.STRIPE_SECRET_KEY)
    console.log('Price ID exists:', !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO)
    
    // Get the authorization token from the request  
    const authHeader = req.headers.authorization
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid auth header')
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)
    
    // Simple JWT decode for testing (since Firebase Admin setup can be complex)
    console.log('🔐 Decoding Firebase token...')
    let uid = 'test-uid'
    let email = 'test@test.com'
    
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
        uid = payload.user_id || payload.sub || payload.uid || 'test-uid'
        email = payload.email || 'test@test.com'
        console.log('✅ Token decoded successfully for user:', uid, email)
      } else {
        console.log('⚠️ Invalid token format, using defaults for testing')
      }
    } catch (tokenError) {
      console.log('⚠️ Token decode failed, using defaults for testing')
      uid = 'test-uid'
      email = 'test@test.com'
    }
    
    const decodedToken = { uid, email }

    const { priceId, successUrl, cancelUrl, promotionCode } = req.body

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    console.log('💳 Creating Stripe checkout session with promotion codes enabled...')

    // Create checkout session with Stripe's native referral support
    const sessionConfig: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.LEVIOUSA_WEB_URL || 'https://www.leviousa.com'}/settings/billing?success=true`,
      cancel_url: cancelUrl || `${process.env.LEVIOUSA_WEB_URL || 'https://www.leviousa.com'}/settings/billing?canceled=true`,
      customer_email: decodedToken.email,
      allow_promotion_codes: true, // 🎫 Enable promotion codes for referrals!
      billing_address_collection: 'auto',
      // Remove customer_creation for subscription mode - Stripe handles this automatically
      metadata: {
        uid: uid,
      },
    }

    // If a specific promotion code is provided, apply it automatically
    if (promotionCode) {
      sessionConfig.discounts = [{ promotion_code: promotionCode }]
      console.log('🎁 Applied promotion code:', promotionCode)
    }

    let session
    try {
      session = await stripe.checkout.sessions.create(sessionConfig)
      console.log('✅ Checkout session created successfully:', session.id)
    } catch (stripeError: any) {
      console.error('❌ Stripe checkout session creation failed:', stripeError)
      return res.status(500).json({
        error: 'Failed to create checkout session',
        details: stripeError.message
      })
    }

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      message: 'Checkout session created with referral support'
    })
  } catch (error) {
    console.error('❌ Error creating checkout session:', error)
    return res.status(500).json({ 
      error: 'Error creating checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
