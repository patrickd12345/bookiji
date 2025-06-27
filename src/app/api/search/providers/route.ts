import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface SearchFilters {
  query?: string
  location?: string
  latitude?: number
  longitude?: number
  radius?: number // in miles
  service_category?: string
  min_rating?: number
  max_price?: number
  availability_date?: string
  availability_time?: string
  sort_by?: 'distance' | 'rating' | 'price' | 'availability' | 'popularity'
  limit?: number
  offset?: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters: SearchFilters = {
      query: searchParams.get('query') || undefined,
      location: searchParams.get('location') || undefined,
      latitude: searchParams.get('latitude') ? parseFloat(searchParams.get('latitude')!) : undefined,
      longitude: searchParams.get('longitude') ? parseFloat(searchParams.get('longitude')!) : undefined,
      radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : 10,
      service_category: searchParams.get('service_category') || undefined,
      min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
      max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
      availability_date: searchParams.get('availability_date') || undefined,
      availability_time: searchParams.get('availability_time') || undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'rating',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    // Build the search query
    let searchResults = await performAdvancedSearch(filters)

    // Track search analytics
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'search_performed',
        session_id: 'server-side',
        page_url: '/api/search/providers',
        properties: {
          query: filters.query,
          location: filters.location,
          service_category: filters.service_category,
          results_count: searchResults.providers.length,
          has_geo_location: !!(filters.latitude && filters.longitude)
        }
      })
    })

    return NextResponse.json({
      success: true,
      ...searchResults,
      filters_applied: filters
    })

  } catch (error) {
    console.error('Provider search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

async function performAdvancedSearch(filters: SearchFilters) {
  let query = supabase
    .from('profiles')
    .select(`
      *,
      services:services(
        id,
        name,
        description,
        category,
        price,
        duration,
        available
      ),
      provider_locations:provider_locations(
        id,
        name,
        address,
        latitude,
        longitude,
        is_primary
      ),
      reviews:reviews(
        rating,
        review_text,
        created_at
      )
    `)
    .eq('user_type', 'provider')
    .eq('is_active', true)

  // Text search on name, business_name, and service descriptions
  if (filters.query) {
    // Use full-text search if available, otherwise use ilike
    query = query.or(`
      name.ilike.%${filters.query}%,
      business_name.ilike.%${filters.query}%,
      bio.ilike.%${filters.query}%,
      services.name.ilike.%${filters.query}%,
      services.description.ilike.%${filters.query}%
    `)
  }

  // Service category filter
  if (filters.service_category) {
    query = query.eq('services.category', filters.service_category)
  }

  // Rating filter
  if (filters.min_rating) {
    query = query.gte('average_rating', filters.min_rating)
  }

  // Execute the base query
  const { data: providers, error } = await query
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1)

  if (error) {
    console.error('Search query error:', error)
    throw new Error('Database query failed')
  }

  if (!providers) {
    return { providers: [], total: 0, pagination: {} }
  }

  // Apply geo-location filtering and distance calculation
  let filteredProviders = providers
  if (filters.latitude && filters.longitude) {
    filteredProviders = providers.map(provider => {
      // Calculate distance to each provider location
      const distances = provider.provider_locations?.map((location: any) => {
        if (location.latitude && location.longitude) {
          return calculateDistance(
            filters.latitude!,
            filters.longitude!,
            location.latitude,
            location.longitude
          )
        }
        return Infinity
      }) || [Infinity]

      const minDistance = Math.min(...distances)
      return {
        ...provider,
        distance: minDistance,
        within_radius: minDistance <= (filters.radius || 10)
      }
    }).filter(provider => provider.within_radius)
  }

  // Apply price filtering
  if (filters.max_price) {
    filteredProviders = filteredProviders.filter(provider => {
      const hasAffordableService = provider.services?.some((service: any) => 
        service.price <= filters.max_price!
      )
      return hasAffordableService
    })
  }

  // Apply availability filtering
  if (filters.availability_date) {
    filteredProviders = await filterByAvailability(
      filteredProviders,
      filters.availability_date,
      filters.availability_time
    )
  }

  // Apply sorting
  filteredProviders = sortProviders(filteredProviders, filters.sort_by || 'rating')

  // Calculate total for pagination
  const total = filteredProviders.length

  // Apply pagination after filtering
  const startIndex = filters.offset || 0
  const endIndex = startIndex + (filters.limit || 20)
  const paginatedProviders = filteredProviders.slice(startIndex, endIndex)

  return {
    providers: paginatedProviders,
    total,
    pagination: {
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      has_more: endIndex < total
    }
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

async function filterByAvailability(
  providers: any[],
  date: string,
  time?: string
): Promise<any[]> {
  const availableProviders = []

  for (const provider of providers) {
    // Check if provider has availability on the requested date
    const { data: slots } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('date', date)
      .eq('is_available', true)

    if (slots && slots.length > 0) {
      // If specific time requested, check if that time slot is available
      if (time) {
        const timeSlotAvailable = slots.some(slot => 
          slot.start_time <= time && slot.end_time > time
        )
        if (timeSlotAvailable) {
          availableProviders.push({
            ...provider,
            available_slots: slots
          })
        }
      } else {
        // If no specific time, include provider if they have any availability
        availableProviders.push({
          ...provider,
          available_slots: slots
        })
      }
    }
  }

  return availableProviders
}

function sortProviders(providers: any[], sortBy: string): any[] {
  switch (sortBy) {
    case 'distance':
      return providers.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    
    case 'rating':
      return providers.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    
    case 'price':
      return providers.sort((a, b) => {
        const aMinPrice = Math.min(...(a.services?.map((s: any) => s.price) || [Infinity]))
        const bMinPrice = Math.min(...(b.services?.map((s: any) => s.price) || [Infinity]))
        return aMinPrice - bMinPrice
      })
    
    case 'popularity':
      return providers.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0))
    
    case 'availability':
      return providers.sort((a, b) => {
        const aSlots = a.available_slots?.length || 0
        const bSlots = b.available_slots?.length || 0
        return bSlots - aSlots
      })
    
    default:
      return providers
  }
}

// POST endpoint for AI-powered search suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, location, user_preferences } = body

    // Generate AI-powered search suggestions
    const suggestions = await generateSearchSuggestions(query, location, user_preferences)

    return NextResponse.json({
      success: true,
      suggestions
    })

  } catch (error) {
    console.error('AI search suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

async function generateSearchSuggestions(
  query: string,
  location?: string,
  userPreferences?: any
): Promise<string[]> {
  // Get popular searches
  const { data: popularSearches } = await supabase
    .from('search_analytics')
    .select('search_query')
    .ilike('search_query', `%${query}%`)
    .limit(5)

  // Get service categories that match
  const { data: services } = await supabase
    .from('services')
    .select('name, category')
    .or(`name.ilike.%${query}%, category.ilike.%${query}%`)
    .limit(10)

  const suggestions = [
    // Popular searches
    ...(popularSearches?.map(s => s.search_query) || []),
    
    // Service names and categories
    ...(services?.map(s => s.name) || []),
    ...(services?.map(s => s.category) || []),
    
    // Location-based suggestions
    ...(location ? [
      `${query} near ${location}`,
      `${query} in ${location}`,
      `best ${query} ${location}`
    ] : []),
    
    // Common service combinations
    `${query} consultation`,
    `${query} appointment`,
    `${query} booking`,
    `affordable ${query}`,
    `premium ${query}`
  ]

  // Remove duplicates and return top 10
  return [...new Set(suggestions)]
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10)
} 