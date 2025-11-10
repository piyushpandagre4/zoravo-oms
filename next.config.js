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
}

module.exports = nextConfig
