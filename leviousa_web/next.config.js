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
  compiler: {
    // Remove console.* in production, but keep error and warn
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
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
              "default-src 'self' https: http: blob: data: 'unsafe-inline' 'unsafe-eval'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http: data: 'wasm-unsafe-eval' 'unsafe-hashes' https://*.useparagon.com https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com https://apis.google.com https://accounts.google.com https://www.googletagmanager.com https://www.gstatic.com https://app.posthog.com https://*.posthog.com https://*.googleapis.com https://*.gstatic.com https://ssl.gstatic.com https://*.googleusercontent.com",
              "connect-src 'self' https: http: ws: wss: blob: data:",
              "img-src 'self' data: blob: https: http:",
              "style-src 'self' 'unsafe-inline' https: http: data:",
              "font-src 'self' data: https: http:",
              "frame-src 'self' https: http: blob: data:",
              "worker-src 'self' blob: data:",
              "child-src 'self' https: http: blob: data:",
              "object-src 'self' blob: https: http: data:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 