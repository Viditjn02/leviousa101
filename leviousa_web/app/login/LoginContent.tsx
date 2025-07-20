'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Chrome, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/utils/firebase'
import { useAuth } from '@/utils/auth'
import { setUserInfo } from '@/utils/api'
import { UrlParamPreserver } from '@/utils/urlParams'

// Main login content component
function LoginContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
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
  const [isElectronMode, setIsElectronMode] = useState(false)

  // o3's solution: Check for Electron mode and store flag before Firebase redirect
  useEffect(() => {
    console.log('🔗 [LoginContent] Checking for Electron mode...')
    console.log('🔗 [LoginContent] Current URL:', window.location.href)
    
    // Capture the hint *before* Firebase redirect
    const qp = new URLSearchParams(window.location.search);
    if (qp.get('mode') === 'electron') {
      sessionStorage.setItem('fromElectron', 'yes');
      setIsElectronMode(true);
      console.log('🔗 [LoginContent] Electron mode detected, flag stored in sessionStorage');
    } else {
      console.log('🔗 [LoginContent] No Electron mode detected');
      setIsElectronMode(false);
    }
  }, [])

  // Auto-redirect when user becomes authenticated (only for web mode)
  useEffect(() => {
    if (!authLoading && user) {
      // Detect mode from URL with comprehensive debugging
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const mode = urlParams.get('mode') || hashParams.get('mode')
      
      console.log('🔍 [LoginContent] Mode detection debug:')
      console.log('🔍 Current URL:', window.location.href)
      console.log('🔍 Search params:', window.location.search)
      console.log('🔍 Hash params:', window.location.hash)
      console.log('🔍 URL mode param:', urlParams.get('mode'))
      console.log('🔍 Hash mode param:', hashParams.get('mode'))
      console.log('🔍 Final mode detected:', mode)
      
      // Also check preserved parameters and cookies
      const preserved = UrlParamPreserver.restoreParams()
      console.log('🔍 Preserved params:', preserved)
      console.log('🔍 Preserved params keys:', Object.keys(preserved))
      console.log('🔍 Preserved params values:', Object.values(preserved))
      console.log('🔍 Preserved params JSON:', JSON.stringify(preserved))
      const preservedMode = preserved.mode || preserved.electron_init
      console.log('🔍 Preserved mode (mode):', preserved.mode)
      console.log('🔍 Preserved mode (electron_init):', preserved.electron_init)
      console.log('🔍 Final preserved mode:', preservedMode)
      
      // Check cookie (o3 solution)
      const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
      console.log('🔍 Cookie mode:', cookieMode)
      
      // Check sessionStorage as additional fallback
      const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
      const localMode = localStorage.getItem('leviousa_auth_mode')
      console.log('🔍 Session mode:', sessionMode)
      console.log('🔍 Local mode:', localMode)
      
      // Use strict mode detection - only electron if explicitly indicated
      const explicitModes = [mode, cookieMode, sessionMode, localMode, preservedMode].filter(Boolean)
      const finalMode = explicitModes.length > 0 ? explicitModes[0] : null
      console.log('🔍 Explicit modes found:', explicitModes)
      console.log('🔍 Final mode (with all fallbacks):', finalMode)
      
      const isElectronMode = finalMode === 'electron'
      const isServerMode = finalMode === 'server'
      
      // Only redirect to activity page for web mode (not Electron/server mode)
      if (!isElectronMode && !isServerMode) {
        console.log('✅ User authenticated via AuthProvider, redirecting to activity (web mode)')
        router.push('/activity')
      } else {
        console.log('✅ User authenticated via AuthProvider, but staying for Electron/server mode handling')
        console.log('🔍 Mode details: isElectron=', isElectronMode, 'isServer=', isServerMode)
      }
    }
  }, [user, authLoading, router])

  // Handle redirect result on page load
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
      
      // o3's solution: Only deep-link if the flag survived the redirect round-trip
      if (sessionStorage.getItem('fromElectron') === 'yes') {
        sessionStorage.removeItem('fromElectron'); // consume it once
        
        const token = await user.getIdToken();
        const deepLinkUrl = `leviousa://auth-success?token=${token}&uid=${user.uid}&email=${encodeURIComponent(user.email || '')}&displayName=${encodeURIComponent(user.displayName || 'User')}`;
        
        console.log('🔗 Deep linking to Electron app:', deepLinkUrl);
        
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
          <div>Opening Leviousa app...</div>
        `
        document.body.appendChild(notification)
        
        // Remove notification after delay
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification)
          }
        }, 3000)
        
        // Trigger the OS-level prompt → opens the desktop app
        setTimeout(() => {
          window.location.href = deepLinkUrl;
        }, 1000);
        
        // Redirect to activity page as fallback
        setTimeout(() => {
          router.push('/activity')
        }, 2000)
        
      } else {
        // Normal web login - go to activity page immediately
        console.log('🌐 Normal web login, redirecting to activity page');
        router.push('/activity')
      }
      
    } catch (error) {
      console.error('❌ Error in auth success handler:', error)
      router.push('/activity') // fallback
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
        
        console.log('✅ Account created successfully:', user.uid)
        await handleAuthSuccess(user)
        
      } else {
        // Sign in existing user
        const { user } = await signInWithEmailAndPassword(auth, formData.email, formData.password)
        console.log('✅ Email sign-in successful:', user.uid)
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
      const provider = new GoogleAuthProvider()
      
      // Use popup method for both web and electron
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

  // Detect mode from URL for display purposes
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const hashParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)) : null
  const urlDisplayMode = urlParams?.get('mode') || hashParams?.get('mode')
  
  // Check all sources for display mode
  let displayMode = urlDisplayMode
  if (typeof window !== 'undefined') {
    const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
    const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
    const localMode = localStorage.getItem('leviousa_auth_mode')
    
    // Use strict mode detection - only electron if explicitly indicated
    const explicitModes = [urlDisplayMode, cookieMode, sessionMode, localMode].filter(Boolean)
    displayMode = explicitModes.length > 0 ? explicitModes[0] : null
  }
  
  // Using state variable isElectronMode instead of const declaration
  const isServerMode = displayMode === 'server'
  
  // Debug display mode detection
  if (typeof window !== 'undefined') {
    console.log('🔍 [LoginContent Display] Mode detection debug:')
    console.log('🔍 Current URL:', window.location.href)
    console.log('🔍 URL mode:', urlDisplayMode)
    console.log('🔍 Hash mode:', hashParams?.get('mode'))
    const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
    const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
    const localMode = localStorage.getItem('leviousa_auth_mode')
    console.log('🔍 Cookie mode:', cookieMode)
    console.log('🔍 Session mode:', sessionMode)
    console.log('🔍 Local mode:', localMode)
    console.log('🔍 Final display mode:', displayMode)
    console.log('🔍 isElectronMode for display:', isElectronMode)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">Authenticating...</p>
            <p className="text-gray-500 text-sm mt-1">Please wait while we sign you in</p>
          </div>
        </div>
      )}
      
      {/* Auth state is now managed by AuthProvider in root layout */}

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Leviousa</h1>
        <p className="text-gray-600 mt-2">
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'} to access AI-powered meeting assistance.
        </p>
        {isElectronMode ? (
          <p className="text-sm text-blue-600 mt-1 font-medium">🔗 Login requested from Leviousa app</p>
        ) : isServerMode ? (
          <p className="text-sm text-purple-600 mt-1 font-medium">🔒 Server-side authentication mode</p>
        ) : null}
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white shadow-md rounded-lg p-8">
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
          >
            <Chrome className="w-5 h-5 mr-2" />
            {isLoading ? 'Signing in...' : `Continue with Google`}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your display name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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