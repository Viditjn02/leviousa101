'use client'

import { useEffect } from 'react'

export default function ElectronPrefixLoginPage() {
  useEffect(() => {
    console.log('🔗 [ElectronPrefix] /e/login page loaded - setting up electron mode...')
    console.log('🔗 [ElectronPrefix] Current URL:', window.location.href)
    
    try {
      // Set cookie for electron mode (survives redirects better than sessionStorage)
      document.cookie = 'leviousa_platform=electron; path=/; max-age=300; SameSite=Strict; Secure'
      
      // Also set in storage as backup
      sessionStorage.setItem('leviousa_auth_mode', 'electron')
      localStorage.setItem('leviousa_auth_mode', 'electron')
      
      console.log('🔗 [ElectronPrefix] Cookie and storage set, redirecting to main login...')
      
      // Redirect to main login page while preserving any other params
      const url = new URL(window.location.href)
      const params = url.searchParams
      
      // Build the redirect URL
      let redirectUrl = '/login'
      if (params.toString()) {
        redirectUrl += '?' + params.toString()
      }
      
      console.log('🔗 [ElectronPrefix] Redirecting to:', redirectUrl)
      
      // Use window.location for immediate redirect
      window.location.href = redirectUrl
      
    } catch (error) {
      console.error('🔗 [ElectronPrefix] Error setting up electron mode:', error)
      window.location.href = '/login'
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Setting up Electron authentication...</p>
        <p className="mt-2 text-sm text-gray-500">Redirecting to login...</p>
      </div>
    </div>
  )
} 