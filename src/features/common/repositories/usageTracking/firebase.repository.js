const { v4: uuidv4 } = require('uuid');
const { getFirestoreInstance, initializeFirebase } = require('../../services/firebaseClient');
const { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    limit, 
    orderBy,
    updateDoc 
} = require('firebase/firestore');

const collectionName = 'usage_tracking';

/**
 * Ensures Firebase is initialized and returns a valid Firestore instance
 * @returns {Promise<Object>} Firestore instance
 */
async function getValidFirestoreInstance() {
    try {
        let firestore = getFirestoreInstance();
        if (!firestore) {
            console.error('[FirebaseRepository] Firestore not properly initialized, initializing...');
            await initializeFirebase();
            firestore = getFirestoreInstance();
            if (!firestore) {
                throw new Error('Firestore initialization failed - instance not available');
            }
            console.log('[FirebaseRepository] ✅ Firestore successfully initialized');
        }
        return firestore;
    } catch (error) {
        console.error('[FirebaseRepository] Failed to get valid Firestore instance:', error);
        throw error;
    }
}

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
    const firestore = await getValidFirestoreInstance();
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

    const docRef = doc(collection(firestore, collectionName), id);
    await setDoc(docRef, usage);
    
    return usage;
}

async function findByUserAndDate(uid, date) {
    const firestore = await getValidFirestoreInstance();
    const q = query(
        collection(firestore, collectionName),
        where('uid', '==', uid),
        where('date', '==', date),
        limit(1)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].data();
}

async function updateUsage(uid, date, usageType, minutes) {
    const firestore = await getValidFirestoreInstance();
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
    const q = query(
        collection(firestore, collectionName),
        where('uid', '==', uid),
        where('date', '==', date),
        limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        throw new Error('Usage record not found for user and date');
    }
    
    const docSnapshot = snapshot.docs[0];
    const currentData = docSnapshot.data();
    const newUsage = (currentData[fieldToUpdate] || 0) + minutes;
    
    await updateDoc(docSnapshot.ref, {
        [fieldToUpdate]: newUsage,
        updated_at: now
    });
    
    return await findByUserAndDate(uid, date);
}

async function updateLimits(uid, date, cmd_l_limit = null, browser_limit = null) {
    const firestore = await getValidFirestoreInstance();
    const now = Date.now();
    const updates = { updated_at: now };
    
    if (cmd_l_limit !== null) {
        updates.cmd_l_limit_minutes = cmd_l_limit;
    }
    
    if (browser_limit !== null) {
        updates.browser_limit_minutes = browser_limit;
    }
    
    // Find the document first
    const q = query(
        collection(firestore, collectionName),
        where('uid', '==', uid),
        where('date', '==', date),
        limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        throw new Error('Usage record not found for user and date');
    }
    
    const docSnapshot = snapshot.docs[0];
    await updateDoc(docSnapshot.ref, updates);
    
    return await findByUserAndDate(uid, date);
}

async function findById(id) {
    const firestore = await getValidFirestoreInstance();
    const docRef = doc(collection(firestore, collectionName), id);
    const snapshot = await getDoc(docRef);
    
    return snapshot.exists() ? snapshot.data() : null;
}

async function getUserUsageHistory(uid, limitCount = 30) {
    const firestore = await getValidFirestoreInstance();
    const q = query(
        collection(firestore, collectionName),
        where('uid', '==', uid),
        orderBy('date', 'desc'),
        limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => docSnapshot.data());
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

