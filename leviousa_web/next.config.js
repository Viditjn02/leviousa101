/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  // Disable static export for Vercel (Vercel handles dynamic Next.js apps)
  // ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  
  // Skip problematic pages during build for OAuth verification
  async generateBuildId() {
    return 'oauth-verification-build'
  },
  
  // Configure pages that should be dynamically rendered
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_PARAGON_PROJECT_ID: process.env.PARAGON_PROJECT_ID,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com https://apis.google.com https://accounts.google.com https://www.leviousa.com https://www.googletagmanager.com https://*.useparagon.com https://www.gstatic.com https://app.posthog.com https://*.posthog.com https://*.googleapis.com https://*.gstatic.com https://ssl.gstatic.com https://*.googleusercontent.com blob: data: 'unsafe-hashes'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://connect.useparagon.com https://cdn.honey.io https://www.leviousa.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com https://apis.google.com https://accounts.google.com https://www.leviousa.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://leviousa-101.firebaseapp.com https://www.google.com https://www.gstatic.com https://firestore.googleapis.com https://*.googleapis.com https://app.posthog.com https://*.posthog.com http://localhost:9001 ws://localhost:*",
              "frame-src 'self' https://connect.useparagon.com https://accounts.google.com https://www.leviousa.com https://leviousa-101.firebaseapp.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "object-src 'self' blob: https://connect.useparagon.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 