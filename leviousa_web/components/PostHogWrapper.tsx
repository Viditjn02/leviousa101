import dynamic from 'next/dynamic'

// Dynamically import the ClientPostHogProvider with no SSR
// This prevents useSearchParams from causing SSR issues
const ClientPostHogProvider = dynamic(
  () => import('./ClientPostHogProvider').then(mod => ({ default: mod.ClientPostHogProvider })),
  { 
    ssr: false,
    loading: () => null
  }
)

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClientPostHogProvider>
      {children}
    </ClientPostHogProvider>
  )
}
