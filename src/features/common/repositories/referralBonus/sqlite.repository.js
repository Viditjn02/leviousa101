const { v4: uuidv4 } = require('uuid');
const sqliteClient = require('../../services/sqliteClient');

const tableName = 'referral_bonuses';

async function create(uid, bonusType, bonusData) {
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

    const columns = Object.keys(bonus).join(', ');
    const placeholders = Object.keys(bonus).map(() => '?').join(', ');
    const values = Object.values(bonus);

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    await sqliteClient.run(query, values);
    
    return bonus;
}

async function findByUserId(uid) {
    const query = `SELECT * FROM ${tableName} WHERE uid = ? ORDER BY created_at DESC`;
    return await sqliteClient.all(query, [uid]);
}

async function findActiveByUserId(uid) {
    const now = Date.now();
    const query = `SELECT * FROM ${tableName} WHERE uid = ? AND (bonus_expires_at IS NULL OR bonus_expires_at > ?) ORDER BY created_at DESC`;
    return await sqliteClient.all(query, [uid, now]);
}

async function findByReferralId(referralId) {
    const query = `SELECT * FROM ${tableName} WHERE referral_id = ? ORDER BY created_at DESC`;
    return await sqliteClient.all(query, [referralId]);
}

async function findById(id) {
    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    return await sqliteClient.get(query, [id]);
}

async function getTotalActiveBonusMinutes(uid) {
    const now = Date.now();
    const query = `
        SELECT 
            SUM(bonus_minutes_cmd_l) as total_cmd_l,
            SUM(bonus_minutes_browser) as total_browser
        FROM ${tableName} 
        WHERE uid = ? AND (bonus_expires_at IS NULL OR bonus_expires_at > ?)
    `;
    
    const result = await sqliteClient.get(query, [uid, now]);
    return {
        cmd_l: result.total_cmd_l || 0,
        browser: result.total_browser || 0
    };
}

async function deleteExpired() {
    const now = Date.now();
    const query = `DELETE FROM ${tableName} WHERE bonus_expires_at IS NOT NULL AND bonus_expires_at <= ?`;
    const result = await sqliteClient.run(query, [now]);
    return result.changes || 0;
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

