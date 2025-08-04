/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Conditionally enable export mode only for production build
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com https://apis.google.com https://accounts.google.com https://leviousa-101.firebaseapp.com https://www.googletagmanager.com https://*.useparagon.com blob: data: 'unsafe-hashes' https://*.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://connect.useparagon.com https://cdn.honey.io https://leviousa-101.firebaseapp.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com https://apis.google.com https://accounts.google.com https://leviousa-101.firebaseapp.com http://localhost:9001 ws://localhost:*",
              "frame-src 'self' https://connect.useparagon.com https://accounts.google.com https://leviousa-101.firebaseapp.com",
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