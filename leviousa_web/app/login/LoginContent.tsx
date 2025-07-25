'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Chrome, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/utils/firebase'
import { useAuth } from '@/utils/auth'
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

  // CRITICAL: Check for Electron mode indicators and set storage
  // This runs before any Firebase auth redirects can happen
  useEffect(() => {
    const checkElectronMode = () => {
      console.log('🔗 [LoginContent] Checking for Electron mode indicators...')
      console.log('🔗 [LoginContent] Current URL:', window.location.href)
      
      // Check URL fragment for electron indicator
      const hash = window.location.hash
      const electronFromHash = hash.includes('electron=')
      
      // Check URL parameters as backup
      const urlParams = new URLSearchParams(window.location.search)
      const electronInit = urlParams.get('electron_init')
      
      // Check User-Agent
      const userAgent = navigator.userAgent
      const electronFromUA = userAgent.includes('Electron')
      
      console.log('🔗 [LoginContent] Hash:', hash)
      console.log('🔗 [LoginContent] Electron from hash:', electronFromHash)
      console.log('🔗 [LoginContent] electron_init param:', electronInit)
      console.log('🔗 [LoginContent] User-Agent:', userAgent)
      console.log('🔗 [LoginContent] Electron from UA:', electronFromUA)
      
      if (electronFromHash || electronInit === 'true' || electronFromUA) {
        console.log('🔗 [LoginContent] ELECTRON MODE detected! Setting storage immediately...')
        
        try {
          // Set multiple storage methods for maximum persistence
          sessionStorage.setItem('leviousa_auth_mode', 'electron')
          localStorage.setItem('leviousa_auth_mode', 'electron')
          document.cookie = 'leviousa_platform=electron; path=/; max-age=300; SameSite=Strict; Secure'
          
          console.log('🔗 [LoginContent] Electron storage set successfully:', {
            session: sessionStorage.getItem('leviousa_auth_mode'),
            local: localStorage.getItem('leviousa_auth_mode'),
            cookie: document.cookie.includes('leviousa_platform=electron')
          })
          
          // Clean up URL
          if (electronFromHash) {
            window.location.hash = ''
          }
          if (electronInit) {
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('electron_init')
            window.history.replaceState({}, '', newUrl.toString())
          }
          
        } catch (error) {
          console.error('🔗 [LoginContent] Error setting electron storage:', error)
        }
      } else {
        console.log('🔗 [LoginContent] No Electron indicators found, will use manual detection on successful login')
      }
    }
    
    checkElectronMode()
  }, []) // Run only once on mount

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
      
      // Check User-Agent as final fallback
      const userAgent = navigator.userAgent
      const userAgentMode = userAgent.includes('Electron') ? 'electron' : null
      console.log('🔍 User-Agent:', userAgent)
      console.log('🔍 User-Agent mode:', userAgentMode)
      
      // Use any available mode (prioritize cookie, then session, then preserved, then User-Agent)
      const finalMode = mode || cookieMode || sessionMode || localMode || preservedMode || userAgentMode
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

  const handleAuthSuccess = React.useCallback(async (user: any) => {
    console.log('✅ Authentication successful:', user.uid)
    
    // Prevent multiple simultaneous auth handling
    if (isLoading) {
      console.log('⚠️ Auth already in progress, skipping duplicate handling')
      return
    }
    
    setIsLoading(true)
    
    // Restore preserved URL parameters
    const preservedParams = UrlParamPreserver.restoreParams()
    const overlayParams = UrlParamPreserver.getOverlayParams()
    
    console.log('🔗 Preserved params during auth:', preservedParams)
    console.log('🔗 Preserved params keys:', Object.keys(preservedParams))
    console.log('🔗 Preserved params JSON:', JSON.stringify(preservedParams))
    console.log('🎯 Overlay params for restoration:', overlayParams)
    console.log('🎯 Overlay params keys:', Object.keys(overlayParams))
    console.log('🎯 Overlay params JSON:', JSON.stringify(overlayParams))
    
    // Detect mode from current URL or preserved params with debugging
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const urlMode = urlParams.get('mode') || hashParams.get('mode')
    
    // Check cookie (o3 solution)
    const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
    
    // Check sessionStorage as additional fallback
    const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
    const localMode = localStorage.getItem('leviousa_auth_mode')
    
    // Check User-Agent as final fallback
    const userAgent = navigator.userAgent
    const userAgentMode = userAgent.includes('Electron') ? 'electron' : null
    
    // Use any available mode (prioritize cookie, then session, then preserved, then User-Agent)
    const preservedMode = preservedParams.mode || preservedParams.electron_init
    const mode = urlMode || cookieMode || sessionMode || localMode || preservedMode || userAgentMode
    
    console.log('🔍 [handleAuthSuccess] Mode detection debug:')
    console.log('🔍 Current URL:', window.location.href)
    console.log('🔍 URL mode:', urlMode)
    console.log('🔍 Hash mode:', hashParams.get('mode'))
    console.log('🔍 Cookie mode:', cookieMode)
    console.log('🔍 Session mode:', sessionMode)
    console.log('🔍 Local mode:', localMode)
    console.log('🔍 Preserved mode (mode):', preservedParams.mode)
    console.log('🔍 Preserved mode (electron_init):', preservedParams.electron_init)
    console.log('🔍 All preserved keys:', Object.keys(preservedParams))
    console.log('🔍 User-Agent:', userAgent)
    console.log('🔍 User-Agent mode:', userAgentMode)
    console.log('🔍 Final mode:', mode)
    
    const isServerMode = mode === 'server'
    const isElectronMode = mode === 'electron'
    
    console.log('🔍 Mode flags: isElectron=', isElectronMode, 'isServer=', isServerMode)
    
    // Get fresh ID token for all authentication methods
    const idToken = await user.getIdToken(true)
    console.log('🔑 Got fresh ID token for authentication')
    
    if (isServerMode) {
      try {
        // Server-side authentication: return user info for custom token creation
        const serverParams: any = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          method: 'server',
          ...overlayParams  // Include preserved overlay parameters
        }
        
        const deepLinkUrl = 'leviousa://server-auth-success?' + new URLSearchParams(serverParams).toString()
        
        console.log('🔒 Return to electron app via server-side auth:', deepLinkUrl)
        window.location.href = deepLinkUrl
        
      } catch (error) {
        console.error('❌ Server-side auth processing failed:', error)
        alert('Login was successful but failed to return to app. Please check the app.')
      }
    }
    else if (isElectronMode) {
      try {
        // Include overlay parameters in the deep link
        const deepLinkParams: any = {
          token: idToken,
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          ...overlayParams  // Include preserved overlay parameters
        }
        
        const deepLinkUrl = 'leviousa://auth-success?' + new URLSearchParams(deepLinkParams).toString()
        
        console.log('🔗 Deep link URL generated:', deepLinkUrl)
        console.log('🔗 Deep link params:', deepLinkParams)
        console.log('🔗 Attempting to navigate to Leviousa app automatically...')
        
        // Show user feedback about the process
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
          <div>Opening Leviousa app automatically...</div>
        `
        document.body.appendChild(notification)
        
        // Remove notification after a few seconds
        setTimeout(() => {
          if (document.body.contains(notification)) {
            notification.style.transition = 'opacity 0.3s ease'
            notification.style.opacity = '0'
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification)
              }
            }, 300)
          }
        }, 3000)
        
        // Multiple automatic deep link methods to bypass permission dialogs
        try {
          // Method 1: Use location.replace for more seamless navigation
          console.log('🔗 Method 1: Direct location replacement...')
          window.location.replace(deepLinkUrl)
          
        } catch (error) {
          console.log('🔗 Method 1 (location.replace) failed:', error)
          
          try {
            // Method 2: Create invisible iframe as fallback
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
            iframe.style.width = '0'
            iframe.style.height = '0'
          iframe.src = deepLinkUrl
          document.body.appendChild(iframe)
            console.log('🔗 Method 2: Iframe deep link triggered')
          
          // Remove iframe after short delay
          setTimeout(() => {
              if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
              }
            }, 500)
          
          } catch (iframeError) {
            console.log('🔗 Method 2 (iframe) failed:', iframeError)
        
        try {
              // Method 3: Use window.open with immediate close as last resort
              const deepLinkWindow = window.open(deepLinkUrl, '_self')
              console.log('🔗 Method 3: Window.open deep link triggered')
            } catch (openError) {
              console.log('🔗 Method 3 (window.open) failed:', openError)
            }
          }
        }
        
        // Instead of showing dialog, redirect to activity page immediately
        console.log('🌐 Electron auth successful, redirecting to activity page...')
        
        // Clear electron mode indicators since auth is complete
        sessionStorage.removeItem('leviousa_auth_mode')
        localStorage.removeItem('leviousa_auth_mode')
        if (window.location.hash.includes('mode=')) {
          window.location.hash = ''
        }
        
        // Add fallback notification if automatic opening doesn't work
        setTimeout(() => {
          const fallbackNotification = document.createElement('div')
          fallbackNotification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #f59e0b; color: white; padding: 16px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
            max-width: 350px; line-height: 1.4; cursor: pointer;
          `
          fallbackNotification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">Need help opening Leviousa?</div>
            <div style="margin-bottom: 8px;">Click here if the app didn't open automatically</div>
            <div style="text-decoration: underline; font-size: 12px;">Manual deep link</div>
          `
          
          fallbackNotification.onclick = () => {
            try {
              window.open(deepLinkUrl, '_blank')
            } catch (e) {
              window.location.href = deepLinkUrl
            }
          }
          
          document.body.appendChild(fallbackNotification)
          
          // Remove fallback notification after 10 seconds
          setTimeout(() => {
            if (document.body.contains(fallbackNotification)) {
              fallbackNotification.style.transition = 'opacity 0.3s ease'
              fallbackNotification.style.opacity = '0'
              setTimeout(() => {
                if (document.body.contains(fallbackNotification)) {
                  document.body.removeChild(fallbackNotification)
                }
              }, 300)
            }
          }, 10000)
        }, 2000)
        
        // Small delay to ensure deep link is processed, then redirect to activity
        setTimeout(() => {
          router.push('/activity')
        }, 1500)
        
      } catch (error) {
        console.error('❌ Deep link processing failed:', error)
        // If deep link fails, still redirect to activity page
        router.push('/activity')
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
      // Check if this might be an Electron session that lost its mode indicators
      console.log('🔍 [Manual Detection] Mode is unclear, checking for Electron indicators...')
      
      // Manual detection: if no clear mode and certain indicators suggest Electron
      const possibleElectronIndicators = [
        // No referrer (direct navigation)
        !document.referrer,
        // External browser opened by app
        window.opener === null,
        // Fresh browser window
        window.history.length === 1
      ]
      
      const electronScore = possibleElectronIndicators.filter(Boolean).length
      console.log('🔍 [Manual Detection] Electron indicators:', {
        noReferrer: !document.referrer,
        noOpener: window.opener === null,
        freshWindow: window.history.length === 1,
        score: electronScore
      })
      
      // If 2 or more indicators suggest Electron, auto-set mode
      if (electronScore >= 2) {
        console.log('🔗 [Manual Detection] Strong Electron indicators detected! Setting Electron mode...')
        
        try {
          sessionStorage.setItem('leviousa_auth_mode', 'electron')
          localStorage.setItem('leviousa_auth_mode', 'electron')
          document.cookie = 'leviousa_platform=electron; path=/; max-age=300; SameSite=Strict; Secure'
          
          console.log('🔗 [Manual Detection] Electron mode set, will generate deep link...')
          
          // Recursively call handleAuthSuccess with electron mode now set
          setTimeout(() => {
            console.log('🔗 [Manual Detection] Retrying handleAuthSuccess with Electron mode set')
            handleAuthSuccess(user)
          }, 100)
          
        } catch (error) {
          console.error('🔗 [Manual Detection] Error setting electron mode:', error)
        }
      } else {
        // For web mode, don't manipulate URL - let the useEffect handle redirect cleanly
        console.log('🌐 Web mode - auth complete, AuthProvider will handle redirect')
        
        // Store overlay params for potential future use but don't add to URL 
        if (Object.keys(overlayParams).length > 0) {
          console.log('🔗 Overlay parameters preserved for future use:', overlayParams)
          // Could store in sessionStorage if needed later
        }
      }
    }
    
    // Clean up preserved parameters after successful authentication
    UrlParamPreserver.clearParams()
    
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
      
      // Add Google Drive scope for MCP integration
      provider.addScope('https://www.googleapis.com/auth/drive.file')
      
      // Detect mode from current URL and other sources
      const urlParams = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const urlMode = urlParams.get('mode') || hashParams.get('mode')
      
      // Check cookie (o3 solution)
      const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
      
      // Check sessionStorage as additional fallback
      const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
      const localMode = localStorage.getItem('leviousa_auth_mode')
      
      // Check User-Agent as final fallback
      const userAgent = navigator.userAgent
      const userAgentMode = userAgent.includes('Electron') ? 'electron' : null
      
      // Use any available mode
      const mode = urlMode || cookieMode || sessionMode || localMode || userAgentMode
      const isElectronMode = mode === 'electron'
      
      console.log('🔍 [handleGoogleSignIn] Mode detection debug:')
      console.log('🔍 Current URL:', window.location.href)
      console.log('🔍 URL mode:', urlMode)
      console.log('🔍 Hash mode:', hashParams.get('mode'))
      console.log('🔍 Cookie mode:', cookieMode)
      console.log('🔍 Session mode:', sessionMode)
      console.log('🔍 Local mode:', localMode)
      console.log('🔍 User-Agent:', userAgent)
      console.log('🔍 User-Agent mode:', userAgentMode)
      console.log('🔍 Final mode:', mode)
      console.log('🔍 isElectronMode:', isElectronMode)
      console.log('🔍 hostname:', window.location.hostname)
      
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
  const hashParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.substring(1)) : null
  const urlDisplayMode = urlParams?.get('mode') || hashParams?.get('mode')
  
  // Check all sources for display mode
  let displayMode = urlDisplayMode
  if (typeof window !== 'undefined') {
    const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
    const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
    const localMode = localStorage.getItem('leviousa_auth_mode')
    const userAgent = navigator.userAgent
    const userAgentMode = userAgent.includes('Electron') ? 'electron' : null
    displayMode = urlDisplayMode || cookieMode || sessionMode || localMode || userAgentMode
  }
  
  const isElectronMode = displayMode === 'electron'
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
    const userAgent = navigator.userAgent
    const userAgentMode = userAgent.includes('Electron') ? 'electron' : null
    console.log('🔍 User-Agent:', userAgent)
    console.log('🔍 User-Agent mode:', userAgentMode)
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