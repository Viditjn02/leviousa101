'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import { Chrome, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/utils/firebase'
import { useAuth } from '@/utils/auth'
import { UrlParamPreserver } from '@/utils/urlParams'
import logger from '@/utils/productionLogger'

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
      logger.debug('🔗 [LoginContent] Checking for Electron mode indicators...')
      logger.debug('🔗 [LoginContent] Current URL:', window.location.href)
      
      // Check URL fragment for electron indicator
      const hash = window.location.hash
      const electronFromHash = hash.includes('electron=')
      
      // Check URL parameters as backup
      const urlParams = new URLSearchParams(window.location.search)
      const electronInit = urlParams.get('electron_init')
      
      // Check User-Agent
      const userAgent = navigator.userAgent
      const electronFromUA = userAgent.includes('Electron')
      
      logger.debug('🔗 [LoginContent] Hash:', hash)
      logger.debug('🔗 [LoginContent] Electron from hash:', electronFromHash)
      logger.debug('🔗 [LoginContent] electron_init param:', electronInit)
      logger.debug('🔗 [LoginContent] User-Agent:', userAgent)
      logger.debug('🔗 [LoginContent] Electron from UA:', electronFromUA)
      
      if (electronFromHash || electronInit === 'true' || electronFromUA) {
        logger.debug('🔗 [LoginContent] ELECTRON MODE detected! Setting storage immediately...')
        
        try {
          // Set multiple storage methods for maximum persistence
          sessionStorage.setItem('leviousa_auth_mode', 'electron')
          localStorage.setItem('leviousa_auth_mode', 'electron')
          document.cookie = 'leviousa_platform=electron; path=/; max-age=300; SameSite=Strict; Secure'
          
          logger.debug('🔗 [LoginContent] Electron storage set successfully:', {
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
        logger.debug('🔗 [LoginContent] No Electron indicators found, will use manual detection on successful login')
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

  // Handle redirect result on page load
  React.useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result) {
          logger.debug('✅ Google redirect authentication successful:', result.user.uid)
          
          // Get fresh ID token for authentication
          const idToken = await result.user.getIdToken(true)
          logger.debug('🔑 Got fresh ID token for authentication')
          
          // Handle auth success inline to avoid dependency issues
          const user = result.user
          logger.debug('✅ Authentication successful:', user.uid)
          
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
    logger.debug('✅ Authentication successful:', user.uid)
    
    // Prevent multiple simultaneous auth handling
    if (isLoading) {
      logger.debug('⚠️ Auth already in progress, skipping duplicate handling')
      return
    }
    
    setIsLoading(true)
    
    // Restore preserved URL parameters
    const preservedParams = UrlParamPreserver.restoreParams()
    const overlayParams = UrlParamPreserver.getOverlayParams()
    
    logger.debug('🔗 Preserved params during auth:', preservedParams)
    logger.debug('🔗 Preserved params keys:', Object.keys(preservedParams))
    logger.debug('🔗 Preserved params JSON:', JSON.stringify(preservedParams))
    logger.debug('🎯 Overlay params for restoration:', overlayParams)
    logger.debug('🎯 Overlay params keys:', Object.keys(overlayParams))
    logger.debug('🎯 Overlay params JSON:', JSON.stringify(overlayParams))
    
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
    
    logger.debug('🔍 [handleAuthSuccess] Mode detection debug:')
    logger.debug('🔍 Current URL:', window.location.href)
    logger.debug('🔍 URL mode:', urlMode)
    logger.debug('🔍 Hash mode:', hashParams.get('mode'))
    logger.debug('🔍 Cookie mode:', cookieMode)
    logger.debug('🔍 Session mode:', sessionMode)
    logger.debug('🔍 Local mode:', localMode)
    logger.debug('🔍 Preserved mode (mode):', preservedParams.mode)
    logger.debug('🔍 Preserved mode (electron_init):', preservedParams.electron_init)
    logger.debug('🔍 All preserved keys:', Object.keys(preservedParams))
    logger.debug('🔍 User-Agent:', userAgent)
    logger.debug('🔍 User-Agent mode:', userAgentMode)
    logger.debug('🔍 Final mode:', mode)
    
    const isServerMode = mode === 'server'
    const isElectronMode = mode === 'electron'
    
    logger.debug('🔍 Mode flags: isElectron=', isElectronMode, 'isServer=', isServerMode)
    
    // Get fresh ID token for all authentication methods
    const idToken = await user.getIdToken(true)
    logger.debug('🔑 Got fresh ID token for authentication')
    
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
        
        logger.debug('🔒 Return to electron app via server-side auth:', deepLinkUrl)
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
        
        logger.debug('🔗 Deep link URL generated:', deepLinkUrl)
        logger.debug('🔗 Deep link params:', deepLinkParams)
        logger.debug('🔗 Attempting to navigate to Leviousa app automatically...')
        
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
        console.log('🔗 [DEEP LINK DEBUG] Attempting to open Electron app with URL:', deepLinkUrl);
        console.log('🔗 [DEEP LINK DEBUG] User Agent:', navigator.userAgent);
        console.log('🔗 [DEEP LINK DEBUG] Browser:', typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : 'unknown');
        
        try {
          // Method 1: Use location.replace for more seamless navigation
          logger.debug('🔗 Method 1: Direct location replacement...')
          console.log('🔗 [DEEP LINK DEBUG] Attempting location.replace with:', deepLinkUrl);
          window.location.replace(deepLinkUrl)
          
        } catch (error) {
          logger.debug('🔗 Method 1 (location.replace) failed:', error)
          
          try {
            // Method 2: Create invisible iframe as fallback
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
            iframe.style.width = '0'
            iframe.style.height = '0'
          iframe.src = deepLinkUrl
          document.body.appendChild(iframe)
            logger.debug('🔗 Method 2: Iframe deep link triggered')
          
          // Remove iframe after short delay
          setTimeout(() => {
              if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
              }
            }, 500)
          
          } catch (iframeError) {
            logger.debug('🔗 Method 2 (iframe) failed:', iframeError)
        
        try {
              // Method 3: Use window.open with immediate close as last resort
              const deepLinkWindow = window.open(deepLinkUrl, '_self')
              logger.debug('🔗 Method 3: Window.open deep link triggered')
            } catch (openError) {
              logger.debug('🔗 Method 3 (window.open) failed:', openError)
            }
          }
        }
        
        // Instead of showing dialog, redirect to activity page immediately
        logger.debug('🌐 Electron auth successful, redirecting to activity page...')
        
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
     
        logger.debug('📡 Auth info sent to electron successfully')
        
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
      logger.debug('🔍 [Manual Detection] Mode is unclear, checking for Electron indicators...')
      
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
      logger.debug('🔍 [Manual Detection] Electron indicators:', {
        noReferrer: !document.referrer,
        noOpener: window.opener === null,
        freshWindow: window.history.length === 1,
        score: electronScore
      })
      
      // If 2 or more indicators suggest Electron, auto-set mode
      if (electronScore >= 2) {
        logger.debug('🔗 [Manual Detection] Strong Electron indicators detected! Setting Electron mode...')
        
        try {
          sessionStorage.setItem('leviousa_auth_mode', 'electron')
          localStorage.setItem('leviousa_auth_mode', 'electron')
          document.cookie = 'leviousa_platform=electron; path=/; max-age=300; SameSite=Strict; Secure'
          
          logger.debug('🔗 [Manual Detection] Electron mode set, will generate deep link...')
          
          // Recursively call handleAuthSuccess with electron mode now set
          setTimeout(() => {
            logger.debug('🔗 [Manual Detection] Retrying handleAuthSuccess with Electron mode set')
            handleAuthSuccess(user)
          }, 100)
          
        } catch (error) {
          console.error('🔗 [Manual Detection] Error setting electron mode:', error)
        }
      } else {
        // For web mode, don't manipulate URL - let the useEffect handle redirect cleanly
        logger.debug('🌐 Web mode - auth complete, AuthProvider will handle redirect')
        
        // Store overlay params for potential future use but don't add to URL 
        if (Object.keys(overlayParams).length > 0) {
          logger.debug('🔗 Overlay parameters preserved for future use:', overlayParams)
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
      
      logger.debug('🔍 [handleGoogleSignIn] Mode detection debug:')
      logger.debug('🔍 Current URL:', window.location.href)
      logger.debug('🔍 URL mode:', urlMode)
      logger.debug('🔍 Hash mode:', hashParams.get('mode'))
      logger.debug('🔍 Cookie mode:', cookieMode)
      logger.debug('🔍 Session mode:', sessionMode)
      logger.debug('🔍 Local mode:', localMode)
      logger.debug('🔍 User-Agent:', userAgent)
      logger.debug('🔍 User-Agent mode:', userAgentMode)
      logger.debug('🔍 Final mode:', mode)
      logger.debug('🔍 isElectronMode:', isElectronMode)
      logger.debug('🔍 hostname:', window.location.hostname)
      
      // Use redirect for Electron/localhost to avoid HTTPS popup issues
      if (isElectronMode || window.location.hostname === 'localhost') {
        logger.debug('🔄 Using redirect method for localhost/electron')
        await signInWithRedirect(auth, provider)
        // Redirect will happen automatically, no need to handle result here
      } else {
        // Use popup for production
        logger.debug('🔄 Using popup method for production')
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
    logger.debug('🔍 [LoginContent Display] Mode detection debug:')
    logger.debug('🔍 Current URL:', window.location.href)
    logger.debug('🔍 URL mode:', urlDisplayMode)
    logger.debug('🔍 Hash mode:', hashParams?.get('mode'))
    const cookieMode = document.cookie.includes('leviousa_platform=electron') ? 'electron' : null
    const sessionMode = sessionStorage.getItem('leviousa_auth_mode')
    const localMode = localStorage.getItem('leviousa_auth_mode')
    logger.debug('🔍 Cookie mode:', cookieMode)
    logger.debug('🔍 Session mode:', sessionMode)
    logger.debug('🔍 Local mode:', localMode)
    const userAgent = navigator.userAgent
    const userAgentMode = userAgent.includes('Electron') ? 'electron' : null
    logger.debug('🔍 User-Agent:', userAgent)
    logger.debug('🔍 User-Agent mode:', userAgentMode)
    logger.debug('🔍 Final display mode:', displayMode)
    logger.debug('🔍 isElectronMode for display:', isElectronMode)
  }

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