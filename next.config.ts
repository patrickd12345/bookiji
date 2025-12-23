/** @type {import('next').NextConfig} */
const isProd = process.env.VERCEL_ENV === 'production';

// Get Supabase URL from environment or use wildcard for *.supabase.co
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const supabaseDomain = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0];

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      `connect-src 'self' ws: wss: https://${supabaseDomain} https://*.supabase.co https://api.stripe.com; ` +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data:; " +
      "frame-src https://js.stripe.com;",
  },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig = {
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
    const finalHeaders = [...securityHeaders];

    if (!isProd) {
      finalHeaders.push({
        key: 'X-Robots-Tag',
        value: 'noindex, nofollow',
      });
    }

    return [
      {
        source: "/(.*)",
        headers: finalHeaders,
      },
    ];
  },
};

export default nextConfig;
