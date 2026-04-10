const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Geen precaching — install event compleet onmiddellijk, SW activeert direct.
  // Push notificaties werken via worker/index.js (wordt door next-pwa samengevoegd).
  buildExcludes: [() => true],
  runtimeCaching: [],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
