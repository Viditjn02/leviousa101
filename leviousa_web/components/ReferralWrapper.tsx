import dynamic from 'next/dynamic'

// Dynamically import the ClientReferralDetector with no SSR
// This prevents useSearchParams from causing SSR issues
const ClientReferralDetector = dynamic(
  () => import('./ClientReferralDetector').then(mod => ({ default: mod.ClientReferralDetector })),
  { 
    ssr: false,
    loading: () => null
  }
)

export default function ReferralDetector({ children }: { children: React.ReactNode }) {
  return (
    <ClientReferralDetector>
      {children}
    </ClientReferralDetector>
  )
}
