import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com'
  const currentDate = new Date()

  const staticRoutes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/blog', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/terms', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/help', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/register', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/login', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/vendor/onboarding', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/get-started', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/choose-role', priority: 0.7, changeFrequency: 'monthly' as const },
  ]

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
