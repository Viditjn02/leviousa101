'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Chrome, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/utils/firebase'
import { useAuth } from '@/utils/auth'

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

  // Auto-redirect when user becomes authenticated (only for web mode)
  useEffect(() => {
    if (!authLoading && user) {
      // Detect mode from URL
      const urlParams = new URLSearchParams(window.location.search)
      const mode = urlParams.get('mode')
      const isElectronMode = mode === 'electron'
      const isServerMode = mode === 'server'
      
      // Only redirect to activity page for web mode (not Electron/server mode)
      if (!isElectronMode && !isServerMode) {
        console.log('✅ User authenticated via AuthProvider, redirecting to activity (web mode)')
        router.push('/activity')
      } else {
        console.log('✅ User authenticated via AuthProvider, but staying for Electron/server mode handling')
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

  const handleAuthSuccess = React.useCallback(async (user: any) => {
    console.log('✅ Authentication successful:', user.uid)
    
    // Prevent multiple simultaneous auth handling
    if (isLoading) {
      console.log('⚠️ Auth already in progress, skipping duplicate handling')
      return
    }
    
    setIsLoading(true)
    
    // Detect mode from current URL
    const urlParams = new URLSearchParams(window.location.search)
    const mode = urlParams.get('mode')
    const isServerMode = mode === 'server'
    const isElectronMode = mode === 'electron'
    
    // Get fresh ID token for all authentication methods
    const idToken = await user.getIdToken(true)
    console.log('🔑 Got fresh ID token for authentication')
    
    if (isServerMode) {
      try {
        // Server-side authentication: return user info for custom token creation
        const deepLinkUrl = 'leviousa://server-auth-success?' + new URLSearchParams({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          method: 'server'
        }).toString()
        
        console.log('🔒 Return to electron app via server-side auth:', deepLinkUrl)
        window.location.href = deepLinkUrl
        
      } catch (error) {
        console.error('❌ Server-side auth processing failed:', error)
        alert('Login was successful but failed to return to app. Please check the app.')
      }
    }
    else if (isElectronMode) {
      try {
        const deepLinkUrl = 'leviousa://auth-success?' + new URLSearchParams({
          token: idToken,
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User'
        }).toString()
        
        console.log('🔗 Return to electron app via deep link with token')
        
        // Try the deep link, but also show a fallback button if it fails
        window.location.href = deepLinkUrl
        
        // Show success message with manual return option after a short delay
        setTimeout(() => {
          document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; text-align: center; padding: 20px;">
              <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px;">
                <h1 style="color: #22c55e; margin-bottom: 16px;">✅ Login Successful!</h1>
                <p style="color: #6b7280; margin-bottom: 24px;">You have been logged in as:<br><strong>${user.email}</strong></p>
                <p style="color: #6b7280; margin-bottom: 24px;">If Leviousa didn't open automatically, click the button below:</p>
                <button onclick="window.location.href='${deepLinkUrl}'" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 16px;">Return to Leviousa App</button>
                <p style="color: #9ca3af; font-size: 14px;">You can safely close this browser window.</p>
              </div>
            </div>
          `
        }, 1000)
        
      } catch (error) {
        console.error('❌ Deep link processing failed:', error)
        alert('Login was successful but failed to return to app. Please check the app.')
      }
    } 
    else if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron')
        const idToken = await user.getIdToken()
        
        ipcRenderer.send('firebase-auth-success', {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          idToken
        })
     
        console.log('📡 Auth info sent to electron successfully')
        
        // Clear all stored modes after successful use
        sessionStorage.removeItem('leviousa_auth_mode')
        localStorage.removeItem('leviousa_auth_mode')
        // Clear hash
        if (window.location.hash.includes('mode=')) {
          window.location.hash = ''
        }
      } catch (error) {
        console.error('❌ Electron communication failed:', error)
      }
    } 
    else {
      // For web mode, let AuthProvider context handle the redirect automatically
      console.log('🌐 Web mode - auth complete, AuthProvider will handle redirect')
    }
    
    // Reset loading state
    setIsLoading(false)
  }, [isLoading, router])

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
      
      // Detect mode from current URL
      const urlParams = new URLSearchParams(window.location.search)
      const mode = urlParams.get('mode')
      const isElectronMode = mode === 'electron'
      
      // Use redirect for Electron/localhost to avoid HTTPS popup issues
      if (isElectronMode || window.location.hostname === 'localhost') {
        console.log('🔄 Using redirect method for localhost/electron')
        await signInWithRedirect(auth, provider)
        // Redirect will happen automatically, no need to handle result here
      } else {
        // Use popup for production
        console.log('🔄 Using popup method for production')
        const result = await signInWithPopup(auth, provider)
        const user = result.user
        await handleAuthSuccess(user)
      }
      
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
  const isElectronMode = urlParams?.get('mode') === 'electron'
  const isServerMode = urlParams?.get('mode') === 'server'

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