const { doc, getDoc, collection, addDoc, query, where, getDocs, writeBatch, orderBy, limit, updateDoc, Timestamp } = require('firebase/firestore');
const { getFirestoreInstance } = require('../../services/firebaseClient');
const { createEncryptedConverter } = require('../firestoreConverter');
const encryptionService = require('../../services/encryptionService');

// Remove title encryption - titles are not sensitive data and need to be readable in web dashboard
const sessionConverter = createEncryptedConverter([]);

function sessionsCol() {
    const db = getFirestoreInstance();
    return collection(db, 'sessions').withConverter(sessionConverter);
}

// Sub-collection references are now built from the top-level
function subCollections(sessionId) {
    const db = getFirestoreInstance();
    const sessionPath = `sessions/${sessionId}`;
    return {
        transcripts: collection(db, `${sessionPath}/transcripts`),
        ai_messages: collection(db, `${sessionPath}/ai_messages`),
        summary: collection(db, `${sessionPath}/summary`),
    }
}

async function getById(id) {
    const docRef = doc(sessionsCol(), id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}

async function create(uid, type = 'ask') {
    const now = Timestamp.now();
    
    // Generate better default title based on session type
    const defaultTitle = getDefaultTitle(type);
    
    const newSession = {
        uid: uid,
        members: [uid], // For future sharing functionality
        title: defaultTitle,
        session_type: type,
        started_at: now,
        updated_at: now,
        ended_at: null,
    };
    const docRef = await addDoc(sessionsCol(), newSession);
    console.log(`Firebase: Created session ${docRef.id} for user ${uid}`);
    return docRef.id;
}

// NEW: Generate better default titles
function getDefaultTitle(sessionType) {
    const date = new Date();
    const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
    
    switch (sessionType) {
        case 'listen':
            return `Listen Session - ${dateStr} ${timeStr}`;
        case 'ask':
            return `Q&A Session - ${dateStr} ${timeStr}`;
        default:
            return `Conversation - ${dateStr} ${timeStr}`;
    }
}

// NEW: Generate intelligent title from session content
async function generateIntelligentTitle(sessionId) {
    try {
        const sessionTitleService = require('../../services/sessionTitleService');
        const session = await getById(sessionId);
        
        if (!session) {
            console.warn(`[Firebase] Session ${sessionId} not found for title generation`);
            return null;
        }

        // Get related data for title generation
        const { transcripts, ai_messages } = subCollections(sessionId);
        
        const [transcriptsSnap, aiMessagesSnap] = await Promise.all([
            getDocs(query(transcripts)),
            getDocs(query(ai_messages))
        ]);
        
        const transcriptData = transcriptsSnap.docs.map(doc => doc.data());
        const aiMessageData = aiMessagesSnap.docs.map(doc => doc.data());
        
        // Generate title using the service
        const newTitle = await sessionTitleService.generateTitle(sessionId, {
            transcripts: transcriptData,
            aiMessages: aiMessageData,
            sessionType: session.session_type
        });
        
        if (newTitle && newTitle !== session.title) {
            await updateTitle(sessionId, newTitle);
            console.log(`[Firebase] Updated session ${sessionId} title to: "${newTitle}"`);
            return newTitle;
        }
        
        return session.title;
    } catch (error) {
        console.error('[Firebase] Error generating intelligent title:', error);
        return null;
    }
}

async function getAllByUserId(uid) {
    const q = query(sessionsCol(), where('members', 'array-contains', uid), orderBy('started_at', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
}

async function updateTitle(id, title) {
    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, {
        title: title, // No encryption needed for titles
        updated_at: Timestamp.now()
    });
    return { changes: 1 };
}

async function deleteWithRelatedData(id) {
    const db = getFirestoreInstance();
    const batch = writeBatch(db);

    const { transcripts, ai_messages, summary } = subCollections(id);
    const [transcriptsSnap, aiMessagesSnap, summarySnap] = await Promise.all([
        getDocs(query(transcripts)),
        getDocs(query(ai_messages)),
        getDocs(query(summary)),
    ]);
    
    transcriptsSnap.forEach(d => batch.delete(d.ref));
    aiMessagesSnap.forEach(d => batch.delete(d.ref));
    summarySnap.forEach(d => batch.delete(d.ref));

    const sessionRef = doc(sessionsCol(), id);
    batch.delete(sessionRef);

    await batch.commit();
    return { success: true };
}

async function end(id) {
    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, { ended_at: Timestamp.now() });
    return { changes: 1 };
}

async function updateType(id, type) {
    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, { session_type: type });
    return { changes: 1 };
}

async function touch(id) {
    const docRef = doc(sessionsCol(), id);
    await updateDoc(docRef, { updated_at: Timestamp.now() });
    return { changes: 1 };
}

async function getOrCreateActive(uid, requestedType = 'ask') {
    const findQuery = query(
        sessionsCol(),
        where('uid', '==', uid),
        where('ended_at', '==', null),
        orderBy('session_type', 'desc'),
        limit(1)
    );

    const activeSessionSnap = await getDocs(findQuery);
    
    if (!activeSessionSnap.empty) {
        const activeSessionDoc = activeSessionSnap.docs[0];
        const sessionRef = doc(sessionsCol(), activeSessionDoc.id);
        const activeSession = activeSessionDoc.data();

        console.log(`[Repo] Found active Firebase session ${activeSession.id}`);
        
        const updates = { updated_at: Timestamp.now() };
        if (activeSession.session_type === 'ask' && requestedType === 'listen') {
            updates.session_type = 'listen';
            console.log(`[Repo] Promoted Firebase session ${activeSession.id} to 'listen' type.`);
        }
        
        await updateDoc(sessionRef, updates);
        return activeSessionDoc.id;
    } else {
        console.log(`[Repo] No active Firebase session for user ${uid}. Creating new.`);
        return create(uid, requestedType);
    }
}

async function endAllActiveSessions(uid) {
    const q = query(sessionsCol(), where('uid', '==', uid), where('ended_at', '==', null));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return { changes: 0 };

    const batch = writeBatch(getFirestoreInstance());
    const now = Timestamp.now();
    snapshot.forEach(d => {
        batch.update(d.ref, { ended_at: now });
    });
    await batch.commit();

    console.log(`[Repo] Ended ${snapshot.size} active session(s) for user ${uid}.`);
    return { changes: snapshot.size };
}

// NEW: Migrate encrypted titles to plaintext for web dashboard compatibility
async function migrateEncryptedTitles() {
    try {
        console.log('[Firebase] Starting migration of encrypted session titles...');
        
        const q = query(sessionsCol(), orderBy('started_at', 'desc'));
        const querySnapshot = await getDocs(q);
        
        let migratedCount = 0;
        const batch = writeBatch(getFirestoreInstance());
        
        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            
            // Check if title looks encrypted (Base64 pattern)
            if (data.title && typeof data.title === 'string' && 
                data.title.match(/^[A-Za-z0-9+/=]{20,}$/) && 
                data.title.includes('=')) {
                
                try {
                    // Try to decrypt the title
                    const decryptedTitle = encryptionService.decrypt(data.title);
                    
                    // Update with decrypted title
                    batch.update(docSnap.ref, {
                        title: decryptedTitle,
                        updated_at: Timestamp.now()
                    });
                    
                    migratedCount++;
                    console.log(`[Firebase] Migrating session ${docSnap.id}: "${data.title.substring(0, 30)}..." -> "${decryptedTitle}"`);
                    
                } catch (decryptError) {
                    console.warn(`[Firebase] Could not decrypt title for session ${docSnap.id}, leaving as-is:`, decryptError.message);
                }
            }
        }
        
        if (migratedCount > 0) {
            await batch.commit();
            console.log(`[Firebase] Successfully migrated ${migratedCount} encrypted session titles`);
        } else {
            console.log('[Firebase] No encrypted session titles found to migrate');
        }
        
        return { migratedCount };
    } catch (error) {
        console.error('[Firebase] Error during title migration:', error);
        return { migratedCount: 0, error: error.message };
    }
}

module.exports = {
    getById,
    create,
    getAllByUserId,
    updateTitle,
    deleteWithRelatedData,
    end,
    updateType,
    touch,
    getOrCreateActive,
    endAllActiveSessions,
    generateIntelligentTitle,
    migrateEncryptedTitles, // Export the migration function
}; 