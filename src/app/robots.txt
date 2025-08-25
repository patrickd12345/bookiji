import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com';
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: '/api/' },
      { userAgent: '*', disallow: '/admin' },
      { userAgent: '*', disallow: '/vendor/dashboard' },
      { userAgent: '*', disallow: '/vendor/calendar' },
      { userAgent: '*', disallow: '/vendor/onboarding' },
      { userAgent: '*', disallow: '/pay' },
      { userAgent: '*', disallow: '/confirm' },
      { userAgent: '*', disallow: '/auth/callback' },
      { userAgent: '*', disallow: '/verify-email' },
      { userAgent: '*', disallow: '/forgot-password' },
    ],
    sitemap: [`${base.replace(/\/$/, '')}/sitemap.xml`],
  };
} 