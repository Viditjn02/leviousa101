import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { buffer } from 'micro'
import { updateSubscription, findSubscriptionByUserId, createSubscription } from '../../../utils/repositories/subscription'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let event: Stripe.Event

  try {
    const buf = await buffer(req)
    const sig = req.headers['stripe-signature']!

    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
    console.log(`🪝 Received webhook: ${event.type}`)

  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed.`, err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'promotion_code.created':
        await handlePromotionCodeCreated(event.data.object as Stripe.PromotionCode)
        break

      // case 'promotion_code.used':
      //   await handlePromotionCodeUsed(event.data.object as Stripe.PromotionCode)
      //   break
        
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
    
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Checkout completed for session:', session.id)
  
  if (!session.customer || !session.subscription) {
    console.log('⚠️ Missing customer or subscription in session')
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const customerEmail = session.customer_details?.email
  const userId = session.metadata?.uid

  if (!userId) {
    console.log('⚠️ No user ID in session metadata')
    return
  }

  console.log(`🎯 Processing subscription for user ${userId}`)

  // Get or create subscription record
  let subscription = await findSubscriptionByUserId(userId)
  
  if (subscription) {
    // Update existing subscription
    await updateSubscription(subscription.id!, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan: 'pro',
      status: 'active'
    })
  } else {
    // Create new subscription record
    await createSubscription(userId, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan: 'pro',
      status: 'active'
    })
  }

  // Check if user used a referral promotion code
  if (session.total_details?.amount_discount && session.total_details.amount_discount > 0) {
    console.log('🎁 User used a promotion code - processing referral rewards')
    
    // Get the promotion codes used in this session
    if (session.discounts && session.discounts.length > 0) {
      const discount = session.discounts[0];
      if (discount.promotion_code) {
        const promoCode = await stripe.promotionCodes.retrieve(discount.promotion_code as string)
        await processReferralReward(promoCode, userId, customerEmail || '')
      }
    }
  }

  console.log('✅ Checkout processing completed')
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('📝 Subscription updated:', subscription.id)
  
  const customerId = subscription.customer as string
  
  // Try to find user by customer ID
  let userSubscription = await findSubscriptionByUserId('') // We need to implement findByCustomerId
  
  const plan = subscription.items.data[0]?.price?.id === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'free'
  
  console.log(`📊 Subscription ${subscription.id} is now ${subscription.status} with plan ${plan}`)
  
  // Check if this is a new Pro subscription that qualifies for referral rewards
  if (plan === 'pro' && subscription.status === 'active') {
    console.log('🎯 New Pro subscription detected - checking for referral rewards')
    
    // Try to find user ID from metadata or customer lookup
    // This is a simplified version - in production you'd have proper customer->user mapping
    const userId = subscription.metadata?.user_id
    
    if (userId) {
      await handleProUpgradeReferralReward(subscription, userId)
    } else {
      console.log('⚠️ No user ID found for subscription - cannot process referral rewards')
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🗑️ Subscription deleted:', subscription.id)
  
  // Downgrade to free plan
  // Note: We need to implement proper customer ID to user ID mapping
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Payment succeeded for invoice:', invoice.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('💳❌ Payment failed for invoice:', invoice.id)
  
  // Mark subscription as past_due
  // Note: We need to implement proper customer ID to user ID mapping
}

async function handlePromotionCodeCreated(promotionCode: Stripe.PromotionCode) {
  console.log('🎫 Promotion code created:', promotionCode.code)
  
  // Track promotion code creation for analytics
}

async function handlePromotionCodeUsed(promotionCode: Stripe.PromotionCode) {
  console.log('🎉 Promotion code used:', promotionCode.code)
  
  // This is not a standard Stripe event, but we can track it via checkout.session.completed
}

async function processReferralReward(promoCode: Stripe.PromotionCode, newUserId: string, newUserEmail: string) {
  console.log('🎁 Processing referral reward for promotion code:', promoCode.code)
  
  const referrerUserId = promoCode.metadata?.referrer_uid
  const referrerEmail = promoCode.metadata?.referrer_email
  
  if (!referrerUserId) {
    console.log('⚠️ No referrer UID in promotion code metadata')
    return
  }

  console.log(`💰 Rewarding referrer ${referrerUserId} for successful referral`)
  
  // Check if referred user already has pro status in database (database-driven)
  let isSpecialEmail = false;
  try {
    const { getFirestoreAdmin } = require('../../utils/firebase-admin');
    const firestore = getFirestoreAdmin();
    
    const userQuery = await firestore.collection('users')
      .where('email', '==', newUserEmail.toLowerCase())
      .get();
      
    if (!userQuery.empty) {
      const userId = userQuery.docs[0].id;
      const existingSubscription = await findSubscriptionByUserId(userId);
      isSpecialEmail = existingSubscription?.plan === 'pro' && existingSubscription?.status === 'active';
      console.log(`🔍 User ${newUserEmail} existing pro status: ${isSpecialEmail}`);
    }
  } catch (error) {
    console.log('⚠️ Could not check user pro status, treating as normal referral');
    isSpecialEmail = false;
  }
  
  if (isSpecialEmail) {
    console.log('⭐ Special email referral - giving 3 day free trial to new user')
    
    // Give new user 3 day Pro trial
    const trialEnd = Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days
    
    let subscription = await findSubscriptionByUserId(newUserId)
    if (subscription) {
      await updateSubscription(subscription.id!, {
        trial_start: Date.now(),
        trial_end: trialEnd,
        plan: 'pro',
        status: 'trialing'
      })
    } else {
      await createSubscription(newUserId, {
        trial_start: Date.now(),
        trial_end: trialEnd,
        plan: 'pro', 
        status: 'trialing'
      })
    }
    
    // When they convert to Pro after trial, give referrer 50% off first month
    // This will be handled in handleSubscriptionUpdate
    
  } else {
    console.log('👥 Normal referral - giving bonus minutes to both users')
    
    // Import referral bonus functions
    const { grantNormalReferralBonuses } = await import('../../../utils/repositories/referralBonus')
    
    // Grant normal referral bonuses
    await grantNormalReferralBonuses(referrerUserId, newUserId, `promo_${promoCode.id}`)
    
    console.log(`✅ Granted normal referral bonuses: ${newUserEmail} gets 30 min daily, ${referrerEmail} gets 60 min daily`)
  }
}

async function handleProUpgradeReferralReward(newSubscription: Stripe.Subscription, newUserId: string) {
  console.log('🎉 Checking if Pro upgrade qualifies for referral reward')
  
  // Check if this user was referred (has a trial that just ended or was using referral bonuses)
  let userSubscription = await findSubscriptionByUserId(newUserId)
  
  if (userSubscription?.trial_end && userSubscription.trial_end < Date.now()) {
    console.log('⭐ User completed special email trial and upgraded to Pro')
    
    // Find the referrer who should get the reward
    // In a complete implementation, you'd track this in the referral system
    // For now, we'll create a generic promotion code for the referrer
    
    try {
      // Create a unique 50% off promotion code for the referrer (expires in 14 days)
      const referrerPromoCode = await stripe.promotionCodes.create({
        coupon: 'FRIEND50', // The 50% off coupon we created
        code: `REWARD-${newUserId.substring(0, 8)}-${Date.now()}`,
        active: true,
        max_redemptions: 1,
        expires_at: Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000), // 14 days
        metadata: {
          reward_type: 'pro_upgrade_referral',
          new_subscriber_uid: newUserId,
          created_for_referrer: 'true'
        }
      })
      
      console.log('🎁 Created 50% off reward code for referrer:', referrerPromoCode.code)
      
      // In a complete implementation, you'd:
      // 1. Find the referrer's email from the referral record
      // 2. Send them an email with the promotion code
      // 3. Update the referral record to mark the reward as granted
      
    } catch (error) {
      console.error('❌ Failed to create referrer reward promotion code:', error)
    }
  }
}
