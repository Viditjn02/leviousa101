import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/utils/auth'
import { PostHogProvider } from '@/components/PostHogProvider'
import '@/utils/urlParams'  // Initialize URL parameter preservation

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Leviousa – Your Invisible Upgrade',
  description: 'Automate the busywork. Keep the impact. Screen-aware AI that understands context, executes actions, and learns your workflow with 130+ integrations.',
  keywords: 'AI assistant, automation, invisible upgrade, productivity, integrations, screen-aware AI, workflow automation',
  robots: 'index, follow',
  openGraph: {
    title: 'Leviousa – Your Invisible Upgrade',
    description: 'Automate the busywork. Keep the impact. 130+ integrations, real-time answers.',
    type: 'website',
    url: 'https://www.leviousa.com',
    images: [
      {
        url: 'https://www.leviousa.com/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Leviousa - Your Invisible Upgrade',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leviousa – Your Invisible Upgrade',
    description: 'Automate the busywork. Keep the impact. 130+ integrations, real-time answers.',
    images: ['https://www.leviousa.com/og-image.svg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23905151'/%3E%3Cstop offset='1' stop-color='%23ffffff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M50 8C34 10 20 24 14 36c-3 6-4 12-4 12s6-1 12-4c12-6 26-20 28-36z' fill='url(%23g)'/%3E%3C/svg%3E" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#905151" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <PostHogProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
} 