const { v4: uuidv4 } = require('uuid');
const { getFirestoreInstance } = require('../../services/firebaseClient');
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
    writeBatch
} = require('firebase/firestore');

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

    const docRef = doc(collection(firestore, collectionName), id);
    await setDoc(docRef, bonus);
    
    return bonus;
}

async function findByUserId(uid) {
    const firestore = getFirestoreInstance();
    const q = query(
        collection(firestore, collectionName),
        where('uid', '==', uid),
        orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => docSnapshot.data());
}

async function findActiveByUserId(uid) {
    const firestore = getFirestoreInstance();
    const now = Date.now();
    
    // Get all bonuses for user (Firebase doesn't support complex OR queries easily)
    const q = query(
        collection(firestore, collectionName),
        where('uid', '==', uid),
        orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const allBonuses = snapshot.docs.map(docSnapshot => docSnapshot.data());
    
    // Filter active bonuses client-side
    return allBonuses.filter(bonus => 
        bonus.bonus_expires_at === null || bonus.bonus_expires_at > now
    );
}

async function findByReferralId(referralId) {
    const firestore = getFirestoreInstance();
    const q = query(
        collection(firestore, collectionName),
        where('referral_id', '==', referralId),
        orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => docSnapshot.data());
}

async function findById(id) {
    const firestore = getFirestoreInstance();
    const docRef = doc(collection(firestore, collectionName), id);
    const snapshot = await getDoc(docRef);
    
    return snapshot.exists() ? snapshot.data() : null;
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
    
    const q = query(
        collection(firestore, collectionName),
        where('bonus_expires_at', '<=', now)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(firestore);
    
    snapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
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

