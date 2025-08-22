const { v4: uuidv4 } = require('uuid');
const sqliteClient = require('../../services/sqliteClient');

const tableName = 'referrals';

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function create(referrerUid, referredEmail, referralType = 'normal') {
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

    const columns = Object.keys(referral).join(', ');
    const placeholders = Object.keys(referral).map(() => '?').join(', ');
    const values = Object.values(referral);

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    await sqliteClient.run(query, values);
    
    return referral;
}

async function findByReferralCode(referralCode) {
    const query = `SELECT * FROM ${tableName} WHERE referral_code = ?`;
    return await sqliteClient.get(query, [referralCode]);
}

async function findByReferredEmail(email) {
    const query = `SELECT * FROM ${tableName} WHERE referred_email = ? ORDER BY created_at DESC LIMIT 1`;
    return await sqliteClient.get(query, [email.toLowerCase().trim()]);
}

async function findByReferrerUid(referrerUid) {
    const query = `SELECT * FROM ${tableName} WHERE referrer_uid = ? ORDER BY created_at DESC`;
    return await sqliteClient.all(query, [referrerUid]);
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

async function markReferredUserJoined(referralId, referredUid) {
    const now = Date.now();
    const query = `UPDATE ${tableName} SET referred_uid = ?, bonus_applied_to_referred = 1, updated_at = ? WHERE id = ?`;
    await sqliteClient.run(query, [referredUid, now, referralId]);
    
    return await findById(referralId);
}

async function markReferredUserJoinedPro(referralId, discountCode = null) {
    const now = Date.now();
    const discountExpiresAt = now + (14 * 24 * 60 * 60 * 1000); // 14 days from now
    
    const query = `UPDATE ${tableName} SET 
        referred_joined_pro = 1, 
        discount_code = ?, 
        discount_expires_at = ?, 
        updated_at = ? 
        WHERE id = ?`;
    
    await sqliteClient.run(query, [discountCode, discountExpiresAt, now, referralId]);
    
    return await findById(referralId);
}

async function markDiscountClaimed(referralId) {
    const now = Date.now();
    const query = `UPDATE ${tableName} SET discount_claimed = 1, updated_at = ? WHERE id = ?`;
    await sqliteClient.run(query, [now, referralId]);
    
    return await findById(referralId);
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

