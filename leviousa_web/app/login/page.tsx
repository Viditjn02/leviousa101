import { Suspense } from 'react'
import LoginPageContent from './LoginContent'

// Server Component that wraps the client component with proper error boundaries
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
} 