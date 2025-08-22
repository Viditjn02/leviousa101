'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/utils/posthog'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPostHogReady, setIsPostHogReady] = useState(false)

  useEffect(() => {
    // Initialize PostHog and wait for it to be ready
    initPostHog()
    
    // Wait for PostHog to be fully loaded
    const checkPostHogReady = () => {
      if (posthog.__loaded) {
        console.log('PostHog is ready!')
        setIsPostHogReady(true)
        
        // Track initial page load
        posthog.capture('posthog_initialized', {
          initial_page: pathname,
          timestamp: Date.now(),
          user_agent: navigator.userAgent
        })
        
        return true
      }
      return false
    }
    
    // Check immediately
    if (!checkPostHogReady()) {
      // If not ready, keep checking
      const interval = setInterval(() => {
        if (checkPostHogReady()) {
          clearInterval(interval)
        }
      }, 100)
      
      // Cleanup interval after 10 seconds max
      setTimeout(() => clearInterval(interval), 10000)
    }
    
    // === COMPREHENSIVE EVENT TRACKING SETUP ===
    // Only set up event listeners if PostHog is ready
    const setupEventListeners = () => {
      if (!posthog.__loaded) return
      
      // Track visibility changes
      const handleVisibilityChange = () => {
        posthog.capture('page_visibility_change', {
          visible: !document.hidden,
          timestamp: Date.now()
        })
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Track focus/blur events
    const handleFocus = () => posthog.capture('page_focus')
    const handleBlur = () => posthog.capture('page_blur')
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    // Track scroll depth
    let maxScrollDepth = 0
    const trackScrollDepth = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      )
      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent
        // Track scroll milestones
        if ([25, 50, 75, 90, 100].includes(scrollPercent)) {
          posthog.capture('scroll_depth', {
            depth_percent: scrollPercent,
            page: pathname
          })
        }
      }
    }
    const scrollHandler = () => requestAnimationFrame(trackScrollDepth)
    window.addEventListener('scroll', scrollHandler, { passive: true })
    
    // Track time on page
    const startTime = Date.now()
    const trackTimeOnPage = () => {
      const timeSpent = Date.now() - startTime
      posthog.capture('time_on_page', {
        duration_ms: timeSpent,
        duration_seconds: Math.round(timeSpent / 1000),
        page: pathname
      })
    }
    window.addEventListener('beforeunload', trackTimeOnPage)
    
    // Track mouse movements (sampled)
    let mouseMoveCount = 0
    const trackMouseActivity = () => {
      mouseMoveCount++
      if (mouseMoveCount % 100 === 0) { // Sample every 100th movement
        posthog.capture('mouse_activity', {
          move_count: mouseMoveCount,
          page: pathname
        })
      }
    }
    document.addEventListener('mousemove', trackMouseActivity, { passive: true })
    
    // Track keyboard activity
    let keyPressCount = 0
    const trackKeyboardActivity = (event: KeyboardEvent) => {
      keyPressCount++
      if (keyPressCount % 50 === 0) { // Sample every 50th keypress
        posthog.capture('keyboard_activity', {
          key_count: keyPressCount,
          page: pathname,
          has_modifier: event.ctrlKey || event.altKey || event.shiftKey || event.metaKey
        })
      }
    }
    document.addEventListener('keydown', trackKeyboardActivity)
    
    // Track network status
    const trackNetworkStatus = () => {
      posthog.capture('network_status_change', {
        online: navigator.onLine,
        connection_type: (navigator as any).connection?.effectiveType || 'unknown',
        download_speed: (navigator as any).connection?.downlink || 'unknown'
      })
    }
    window.addEventListener('online', trackNetworkStatus)
    window.addEventListener('offline', trackNetworkStatus)
    
    // Track device orientation changes
    const trackOrientationChange = () => {
      posthog.capture('orientation_change', {
        orientation: screen.orientation?.angle || 'unknown',
        type: screen.orientation?.type || 'unknown'
      })
    }
    window.addEventListener('orientationchange', trackOrientationChange)
    
    // Track errors and exceptions
    const trackError = (event: ErrorEvent) => {
      posthog.capture('javascript_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        page: pathname
      })
    }
    window.addEventListener('error', trackError)
    
    // Track unhandled promise rejections
    const trackUnhandledRejection = (event: PromiseRejectionEvent) => {
      posthog.capture('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        page: pathname
      })
    }
      window.addEventListener('unhandledrejection', trackUnhandledRejection)
      
      // Store cleanup function
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
        window.removeEventListener('blur', handleBlur)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('beforeunload', trackTimeOnPage)
        document.removeEventListener('mousemove', trackMouseActivity)
        document.removeEventListener('keydown', trackKeyboardActivity)
        window.removeEventListener('online', trackNetworkStatus)
        window.removeEventListener('offline', trackNetworkStatus)
        window.removeEventListener('orientationchange', trackOrientationChange)
        window.removeEventListener('error', trackError)
        window.removeEventListener('unhandledrejection', trackUnhandledRejection)
      }
    }
    
    // Set up event listeners after PostHog is ready
    let cleanup: (() => void) | undefined
    if (isPostHogReady) {
      cleanup = setupEventListeners()
    }
    
    return cleanup
  }, [])

  useEffect(() => {
    // Enhanced page view tracking - only when PostHog is ready
    if (pathname && isPostHogReady) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      
      console.log('Tracking page view:', url)
      posthog.capture('$pageview', {
        $current_url: url,
        page_title: document.title,
        referrer: document.referrer,
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        screen_width: screen.width,
        screen_height: screen.height,
        color_depth: screen.colorDepth,
        pixel_ratio: window.devicePixelRatio,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        connection_type: (navigator as any).connection?.effectiveType || 'unknown'
      })
    }
  }, [pathname, searchParams, isPostHogReady])

  return <>{children}</>
}
