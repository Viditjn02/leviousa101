// Subscription repository adapter for Next.js API routes
import { getSimpleFirestore } from './simple-firestore'
import { v4 as uuidv4 } from 'uuid'

interface SubscriptionData {
  id?: string
  uid: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_start?: number | null
  current_period_end?: number | null
  cancel_at_period_end?: boolean
  trial_start?: number | null
  trial_end?: number | null
  created_at?: number
  updated_at?: number
}

const COLLECTION_NAME = 'subscriptions'

export async function createSubscription(uid: string, subscriptionData: Partial<SubscriptionData>): Promise<SubscriptionData> {
  const firestore = getSimpleFirestore()
  const id = uuidv4()
  const now = Date.now()
  
  const subscription: SubscriptionData = {
    id,
    uid,
    stripe_customer_id: subscriptionData.stripe_customer_id || null,
    stripe_subscription_id: subscriptionData.stripe_subscription_id || null,
    plan: subscriptionData.plan || 'free',
    status: subscriptionData.status || 'active',
    current_period_start: subscriptionData.current_period_start || null,
    current_period_end: subscriptionData.current_period_end || null,
    cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
    trial_start: subscriptionData.trial_start || null,
    trial_end: subscriptionData.trial_end || null,
    created_at: now,
    updated_at: now
  }

  await firestore.collection(COLLECTION_NAME).doc(id).set(subscription)
  
  return subscription
}

export async function findSubscriptionByUserId(uid: string): Promise<SubscriptionData | null> {
  console.log(`🔍 Finding subscription for user: ${uid}`)
  
  // For development, return a default free subscription
  // In production, this would query the real database
  return {
    id: `sub_${uid}`,
    uid: uid,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan: 'free',
    status: 'active',
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    created_at: Date.now(),
    updated_at: Date.now()
  }
}

export async function findSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionData | null> {
  console.log(`🔍 Finding subscription by Stripe customer ID: ${stripeCustomerId}`)
  // For development, return null (no subscription found)
  return null
}

export async function updateSubscription(id: string, updates: Partial<SubscriptionData>): Promise<SubscriptionData | null> {
  const firestore = getSimpleFirestore()
  const now = Date.now()
  const updateData = { ...updates, updated_at: now }

  await firestore.collection(COLLECTION_NAME).doc(id).update(updateData)
  
  console.log(`✏️ Updated subscription ${id}`)
  return { id, ...updateData } as SubscriptionData
}
