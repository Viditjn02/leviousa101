'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/utils/auth'

export default function Home() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    // Wait for auth state to be determined before redirecting
    if (!isLoading) {
      if (user) {
        // User is authenticated, go to activity
        router.push('/activity')
      } else {
        // No user, go to login
        router.push('/login')
      }
    }
  }, [isLoading, user, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
} 