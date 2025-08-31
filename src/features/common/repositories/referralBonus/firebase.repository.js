const { v4: uuidv4 } = require('uuid');
const { getFirestoreInstance } = require('../../services/firebaseClient');

const collectionName = 'referral_bonuses';

async function create(uid, bonusType, bonusData) {
    const firestore = getFirestoreInstance();
    const id = uuidv4();
    const now = Date.now();
    
    const bonus = {
        id,
        uid,
        bonus_type: bonusType,
        bonus_minutes_cmd_l: bonusData.bonus_minutes_cmd_l || 0,
        bonus_minutes_browser: bonusData.bonus_minutes_browser || 0,
        bonus_expires_at: bonusData.bonus_expires_at || null,
        applied_at: now,
        referral_id: bonusData.referral_id || null,
        created_at: now
    };

    const docRef = firestore.collection(collectionName).doc(id);
    await docRef.set(bonus);
    
    return bonus;
}

async function findByUserId(uid) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .where('uid', '==', uid)
        .orderBy('created_at', 'desc');
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
}

async function findActiveByUserId(uid) {
    const firestore = getFirestoreInstance();
    const now = Date.now();
    
    // Get all bonuses for user (Firebase doesn't support complex OR queries easily)
    const query = firestore.collection(collectionName)
        .where('uid', '==', uid)
        .orderBy('created_at', 'desc');
    
    const snapshot = await query.get();
    const allBonuses = snapshot.docs.map(doc => doc.data());
    
    // Filter active bonuses client-side
    return allBonuses.filter(bonus => 
        bonus.bonus_expires_at === null || bonus.bonus_expires_at > now
    );
}

async function findByReferralId(referralId) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .where('referral_id', '==', referralId)
        .orderBy('created_at', 'desc');
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
}

async function findById(id) {
    const firestore = getFirestoreInstance();
    const docRef = firestore.collection(collectionName).doc(id);
    const snapshot = await docRef.get();
    
    return snapshot.exists ? snapshot.data() : null;
}

async function getTotalActiveBonusMinutes(uid) {
    const activeBonuses = await findActiveByUserId(uid);
    
    const totals = activeBonuses.reduce((acc, bonus) => {
        acc.cmd_l += bonus.bonus_minutes_cmd_l || 0;
        acc.browser += bonus.bonus_minutes_browser || 0;
        return acc;
    }, { cmd_l: 0, browser: 0 });
    
    return totals;
}

async function deleteExpired() {
    const firestore = getFirestoreInstance();
    const now = Date.now();
    
    const query = firestore.collection(collectionName)
        .where('bonus_expires_at', '<=', now);
    
    const snapshot = await query.get();
    const batch = firestore.batch();
    
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    if (!snapshot.empty) {
        await batch.commit();
    }
    
    return snapshot.size;
}

module.exports = {
    create,
    findByUserId,
    findActiveByUserId,
    findByReferralId,
    findById,
    getTotalActiveBonusMinutes,
    deleteExpired
};

