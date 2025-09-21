'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/utils/auth'

export default function Home() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    // If user is authenticated, redirect to activity page
    if (!isLoading && user) {
      router.push('/activity')
    }
  }, [isLoading, user, router])

  // For non-authenticated users, redirect to landing page
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/landing.html'
    }
  }, [isLoading, user])

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'radial-gradient(circle at center, rgba(144, 81, 81, 0.25), #000)'
    }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: '#905151'}}></div>
        <p className="mt-4" style={{color: '#bbb'}}>Loading...</p>
      </div>
    </div>
  )
} 