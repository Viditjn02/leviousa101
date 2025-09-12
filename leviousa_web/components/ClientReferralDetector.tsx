'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/utils/firebase'
import FreeTrialPopup from './FreeTrialPopup'

interface ClientReferralDetectorProps {
  children: React.ReactNode
}

export function ClientReferralDetector({ children }: ClientReferralDetectorProps) {
  const [user] = useAuthState(auth)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showTrialPopup, setShowTrialPopup] = useState(false)
  const [referralData, setReferralData] = useState<{
    type: 'special' | 'normal'
    referrerEmail?: string
    referredBy?: string
    hasFreeTrialBenefit?: boolean
  } | null>(null)

  useEffect(() => {
    const referralCode = searchParams?.get('ref') || searchParams?.get('referral')
    const referrerEmail = searchParams?.get('referrer_email')
    const specialCode = searchParams?.get('special')

    if (specialCode || referralCode || referrerEmail) {
      console.log('🔗 Referral detected:', { specialCode, referralCode, referrerEmail })

      // Determine referral type and data
      let type: 'special' | 'normal' = 'normal'
      let hasFreeTrialBenefit = false

      if (specialCode) {
        type = 'special'
        hasFreeTrialBenefit = true
      } else if (referralCode && (referralCode.includes('trial') || referralCode.includes('free'))) {
        hasFreeTrialBenefit = true
      }

      setReferralData({
        type,
        referrerEmail: referrerEmail || undefined,
        referredBy: referralCode || undefined,
        hasFreeTrialBenefit
      })

      // Store referral data in localStorage for persistence
      const referralInfo = {
        type,
        referrerEmail,
        referredBy: referralCode,
        hasFreeTrialBenefit,
        detectedAt: new Date().toISOString()
      }
      
      localStorage.setItem('pendingReferral', JSON.stringify(referralInfo))
      console.log('📦 Stored referral data:', referralInfo)

      // Show trial popup if there's a free trial benefit and user is not signed in
      if (hasFreeTrialBenefit && !user) {
        setShowTrialPopup(true)
      }

      // Clean URL by removing referral parameters
      const newParams = new URLSearchParams(searchParams?.toString() || '')
      newParams.delete('ref')
      newParams.delete('referral') 
      newParams.delete('referrer_email')
      newParams.delete('special')
      
      const newUrl = newParams.toString() 
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname
        
      router.replace(newUrl)
    }
  }, [searchParams, router, user])

  return (
    <>
      {children}
      {showTrialPopup && referralData && (
        <FreeTrialPopup
          isOpen={showTrialPopup}
          onClose={() => setShowTrialPopup(false)}
          referralType={referralData.type}
          referrerEmail={referralData.referrerEmail}
        />
      )}
    </>
  )
}
