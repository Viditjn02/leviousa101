'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/utils/firebase'
import FreeTrialPopup from './FreeTrialPopup'

interface ReferralDetectorProps {
  children: React.ReactNode
}

export default function ReferralDetector({ children }: ReferralDetectorProps) {
  const [user] = useAuthState(auth)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showTrialPopup, setShowTrialPopup] = useState(false)
  const [referralData, setReferralData] = useState<{
    type: 'special' | 'normal'
    referrerEmail?: string
  } | null>(null)

  useEffect(() => {
    // Check for referral code in URL
    const referralCode = searchParams?.get('ref')
    
    if (referralCode && user) {
      handleReferralSignup(referralCode)
    }
  }, [user, searchParams])

  const handleReferralSignup = async (referralCode: string) => {
    try {
      // Process referral signup
      const response = await fetch('/api/referrals/process-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ 
          referralCode,
          userEmail: user?.email 
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Set referral data and show appropriate popup
        setReferralData({
          type: data.referralType,
          referrerEmail: data.referrerEmail
        })
        setShowTrialPopup(true)

        // Clean up URL
        const url = new URL(window.location.href)
        url.searchParams.delete('ref')
        router.replace(url.pathname + url.search)
      }
    } catch (error) {
      console.error('Error processing referral:', error)
    }
  }

  return (
    <>
      {children}
      
      {referralData && (
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

