const { v4: uuidv4 } = require('uuid');
const sqliteClient = require('../../services/sqliteClient');

const tableName = 'subscriptions';

async function create(uid, subscriptionData) {
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

    const columns = Object.keys(subscription).join(', ');
    const placeholders = Object.keys(subscription).map(() => '?').join(', ');
    const values = Object.values(subscription);

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    await sqliteClient.run(query, values);
    
    return subscription;
}

async function findByUserId(uid) {
    const query = `SELECT * FROM ${tableName} WHERE uid = ? ORDER BY created_at DESC LIMIT 1`;
    return await sqliteClient.get(query, [uid]);
}

async function findByStripeCustomerId(stripe_customer_id) {
    const query = `SELECT * FROM ${tableName} WHERE stripe_customer_id = ? ORDER BY created_at DESC LIMIT 1`;
    return await sqliteClient.get(query, [stripe_customer_id]);
}

async function findByStripeSubscriptionId(stripe_subscription_id) {
    const query = `SELECT * FROM ${tableName} WHERE stripe_subscription_id = ? ORDER BY created_at DESC LIMIT 1`;
    return await sqliteClient.get(query, [stripe_subscription_id]);
}

async function update(id, updates) {
    const now = Date.now();
    updates.updated_at = now;

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    await sqliteClient.run(query, values);
    
    return await findById(id);
}

async function findById(id) {
    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    return await sqliteClient.get(query, [id]);
}

async function deleteById(id) {
    const query = `DELETE FROM ${tableName} WHERE id = ?`;
    await sqliteClient.run(query, [id]);
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

