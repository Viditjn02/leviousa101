'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ElectronLoginPage() {
  const router = useRouter()

  useEffect(() => {
    console.log('🔗 [ElectronLogin] PAGE LOADED! Starting electron mode setup...')
    console.log('🔗 [ElectronLogin] Current URL:', window.location.href)
    
    try {
      // Store electron mode in sessionStorage and redirect to main login
      console.log('🔗 [ElectronLogin] Setting electron mode in storage...')
      
      // Store the mode in multiple places for maximum persistence
      sessionStorage.setItem('leviousa_auth_mode', 'electron')
      localStorage.setItem('leviousa_auth_mode', 'electron')
      
      console.log('🔗 [ElectronLogin] Storage set. Verifying:', {
        session: sessionStorage.getItem('leviousa_auth_mode'),
        local: localStorage.getItem('leviousa_auth_mode')
      })
      
      // Small delay to ensure storage is written
      setTimeout(() => {
        console.log('🔗 [ElectronLogin] Redirecting to main login page...')
        router.replace('/login')
      }, 100)
      
    } catch (error) {
      console.error('🔗 [ElectronLogin] Error setting up electron mode:', error)
      router.replace('/login')
    }
  }, [router])

  // Also try immediate storage setting
  if (typeof window !== 'undefined') {
    console.log('🔗 [ElectronLogin] IMMEDIATE: Setting storage on page load')
    try {
      sessionStorage.setItem('leviousa_auth_mode', 'electron')
      localStorage.setItem('leviousa_auth_mode', 'electron')
    } catch (e) {
      console.error('🔗 [ElectronLogin] IMMEDIATE: Storage error:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Setting up Electron authentication...</p>
      </div>
    </div>
  )
} 