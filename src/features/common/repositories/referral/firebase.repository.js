const { v4: uuidv4 } = require('uuid');
const { getFirestoreInstance } = require('../../services/firebaseClient');
const { createEncryptedConverter } = require('../firestoreConverter');

const collectionName = 'referrals';

// Create encrypted converter for sensitive referral data
const referralConverter = createEncryptedConverter(['referred_email', 'discount_code']);

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function create(referrerUid, referredEmail, referralType = 'normal') {
    const firestore = getFirestoreInstance();
    const id = uuidv4();
    const now = Date.now();
    const referralCode = generateReferralCode();
    
    const referral = {
        id,
        referrer_uid: referrerUid,
        referred_uid: null,
        referred_email: referredEmail.toLowerCase().trim(),
        referral_code: referralCode,
        referral_type: referralType,
        bonus_applied_to_referred: 0,
        bonus_applied_to_referrer: 0,
        referred_joined_pro: 0,
        discount_code: null,
        discount_expires_at: null,
        discount_claimed: 0,
        created_at: now,
        updated_at: now
    };

    const docRef = firestore.collection(collectionName).doc(id).withConverter(referralConverter);
    await docRef.set(referral);
    
    return referral;
}

async function findByReferralCode(referralCode) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .withConverter(referralConverter)
        .where('referral_code', '==', referralCode)
        .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data();
}

async function findByReferredEmail(email) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .withConverter(referralConverter)
        .where('referred_email', '==', email.toLowerCase().trim())
        .orderBy('created_at', 'desc')
        .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data();
}

async function findByReferrerUid(referrerUid) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .withConverter(referralConverter)
        .where('referrer_uid', '==', referrerUid)
        .orderBy('created_at', 'desc');
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
}

async function update(id, updates) {
    const firestore = getFirestoreInstance();
    const now = Date.now();
    updates.updated_at = now;

    const docRef = firestore.collection(collectionName).doc(id).withConverter(referralConverter);
    await docRef.update(updates);
    
    return await findById(id);
}

async function findById(id) {
    const firestore = getFirestoreInstance();
    const docRef = firestore.collection(collectionName).doc(id).withConverter(referralConverter);
    const snapshot = await docRef.get();
    
    return snapshot.exists ? snapshot.data() : null;
}

async function markReferredUserJoined(referralId, referredUid) {
    const now = Date.now();
    
    return await update(referralId, {
        referred_uid: referredUid,
        bonus_applied_to_referred: 1
    });
}

async function markReferredUserJoinedPro(referralId, discountCode = null) {
    const now = Date.now();
    const discountExpiresAt = now + (14 * 24 * 60 * 60 * 1000); // 14 days from now
    
    return await update(referralId, {
        referred_joined_pro: 1,
        discount_code: discountCode,
        discount_expires_at: discountExpiresAt
    });
}

async function markDiscountClaimed(referralId) {
    return await update(referralId, {
        discount_claimed: 1
    });
}

module.exports = {
    create,
    findByReferralCode,
    findByReferredEmail,
    findByReferrerUid,
    update,
    findById,
    markReferredUserJoined,
    markReferredUserJoinedPro,
    markDiscountClaimed
};

