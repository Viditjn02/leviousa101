/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_PARAGON_PROJECT_ID: process.env.PARAGON_PROJECT_ID,
  },
}

module.exports = nextConfig 