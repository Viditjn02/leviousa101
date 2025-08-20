import { Suspense } from 'react'
import LoginPageContent from './LoginContent'

// Server Component that wraps the client component with proper error boundaries
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'radial-gradient(circle at center, rgba(144, 81, 81, 0.25), #000)'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{borderColor: '#905151'}}></div>
          <p style={{color: '#bbb'}}>Loading authentication...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
} 