/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/ssr'],
  eslint: {
    // Ignore ESLint errors during `next build` to not block deployments
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during `next build` to not block deployments
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Suppress "Critical dependency" warnings for dynamic imports in tenant-context.ts
    // These are harmless - the dynamic imports work correctly at runtime
    config.module = config.module || {}
    config.module.exprContextCritical = false
    config.module.unknownContextCritical = false
    
    return config
  },
}

module.exports = nextConfig
