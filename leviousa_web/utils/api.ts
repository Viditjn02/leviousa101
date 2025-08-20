import { auth as firebaseAuth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  FirestoreUserService, 
  FirestoreSessionService, 
  FirestoreTranscriptService, 
  FirestoreAiMessageService, 
  FirestoreSummaryService, 
  FirestorePromptPresetService,
  FirestoreSession,
  FirestoreTranscript,
  FirestoreAiMessage,
  FirestoreSummary,
  FirestorePromptPreset
} from './firestore';
import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  display_name: string;
  email: string;
}

export interface Session {
  id: string;
  uid: string;
  title: string;
  session_type: string;
  started_at: number;
  ended_at?: number;
  sync_state: 'clean' | 'dirty';
  updated_at: number;
}

export interface Transcript {
  id: string;
  session_id: string;
  start_at: number;
  end_at?: number;
  speaker?: string;
  text: string;
  lang?: string;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface AiMessage {
  id: string;
  session_id: string;
  sent_at: number;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  model?: string;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface Summary {
  session_id: string;
  generated_at: number;
  model?: string;
  text: string;
  tldr: string;
  bullet_json: string;
  action_json: string;
  tokens_used?: number;
  updated_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface PromptPreset {
  id: string;
  uid: string;
  title: string;
  prompt: string;
  is_default: 0 | 1;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface SessionDetails {
    session: Session;
    transcripts: Transcript[];
    ai_messages: AiMessage[];
    summary: Summary | null;
}

// Track current auth state with better initialization handling
let currentAuthUser: any = null;
let authInitialized = false;
let authInitializationPromise: Promise<void> | null = null;

// Create a promise that resolves when auth is initialized
const waitForAuthInitialization = (): Promise<void> => {
  if (authInitialized) {
    return Promise.resolve();
  }
  
  if (!authInitializationPromise) {
    authInitializationPromise = new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        currentAuthUser = user;
        authInitialized = true;
        console.log('🔑 Auth state initialized:', user ? user.email : 'No user');
        unsubscribe();
        resolve();
      });
      
      // Add timeout to prevent hanging forever
      setTimeout(() => {
        if (!authInitialized) {
          console.warn('⚠️ Auth initialization timeout, proceeding without auth');
          authInitialized = true;
          unsubscribe();
          resolve();
        }
      }, 10000); // 10 second timeout
    });
  }
  
  return authInitializationPromise;
};

// Initialize auth state listener with better error handling
if (typeof window !== 'undefined') {
  onAuthStateChanged(firebaseAuth, (user) => {
    currentAuthUser = user;
    authInitialized = true;
    console.log('🔑 Auth state updated:', user ? user.email : 'No user');
  }, (error) => {
    console.error('❌ Auth state change error:', error);
    authInitialized = true; // Mark as initialized even on error to prevent hanging
  });
}

const isFirebaseMode = (): boolean => {
  // Use the tracked auth state instead of checking currentUser directly
  const isFirebase = currentAuthUser !== null;
  console.log('🔍 isFirebaseMode check:', isFirebase, 'currentUser:', currentAuthUser?.email, 'initialized:', authInitialized);
  return isFirebase;
};

const timestampToUnix = (timestamp: Timestamp): number => {
  return timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000);
};

const unixToTimestamp = (unix: number): Timestamp => {
  return Timestamp.fromMillis(unix);
};

const convertFirestoreSession = (session: { id: string } & FirestoreSession, uid: string): Session => {
  return {
    id: session.id,
    uid,
    title: session.title,
    session_type: session.session_type,
    started_at: timestampToUnix(session.started_at),
    ended_at: session.ended_at ? timestampToUnix(session.ended_at) : undefined,
    sync_state: 'clean',
    updated_at: timestampToUnix(session.started_at)
  };
};

const convertFirestoreTranscript = (transcript: { id: string } & FirestoreTranscript): Transcript => {
  return {
    id: transcript.id,
    session_id: '',
    start_at: timestampToUnix(transcript.startAt),
    end_at: transcript.endAt ? timestampToUnix(transcript.endAt) : undefined,
    speaker: transcript.speaker,
    text: transcript.text,
    lang: transcript.lang,
    created_at: timestampToUnix(transcript.createdAt),
    sync_state: 'clean'
  };
};

const convertFirestoreAiMessage = (message: { id: string } & FirestoreAiMessage): AiMessage => {
  return {
    id: message.id,
    session_id: '',
    sent_at: timestampToUnix(message.sentAt),
    role: message.role,
    content: message.content,
    tokens: message.tokens,
    model: message.model,
    created_at: timestampToUnix(message.createdAt),
    sync_state: 'clean'
  };
};

const convertFirestoreSummary = (summary: FirestoreSummary, sessionId: string): Summary => {
  return {
    session_id: sessionId,
    generated_at: timestampToUnix(summary.generatedAt),
    model: summary.model,
    text: summary.text,
    tldr: summary.tldr,
    bullet_json: JSON.stringify(summary.bulletPoints),
    action_json: JSON.stringify(summary.actionItems),
    tokens_used: summary.tokensUsed,
    updated_at: timestampToUnix(summary.generatedAt),
    sync_state: 'clean'
  };
};

const convertFirestorePreset = (preset: { id: string } & FirestorePromptPreset, uid: string): PromptPreset => {
  return {
    id: preset.id,
    uid,
    title: preset.title,
    prompt: preset.prompt,
    is_default: preset.isDefault ? 1 : 0,
    created_at: timestampToUnix(preset.createdAt),
    sync_state: 'clean'
  };
};


let API_ORIGIN = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9001'
  : '';

const loadRuntimeConfig = async (): Promise<string | null> => {
  try {
    const response = await fetch('/runtime-config.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (response.ok) {
      const config = await response.json();
      console.log('✅ Runtime config loaded:', config);
      return config.API_URL;
    } else {
      console.log('⚠️ Runtime config response not ok:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Failed to load runtime config:', error);
  }
  return null;
};

let apiUrlInitialized = false;
let initializationPromise: Promise<void> | null = null;

const initializeApiUrl = async () => {
  if (apiUrlInitialized) return;
  
  try {
    // Add timeout to prevent hanging on runtime config load
    const runtimeUrl = await Promise.race([
      loadRuntimeConfig(),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Runtime config timeout')), 5000)
      )
    ]);
    
    if (runtimeUrl) {
      API_ORIGIN = runtimeUrl;
      console.log('✅ API URL from runtime config:', API_ORIGIN);
    } else {
      console.log('📍 Using fallback API URL:', API_ORIGIN);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load runtime config, using fallback:', error);
    console.log('📍 Using fallback API URL:', API_ORIGIN);
  }
  
  apiUrlInitialized = true;
};

if (typeof window !== 'undefined') {
  initializationPromise = initializeApiUrl();
}

const userInfoListeners: Array<(userInfo: UserProfile | null) => void> = [];

export const getUserInfo = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  
  const storedUserInfo = localStorage.getItem('leviousa_user');
  if (storedUserInfo) {
    try {
      return JSON.parse(storedUserInfo);
    } catch (error) {
      console.error('Failed to parse user info:', error);
      localStorage.removeItem('leviousa_user');
    }
  }
  return null;
};

export const setUserInfo = (userInfo: UserProfile | null, skipEvents: boolean = false) => {
  if (typeof window === 'undefined') return;
  
  if (userInfo) {
    localStorage.setItem('leviousa_user', JSON.stringify(userInfo));
  } else {
          localStorage.removeItem('leviousa_user');
  }
  
  if (!skipEvents) {
    userInfoListeners.forEach(listener => listener(userInfo));
    
    window.dispatchEvent(new Event('userInfoChanged'));
  }
};

export const onUserInfoChange = (listener: (userInfo: UserProfile | null) => void) => {
  userInfoListeners.push(listener);
  
  return () => {
    const index = userInfoListeners.indexOf(listener);
    if (index > -1) {
      userInfoListeners.splice(index, 1);
    }
  };
};

export const getApiHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const userInfo = getUserInfo();
  if (userInfo?.uid) {
    headers['X-User-ID'] = userInfo.uid;
  }
  
  return headers;
};


export const apiCall = async (path: string, options: RequestInit = {}) => {
  if (!apiUrlInitialized && initializationPromise) {
    await initializationPromise;
  }
  
  if (!apiUrlInitialized) {
    await initializeApiUrl();
  }
  
  const url = `${API_ORIGIN}${path}`;
  console.log('🌐 apiCall (Local Mode):', {
    path,
    API_ORIGIN,
    fullUrl: url,
    initialized: apiUrlInitialized,
    timestamp: new Date().toISOString()
  });
  
  const defaultOpts: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...getApiHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  };
  return fetch(url, defaultOpts);
};


export const searchConversations = async (query: string): Promise<Session[]> => {
  if (!query.trim()) {
    return [];
  }

  if (isFirebaseMode()) {
    const sessions = await getSessions();
    return sessions.filter(session => 
      session.title.toLowerCase().includes(query.toLowerCase())
    );
  } else {
    const response = await apiCall(`/api/conversations/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Failed to search conversations');
    }
    return response.json();
  }
};

export const getSessions = async (): Promise<Session[]> => {
  try {
    // Wait for auth to be initialized to avoid race conditions
    await waitForAuthInitialization();
    
    if (isFirebaseMode()) {
      if (!currentAuthUser) {
        console.warn('Firebase mode but no current user after initialization');
        return [];
      }
      const uid = currentAuthUser.uid;
      console.log('🔍 [getSessions] Fetching Firestore sessions for uid:', uid);
      
      try {
        const firestoreSessions = await FirestoreSessionService.getSessions(uid);
        console.log('✅ [getSessions] Successfully fetched', firestoreSessions.length, 'sessions');
        return firestoreSessions.map(session => convertFirestoreSession(session, uid));
      } catch (firestoreError) {
        console.error('❌ [getSessions] Firestore query failed:', firestoreError);
        // Return empty array instead of throwing to prevent UI from hanging
        return [];
      }
    } else {
      console.log('🔍 [getSessions] Fetching sessions from API');
      const response = await apiCall(`/api/conversations`, { method: 'GET' });
      if (!response.ok) {
        console.error('❌ [getSessions] API call failed:', response.status, response.statusText);
        return []; // Return empty array instead of throwing
      }
      const sessions = await response.json();
      console.log('✅ [getSessions] Successfully fetched', sessions.length, 'sessions from API');
      return sessions;
    }
  } catch (error) {
    console.error('❌ [getSessions] Unexpected error:', error);
    // Return empty array to prevent UI from hanging
    return [];
  }
};

export const getSessionsPaginated = async (page: number = 1, pageSize: number = 20, lastDocId?: string): Promise<{sessions: Session[], hasMore: boolean, totalCount?: number}> => {
  try {
    await waitForAuthInitialization();
    
    if (isFirebaseMode()) {
      if (!currentAuthUser) {
        console.warn('Firebase mode but no current user after initialization');
        return { sessions: [], hasMore: false };
      }
      const uid = currentAuthUser.uid;
      console.log('🔍 [getSessionsPaginated] Fetching page', page, 'with limit', pageSize, 'for uid:', uid);
      
      try {
        const result = await FirestoreSessionService.getSessionsPaginated(uid, pageSize, lastDocId);
        console.log('✅ [getSessionsPaginated] Returning', result.sessions.length, 'sessions');
        return {
          sessions: result.sessions.map(session => convertFirestoreSession(session, uid)),
          hasMore: result.hasMore,
          totalCount: result.totalCount
        };
      } catch (firestoreError) {
        console.error('❌ [getSessionsPaginated] Firestore query failed:', firestoreError);
        return { sessions: [], hasMore: false };
      }
    } else {
      console.log('🔍 [getSessionsPaginated] Fetching sessions from API with pagination');
      const offset = (page - 1) * pageSize;
      const response = await apiCall(`/api/conversations?limit=${pageSize}&offset=${offset}`, { method: 'GET' });
      if (!response.ok) {
        console.error('❌ [getSessionsPaginated] API call failed:', response.status, response.statusText);
        return { sessions: [], hasMore: false };
      }
      const data = await response.json();
      return {
        sessions: data.sessions || data,
        hasMore: data.hasMore || false,
        totalCount: data.totalCount
      };
    }
  } catch (error) {
    console.error('❌ [getSessionsPaginated] Unexpected error:', error);
    return { sessions: [], hasMore: false };
  }
};

export const getSessionDetails = async (sessionId: string): Promise<SessionDetails> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    
    const [session, transcripts, aiMessages, summary] = await Promise.all([
      FirestoreSessionService.getSession(uid, sessionId),
      FirestoreTranscriptService.getTranscripts(uid, sessionId),
      FirestoreAiMessageService.getAiMessages(uid, sessionId),
      FirestoreSummaryService.getSummary(uid, sessionId)
    ]);

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      session: convertFirestoreSession({ id: sessionId, ...session }, uid),
      transcripts: transcripts.map(t => ({ ...convertFirestoreTranscript(t), session_id: sessionId })),
      ai_messages: aiMessages.map(m => ({ ...convertFirestoreAiMessage(m), session_id: sessionId })),
      summary: summary ? convertFirestoreSummary(summary, sessionId) : null
    };
  } else {
    const response = await apiCall(`/api/conversations/${sessionId}`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch session details');
    return response.json();
  }
};

export const createSession = async (title?: string): Promise<{ id: string }> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    const sessionId = await FirestoreSessionService.createSession(uid, {
      title: title || 'New Session',
      session_type: 'ask',
      ended_at: undefined
    });
    return { id: sessionId };
  } else {
    const response = await apiCall(`/api/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    await FirestoreSessionService.deleteSession(uid, sessionId);
  } else {
    const response = await apiCall(`/api/conversations/${sessionId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete session');
  }
};

export const getUserProfile = async (): Promise<UserProfile> => {
  if (isFirebaseMode()) {
    if (!currentAuthUser) {
      throw new Error('No authenticated user');
    }
    const user = currentAuthUser;
    const firestoreProfile = await FirestoreUserService.getUser(user.uid);
    
    return {
      uid: user.uid,
      display_name: firestoreProfile?.displayName || user.displayName || 'User',
      email: firestoreProfile?.email || user.email || 'no-email@example.com'
    };
  } else {
    const response = await apiCall(`/api/user/profile`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  }
};

export const updateUserProfile = async (data: { displayName: string }): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    await FirestoreUserService.updateUser(uid, { displayName: data.displayName });
  } else {
    const response = await apiCall(`/api/user/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user profile');
  }
};

export const findOrCreateUser = async (user: UserProfile): Promise<UserProfile> => {
  console.log('🔍 [findOrCreateUser] Starting for uid:', user.uid);
  
  if (isFirebaseMode()) {
    if (!currentAuthUser) {
      console.error('❌ [findOrCreateUser] No authenticated user');
      throw new Error('No authenticated user');
    }
    
    try {
      const uid = currentAuthUser.uid;
      console.log('🔍 [findOrCreateUser] Checking Firestore for user:', uid);
      
      // Add timeout protection to Firestore operations
      const firestorePromise = (async () => {
        const existingUser = await FirestoreUserService.getUser(uid);
        
        if (!existingUser) {
          console.log('🔍 [findOrCreateUser] Creating new user in Firestore');
          await FirestoreUserService.createUser(uid, {
            displayName: user.display_name,
            email: user.email
          });
          console.log('✅ [findOrCreateUser] User created in Firestore');
        } else {
          console.log('✅ [findOrCreateUser] User found in Firestore');
        }
        
        return user;
      })();
      
      const timeoutPromise = new Promise<UserProfile>((_, reject) => 
        setTimeout(() => reject(new Error('Firestore user operations timeout')), 6000)
      );
      
      const result = await Promise.race([firestorePromise, timeoutPromise]);
      console.log('✅ [findOrCreateUser] Firebase mode success');
      return result;
      
    } catch (error) {
      console.error('❌ [findOrCreateUser] Firestore operation failed or timed out:', error);
      console.log('📋 [findOrCreateUser] Returning user profile as fallback');
      // Return the user profile as fallback even if Firestore fails
      return user;
    }
  } else {
    console.log('🔍 [findOrCreateUser] API mode - calling find-or-create endpoint');
    try {
      // Add timeout to API call as well
      const apiPromise = apiCall(`/api/user/find-or-create`, {
          method: 'POST',
          body: JSON.stringify(user),
      });
      
      const timeoutPromise = new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('API user creation timeout')), 8000)
      );
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`Failed to find or create user: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ [findOrCreateUser] API mode success');
      return result;
    } catch (error) {
      console.error('❌ [findOrCreateUser] API operation failed:', error);
      // Return the user profile as fallback
      return user;
    }
  }
};

export const saveApiKey = async (apiKey: string): Promise<void> => {
  if (isFirebaseMode()) {
    console.log('API key is not needed in Firebase mode');
    return;
  } else {
    const response = await apiCall(`/api/user/api-key`, {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
    });
    if (!response.ok) throw new Error('Failed to save API key');
  }
};

export const checkApiKeyStatus = async (): Promise<{ hasApiKey: boolean }> => {
  if (isFirebaseMode()) {
    return { hasApiKey: true };
  } else {
    const response = await apiCall(`/api/user/api-key-status`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to check API key status');
    return response.json();
  }
};

export const deleteAccount = async (): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    
    await FirestoreUserService.deleteUser(uid);
    
    await firebaseAuth.currentUser!.delete();
  } else {
    const response = await apiCall(`/api/user/profile`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete account');
  }
};

export const getPresets = async (): Promise<PromptPreset[]> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    const firestorePresets = await FirestorePromptPresetService.getPresets(uid);
    return firestorePresets.map(preset => convertFirestorePreset(preset, uid));
  } else {
    const response = await apiCall(`/api/presets`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch presets');
    return response.json();
  }
};

export const createPreset = async (data: { title: string, prompt: string }): Promise<{ id: string }> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    const presetId = await FirestorePromptPresetService.createPreset(uid, {
      title: data.title,
      prompt: data.prompt,
      isDefault: false
    });
    return { id: presetId };
  } else {
    const response = await apiCall(`/api/presets`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create preset');
    return response.json();
  }
};

export const updatePreset = async (id: string, data: { title: string, prompt: string }): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    await FirestorePromptPresetService.updatePreset(uid, id, {
      title: data.title,
      prompt: data.prompt
    });
  } else {
    const response = await apiCall(`/api/presets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update preset: ${response.status} ${errorText}`);
    }
  }
};

export const deletePreset = async (id: string): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = firebaseAuth.currentUser!.uid;
    await FirestorePromptPresetService.deletePreset(uid, id);
  } else {
    const response = await apiCall(`/api/presets/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete preset');
  }
};

export interface BatchData {
    profile?: UserProfile;
    presets?: PromptPreset[];
    sessions?: Session[];
}

export const getBatchData = async (includes: ('profile' | 'presets' | 'sessions')[]): Promise<BatchData> => {
  if (isFirebaseMode()) {
    const result: BatchData = {};
    
    const promises: Promise<any>[] = [];
    
    if (includes.includes('profile')) {
      promises.push(getUserProfile().then(profile => ({ type: 'profile', data: profile })));
    }
    if (includes.includes('presets')) {
      promises.push(getPresets().then(presets => ({ type: 'presets', data: presets })));
    }
    if (includes.includes('sessions')) {
      promises.push(getSessions().then(sessions => ({ type: 'sessions', data: sessions })));
    }
    
    const results = await Promise.all(promises);
    
    results.forEach(({ type, data }) => {
      result[type as keyof BatchData] = data;
    });
    
    return result;
  } else {
    const response = await apiCall(`/api/user/batch?include=${includes.join(',')}`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch batch data');
    return response.json();
  }
};

export const logout = async () => {
  console.log('🚪 Logging out user...');
  
  try {
    if (isFirebaseMode()) {
      const { signOut } = await import('firebase/auth');
      await signOut(firebaseAuth);
      console.log('✅ Firebase sign out successful');
    }
    
    // Clear user info immediately
    setUserInfo(null);
    
    // Clear all authentication-related localStorage items
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('leviousa_user');
    localStorage.removeItem('user_info');
    localStorage.removeItem('leviousa_auth_mode');
    
    // Clear session storage
    sessionStorage.removeItem('leviousa_auth_mode');
    
    console.log('✅ Logout completed, redirecting to login...');
    
    // Force a hard redirect to ensure clean state
      window.location.href = '/login';
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Still clear local state and redirect even if logout fails
    setUserInfo(null);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }
}; 