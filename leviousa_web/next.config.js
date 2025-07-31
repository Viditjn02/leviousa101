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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.useparagon.com https://apis.google.com https://accounts.google.com blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://connect.useparagon.com https://cdn.honey.io",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://connect.useparagon.com https://zeus.useparagon.com https://api.useparagon.com https://apis.google.com https://accounts.google.com http://localhost:9001 ws://localhost:*",
              "frame-src 'self' https://connect.useparagon.com https://accounts.google.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 