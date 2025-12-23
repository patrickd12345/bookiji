import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com').replace(/\/$/, '');

  const now = new Date().toISOString();

  // Public pages - these should be indexed by search engines
  const publicPages: Array<{ path: string; priority: number; changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' }> = [
    // Homepage and core pages
    { path: '/', priority: 1.0, changeFrequency: 'daily' },
    { path: '/get-started', priority: 0.9, changeFrequency: 'daily' },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
    
    // Help and support
    { path: '/help', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/faq', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/help/tickets', priority: 0.7, changeFrequency: 'daily' },
    
    // Legal and compliance
    { path: '/privacy', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/compliance', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    
    // Authentication (public landing pages)
    { path: '/login', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/register', priority: 0.7, changeFrequency: 'monthly' },
    
    // Public features
    { path: '/requests', priority: 0.7, changeFrequency: 'daily' },
    { path: '/application', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/beta/signup', priority: 0.6, changeFrequency: 'weekly' },
    
    // Help articles (dynamic routes - add more as needed)
    { path: '/help/how-booking-works', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/the-1-commitment-fee', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/reschedule-cancel', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/refunds-no-shows', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/provider-onboarding', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/calendar-linking', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/privacy-radius', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/support-options', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/dispute-policy', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/help/languages-currency', priority: 0.7, changeFrequency: 'monthly' },
  ];

  return [
    ...publicPages.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  })),
    // RSS Feed
    {
      url: `${base}/rss.xml`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
  ];
}
