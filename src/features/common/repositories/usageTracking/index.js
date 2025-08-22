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

async function getOrCreateTodayUsage(uid = null) {
    const userId = uid || authService.getCurrentUserId();
    if (!userId) {
        throw new Error('User must be authenticated to track usage');
    }
    
    const repository = getRepository();
    return await repository.getOrCreateTodayUsage(userId);
}

async function trackUsage(usageType, minutes) {
    const uid = authService.getCurrentUserId();
    if (!uid) {
        throw new Error('User must be authenticated to track usage');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const repository = getRepository();
    
    // Ensure today's usage record exists
    await repository.getOrCreateTodayUsage(uid);
    
    // Update usage
    return await repository.updateUsage(uid, today, usageType, minutes);
}

async function checkUsageLimit(usageType) {
    const uid = authService.getCurrentUserId();
    if (!uid) {
        // Non-authenticated users have no limits (or default limits)
        return {
            canUse: true,
            usage: 0,
            limit: 0,
            remaining: 0
        };
    }
    
    const repository = getRepository();
    const todayUsage = await repository.getOrCreateTodayUsage(uid);
    
    let usage, limit;
    if (usageType === 'cmd_l') {
        usage = todayUsage.cmd_l_usage_minutes || 0;
        limit = todayUsage.cmd_l_limit_minutes || 10;
    } else if (usageType === 'browser') {
        usage = todayUsage.browser_usage_minutes || 0;
        limit = todayUsage.browser_limit_minutes || 10;
    } else {
        throw new Error('Invalid usage type. Must be "cmd_l" or "browser"');
    }
    
    const remaining = Math.max(0, limit - usage);
    const canUse = usage < limit;
    
    return {
        canUse,
        usage,
        limit,
        remaining
    };
}

async function updateUserLimits(cmd_l_limit = null, browser_limit = null, uid = null) {
    const userId = uid || authService.getCurrentUserId();
    if (!userId) {
        throw new Error('User must be authenticated to update limits');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const repository = getRepository();
    
    // Ensure today's usage record exists
    await repository.getOrCreateTodayUsage(userId);
    
    return await repository.updateLimits(userId, today, cmd_l_limit, browser_limit);
}

async function getUserUsageHistory(uid = null, limit = 30) {
    const userId = uid || authService.getCurrentUserId();
    if (!userId) {
        return [];
    }
    
    const repository = getRepository();
    return await repository.getUserUsageHistory(userId, limit);
}

async function getTodayUsageStatus() {
    const uid = authService.getCurrentUserId();
    if (!uid) {
        return {
            cmd_l: { canUse: true, usage: 0, limit: 0, remaining: 0 },
            browser: { canUse: true, usage: 0, limit: 0, remaining: 0 }
        };
    }
    
    const [cmdLStatus, browserStatus] = await Promise.all([
        checkUsageLimit('cmd_l'),
        checkUsageLimit('browser')
    ]);
    
    return {
        cmd_l: cmdLStatus,
        browser: browserStatus
    };
}

module.exports = {
    getOrCreateTodayUsage,
    trackUsage,
    checkUsageLimit,
    updateUserLimits,
    getUserUsageHistory,
    getTodayUsageStatus
};

