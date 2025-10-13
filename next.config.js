/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirect root to analytics
  async redirects() {
    return [
      {
        source: '/',
        destination: '/analytics',
        permanent: false,
      },
    ]
  },

  images: {
    // Reduce the number of generated image sizes
    deviceSizes: [640, 768, 1024, 1280],
    imageSizes: [180, 200, 240, 320],

    // Cache images for longer to reduce regeneration
    minimumCacheTTL: 86400, // 24 hours

    // Optimize formats
    formats: ['image/webp', 'image/avif'],

    // Add domains if you're loading external images
    domains: [
      // Add your image domains here if needed
    ],

    // Disable image optimization to save quota
    unoptimized: true
  },

  // Performance optimizations
  experimental: {
    // Enable modern bundling
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
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

module.exports = nextConfig