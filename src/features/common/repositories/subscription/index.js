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

async function create(subscriptionData) {
    const uid = authService.getCurrentUserId();
    if (!uid) {
        throw new Error('User must be authenticated to create subscription');
    }
    
    const repository = getRepository();
    return await repository.create(uid, subscriptionData);
}

async function findByUserId(uid = null) {
    const userId = uid || authService.getCurrentUserId();
    if (!userId) {
        throw new Error('User ID is required');
    }
    
    const repository = getRepository();
    return await repository.findByUserId(userId);
}

async function findByStripeCustomerId(stripe_customer_id) {
    const repository = getRepository();
    return await repository.findByStripeCustomerId(stripe_customer_id);
}

async function findByStripeSubscriptionId(stripe_subscription_id) {
    const repository = getRepository();
    return await repository.findByStripeSubscriptionId(stripe_subscription_id);
}

async function update(id, updates) {
    const repository = getRepository();
    return await repository.update(id, updates);
}

async function findById(id) {
    const repository = getRepository();
    return await repository.findById(id);
}

async function deleteById(id) {
    const repository = getRepository();
    return await repository.deleteById(id);
}

async function getCurrentUserSubscription() {
    const uid = authService.getCurrentUserId();
    if (!uid) {
        // Return default free subscription for non-authenticated users
        return {
            plan: 'free',
            status: 'active',
            uid: null
        };
    }
    
    const subscription = await findByUserId(uid);
    
    // Return default free subscription if none exists
    if (!subscription) {
        return {
            plan: 'free',
            status: 'active',
            uid: uid
        };
    }
    
    return subscription;
}

module.exports = {
    create,
    findByUserId,
    findByStripeCustomerId,
    findByStripeSubscriptionId,
    update,
    findById,
    deleteById,
    getCurrentUserSubscription
};

