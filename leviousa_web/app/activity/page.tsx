'use client'

import { useState, useEffect, useCallback } from 'react'
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

  // Load cached sessions on mount for instant display
  useEffect(() => {
    const cachedSessions = sessionStorage.getItem('leviousa_cached_sessions');
    if (cachedSessions) {
      try {
        const parsed = JSON.parse(cachedSessions);
        setSessions(parsed);
        console.log('🚀 [ActivityPage] Loaded', parsed.length, 'sessions from cache');
      } catch (error) {
        console.error('Failed to parse cached sessions:', error);
      }
    }
  }, []);

  const fetchFirstPage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 [ActivityPage] User available, fetching first page...');
      
      const result = await getSessionsPaginated(1, 20);
      console.log('✅ [ActivityPage] Fetched', result.sessions.length, 'sessions for page 1');
      
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
      
      console.log('✅ [ActivityPage] Loaded', result.sessions.length, 'more sessions');
      
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



  useEffect(() => {
    console.log('🔄 [ActivityPage] useEffect triggered - userInfo:', !!userInfo, 'isLoading:', isLoading);
    if (userInfo) {
      console.log('🔄 [ActivityPage] User available, fetching first page...');
      fetchFirstPage();
    } else {
      console.log('⚠️ [ActivityPage] No user available for fetching sessions');
      setIsLoading(false);
    }
  }, [userInfo, fetchFirstPage]);

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user information...</p>
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
    console.log('🔄 [ActivityPage] Manual retry requested');
    fetchFirstPage();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl text-gray-600">
            {getGreeting()}, {userInfo.display_name}
          </h1>
        </div>
        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">
              Your Past Activity
            </h2>
            {lastFetchTime && (
              <div className="text-sm text-gray-500">
                Last updated: {lastFetchTime.toLocaleTimeString()}
              </div>
            )}
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Failed to load conversations
                  </h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="ml-4 px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading conversations...</p>
              <p className="mt-2 text-sm text-gray-500">Loading first page...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="block bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link href={`/activity/details?sessionId=${session.id}`} className="text-lg font-medium text-gray-900 hover:underline">
                        {session.title || `Conversation - ${new Date(session.started_at * 1000).toLocaleDateString()}`}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {new Date(session.started_at * 1000).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                      className={`ml-4 px-3 py-1 rounded text-xs font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors ${deletingId === session.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {deletingId === session.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <span className={`capitalize inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.session_type === 'listen' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {session.session_type || 'ask'}
                  </span>
                </div>
              ))}
              
              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={loadMoreSessions}
                    disabled={isLoadingMore}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Loading more...</span>
                      </div>
                    ) : (
                      `Load more conversations`
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center bg-white rounded-lg p-12">
              <p className="text-gray-500 mb-4">
                {error ? 'Unable to load conversations at this time.' : 'No conversations yet. Start a conversation in the desktop app to see your activity here.'}
              </p>
              <div className="text-sm text-gray-400">
                💡 Tip: Use the desktop app to have AI-powered conversations that will appear here automatically.
              </div>
              {error && (
                <button
                  onClick={handleRetry}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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