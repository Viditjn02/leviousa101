const authService = require('../../services/authService');

let sqliteRepository = null;
let firebaseRepository = null;

function getSqliteRepository() {
    if (!sqliteRepository) {
        sqliteRepository = require('./sqlite.repository');
    }
    return sqliteRepository;
}

function getFirebaseRepository() {
    if (!firebaseRepository) {
        firebaseRepository = require('./firebase.repository');
    }
    return firebaseRepository;
}

function getRepository() {
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.mode === 'firebase') {
        return getFirebaseRepository();
    } else {
        return getSqliteRepository();
    }
}

async function create(referredEmail, referralType = 'normal') {
    const referrerUid = authService.getCurrentUserId();
    if (!referrerUid) {
        throw new Error('User must be authenticated to create referral');
    }
    
    const repository = getRepository();
    return await repository.create(referrerUid, referredEmail, referralType);
}

async function findByReferralCode(referralCode) {
    const repository = getRepository();
    return await repository.findByReferralCode(referralCode);
}

async function findByReferredEmail(email) {
    const repository = getRepository();
    return await repository.findByReferredEmail(email);
}

async function findByReferrerUid(referrerUid = null) {
    const uid = referrerUid || authService.getCurrentUserId();
    if (!uid) {
        return [];
    }
    
    const repository = getRepository();
    return await repository.findByReferrerUid(uid);
}

async function update(id, updates) {
    const repository = getRepository();
    return await repository.update(id, updates);
}

async function findById(id) {
    const repository = getRepository();
    return await repository.findById(id);
}

async function markReferredUserJoined(referralId, referredUid) {
    const repository = getRepository();
    return await repository.markReferredUserJoined(referralId, referredUid);
}

async function markReferredUserJoinedPro(referralId, discountCode = null) {
    const repository = getRepository();
    return await repository.markReferredUserJoinedPro(referralId, discountCode);
}

async function markDiscountClaimed(referralId) {
    const repository = getRepository();
    return await repository.markDiscountClaimed(referralId);
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

