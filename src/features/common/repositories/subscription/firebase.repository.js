const { v4: uuidv4 } = require('uuid');
const { getFirestoreInstance } = require('../../services/firebaseClient');
const { createEncryptedConverter } = require('../firestoreConverter');

const collectionName = 'subscriptions';

// Create encrypted converter for sensitive subscription data
const subscriptionConverter = createEncryptedConverter(['stripe_customer_id', 'stripe_subscription_id']);

async function create(uid, subscriptionData) {
    const firestore = getFirestoreInstance();
    const id = uuidv4();
    const now = Date.now();
    
    const subscription = {
        id,
        uid,
        stripe_customer_id: subscriptionData.stripe_customer_id || null,
        stripe_subscription_id: subscriptionData.stripe_subscription_id || null,
        plan: subscriptionData.plan || 'free',
        status: subscriptionData.status || 'active',
        current_period_start: subscriptionData.current_period_start || null,
        current_period_end: subscriptionData.current_period_end || null,
        cancel_at_period_end: subscriptionData.cancel_at_period_end || 0,
        trial_start: subscriptionData.trial_start || null,
        trial_end: subscriptionData.trial_end || null,
        created_at: now,
        updated_at: now
    };

    const docRef = firestore.collection(collectionName).doc(id).withConverter(subscriptionConverter);
    await docRef.set(subscription);
    
    return subscription;
}

async function findByUserId(uid) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .withConverter(subscriptionConverter)
        .where('uid', '==', uid)
        .orderBy('created_at', 'desc')
        .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data();
}

async function findByStripeCustomerId(stripe_customer_id) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .withConverter(subscriptionConverter)
        .where('stripe_customer_id', '==', stripe_customer_id)
        .orderBy('created_at', 'desc')
        .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data();
}

async function findByStripeSubscriptionId(stripe_subscription_id) {
    const firestore = getFirestoreInstance();
    const query = firestore.collection(collectionName)
        .withConverter(subscriptionConverter)
        .where('stripe_subscription_id', '==', stripe_subscription_id)
        .orderBy('created_at', 'desc')
        .limit(1);
    
    const snapshot = await query.get();
    return snapshot.empty ? null : snapshot.docs[0].data();
}

async function update(id, updates) {
    const firestore = getFirestoreInstance();
    const now = Date.now();
    updates.updated_at = now;

    const docRef = firestore.collection(collectionName).doc(id).withConverter(subscriptionConverter);
    await docRef.update(updates);
    
    return await findById(id);
}

async function findById(id) {
    const firestore = getFirestoreInstance();
    const docRef = firestore.collection(collectionName).doc(id).withConverter(subscriptionConverter);
    const snapshot = await docRef.get();
    
    return snapshot.exists ? snapshot.data() : null;
}

async function deleteById(id) {
    const firestore = getFirestoreInstance();
    const docRef = firestore.collection(collectionName).doc(id);
    await docRef.delete();
    return true;
}

module.exports = {
    create,
    findByUserId,
    findByStripeCustomerId,
    findByStripeSubscriptionId,
    update,
    findById,
    deleteById
};

