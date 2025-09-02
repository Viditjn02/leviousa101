'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/utils/auth'

// Function to check if countdown is still active
async function checkCountdownStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/countdown-status')
    const data = await response.json()
    return data.countdownActive || false
  } catch (error) {
    console.error('Error checking countdown status:', error)
    // Default to showing landing page if there's an error
    return false
  }
}

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
        // Check if countdown is active - if so, redirect to countdown
        checkCountdownStatus().then(countdownActive => {
          if (countdownActive) {
            window.location.href = '/countdown.html'
          } else {
            router.push('/landing.html')
          }
        }).catch(() => {
          // If API fails, check env variable as fallback
          const isCountdownActive = process.env.NEXT_PUBLIC_COUNTDOWN_ACTIVE === 'true'
          if (isCountdownActive) {
            window.location.href = '/countdown.html'
          } else {
            router.push('/landing.html')
          }
        })
      }
    }
  }, [isLoading, user, router])

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