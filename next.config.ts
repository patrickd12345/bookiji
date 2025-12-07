import type { NextConfig } from 'next';

const isProd = process.env.VERCEL_ENV === 'production';

// Inline security headers to avoid import issues
const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: https://lzgynywojluwdccqkeop.supabase.co https://api.stripe.com; img-src 'self' data: blob: https:; font-src 'self' data:; frame-src 'self' https://js.stripe.com;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

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

