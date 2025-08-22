const { v4: uuidv4 } = require('uuid');
const sqliteClient = require('../../services/sqliteClient');

const tableName = 'usage_tracking';

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

    const columns = Object.keys(usage).join(', ');
    const placeholders = Object.keys(usage).map(() => '?').join(', ');
    const values = Object.values(usage);

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    await sqliteClient.run(query, values);
    
    return usage;
}

async function findByUserAndDate(uid, date) {
    const query = `SELECT * FROM ${tableName} WHERE uid = ? AND date = ?`;
    return await sqliteClient.get(query, [uid, date]);
}

async function updateUsage(uid, date, usageType, minutes) {
    const now = Date.now();
    let column;
    
    if (usageType === 'cmd_l') {
        column = 'cmd_l_usage_minutes';
    } else if (usageType === 'browser') {
        column = 'browser_usage_minutes';
    } else {
        throw new Error('Invalid usage type. Must be "cmd_l" or "browser"');
    }

    const query = `UPDATE ${tableName} SET ${column} = ${column} + ?, updated_at = ? WHERE uid = ? AND date = ?`;
    await sqliteClient.run(query, [minutes, now, uid, date]);
    
    return await findByUserAndDate(uid, date);
}

async function updateLimits(uid, date, cmd_l_limit = null, browser_limit = null) {
    const now = Date.now();
    const updates = ['updated_at = ?'];
    const values = [now];
    
    if (cmd_l_limit !== null) {
        updates.push('cmd_l_limit_minutes = ?');
        values.push(cmd_l_limit);
    }
    
    if (browser_limit !== null) {
        updates.push('browser_limit_minutes = ?');
        values.push(browser_limit);
    }
    
    values.push(uid, date);
    
    const query = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE uid = ? AND date = ?`;
    await sqliteClient.run(query, values);
    
    return await findByUserAndDate(uid, date);
}

async function findById(id) {
    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    return await sqliteClient.get(query, [id]);
}

async function getUserUsageHistory(uid, limit = 30) {
    const query = `SELECT * FROM ${tableName} WHERE uid = ? ORDER BY date DESC LIMIT ?`;
    return await sqliteClient.all(query, [uid, limit]);
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

