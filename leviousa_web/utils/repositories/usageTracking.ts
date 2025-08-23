// Usage tracking repository adapter for Next.js API routes
import { getSimpleFirestore } from './simple-firestore'
import { v4 as uuidv4 } from 'uuid'

interface UsageData {
  id?: string
  uid: string
  date: string // YYYY-MM-DD format
  cmd_l_usage_minutes: number
  browser_usage_minutes: number
  cmd_l_limit_minutes: number
  browser_limit_minutes: number
  created_at?: number
  updated_at?: number
}

const COLLECTION_NAME = 'usage_tracking'

export async function getOrCreateTodayUsage(uid: string): Promise<UsageData> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  
  // Try to find existing usage for today
  let usage = await findUsageByUserAndDate(uid, today)
  
  if (!usage) {
    console.log(`📝 Creating new usage record for ${uid} on ${today}`)
    // Create new usage record for today
    usage = await createUsage(uid, {
      date: today,
      cmd_l_usage_minutes: 0,
      browser_usage_minutes: 0,
      cmd_l_limit_minutes: 10,
      browser_limit_minutes: 10
    })
  }
  
  return usage
}

export async function createUsage(uid: string, usageData: Partial<UsageData>): Promise<UsageData> {
  const firestore = getSimpleFirestore()
  const id = uuidv4()
  const now = Date.now()
  
  const usage: UsageData = {
    id,
    uid,
    date: usageData.date || new Date().toISOString().split('T')[0],
    cmd_l_usage_minutes: usageData.cmd_l_usage_minutes || 0,
    browser_usage_minutes: usageData.browser_usage_minutes || 0,
    cmd_l_limit_minutes: usageData.cmd_l_limit_minutes || 10,
    browser_limit_minutes: usageData.browser_limit_minutes || 10,
    created_at: now,
    updated_at: now
  }

  await firestore.collection(COLLECTION_NAME).doc(id).set(usage)
  
  return usage
}

export async function findUsageByUserAndDate(uid: string, date: string): Promise<UsageData | null> {
  console.log(`🔍 Finding usage for user ${uid} on date ${date}`)
  
  const firestore = getSimpleFirestore()
  
  try {
    // Query for usage record by uid and date
    const snapshot = await firestore.collection(COLLECTION_NAME)
      .where('uid', '==', uid)
      .where('date', '==', date)
      .limit(1)
      .get()
    
    if (snapshot.empty) {
      console.log(`📝 No usage record found for ${uid} on ${date}`)
      return null
    }
    
    const doc = snapshot.docs[0]
    const usage = { id: doc.id, ...doc.data() } as UsageData
    console.log(`✅ Found usage record:`, usage)
    return usage
    
  } catch (error) {
    console.error('❌ Error finding usage by user and date:', error)
    
    // Return default usage record for testing
    return {
      id: `usage_${uid}_${date}`,
      uid: uid,
      date: date,
      cmd_l_usage_minutes: 0,
      browser_usage_minutes: 0,
      cmd_l_limit_minutes: 10,
      browser_limit_minutes: 10,
      created_at: Date.now(),
      updated_at: Date.now()
    }
  }
}

export async function updateUsage(uid: string, date: string, usageType: 'cmd_l' | 'browser', minutes: number): Promise<UsageData | null> {
  console.log(`✏️ Updating ${usageType} usage for user ${uid} on ${date}: +${minutes} minutes`)
  
  const firestore = getSimpleFirestore()
  
  try {
    // Get current usage record
    let current = await findUsageByUserAndDate(uid, date)
    if (!current) {
      // Create new usage record if it doesn't exist
      current = await createUsage(uid, { date })
    }
    
    const fieldToUpdate = usageType === 'cmd_l' ? 'cmd_l_usage_minutes' : 'browser_usage_minutes'
    const newUsage = (current[fieldToUpdate] || 0) + minutes
    const now = Date.now()
    
    const updateData = {
      [fieldToUpdate]: newUsage,
      updated_at: now
    }
    
    // Update in Firestore
    await firestore.collection(COLLECTION_NAME).doc(current.id!).update(updateData)
    
    const updatedRecord = {
      ...current,
      ...updateData
    }
    
    console.log(`✅ Updated ${usageType} usage: ${newUsage} minutes`)
    return updatedRecord
    
  } catch (error) {
    console.error(`❌ Error updating ${usageType} usage:`, error)
    
    // Fallback for development
    const current = await findUsageByUserAndDate(uid, date)
    if (!current) return null
    
    const fieldToUpdate = usageType === 'cmd_l' ? 'cmd_l_usage_minutes' : 'browser_usage_minutes'
    const newUsage = (current[fieldToUpdate] || 0) + minutes
    
    return {
      ...current,
      [fieldToUpdate]: newUsage,
      updated_at: Date.now()
    }
  }
}

export async function updateLimits(uid: string, date: string, cmdLLimit?: number, browserLimit?: number): Promise<UsageData | null> {
  console.log(`✏️ Updating limits for user ${uid} on ${date}`)
  
  // For development, just return the updated usage record
  const current = await findUsageByUserAndDate(uid, date)
  if (!current) return null
  
  const updates: any = { ...current, updated_at: Date.now() }
  
  if (cmdLLimit !== undefined) {
    updates.cmd_l_limit_minutes = cmdLLimit
  }
  
  if (browserLimit !== undefined) {
    updates.browser_limit_minutes = browserLimit
  }
  
  return updates
}
