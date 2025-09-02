'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../utils/firebase';

export default function SetupPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing setup token.');
      setIsValidating(false);
      return;
    }
    
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch('/api/validate-setup-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setTokenData(result.data);
      } else {
        setError(result.error || 'Invalid or expired token.');
      }
    } catch (err) {
      setError('Failed to validate token. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !tokenData) {
      setError('Invalid setup session.');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Complete password setup
      const response = await fetch('/api/complete-password-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Sign in the user with the custom token
        await signInWithCustomToken(auth, result.customToken);
        
        // Redirect to main app
        router.push('/activity');
      } else {
        setError(result.error || 'Failed to set up password.');
      }
    } catch (err) {
      console.error('Password setup error:', err);
      setError('Failed to set up password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-pulse text-white text-xl mb-4">Validating setup link...</div>
          <div className="w-8 h-8 border-4 border-[#905151] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1e1e1e] rounded-2xl p-8 border border-[#333]">
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Setup Link</h1>
            <p className="text-[#bbb] mb-6">{error}</p>
            <a 
              href="/"
              className="inline-block bg-gradient-to-r from-[#905151] to-[#f2e9e9] text-black font-bold py-3 px-6 rounded-lg hover:transform hover:scale-105 transition-all"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-md w-full">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1e1e1e] rounded-2xl p-8 border border-[#333] shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🚀</div>
            <h1 className="text-2xl font-bold text-white mb-2">Complete Your Setup</h1>
            <p className="text-[#bbb]">
              Welcome back, <span className="text-[#f2e9e9] font-semibold">{tokenData?.name}</span>!<br />
              Set your password to access Leviousa.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#050505] border border-[#333] rounded-lg text-white placeholder-[#999] focus:outline-none focus:border-[#905151] focus:ring-1 focus:ring-[#905151] transition-colors"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#050505] border border-[#333] rounded-lg text-white placeholder-[#999] focus:outline-none focus:border-[#905151] focus:ring-1 focus:ring-[#905151] transition-colors"
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#905151] to-[#f2e9e9] text-black font-bold py-3 px-4 rounded-lg hover:transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  Setting up your account...
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#333] text-center">
            <p className="text-sm text-[#999]">
              Ready for the upgrade?<br />
              <span className="text-[#f2e9e9]">Zero interruptions. Pure magic.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
