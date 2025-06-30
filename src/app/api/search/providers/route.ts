import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface Provider {
  id: string
  name: string
  location: {
    lat: number
    lng: number
  }
  services: Service[]
  availability: AvailabilitySlot[]
  rating?: number
  total_bookings?: number
  provider_locations?: Array<{
    id: string
    name: string
    address: string
    latitude: number
    longitude: number
    is_primary: boolean
  }>
}

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface AvailabilitySlot {
  id: string
  start_time: string
  end_time: string
  is_booked: boolean
}

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

interface ProviderWithDistance extends Provider {
  distance?: number
  within_radius?: boolean
}

interface UserPreferences {
  preferred_categories?: string[]
  preferred_price_range?: {
    min: number
    max: number
  }
  preferred_locations?: string[]
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
    filteredProviders = providers.map((provider: Provider) => {
      // Calculate distance to each provider location
      const distances = provider.provider_locations?.map((location: { latitude: number; longitude: number }) => {
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
    }).filter((provider: ProviderWithDistance) => provider.within_radius)
  }

  // Apply price filtering
  if (filters.max_price) {
    filteredProviders = filteredProviders.filter((provider: Provider) => {
      const hasAffordableService = provider.services?.some((service: Service) => 
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
  providers: Provider[],
  date: string,
  time?: string
): Promise<Provider[]> {
  const availableProviders: Provider[] = []

  for (const provider of providers) {
    // Get provider's availability for the date
    const { data: slots } = await supabase
      .from('availability')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('date', date)
      .eq('is_booked', false)

    if (slots && slots.length > 0) {
      // If time is specified, check for specific time slot
      if (time) {
        const hasTimeSlot = slots.some((slot: AvailabilitySlot) => {
          const slotStart = new Date(`${date}T${slot.start_time}`)
          const slotEnd = new Date(`${date}T${slot.end_time}`)
          const requestedTime = new Date(`${date}T${time}`)
          return slotStart <= requestedTime && requestedTime < slotEnd
        })
        if (hasTimeSlot) {
          availableProviders.push(provider)
        }
      } else {
        // If no time specified, provider is available if they have any slots
        availableProviders.push(provider)
      }
    }
  }

  return availableProviders
}

function sortProviders(providers: ProviderWithDistance[], sortBy: 'distance' | 'rating' | 'price' | 'availability' | 'popularity'): ProviderWithDistance[] {
  switch (sortBy) {
    case 'distance':
      return providers.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
    case 'rating':
      return providers.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'price':
      return providers.sort((a, b) => {
        const aMinPrice = Math.min(...(a.services?.map(s => s.price) || [Infinity]))
        const bMinPrice = Math.min(...(b.services?.map(s => s.price) || [Infinity]))
        return aMinPrice - bMinPrice
      })
    case 'availability':
      return providers.sort((a, b) => (b.availability?.length || 0) - (a.availability?.length || 0))
    case 'popularity':
      return providers.sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0))
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
  userPreferences?: UserPreferences
): Promise<string[]> {
  // Get popular searches
  const { data: popularSearches } = await supabase
    .from('search_history')
    .select('query, count')
    .ilike('query', `%${query}%`)
    .order('count', { ascending: false })
    .limit(5)

  // Get matching service categories
  const { data: categories } = await supabase
    .from('service_categories')
    .select('name')
    .ilike('name', `%${query}%`)
    .limit(3)

  // Get matching provider names
  const { data: providers } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('user_type', 'provider')
    .ilike('business_name', `%${query}%`)
    .limit(3)

  // Combine and deduplicate suggestions
  const suggestions = new Set<string>()

  popularSearches?.forEach((search: { query: string }) => suggestions.add(search.query))
  categories?.forEach((category: { name: string }) => suggestions.add(category.name))
  providers?.forEach((provider: { business_name: string }) => suggestions.add(provider.business_name))

  // Add location-based suggestions if location provided
  if (location) {
    const { data: locationProviders } = await supabase
      .from('profiles')
      .select('business_name')
      .eq('user_type', 'provider')
      .ilike('service_area', `%${location}%`)
      .limit(2)

    locationProviders?.forEach((provider: { business_name: string }) => {
      suggestions.add(`${provider.business_name} in ${location}`)
    })
  }

  // Add personalized suggestions based on user preferences
  if (userPreferences?.preferred_categories) {
    userPreferences.preferred_categories.forEach(category => {
      if (category.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(category)
      }
    })
  }

  return Array.from(suggestions)
}

// Filter providers by availability
const filterProvidersByAvailability = (providers: Provider[], slot: AvailabilitySlot): Provider[] => {
  return providers.filter((provider: Provider) => {
    return provider.availability.some((availableSlot: AvailabilitySlot) => {
      const slotStart = new Date(availableSlot.start_time)
      const slotEnd = new Date(availableSlot.end_time)
      const requestedStart = new Date(slot.start_time)
      return !availableSlot.is_booked && slotStart <= requestedStart && requestedStart < slotEnd
    })
  })
} 