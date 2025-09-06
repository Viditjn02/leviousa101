'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Head from 'next/head'
import { Chrome, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/utils/firebase'
import { useAuth } from '@/utils/auth'
import { setUserInfo } from '@/utils/api'
import { UrlParamPreserver } from '@/utils/urlParams'
import logger from '@/utils/productionLogger'

// Main login content component
function LoginContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const sp = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  })
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  })

  // Add build stamp to verify we're getting fresh deployment
  console.log('✅ LoginContent build stamp:', process.env.NEXT_PUBLIC_BUILD_ID ?? 'no-build-id', Date.now())
  console.log('✅ API base:', process.env.NEXT_PUBLIC_API_BASE ?? 'no-api-base')

  // Robust mode detection: prefer Next.js searchParams, fallback to window URL
  const electronMode = useMemo(() => {
    try {
      const m1 = sp?.get('mode')
      if (m1) return m1
      if (typeof window !== 'undefined') {
        const m2 = new URL(window.location.href).searchParams.get('mode')
        if (m2) return m2
      }
    } catch {}
    return null
  }, [sp])

  // Robust Electron mode detection and flag storage
  useEffect(() => {
    console.log('🔗 [LoginContent] ROBUST mode detection starting...')
    console.log('🔗 [LoginContent] Current URL:', window.location.href)
    console.log('🔗 [LoginContent] Detected mode:', electronMode)
    
    const isElectron = electronMode === 'electron'
    if (isElectron) {
      sessionStorage.setItem('lev:electron', '1')
      // Keep old key for compatibility
      sessionStorage.setItem('fromElectron', 'yes')
      console.log('✅ [LoginContent] Electron mode detected, saved in sessionStorage')
    } else {
      console.log('🔗 [LoginContent] Electron mode not detected; mode =', electronMode)
    }
  }, [electronMode])

  // Note: Removed redundant Firebase auth state listener here
  // AuthProvider in utils/auth.tsx already handles Firebase auth state changes
  // Multiple listeners were causing conflicts and race conditions

  // Auto-redirect when user becomes authenticated (only for web mode)
  useEffect(() => {
    if (!authLoading && user) {
      // Detect mode from URL with comprehensive debugging
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const mode = urlParams.get('mode') || hashParams.get('mode')
      
      logger.debug('🔍 [LoginContent] Mode detection debug:')
      logger.debug('🔍 Current URL:', window.location.href)
      logger.debug('🔍 Search params:', window.location.search)
      logger.debug('🔍 Hash params:', window.location.hash)
      logger.debug('🔍 URL mode param:', urlParams.get('mode'))
      logger.debug('🔍 Hash mode param:', hashParams.get('mode'))
      logger.debug('🔍 Final mode detected:', mode)
      
      // Also check preserved parameters and cookies
      const preserved = UrlParamPreserver.restoreParams()
      logger.debug('🔍 Preserved params:', preserved)
      logger.debug('🔍 Preserved params keys:', Object.keys(preserved))
      logger.debug('🔍 Preserved params values:', Object.values(preserved))
      logger.debug('🔍 Preserved params JSON:', JSON.stringify(preserved))
      const preservedMode = preserved.mode || preserved.electron_init
      logger.debug('🔍 Preserved mode (mode):', preserved.mode)
      logger.debug('🔍 Preserved mode (electron_init):', preserved.electron_init)
      logger.debug('🔍 Final preserved mode:', preservedMode)
      
      // Check cookie (o3 solution)
      const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
      logger.debug('🔍 Cookie mode:', cookieMode)
      
      // Check sessionStorage as additional fallback
      const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
      const localMode = localStorage.getItem('leviousa_auth_mode')
      logger.debug('🔍 Session mode:', sessionMode)
      logger.debug('🔍 Local mode:', localMode)
      
      // Check User-Agent as final fallback
      const userAgent = navigator.userAgent
      const userAgentMode = userAgent.includes('Electron') ? 'electron' : null
      logger.debug('🔍 User-Agent:', userAgent)
      logger.debug('🔍 User-Agent mode:', userAgentMode)
      
      // Use any available mode (prioritize cookie, then session, then preserved, then User-Agent)
      const finalMode = mode || cookieMode || sessionMode || localMode || preservedMode || userAgentMode
      logger.debug('🔍 Final mode (with all fallbacks):', finalMode)
      
      const isElectronMode = finalMode === 'electron'
      const isServerMode = finalMode === 'server'
      
      // Only redirect to activity page for web mode (not Electron/server mode)
      if (!isElectronMode && !isServerMode) {
        logger.debug('✅ User authenticated via AuthProvider, redirecting to activity (web mode)')
        router.push('/activity')
      } else {
        logger.debug('✅ User authenticated via AuthProvider, but staying for Electron/server mode handling')
        logger.debug('🔍 Mode details: isElectron=', isElectronMode, 'isServer=', isServerMode)
      }
    }
  }, [user, authLoading, router])

  // Handle redirect result on page load (o3's working solution)
  React.useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result) {
          console.log('✅ Google redirect authentication successful:', result.user.uid)
          
          // Get fresh ID token for authentication
          const idToken = await result.user.getIdToken(true)
          console.log('🔑 Got fresh ID token for authentication')
          
          // Handle auth success inline to avoid dependency issues
          const user = result.user
          console.log('✅ Authentication successful:', user.uid)
          
          await handleAuthSuccess(user)
        }
      } catch (error: any) {
        console.error('❌ Google redirect failed:', error)
        setErrors({ email: '', password: '', general: 'Google sign-in failed. Please try again.' })
      }
    }
    
    handleRedirectResult()
  }, [])

  const handleAuthSuccess = async (user: any) => {
    console.log('🔥 Authentication successful:', user.uid)
    try {
      setUserInfo({
        uid: user.uid,
        display_name: user.displayName || 'User',
        email: user.email || '',
      })
      
      // Check for both old and new Electron flags
      const fromElectron = sessionStorage.getItem('fromElectron') === 'yes' || 
                          sessionStorage.getItem('lev:electron') === '1'
      
      if (fromElectron) {
        // Clean up flags
        sessionStorage.removeItem('fromElectron')
        sessionStorage.removeItem('lev:electron')
        
        console.log('🔗 [handleAuthSuccess] Electron mode detected - setting up auth transfer...')
        
        const token = await user.getIdToken()
        const deepLinkUrl = `leviousa://auth-success?token=${token}&uid=${user.uid}&email=${encodeURIComponent(user.email || '')}&displayName=${encodeURIComponent(user.displayName || 'User')}`
        
        console.log('🔗 Deep linking to Electron app:', deepLinkUrl)
        
        // DEVELOPMENT MODE BRIDGE: Store auth data for Electron polling
        const authData = {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            token: token
          },
          timestamp: Date.now(),
          mode: 'development-bridge'
        }
        
        console.log('🔧 [DEV BRIDGE] Storing auth data for development mode polling...')
        localStorage.setItem('leviousa_dev_auth_bridge', JSON.stringify(authData))
        sessionStorage.setItem('leviousa_dev_auth_bridge', JSON.stringify(authData))
        
        // Also store via API for more reliable Electron polling
        try {
          const response = await fetch('/api/dev-auth-bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authData, timestamp: Date.now() })
          })
          
          if (response.ok) {
            console.log('✅ [DEV BRIDGE] Auth data stored via API for Electron polling')
          } else {
            console.warn('⚠️ [DEV BRIDGE] API storage failed, using localStorage only')
          }
        } catch (error) {
          console.warn('⚠️ [DEV BRIDGE] API storage error, using localStorage only:', error)
        }
        
        // Show success notification
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 10000;
          background: #4f46e5; color: white; padding: 16px 20px;
          border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
          max-width: 350px; line-height: 1.4;
        `
        notification.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">✅ Login Successful!</div>
          <div>Transferring auth to Leviousa app...</div>
          <div style="font-size: 12px; margin-top: 4px; opacity: 0.8;">Development Mode Bridge</div>
        `
        document.body.appendChild(notification)
        
        // Remove notification after delay
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 4000)
        
        // Try deep link for packaged app (will fail silently in development)
        setTimeout(() => {
          try {
            window.location.href = deepLinkUrl
          } catch (e) {
            console.log('🔗 Deep link failed (expected in development mode)')
          }
        }, 1000)
        
        // Redirect to activity page as fallback
        setTimeout(() => {
          router.push('/activity')
        }, 2000)
        
      } else {
        // Normal web authentication - let AuthProvider handle redirect
        console.log('🌐 Web mode authentication completed')
      }
    } catch (error) {
      console.error('❌ Auth success processing failed:', error)
      setErrors({ email: '', password: '', general: 'Authentication succeeded but processing failed.' })
    }
  }

  const validateForm = () => {
    const newErrors = { email: '', password: '', general: '' }
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (mode === 'signup' && !formData.displayName.trim()) {
      newErrors.general = 'Display name is required for signup'
    }
    
    setErrors(newErrors)
    return !newErrors.email && !newErrors.password && !newErrors.general
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setErrors({ email: '', password: '', general: '' })

    try {
      if (mode === 'signup') {
        // Create new account
        const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
        
        // Update display name
        await updateProfile(user, {
          displayName: formData.displayName
        })
        
        logger.debug('✅ Account created successfully:', user.uid)
        await handleAuthSuccess(user)
        
      } else {
        // Sign in existing user
        const { user } = await signInWithEmailAndPassword(auth, formData.email, formData.password)
        logger.debug('✅ Email sign-in successful:', user.uid)
        await handleAuthSuccess(user)
      }
      
    } catch (error: any) {
      console.error('❌ Email authentication failed:', error)
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          setErrors({ ...errors, general: 'No account found with this email address.' })
          break
        case 'auth/wrong-password':
          setErrors({ ...errors, general: 'Incorrect password.' })
          break
        case 'auth/email-already-in-use':
          setErrors({ ...errors, general: 'An account with this email already exists.' })
          break
        case 'auth/weak-password':
          setErrors({ ...errors, general: 'Password should be at least 6 characters.' })
          break
        case 'auth/invalid-email':
          setErrors({ ...errors, general: 'Please enter a valid email address.' })
          break
        default:
          setErrors({ ...errors, general: 'Authentication failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setErrors({ email: '', password: '', general: '' })

    try {
      // Clear any existing Firebase auth state to prevent wrong account issues
      console.log('🔄 [GoogleSignIn] Clearing existing Firebase auth state before Google Sign-In')
      await auth.signOut()
      console.log('✅ [GoogleSignIn] Previous auth state cleared')
      const provider = new GoogleAuthProvider()
      
      // Add Google Drive scope for MCP integration
      provider.addScope('https://www.googleapis.com/auth/drive.file')
      
      // Force account selection to avoid wrong account issues when multiple Google accounts are signed in
      provider.setCustomParameters({
        'prompt': 'select_account',  // Forces account selection dialog
        'hd': ''  // Allow any domain (not just G Suite)
      })
      
      // Use popup method for both web and electron (o3's working solution)
      console.log('🔄 Using popup method for Google sign-in')
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      await handleAuthSuccess(user)
      
    } catch (error: any) {
      console.error('❌ Google login failed:', error)
      
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrors({ ...errors, general: 'Google sign-in failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear specific field error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Detect mode from URL for display purposes (o3's working solution)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const displayMode = urlParams?.get('mode')
  const isElectronMode = displayMode === 'electron'
  const isServerMode = displayMode === 'server'

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center py-12 px-4 relative"
      style={{
        background: 'radial-gradient(circle at center, rgba(144, 81, 81, 0.25), #000)',
        color: '#fff'
      }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333'
          }} className="rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mb-4" style={{borderColor: '#905151'}}></div>
            <p style={{color: '#fff'}} className="font-medium">Authenticating...</p>
            <p style={{color: '#bbb'}} className="text-sm mt-1">Please wait while we sign you in</p>
          </div>
        </div>
      )}
      
      {/* Auth state is now managed by AuthProvider in root layout */}

      <div className="text-center mb-8 relative z-10">
        <h1 className="text-4xl mb-4 font-extrabold tracking-wider uppercase" style={{
          background: 'linear-gradient(45deg, #905151, #f2e9e9)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent'
        }}>LEVIOUSA</h1>
        {isElectronMode ? (
          <p style={{color: '#905151'}} className="text-sm mt-1 font-medium">🔗 Login requested from Leviousa app</p>
        ) : isServerMode ? (
          <p style={{color: '#905151'}} className="text-sm mt-1 font-medium">🔒 Server-side authentication mode</p>
        ) : null}
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-lg p-8 shadow-2xl" style={{
          background: '#1a1a1a',
          border: '1px solid #333'
        }}>
          {/* Mode Toggle */}
          <div className="flex mb-6 rounded-lg p-1" style={{background: '#070707'}}>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'shadow-sm'
                  : 'hover:opacity-80'
              }`}
              style={{
                background: mode === 'signin' ? '#1e1e1e' : 'transparent',
                color: mode === 'signin' ? '#fff' : '#bbb',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'shadow-sm'
                  : 'hover:opacity-80'
              }`}
              style={{
                background: mode === 'signup' ? '#1e1e1e' : 'transparent',
                color: mode === 'signup' ? '#fff' : '#bbb',
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 rounded-md shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
            style={{
              background: '#1e1e1e',
              border: '1px solid #333',
              color: '#fff'
            }}
          >
            <Chrome className="w-5 h-5 mr-2" />
            {isLoading ? 'Signing in...' : `Continue with Google`}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{borderColor: '#333'}} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2" style={{background: '#1a1a1a', color: '#bbb'}}>Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium mb-2" style={{color: '#fff'}}>
                  <User className="w-4 h-4 inline mr-2" />
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                  style={{
                    background: '#070707',
                    border: '1px solid #333',
                    color: '#fff'
                  }}
                  placeholder="Enter your display name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{color: '#fff'}}>
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2"
                style={{
                  background: '#070707',
                  border: errors.email ? '1px solid #ef4444' : '1px solid #333',
                  color: '#fff'
                }}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm" style={{color: '#ef4444'}}>{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{color: '#fff'}}>
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 pr-10"
                  style={{
                    background: '#070707',
                    border: errors.password ? '1px solid #ef4444' : '1px solid #333',
                    color: '#fff'
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" style={{color: '#bbb'}} />
                  ) : (
                    <Eye className="h-4 w-4" style={{color: '#bbb'}} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm" style={{color: '#ef4444'}}>{errors.password}</p>
              )}
            </div>

            {errors.general && (
              <div className="p-3 rounded-md" style={{
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <p className="text-sm" style={{color: '#ef4444'}}>{errors.general}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all hover:transform hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: 'linear-gradient(45deg, #905151, #f2e9e9)',
                color: '#000',
                border: 'none'
              }}
            >
              {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPageContent() {
  return <LoginContent />
}