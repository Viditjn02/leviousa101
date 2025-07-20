const sqliteRepository = require('./sqlite.repository');
const firebaseRepository = require('./firebase.repository');
const authService = require('../../services/authService');

function getBaseRepository() {
    const user = authService.getCurrentUser();
    if (user && user.isLoggedIn) {
        return firebaseRepository;
    }
    return sqliteRepository;
}

const presetRepositoryAdapter = {
    getPresets: () => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            throw new Error('Authentication required to access presets');
        }
        return getBaseRepository().getPresets(uid);
    },

    getPresetTemplates: () => {
        // Preset templates are global and don't require authentication
        return getBaseRepository().getPresetTemplates();
    },

    create: (options) => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            throw new Error('Authentication required to create presets');
        }
        return getBaseRepository().create({ uid, ...options });
    },

    update: (id, options) => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            throw new Error('Authentication required to update presets');
        }
        return getBaseRepository().update(id, options, uid);
    },

    delete: (id) => {
        const uid = authService.getCurrentUserId();
        if (!uid) {
            throw new Error('Authentication required to delete presets');
        }
        return getBaseRepository().delete(id, uid);
    },
};

module.exports = presetRepositoryAdapter; 