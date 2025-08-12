const sqliteRepository = require('./sqlite.repository');
const firebaseRepository = require('./firebase.repository');

let authService = null;

function setAuthService(service) {
    authService = service;
}

function getBaseRepository() {
    if (!authService) {
        // Fallback or error if authService is not set, to prevent crashes.
        // During initial load, it might not be set, so we default to sqlite.
        return sqliteRepository;
    }
    const user = authService.getCurrentUser();
    if (user && user.isLoggedIn) {
        return firebaseRepository;
    }
    return sqliteRepository;
}

// The adapter layer that injects the UID
const sessionRepositoryAdapter = {
    setAuthService, // Expose the setter

    getById: (id) => getBaseRepository().getById(id),
    
    create: (type = 'ask') => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            throw new Error('Authentication required to create sessions');
        }
        return getBaseRepository().create(uid, type);
    },
    
    getAllByUserId: () => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            throw new Error('Authentication required to access sessions');
        }
        return getBaseRepository().getAllByUserId(uid);
    },

    updateTitle: (id, title) => getBaseRepository().updateTitle(id, title),
    
    deleteWithRelatedData: (id) => getBaseRepository().deleteWithRelatedData(id),

    end: (id) => getBaseRepository().end(id),

    updateType: (id, type) => getBaseRepository().updateType(id, type),

    touch: (id) => getBaseRepository().touch(id),

    getOrCreateActive: (requestedType = 'ask') => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            throw new Error('Authentication required to access sessions');
        }
        return getBaseRepository().getOrCreateActive(uid, requestedType);
    },

    endAllActiveSessions: () => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().endAllActiveSessions(uid);
    },

    // NEW: Generate intelligent title for session
    generateIntelligentTitle: (sessionId) => {
        return getBaseRepository().generateIntelligentTitle(sessionId);
    },

    // NEW: Migrate encrypted titles (Firebase only)
    migrateEncryptedTitles: () => {
        const repo = getBaseRepository();
        if (repo.migrateEncryptedTitles) {
            return repo.migrateEncryptedTitles();
        }
        return Promise.resolve({ migratedCount: 0, message: 'Migration not available for current repository' });
    },

    // NEW: Get current active session for context
    getCurrentSession: () => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            return Promise.resolve(null);
        }
        return getBaseRepository().getCurrentSession ? 
            getBaseRepository().getCurrentSession(uid) : 
            getBaseRepository().getOrCreateActive(uid, 'listen');
    },

    // NEW: Get recent messages from a session for context
    getRecentMessages: (sessionId, limit = 10) => {
        return getBaseRepository().getRecentMessages ? 
            getBaseRepository().getRecentMessages(sessionId, limit) :
            Promise.resolve([]);
    },
};

module.exports = sessionRepositoryAdapter; 