import posthog from 'posthog-js'
import logger from './productionLogger'

export const initPostHog = () => {
  if (typeof window !== 'undefined' && !posthog.__loaded) {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    
    if (!posthogKey) {
      logger.debug('PostHog key not found - skipping analytics initialization')
      return
    }
    
    logger.debug('Initializing PostHog with key:', posthogKey.substring(0, 10) + '...')
    posthog.init(posthogKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      autocapture: true,
      capture_pageview: false, // We handle this manually for better control
      disable_session_recording: false,
      session_recording: {
        maskTextClass: 'ph-mask',
        maskTextSelector: undefined,
        recordCrossOriginIframes: false,
      },
      bootstrap: {
        distinctID: `anon_${Math.random().toString(36).substr(2, 9)}`,
      },
      persistence: 'localStorage+cookie',
      debug: process.env.NODE_ENV === 'development',
      loaded: (posthog) => {
        logger.debug('PostHog loaded successfully')
        if (process.env.NODE_ENV === 'development') {
          posthog.debug()
        }
      }
    })
  }
}

export { posthog }
export default posthog
