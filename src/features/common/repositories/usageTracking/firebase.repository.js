const { v4: uuidv4 } = require('uuid');
const { getFirestoreInstance } = require('../../services/firebaseClient');

const collectionName = 'usage_tracking';

async function getOrCreateTodayUsage(uid) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Try to find existing usage for today
    let usage = await findByUserAndDate(uid, today);
    
    if (!usage) {
        // Create new usage record for today
        usage = await create(uid, {
            date: today,
            cmd_l_usage_minutes: 0,
            browser_usage_minutes: 0,
            cmd_l_limit_minutes: 10,
            browser_limit_minutes: 10
        });
    }
    
    return usage;
}

async function create(uid, usageData) {
    const firestore = getFirestoreInstance();
    const id = uuidv4();
    const now = Date.now();
    
    const usage = {
        id,
        uid,
        date: usageData.date,
        cmd_l_usage_minutes: usageData.cmd_l_usage_minutes || 0,
        browser_usage_minutes: usageData.browser_usage_minutes || 0,
        cmd_l_limit_minutes: usageData.cmd_l_limit_minutes || 10,
        browser_limit_minutes: usageData.browser_limit_minutes || 10,
        created_at: now,
        updated_at: now
    };

    const docRef = firestore.collection(collectionName).doc(id);
    await docRef.set(usage);
    
    return usage;
}

async function findByUserAndDate(uid, date) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .where('uid', '==', uid)
        .where('date', '==', date)
        .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data();
}

async function updateUsage(uid, date, usageType, minutes) {
    const firestore = getFirestoreInstance();
    const now = Date.now();
    let fieldToUpdate;
    
    if (usageType === 'cmd_l') {
        fieldToUpdate = 'cmd_l_usage_minutes';
    } else if (usageType === 'browser') {
        fieldToUpdate = 'browser_usage_minutes';
    } else {
        throw new Error('Invalid usage type. Must be "cmd_l" or "browser"');
    }

    // Find the document first
    const query = firestore.collection(collectionName)
        .where('uid', '==', uid)
        .where('date', '==', date)
        .limit(1);
    
    const snapshot = await query.get();
    if (snapshot.empty) {
        throw new Error('Usage record not found for user and date');
    }
    
    const doc = snapshot.docs[0];
    const currentData = doc.data();
    const newUsage = (currentData[fieldToUpdate] || 0) + minutes;
    
    await doc.ref.update({
        [fieldToUpdate]: newUsage,
        updated_at: now
    });
    
    return await findByUserAndDate(uid, date);
}

async function updateLimits(uid, date, cmd_l_limit = null, browser_limit = null) {
    const firestore = getFirestoreInstance();
    const now = Date.now();
    const updates = { updated_at: now };
    
    if (cmd_l_limit !== null) {
        updates.cmd_l_limit_minutes = cmd_l_limit;
    }
    
    if (browser_limit !== null) {
        updates.browser_limit_minutes = browser_limit;
    }
    
    // Find the document first
    const query = firestore.collection(collectionName)
        .where('uid', '==', uid)
        .where('date', '==', date)
        .limit(1);
    
    const snapshot = await query.get();
    if (snapshot.empty) {
        throw new Error('Usage record not found for user and date');
    }
    
    const doc = snapshot.docs[0];
    await doc.ref.update(updates);
    
    return await findByUserAndDate(uid, date);
}

async function findById(id) {
    const firestore = getFirestoreInstance();
    const docRef = firestore.collection(collectionName).doc(id);
    const snapshot = await docRef.get();
    
    return snapshot.exists ? snapshot.data() : null;
}

async function getUserUsageHistory(uid, limit = 30) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .where('uid', '==', uid)
        .orderBy('date', 'desc')
        .limit(limit);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
}

module.exports = {
    getOrCreateTodayUsage,
    create,
    findByUserAndDate,
    updateUsage,
    updateLimits,
    findById,
    getUserUsageHistory
};

