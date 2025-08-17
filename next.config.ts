import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizeCss: true,
  },
  // CSP is now handled by middleware.ts with nonce-based approach
  // Security headers are applied in middleware
};

export default nextConfig;
