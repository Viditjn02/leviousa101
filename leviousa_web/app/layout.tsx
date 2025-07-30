import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/utils/auth'
import '@/utils/urlParams'  // Initialize URL parameter preservation
import ParagonConnect from '@/components/ParagonConnect'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'leviousa - AI Assistant',
  description: 'Personalized AI Assistant for various contexts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ParagonConnect />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 