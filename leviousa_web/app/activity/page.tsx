'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/utils/auth'
import {
  UserProfile,
  Session,
  getSessions,
  getSessionsPaginated,
  deleteSession,
} from '@/utils/api'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import logger from '@/utils/productionLogger'

function ActivityPageContent() {
  const router = useRouter()
  const { user: userInfo } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Load cached sessions on mount for instant display
  useEffect(() => {
    const cachedSessions = sessionStorage.getItem('leviousa_cached_sessions');
    if (cachedSessions) {
      try {
        const parsed = JSON.parse(cachedSessions);
        setSessions(parsed);
        logger.debug('🚀 [ActivityPage] Loaded', parsed.length, 'sessions from cache');
      } catch (error) {
        console.error('Failed to parse cached sessions:', error);
      }
    }
  }, []);

  const fetchFirstPage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      logger.debug('🔄 [ActivityPage] User available, fetching first page...');
      
      const result = await getSessionsPaginated(1, 20);
      logger.debug('✅ [ActivityPage] Fetched', result.sessions.length, 'sessions for page 1');
      
      setSessions(result.sessions);
      setHasMore(result.hasMore);
      setCurrentPage(1);
      setLastFetchTime(new Date());
      
      // Cache sessions for instant loading
      sessionStorage.setItem('leviousa_cached_sessions', JSON.stringify(result.sessions));
    } catch (error) {
      console.error('❌ [ActivityPage] Failed to fetch first page:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversations');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreSessions = useCallback(async () => {
    if (!hasMore || isLoadingMore || sessions.length === 0) return;
    
    try {
      setIsLoadingMore(true);
      const lastSession = sessions[sessions.length - 1];
      const result = await getSessionsPaginated(currentPage + 1, 20, lastSession.id);
      
      logger.debug('✅ [ActivityPage] Loaded', result.sessions.length, 'more sessions');
      
      setSessions(prev => [...prev, ...result.sessions]);
      setHasMore(result.hasMore);
      setCurrentPage(prev => prev + 1);
      
      // Update cache with new sessions
      const updatedSessions = [...sessions, ...result.sessions];
      sessionStorage.setItem('leviousa_cached_sessions', JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('❌ [ActivityPage] Failed to load more sessions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, sessions, currentPage]);

  // Set up infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          logger.debug('🔄 [ActivityPage] Intersection observed, loading more sessions...');
          loadMoreSessions();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loadMoreSessions]);

  useEffect(() => {
    logger.debug('🔄 [ActivityPage] useEffect triggered - userInfo:', !!userInfo, 'isLoading:', isLoading);
    if (userInfo) {
      logger.debug('🔄 [ActivityPage] User available, fetching first page...');
      fetchFirstPage();
    } else {
      logger.debug('⚠️ [ActivityPage] No user available for fetching sessions');
      setIsLoading(false);
    }
  }, [userInfo, fetchFirstPage]);

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(circle at center, rgba(144, 81, 81, 0.25), #000)'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: '#905151'}}></div>
          <p className="mt-4" style={{color: '#fff'}}>Loading user information...</p>
        </div>
      </div>
    )
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this activity? This cannot be undone.')) return;
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(sessions => sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      alert('Failed to delete activity.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  }

  const handleRetry = () => {
    logger.debug('🔄 [ActivityPage] Manual retry requested');
    fetchFirstPage();
  };

  return (
    <div className="min-h-screen" style={{background: 'var(--bg)'}}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl brand-gradient font-bold">
            {getGreeting()}, {userInfo.display_name}
          </h1>
        </div>
        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold" style={{color: 'var(--text)'}}>
              Your Past Activity
            </h2>
            {lastFetchTime && (
              <div className="text-sm" style={{color: 'var(--muted)'}}>
                Last updated: {lastFetchTime.toLocaleTimeString()}
              </div>
            )}
          </div>
          
          {error && (
            <div className="mb-6 p-4 rounded-lg glass-card" style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium" style={{color: '#ef4444'}}>
                    Failed to load conversations
                  </h3>
                  <p className="text-sm mt-1" style={{color: '#ef4444'}}>{error}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="ml-4 px-3 py-1 text-sm rounded transition-colors hover:transform hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: 'var(--brand-start)'}}></div>
              <p className="mt-4" style={{color: 'var(--text)'}}>Loading conversations...</p>
              <p className="mt-2 text-sm" style={{color: 'var(--muted)'}}>Loading first page...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="block rounded-lg p-6 glass-card hover:transform hover:-translate-y-1 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link href={`/activity/details?sessionId=${session.id}`} className="text-lg font-medium hover:underline" style={{color: 'var(--text)'}}>
                        {session.title || `Conversation - ${new Date(session.started_at * 1000).toLocaleDateString()}`}
                      </Link>
                      <div className="text-sm" style={{color: 'var(--muted)'}}>
                        {new Date(session.started_at * 1000).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                      className={`ml-4 px-3 py-1 rounded text-xs font-medium transition-all hover:transform hover:-translate-y-0.5 ${deletingId === session.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      {deletingId === session.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <span className={`capitalize inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`} style={{
                    background: session.session_type === 'listen' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: session.session_type === 'listen' ? '#3b82f6' : '#22c55e',
                    border: `1px solid ${session.session_type === 'listen' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                  }}>
                    {session.session_type || 'ask'}
                  </span>
                </div>
              ))}
              
              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center pt-6 pb-4">
                  {isLoadingMore && (
                    <div className="flex items-center space-x-2" style={{color: 'var(--muted)'}}>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{borderColor: 'var(--brand-start)'}}></div>
                      <span>Loading more conversations...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center rounded-lg p-12 glass-card">
              <p className="mb-4" style={{color: 'var(--muted)'}}>
                {error ? 'Unable to load conversations at this time.' : 'No conversations yet. Start a conversation in the desktop app to see your activity here.'}
              </p>
              <div className="text-sm" style={{color: 'var(--muted-2)'}}>
                💡 Tip: Use the desktop app to have AI-powered conversations that will appear here automatically.
              </div>
              {error && (
                <button
                  onClick={handleRetry}
                  className="mt-4 px-4 py-2 rounded transition-all hover:transform hover:-translate-y-1 btn-brand"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ActivityPage() {
  return (
    <AuthenticatedLayout>
      <ActivityPageContent />
    </AuthenticatedLayout>
  )
} 