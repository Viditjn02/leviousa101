// Subscription repository adapter for Next.js API routes
import { getFirestoreAdmin } from '../firebase-admin'
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
  const firestore = getFirestoreAdmin()
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
  console.log(`✅ Created subscription in real Firestore: ${id} for user ${uid}`)
  
  return subscription
}

export async function findSubscriptionByUserId(uid: string): Promise<SubscriptionData | null> {
  console.log(`🔍 [SUBSCRIPTION] Finding subscription for user: "${uid}"`)
  
  try {
    const firestore = getFirestoreAdmin()
    
    // Strategy 1: Direct UID match (fastest)
    console.log('🎯 [SUBSCRIPTION] Trying direct UID match...')
    const directQuery = await firestore.collection(COLLECTION_NAME)
      .where('uid', '==', uid)
      .where('status', '==', 'active')
      .where('plan', '==', 'pro')
      .get()

    if (!directQuery.empty) {
      const subscription = directQuery.docs[0].data() as SubscriptionData
      console.log(`✅ [SUBSCRIPTION] Found via direct UID match: Plan=${subscription.plan}`)
      return subscription
    }

    // Strategy 2: Email-based lookup (for admin-granted subscriptions with different UIDs)
    console.log('🔄 [SUBSCRIPTION] UID match failed, trying email-based lookup...')
    
    // Get user's email from users collection
    const userDoc = await firestore.collection('users').doc(uid).get()
    let userEmail = null
    if (userDoc.exists) {
      const userData = userDoc.data()
      userEmail = userData?.email
      console.log(`📧 [SUBSCRIPTION] Found user email: ${userEmail}`)
      
      if (userEmail) {
        // Look for subscription by email in metadata
        const emailQuery = await firestore.collection(COLLECTION_NAME)
          .where('metadata.email', '==', userEmail)
          .where('status', '==', 'active')
          .where('plan', '==', 'pro')
          .get()
          
        if (!emailQuery.empty) {
          const emailSubscription = emailQuery.docs[0].data() as SubscriptionData
          console.log(`✅ [SUBSCRIPTION] Found via email lookup: Plan=${emailSubscription.plan}`)
          return emailSubscription
        }
      }
    }
    
    // Strategy 3: Fuzzy matching for UID variations (handles typos)
    console.log('🔄 [SUBSCRIPTION] Email lookup failed, trying fuzzy matching...')
    const allSnapshot = await firestore.collection(COLLECTION_NAME).get()
    const allDocs = allSnapshot.docs.map(doc => doc.data())
    
    console.log(`📊 [SUBSCRIPTION] Searching ${allDocs.length} documents for similar UIDs...`)
    
    // Look for UIDs that are similar (accounting for common typos)
    const subscription = allDocs.find(doc => {
      if (doc.status !== 'active' || doc.plan !== 'pro') return false
      
      const docUid = doc.uid
      const similarity = calculateUIDSimilarity(uid, docUid)
      
      console.log(`   - Comparing "${uid}" vs "${docUid}": similarity=${similarity}%`)
      
      // If UIDs are 85% similar, consider it a match (handles minor typos)
      if (similarity >= 85) {
        console.log(`🎯 [SUBSCRIPTION] Found similar UID match: ${similarity}% similarity`)
        return true
      }
      
      return false
    })
    
    if (subscription) {
      console.log(`✅ [SUBSCRIPTION] Found pro subscription via fuzzy match: Plan=${subscription.plan}`)
      
      // Auto-correct the UID mismatch in background (don't await to avoid blocking)
      autoCorrectUIDMismatch(uid, subscription.uid, subscription.metadata?.email)
        .catch(err => console.error('Background UID correction failed:', err))
      
      return subscription as SubscriptionData
    }

    console.log(`⚠️ [SUBSCRIPTION] No matching subscription found for user: "${uid}"`)
    console.log(`🔍 [SUBSCRIPTION] Available UIDs:`, allDocs.map(doc => `"${doc.uid}"`))
    
    return null
    
  } catch (error) {
    console.error(`❌ [SUBSCRIPTION] Error:`, error)
    return null
  }
}

// Helper function to calculate UID similarity percentage
function calculateUIDSimilarity(uid1: string, uid2: string): number {
  if (uid1 === uid2) return 100
  if (!uid1 || !uid2) return 0
  
  const len1 = uid1.length
  const len2 = uid2.length
  const maxLen = Math.max(len1, len2)
  
  let matches = 0
  const minLen = Math.min(len1, len2)
  
  for (let i = 0; i < minLen; i++) {
    if (uid1[i] === uid2[i]) {
      matches++
    }
  }
  
  return Math.round((matches / maxLen) * 100)
}

// Auto-correct UID mismatches in background
async function autoCorrectUIDMismatch(correctUid: string, wrongUid: string, email?: string): Promise<void> {
  try {
    console.log(`🔧 [AUTO-CORRECT] Fixing UID mismatch: "${wrongUid}" → "${correctUid}"`)
    
    const firestore = getFirestoreAdmin()
    
    // Get the subscription with wrong UID
    const wrongSnapshot = await firestore.collection(COLLECTION_NAME)
      .where('uid', '==', wrongUid)
      .get()
    
    if (wrongSnapshot.empty) return
    
    const subscriptionData = wrongSnapshot.docs[0].data()
    
    // Create new document with correct UID
    const newDocRef = firestore.collection(COLLECTION_NAME).doc(`sub_${correctUid}`)
    const correctedData = {
      ...subscriptionData,
      id: `sub_${correctUid}`,
      uid: correctUid,
      updated_at: Date.now(),
      metadata: {
        ...subscriptionData.metadata,
        auto_corrected: true,
        original_uid: wrongUid,
        corrected_at: Date.now()
      }
    }
    
    await newDocRef.set(correctedData)
    
    // Delete old document
    await wrongSnapshot.docs[0].ref.delete()
    
    console.log(`✅ [AUTO-CORRECT] UID mismatch fixed for ${email || correctUid}`)
    
  } catch (error) {
    console.error('❌ [AUTO-CORRECT] Failed to fix UID mismatch:', error)
  }
}

export async function findSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionData | null> {
  console.log(`🔍 Finding subscription by Stripe customer ID: ${stripeCustomerId}`)
  
  try {
    const firestore = getFirestoreAdmin()
    
    const snapshot = await firestore.collection(COLLECTION_NAME)
      .where('stripe_customer_id', '==', stripeCustomerId)
      .where('status', '==', 'active')
      .get()
    
    if (snapshot.empty) {
      console.log(`⚠️ No active subscription found for Stripe customer: ${stripeCustomerId}`)
      return null
    }
    
    const subscription = snapshot.docs[0].data() as SubscriptionData
    console.log(`✅ Found subscription for Stripe customer ${stripeCustomerId}: ${subscription.id}`)
    
    return subscription
    
  } catch (error) {
    console.error(`❌ Error finding subscription by Stripe customer ID ${stripeCustomerId}:`, error)
    return null
  }
}

export async function updateSubscription(id: string, updates: Partial<SubscriptionData>): Promise<SubscriptionData | null> {
  const firestore = getFirestoreAdmin()
  const now = Date.now()
  const updateData = { ...updates, updated_at: now }

  await firestore.collection(COLLECTION_NAME).doc(id).update(updateData)
  
  console.log(`✏️ Updated subscription ${id} in real Firestore`)
  return { id, ...updateData } as SubscriptionData
}
