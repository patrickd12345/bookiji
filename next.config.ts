/** @type {import('next').NextConfig} */
const isProd = process.env.VERCEL_ENV === 'production';

// Get Supabase URL from environment or use wildcard for *.supabase.co
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const supabaseDomain = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0];

// Allow localhost connections for local development and E2E testing
const isLocalOrE2E = process.env.NODE_ENV === 'development' || 
                     process.env.E2E === 'true' || 
                     process.env.NEXT_PUBLIC_E2E === 'true' ||
                     supabaseUrl.includes('localhost') ||
                     supabaseUrl.includes('127.0.0.1');

const connectSrc = isLocalOrE2E
  ? `connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://${supabaseDomain} https://*.supabase.co https://api.stripe.com; `
  : `connect-src 'self' ws: wss: https://${supabaseDomain} https://*.supabase.co https://api.stripe.com; `;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      connectSrc +
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

  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // Improve file watching for hot reload on Windows (apply to both client and server)
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding once the first file changed
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          '**/test-results/**',
          '**/playwright-report/**',
        ],
      };
    }
    return config;
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
