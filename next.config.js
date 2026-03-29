const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

/** @type {import('next').NextConfig} */
module.exports = (phase) => {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER

  return {
  // Redirect root to analytics v2
  async redirects() {
    return [
      {
        source: '/',
        destination: '/analytics/v2',
        permanent: false,
      },
    ]
  },

  // Prevent dev/build race conditions by isolating output directories.
  // Dev writes to .next-dev; production build keeps .next.
  distDir: isDevServer ? '.next-dev' : '.next',

  images: {
    // Reduce the number of generated image sizes
    deviceSizes: [640, 768, 1024, 1280],
    imageSizes: [180, 200, 240, 320],

    // Cache images for longer to reduce regeneration
    minimumCacheTTL: 604800, // 7 days for better CDN caching

    // Optimize formats
    formats: ['image/webp'],

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'htface-kr-1305865668.file.myqcloud.com',
        port: '',
        pathname: '/img/face/**',
      },
    ],

    // Re-enable image optimization with conservative settings
    // to leverage Vercel's CDN caching for remote images
    unoptimized: false,
  },

  // Performance optimizations
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Optimize bundle
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Enable gzip compression
      config.optimization.minimize = true
    }
    return config
  },

  // Enable compression
  compress: true,

  // Removed optimizeCss to fix build error
}
}