import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Evita que o bundler tente internalizar drivers nativos de postgres.
  // Necessário no Vercel para pg e @neondatabase/serverless funcionarem corretamente.
  serverExternalPackages: ['pg', 'pg-native', '@neondatabase/serverless'],
}

export default nextConfig
