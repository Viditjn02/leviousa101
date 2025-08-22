'use client'

import { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/utils/firebase'

interface FreeTrialPopupProps {
  isOpen: boolean
  onClose: () => void
  referralType: 'special' | 'normal'
  referrerEmail?: string
}

export default function FreeTrialPopup({ isOpen, onClose, referralType, referrerEmail }: FreeTrialPopupProps) {
  const [user] = useAuthState(auth)
  const [isStartingTrial, setIsStartingTrial] = useState(false)

  if (!isOpen) return null

  const handleStartFreeTrial = async () => {
    if (!user) return
    
    setIsStartingTrial(true)
    try {
      // Create Stripe checkout session for free trial
      const response = await fetch('/api/subscription/free-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          referralType,
          successUrl: `${window.location.origin}/settings/billing?trial=success`,
          cancelUrl: `${window.location.origin}/settings/billing?trial=canceled`
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to start free trial')
      }
    } catch (error) {
      console.error('Error starting free trial:', error)
      alert('Failed to start free trial')
    } finally {
      setIsStartingTrial(false)
    }
  }

  const handleSkipTrial = () => {
    // For special referrals, they still get some basic bonus
    onClose()
    // TODO: Apply basic referral bonus instead of trial
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {referralType === 'special' ? 'Congratulations!' : 'Welcome!'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {referralType === 'special' 
                ? `You've been referred by ${referrerEmail} and qualified for a special 3-day free trial of Leviousa Pro!`
                : 'You\'ve been referred and earned bonus usage time!'
              }
            </p>
          </div>

          {referralType === 'special' ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Your 3-Day Free Trial Includes:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>✅ Unlimited cmd+L usage</li>
                  <li>✅ Unlimited browser features</li>
                  <li>✅ Access to all AI models</li>
                  <li>✅ All Pro features</li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  We'll collect your payment details but won't charge you during the trial. 
                  After 3 days, your subscription will continue at $18/month.
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleStartFreeTrial}
                  disabled={isStartingTrial}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isStartingTrial ? 'Starting Trial...' : 'Start Your Free Trial'}
                </button>
                
                <button
                  onClick={handleSkipTrial}
                  className="w-full text-gray-600 dark:text-gray-400 py-2 px-6 rounded-lg font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Referral Bonus Applied!</h3>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>✅ +30 minutes daily cmd+L usage</li>
                  <li>✅ +30 minutes daily browser features</li>
                  <li>✅ Resets every 24 hours</li>
                </ul>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            You can manage your subscription anytime in Settings → Billing
          </p>
        </div>
      </div>
    </div>
  )
}
