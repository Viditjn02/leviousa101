'use client'

import ClientLayout from '@/components/ClientLayout'
import ReferralDetector from '@/components/ReferralDetector'
import { useAuth } from '@/utils/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  useEffect(() => {
    console.log('🔍 AuthenticatedLayout: Auth state check - isLoading:', isLoading, 'user:', !!user, 'hasCheckedAuth:', hasCheckedAuth);
    
    // Add timeout to prevent hanging forever on auth check
    const authTimeout = setTimeout(() => {
      if (!hasCheckedAuth) {
        console.warn('⚠️ AuthenticatedLayout: Auth check timeout, proceeding anyway');
        setHasCheckedAuth(true);
      }
    }, 15000); // 15 second timeout

    if (!isLoading) {
      console.log('✅ AuthenticatedLayout: Auth loading complete');
      setHasCheckedAuth(true);
      clearTimeout(authTimeout);
      
      if (!user) {
        console.log('🚫 AuthenticatedLayout: No authenticated user, redirecting to login');
        router.push('/login');
      } else {
        console.log('✅ AuthenticatedLayout: User authenticated, showing content');
      }
    }

    return () => clearTimeout(authTimeout);
  }, [isLoading, user, router, hasCheckedAuth])

  // Show loading state only for a reasonable amount of time
  if (!hasCheckedAuth || (isLoading && !hasCheckedAuth)) {
    console.log('🔄 AuthenticatedLayout: Showing loading state - hasCheckedAuth:', hasCheckedAuth, 'isLoading:', isLoading);
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(circle at center, rgba(144, 81, 81, 0.25), #000)'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: '#905151'}}></div>
          <p className="mt-4" style={{color: '#fff'}}>Loading...</p>
          {isLoading && (
            <p className="mt-2 text-sm" style={{color: '#bbb'}}>Checking authentication...</p>
          )}
          <p className="mt-2 text-xs" style={{color: '#999'}}>
            Debug: hasCheckedAuth={hasCheckedAuth.toString()}, isLoading={isLoading.toString()}
          </p>
        </div>
      </div>
    )
  }

  // If no user after timeout, redirect will happen in useEffect
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(circle at center, rgba(144, 81, 81, 0.25), #000)'
      }}>
        <div className="text-center">
          <p style={{color: '#fff'}}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <ReferralDetector>
      <ClientLayout>
        {children}
      </ClientLayout>
    </ReferralDetector>
  )
}
