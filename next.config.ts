import type { NextConfig } from 'next';
import { securityHeaders } from './src/middleware/security';

const isProd = process.env.VERCEL_ENV === 'production';

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
  async headers() {
    const headers = [];
    
    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      headers.push({ key, value });
    });
    
    // Add non-prod noindex header
    if (!isProd) {
      headers.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
    }
    
    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
