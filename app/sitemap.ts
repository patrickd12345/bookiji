import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com').replace(/\/$/, '');

  // TODO: expand with dynamic URLs (vendors/services) when DB is wired.
  // These paths must match seo/route-inventory.json required array
  const staticPaths = ['/', '/vendors', '/services', '/pricing', '/contact'];

  const now = new Date().toISOString();
  return staticPaths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: p === '/' ? 1 : 0.7,
  }));
}
