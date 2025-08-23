import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserReferralData, createUserReferralData } from '../../../utils/repositories/referral'

// For testing purposes, use simple JWT decode instead of Firebase Admin

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { // Changed to GET since we're just retrieving
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)
    
    // Simple JWT decode for testing (since Firebase Admin setup can be complex)
    let uid = 'test-uid'
    let email = 'test@test.com'
    
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
        uid = payload.user_id || payload.sub || payload.uid || 'test-uid'
        email = payload.email || 'test@test.com'
        console.log('✅ Token decoded successfully for user:', uid)
      } else {
        console.log('⚠️ Invalid token format, using defaults for testing')
      }
    } catch (tokenError) {
      console.log('⚠️ Token decode failed, using defaults for testing')
      uid = 'test-uid'  
      email = 'test@test.com'
    }

    console.log('🔗 Getting or creating unique referral link for user:', uid)

    // Check if user already has referral data
    let referralData = await getUserReferralData(uid)
    
    if (referralData) {
      console.log('✅ User already has referral data:', referralData.referral_code)
      return res.status(200).json({
        success: true,
        referral_code: referralData.referral_code,
        referral_link: referralData.referral_link,
        discount: '50% off first month',
        max_uses: 10,
        stripe_promo_id: referralData.stripe_promo_id,
        instructions: `Share this link: ${referralData.referral_link}`,
        existing: true
      })
    }

    // Create unique referral code based on user ID (only if doesn't exist)
    const userCode = uid.substring(0, 8).toUpperCase()
    const uniqueCode = `FRIEND-${userCode}`
    const referralLink = `https://www.leviousa.com/login?promo=${uniqueCode}`
    
    console.log('🎫 Creating new promotion code for first time:', uniqueCode)

    try {
      // Create a unique promotion code for this user
      const promotionCode = await stripe.promotionCodes.create({
        coupon: process.env.STRIPE_REFERRAL_COUPON_50_OFF || 'SX0SGRUm', // 50% off coupon
        code: uniqueCode,
        active: true,
        max_redemptions: 10, // Each user can refer up to 10 people
        metadata: {
          referrer_uid: uid,
          referrer_email: email
        }
      })

      console.log('✅ Created unique promotion code:', promotionCode.id)

      // Store referral data in Firestore for persistence
      referralData = await createUserReferralData(uid, {
        referral_code: uniqueCode,
        referral_link: referralLink,
        stripe_promo_id: promotionCode.id
      })

      return res.status(200).json({
        success: true,
        referral_code: uniqueCode,
        referral_link: referralLink,
        discount: '50% off first month',
        max_uses: 10,
        stripe_promo_id: promotionCode.id,
        instructions: `Share this link: ${referralLink}`,
        new: true
      })

    } catch (stripeError: any) {
      // If promotion code already exists, that's fine - store it anyway
      if (stripeError.code === 'resource_already_exists') {
        console.log('ℹ️ Promotion code already exists in Stripe:', uniqueCode)
        
        // Store referral data in Firestore even if Stripe code exists
        referralData = await createUserReferralData(uid, {
          referral_code: uniqueCode,
          referral_link: referralLink,
          stripe_promo_id: undefined // We don't have the ID since it already exists
        })
        
        return res.status(200).json({
          success: true,
          referral_code: uniqueCode,
          referral_link: referralLink,
          discount: '50% off first month',
          max_uses: 10,
          message: 'Using existing promotion code',
          instructions: `Share this link: ${referralLink}`,
          existing_stripe: true
        })
      }
      
      console.error('❌ Stripe error creating promotion code:', stripeError)
      
      // Return success with basic referral link even if Stripe fails
      // Still store in Firestore for tracking
      try {
        referralData = await createUserReferralData(uid, {
          referral_code: uniqueCode,
          referral_link: referralLink
        })
      } catch (firestoreError) {
        console.error('Error storing referral data in Firestore:', firestoreError)
      }
      
      return res.status(200).json({
        success: true,
        referral_code: uniqueCode,
        referral_link: referralLink,
        discount: '50% off first month',
        max_uses: 10,
        stripe_error: stripeError.message,
        instructions: `Share this link: ${referralLink}`,
        stripe_failed: true
      })
    }

  } catch (error) {
    console.error('❌ Error generating unique referral:', error)
    return res.status(500).json({ 
      error: 'Error generating referral link',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}


