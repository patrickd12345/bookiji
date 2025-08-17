import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'https://bookiji.com'
  const baseUrl = raw.startsWith('http') ? raw : `https://${raw}`
  const now = new Date()
  
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/compliance`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/get-started`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ]

  try {
    // Get vendor profiles for dynamic sitemap entries
    const { url, secretKey } = getSupabaseConfig()
    const supabase = createClient(url, secretKey!, { auth: { persistSession: false } })
    
    const { data: vendors, error } = await supabase
      .from('profiles')
      .select('id, business_name, updated_at')
      .eq('role', 'vendor')
      .eq('is_active', true)
      .not('business_name', 'is', null)
    
    if (!error && vendors) {
      const vendorRoutes: MetadataRoute.Sitemap = vendors.map(vendor => ({
        url: `${baseUrl}/vendor/${vendor.id}`,
        lastModified: vendor.updated_at ? new Date(vendor.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
      
      // Get service types for additional SEO
      const { data: serviceTypes } = await supabase
        .from('service_types')
        .select('id, name, updated_at')
        .eq('is_active', true)
      
      if (serviceTypes) {
        const serviceRoutes: MetadataRoute.Sitemap = serviceTypes.map(service => ({
          url: `${baseUrl}/services/${service.id}`,
          lastModified: service.updated_at ? new Date(service.updated_at) : now,
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        }))
        
        return [...staticRoutes, ...vendorRoutes, ...serviceRoutes]
      }
      
      return [...staticRoutes, ...vendorRoutes]
    }
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error)
  }
  
  return staticRoutes
}
