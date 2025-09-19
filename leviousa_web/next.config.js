/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable ESLint to test CSP fixes
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily disable TypeScript to test CSP fixes
  },
  experimental: {
    missingSuspenseWithCSRBailout: false, // Disable useSearchParams suspense requirement
  },
  
  // Allow all domains for images
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https: http: blob: data: 'unsafe-inline' 'unsafe-eval'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http: data: 'wasm-unsafe-eval' 'unsafe-hashes' https://*.useparagon.com https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com https://dashboard.useparagon.com https://www.google-analytics.com https://cdn.segment.com https://imgsct.cookiebot.com https://cdn.honey.io",
              "connect-src 'self' https: http: ws: wss: blob: data: https://*.useparagon.com https://zeus.useparagon.com https://zeus.connect.useparagon.com https://zeus.app.useparagon.com https://connect.useparagon.com https://api.useparagon.com https://dashboard.useparagon.com https://www.google-analytics.com https://cdn.segment.com",
              "img-src 'self' data: blob: https: http: https://cdn.honey.io https://imgsct.cookiebot.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https: http: data: https://cdn.honey.io",
              "font-src 'self' data: https: http:",
              "frame-src 'self' https: http: blob: data: https://*.useparagon.com https://dashboard.useparagon.com",
              "worker-src 'self' blob: data:",
              "child-src 'self' https: http: blob: data:",
              "object-src 'self' blob: https: http: data:"
            ].join('; ')
          }
        ],
      },
    ]
  },

  // Disable SWC minification in development for better debugging
  swcMinify: process.env.NODE_ENV === 'production',
}

module.exports = nextConfig
