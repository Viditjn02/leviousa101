import { 
  doc, 
  collection, 
  addDoc,
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { firestore } from './firebase';

export interface FirestoreUserProfile {
  displayName: string;
  email: string;
  createdAt: Timestamp;
}

export interface FirestoreSession {
  title: string;
  session_type: string;
  started_at: Timestamp; // Match Electron app field name
  ended_at?: Timestamp;   // Match Electron app field name
}

export interface FirestoreTranscript {
  startAt: Timestamp;
  endAt: Timestamp;
  speaker: 'me' | 'other';
  text: string;
  lang?: string;
  createdAt: Timestamp;
}

export interface FirestoreAiMessage {
  sentAt: Timestamp;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  model?: string;
  createdAt: Timestamp;
}

export interface FirestoreSummary {
  generatedAt: Timestamp;
  model: string;
  text: string;
  tldr: string;
  bulletPoints: string[];
  actionItems: Array<{ owner: string; task: string; due: string }>;
  tokensUsed?: number;
}

export interface FirestorePromptPreset {
  title: string;
  prompt: string;
  isDefault: boolean;
  createdAt: Timestamp;
}

export class FirestoreUserService {
  static async createUser(uid: string, profile: Omit<FirestoreUserProfile, 'createdAt'>) {
    const userRef = doc(firestore, 'users', uid);
    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp()
    });
  }

  static async getUser(uid: string): Promise<FirestoreUserProfile | null> {
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() as FirestoreUserProfile : null;
  }

  static async updateUser(uid: string, updates: Partial<FirestoreUserProfile>) {
    const userRef = doc(firestore, 'users', uid);
    await updateDoc(userRef, updates);
  }

  static async deleteUser(uid: string) {
    const batch = writeBatch(firestore);
    
    const sessionsRef = collection(firestore, 'users', uid, 'sessions');
    const sessionsSnap = await getDocs(sessionsRef);
    
    for (const sessionDoc of sessionsSnap.docs) {
      const sessionId = sessionDoc.id;
      
      const transcriptsRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'transcripts');
      const transcriptsSnap = await getDocs(transcriptsRef);
      transcriptsSnap.docs.forEach(doc => batch.delete(doc.ref));
      
      const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'aiMessages');
      const aiMessagesSnap = await getDocs(aiMessagesRef);
      aiMessagesSnap.docs.forEach(doc => batch.delete(doc.ref));
      
      const summaryRef = doc(firestore, 'users', uid, 'sessions', sessionId, 'summary', 'data');
      batch.delete(summaryRef);
      
      batch.delete(sessionDoc.ref);
    }
    
    const presetsRef = collection(firestore, 'users', uid, 'promptPresets');
    const presetsSnap = await getDocs(presetsRef);
    presetsSnap.docs.forEach(doc => batch.delete(doc.ref));
    
    const userRef = doc(firestore, 'users', uid);
    batch.delete(userRef);
    
    await batch.commit();
  }
}

// Function to generate meaningful titles from conversation content
async function generateSessionTitle(sessionId: string): Promise<string> {
  try {
    // Get first few messages from the conversation
    const transcriptsRef = collection(firestore, 'sessions', sessionId, 'transcripts');
    const aiMessagesRef = collection(firestore, 'sessions', sessionId, 'ai_messages');
    
    const [transcriptsSnap, aiMessagesSnap] = await Promise.all([
      getDocs(query(transcriptsRef, orderBy('start_at', 'asc'), limit(3))),
      getDocs(query(aiMessagesRef, orderBy('sent_at', 'asc'), limit(3)))
    ]);
    
    // Collect conversation content
    const conversationParts: string[] = [];
    
    // Helper function to check if content looks encrypted
    const looksEncrypted = (text: string): boolean => {
      // Encrypted content is base64 and typically very long with no spaces
      return text.length > 100 && !text.includes(' ') && /^[A-Za-z0-9+/]+=*$/.test(text);
    };
    
    // Add transcripts (user speech)
    transcriptsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.text && typeof data.text === 'string' && data.text.length > 3) {
        // Skip encrypted content for now, but use speaker info
        if (!looksEncrypted(data.text)) {
          conversationParts.push(`User: ${data.text}`);
        } else {
          // If encrypted, use generic placeholder with speaker info
          const speaker = data.speaker || 'User';
          conversationParts.push(`${speaker}: [Speech content]`);
        }
      }
    });
    
    // Add AI messages
    aiMessagesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.content && typeof data.content === 'string' && data.content.length > 10) {
        if (!looksEncrypted(data.content)) {
          // Take first 100 chars of AI response to avoid too much content
          const content = data.content.length > 100 ? data.content.substring(0, 100) + '...' : data.content;
          conversationParts.push(`Assistant: ${content}`);
        } else {
          // If encrypted, use generic placeholder
          conversationParts.push(`Assistant: [AI response]`);
        }
      }
    });
    
    if (conversationParts.length === 0) {
      return 'Empty conversation';
    }
    
    // Look for actual content (not placeholders)
    const realContent = conversationParts.filter(part => 
      !part.includes('[Speech content]') && !part.includes('[AI response]')
    );
    
    // If we have real content, use it
    if (realContent.length > 0) {
      const firstUserMessage = realContent.find(part => part.startsWith('User:'));
      if (firstUserMessage) {
        const userText = firstUserMessage.replace('User: ', '').trim();
        if (userText.length > 50) {
          return userText.substring(0, 50) + '...';
        }
        return userText;
      }
      
      // Use first real content
      const firstPart = realContent[0].replace(/^(User|Assistant): /, '').trim();
      if (firstPart.length > 50) {
        return firstPart.substring(0, 50) + '...';
      }
      return firstPart || 'Conversation';
    }
    
    // If all content is encrypted, create title based on conversation type and participants
    const hasUser = conversationParts.some(part => part.includes('User:') || part.includes(': [Speech content]'));
    const hasAssistant = conversationParts.some(part => part.includes('Assistant:'));
    const hasOtherSpeakers = conversationParts.some(part => 
      !part.includes('User:') && !part.includes('Assistant:') && part.includes(': [Speech content]')
    );
    
    if (hasUser && hasAssistant) {
      return 'AI Conversation';
    } else if (hasUser || hasOtherSpeakers) {
      return 'Voice Conversation';
    } else if (hasAssistant) {
      return 'AI Chat';
    }
    
    return 'Conversation';
    
  } catch (error) {
    console.error('❌ [generateSessionTitle] Error generating title:', error);
    return 'Conversation';
  }
}

export class FirestoreSessionService {
  static async createSession(uid: string, session: Omit<FirestoreSession, 'started_at'>): Promise<string> {
    // Create in top-level sessions collection to match Electron app
    const sessionsRef = collection(firestore, 'sessions');
    const docRef = await addDoc(sessionsRef, {
      ...session,
      uid, // Add uid field for ownership
      started_at: serverTimestamp()
    });
    return docRef.id;
  }

  static async getSession(uid: string, sessionId: string): Promise<FirestoreSession | null> {
    // Read from top-level sessions collection 
    const sessionRef = doc(firestore, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    const data = sessionSnap.exists() ? sessionSnap.data() as FirestoreSession : null;
    
    // Verify ownership
    if (data && (data as any).uid !== uid) {
      return null; // User doesn't own this session
    }
    
    return data;
  }

  static async getSessions(uid: string): Promise<Array<{ id: string } & FirestoreSession>> {
    try {
      // Read from top-level sessions collection where Electron app saves
      const sessionsRef = collection(firestore, 'sessions');
      console.log('🔍 [getSessions] Querying sessions for uid:', uid);
      
      // Add timeout to prevent hanging on Firestore queries
      const queryPromise = (async () => {
        const q = query(sessionsRef, where('uid', '==', uid), orderBy('started_at', 'desc'));
        return await getDocs(q);
      })();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Firestore query timeout')), 10000)
      );
      
      const querySnapshot = await Promise.race([queryPromise, timeoutPromise]);
      console.log('🔍 [getSessions] Found', querySnapshot.docs.length, 'sessions');
      
      // Process sessions with individual error handling
      const sessionsWithTitles: Array<{ id: string } & FirestoreSession> = [];
      
      for (const doc of querySnapshot.docs) {
        try {
          const data = doc.data();
          console.log('🔍 [getSessions] Processing session:', doc.id);
          
          // Temporarily disable smart title generation to avoid CORS issues
          let smartTitle: string;
          console.log('🔧 [getSessions] Using fallback title for session:', doc.id);
          smartTitle = data.title || `Session ${new Date(data.started_at?.toMillis() || Date.now()).toLocaleDateString()}`;
          
          sessionsWithTitles.push({
            id: doc.id,
            ...data as FirestoreSession,
            title: smartTitle,
          });
        } catch (sessionError) {
          console.warn('⚠️ [getSessions] Failed to process session', doc.id, ':', sessionError);
          // Continue with other sessions instead of failing completely
        }
      }
      
      console.log('✅ [getSessions] Successfully processed', sessionsWithTitles.length, 'sessions');
      return sessionsWithTitles;
      
    } catch (error: any) {
      console.error('❌ [getSessions] Error:', error);
      
      // If it's an index error or timeout, try fallback query without orderBy
      if (error?.code === 'failed-precondition' || error?.message?.includes('timeout')) {
        console.log('🔄 [getSessions] Trying fallback query without orderBy');
        try {
          const sessionsRef = collection(firestore, 'sessions');
          
          const fallbackPromise = (async () => {
            const q = query(sessionsRef, where('uid', '==', uid));
            return await getDocs(q);
          })();
          
          const fallbackTimeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Fallback query timeout')), 8000)
          );
          
          const querySnapshot = await Promise.race([fallbackPromise, fallbackTimeout]);
          
          const sessions: Array<{ id: string } & FirestoreSession> = [];
          
          for (const doc of querySnapshot.docs) {
            try {
              const data = doc.data();
              // Use simple title fallback for error cases
              const simpleTitle = data.title || `Session ${new Date(data.started_at?.toMillis() || Date.now()).toLocaleDateString()}`;
              
              sessions.push({
                id: doc.id,
                ...data as FirestoreSession,
                title: simpleTitle,
              });
            } catch (sessionError) {
              console.warn('⚠️ [getSessions] Failed to process session in fallback', doc.id);
              // Continue with other sessions
            }
          }
          
          // Sort manually in JavaScript as fallback
          sessions.sort((a, b) => {
            const aTime = a.started_at?.toMillis() || 0;
            const bTime = b.started_at?.toMillis() || 0;
            return bTime - aTime;
          });
          
          console.log('✅ [getSessions] Fallback query successful, found', sessions.length, 'sessions');
          return sessions;
        } catch (fallbackError) {
          console.error('❌ [getSessions] Fallback query also failed:', fallbackError);
          // Return empty array instead of throwing to prevent UI hanging
          return [];
        }
      }
      
      // For other errors, return empty array to prevent UI hanging
      console.warn('⚠️ [getSessions] Returning empty array due to error');
      return [];
    }
  }

  static async updateSession(uid: string, sessionId: string, updates: Partial<FirestoreSession>) {
    // Update in top-level sessions collection
    const sessionRef = doc(firestore, 'sessions', sessionId);
    await updateDoc(sessionRef, updates);
  }

  static async deleteSession(uid: string, sessionId: string) {
    const batch = writeBatch(firestore);
    
    // Delete subcollections using the top-level structure that matches Electron app
    const transcriptsRef = collection(firestore, 'sessions', sessionId, 'transcripts');
    const transcriptsSnap = await getDocs(transcriptsRef);
    transcriptsSnap.docs.forEach(doc => batch.delete(doc.ref));
    
    const aiMessagesRef = collection(firestore, 'sessions', sessionId, 'ai_messages');
    const aiMessagesSnap = await getDocs(aiMessagesRef);
    aiMessagesSnap.docs.forEach(doc => batch.delete(doc.ref));
    
    const summaryRef = doc(firestore, 'sessions', sessionId, 'summary', 'data');
    batch.delete(summaryRef);
    
    const sessionRef = doc(firestore, 'sessions', sessionId);
    batch.delete(sessionRef);
    
    await batch.commit();
  }
}

export class FirestoreTranscriptService {
  static async addTranscript(uid: string, sessionId: string, transcript: Omit<FirestoreTranscript, 'createdAt'>): Promise<string> {
    // Use top-level sessions structure to match Electron app
    const transcriptsRef = collection(firestore, 'sessions', sessionId, 'transcripts');
    const docRef = await addDoc(transcriptsRef, {
      ...transcript,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getTranscripts(uid: string, sessionId: string): Promise<Array<{ id: string } & FirestoreTranscript>> {
    // Use top-level sessions structure to match Electron app
    const transcriptsRef = collection(firestore, 'sessions', sessionId, 'transcripts');
    const q = query(transcriptsRef, orderBy('startAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreTranscript
    }));
  }
}

export class FirestoreAiMessageService {
  static async addAiMessage(uid: string, sessionId: string, message: Omit<FirestoreAiMessage, 'createdAt'>): Promise<string> {
    // Use top-level sessions structure to match Electron app (ai_messages not aiMessages)
    const aiMessagesRef = collection(firestore, 'sessions', sessionId, 'ai_messages');
    const docRef = await addDoc(aiMessagesRef, {
      ...message,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getAiMessages(uid: string, sessionId: string): Promise<Array<{ id: string } & FirestoreAiMessage>> {
    // Use top-level sessions structure to match Electron app (ai_messages not aiMessages)
    const aiMessagesRef = collection(firestore, 'sessions', sessionId, 'ai_messages');
    const q = query(aiMessagesRef, orderBy('sentAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreAiMessage
    }));
  }
}

export class FirestoreSummaryService {
  static async setSummary(uid: string, sessionId: string, summary: FirestoreSummary) {
    // Use top-level sessions structure to match Electron app
    const summaryRef = doc(firestore, 'sessions', sessionId, 'summary', 'data');
    await setDoc(summaryRef, summary);
  }

  static async getSummary(uid: string, sessionId: string): Promise<FirestoreSummary | null> {
    // Use top-level sessions structure to match Electron app
    const summaryRef = doc(firestore, 'sessions', sessionId, 'summary', 'data');
    const summarySnap = await getDoc(summaryRef);
    return summarySnap.exists() ? summarySnap.data() as FirestoreSummary : null;
  }
}

export class FirestorePromptPresetService {
  static async createPreset(uid: string, preset: Omit<FirestorePromptPreset, 'createdAt'>): Promise<string> {
    const presetsRef = collection(firestore, 'users', uid, 'promptPresets');
    const docRef = await addDoc(presetsRef, {
      ...preset,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getPresets(uid: string): Promise<Array<{ id: string } & FirestorePromptPreset>> {
    const presetsRef = collection(firestore, 'users', uid, 'promptPresets');
    const q = query(presetsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestorePromptPreset
    }));
  }

  static async updatePreset(uid: string, presetId: string, updates: Partial<FirestorePromptPreset>) {
    const presetRef = doc(firestore, 'users', uid, 'promptPresets', presetId);
    await updateDoc(presetRef, updates);
  }

  static async deletePreset(uid: string, presetId: string) {
    const presetRef = doc(firestore, 'users', uid, 'promptPresets', presetId);
    await deleteDoc(presetRef);
  }
} 