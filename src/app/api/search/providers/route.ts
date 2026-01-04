import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, {
  get: (_target, prop) => (getServerSupabase() as any)[prop],
})

// Constants for dynamic radius logic (in kilometers)
const MIN_PROVIDERS_THRESHOLD = 3
const RADIUS_STEP = 2
const START_RADIUS = 3

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
  category?: string
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
  radius?: number // in miles (legacy)
  maxTravelDistance?: number // in kilometers
  service_category?: string
  specialty_ids?: string[] // New: filter by specific specialties
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
      latitude: searchParams.get('userLat')
        ? parseFloat(searchParams.get('userLat')!)
        : searchParams.get('latitude')
          ? parseFloat(searchParams.get('latitude')!)
          : undefined,
      longitude: searchParams.get('userLon')
        ? parseFloat(searchParams.get('userLon')!)
        : searchParams.get('longitude')
          ? parseFloat(searchParams.get('longitude')!)
          : undefined,
      radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : undefined,
      maxTravelDistance: searchParams.get('maxTravelDistance')
        ? parseFloat(searchParams.get('maxTravelDistance')!)
        : 20,
      service_category: searchParams.get('service_category') || searchParams.get('category') || undefined,
      specialty_ids: searchParams.get('specialty_ids')?.split(',').filter(Boolean) || undefined,
      min_rating: searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined,
      max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
      availability_date: searchParams.get('availability_date') || undefined,
      availability_time: searchParams.get('availability_time') || undefined,
      sort_by: (searchParams.get('sort_by') as 'distance' | 'rating' | 'price' | 'availability' | 'popularity') || 'rating',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    const bookingStatus = searchParams.get('bookingStatus') || undefined

    // Build the search query
    const searchResults = await performAdvancedSearch(filters)
    const finalProviders = applyPrivacy(searchResults.providers || [], bookingStatus)
    const matchFound = finalProviders.length >= MIN_PROVIDERS_THRESHOLD

    // Track search analytics (non-blocking, don't fail if analytics fails)
    try {
      const analyticsUrl = `${request.nextUrl.origin}/api/analytics/track`
      await fetch(analyticsUrl, {
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
            results_count: finalProviders.length,
            has_geo_location: !!(filters.latitude && filters.longitude)
          }
        })
      })
    } catch (analyticsError) {
      // Analytics is non-critical, log but don't fail the request
      console.warn('Analytics tracking failed:', analyticsError)
    }

    return NextResponse.json({
      success: true,
      matchFound,
      providers: finalProviders,
      total: finalProviders.length,
      radiusUsed: searchResults.radiusUsed,
      message: matchFound ? undefined : `No providers available within ${filters.maxTravelDistance || 20} km.`,
      suggestion: matchFound ? undefined : 'Try expanding your search or changing service type.',
      pagination: searchResults.pagination,
      filters_applied: filters
    })

  } catch (error) {
    console.error('[search/providers] unhandled error', error)
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
        duration_minutes,
        is_active
      ),
      provider_locations:provider_locations(
        id,
        address,
        city,
        latitude,
        longitude,
        is_primary
      )
    `)
    .eq('role', 'vendor')

  // Text search on full_name and bio
  // Note: Cannot search nested relations (services.name) in .or() clause
  if (filters.query) {
    const searchTerm = filters.query.replace(/'/g, "''") // Escape single quotes for SQL
    query = query.or(`full_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
  }

  // Note: Cannot filter nested relations (services.category, vendor_specialties.specialty_id) 
  // in Supabase query builder - will filter in post-processing

  // Execute the base query
  const { data: providers, error } = await query
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1)

  if (error) {
    console.error('[search/providers] supabase error', { step: 'main_profiles_query', error })
    throw new Error(`Database query failed: ${error.message || JSON.stringify(error)}`)
  }

  if (!providers || providers.length === 0) {
    return { providers: [], total: 0, radiusUsed: filters.maxTravelDistance || 20, pagination: { limit: filters.limit || 20, offset: filters.offset || 0, has_more: false } }
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
        distance: minDistance
      }
    })
  }

  // Apply price filtering
  if (filters.max_price) {
    filteredProviders = filteredProviders.filter((provider: Provider) => {
      if (!provider.services || provider.services.length === 0) return false
      const hasAffordableService = provider.services.some((service: Service) => 
        service.price && service.price <= filters.max_price!
      )
      return hasAffordableService
    })
  }

  // Apply service category filter (post-processing, can't filter nested relations in query)
  if (filters.service_category) {
    filteredProviders = filteredProviders.filter((provider: Provider) => {
      if (!provider.services || provider.services.length === 0) return false
      return provider.services.some((service: Service) => 
        service.category === filters.service_category
      )
    })
  }

  // Apply specialty filter (post-processing)
  // Note: vendor_specialties references app_users, not profiles directly, so we skip this filter
  // Specialty filtering would require a separate query joining through app_users
  if (filters.specialty_ids && filters.specialty_ids.length > 0) {
    // Filter disabled - vendor_specialties not directly accessible from profiles
    // Would need separate query: profiles -> app_users -> vendor_specialties
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

  // Dynamic radius expansion
  const { providers: radiusProviders, radiusUsed } = dynamicRadiusFilter(
    filteredProviders,
    filters.maxTravelDistance || 20
  )

  const total = radiusProviders.length

  const startIndex = filters.offset || 0
  const endIndex = startIndex + (filters.limit || 20)
  const paginatedProviders = radiusProviders.slice(startIndex, endIndex)

  return {
    providers: paginatedProviders,
    total,
    radiusUsed,
    pagination: {
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      has_more: endIndex < total
    }
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
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
  if (providers.length === 0) {
    return []
  }

  // Collect all provider IDs for batched query
  const providerIds = providers.map(p => p.id)

  // Single batched query for all providers
  // PERFORMANCE: This must remain a single query to avoid N+1 regression
  const { data: slots, error: availabilityError } = await supabase
    .from('availability_slots')
    .select('provider_id, start_time, end_time')
    .in('provider_id', providerIds)
    .gte('start_time', `${date}T00:00:00Z`)
    .lt('start_time', `${date}T23:59:59Z`)
    .eq('is_available', true)
  
  // Observability: Log batch query metrics (non-high-cardinality)
  console.log('[search/providers] availability_filter', {
    providerCount: providers.length,
    slotsFetched: slots?.length || 0,
    date
  })
  
  if (availabilityError) {
    console.error('[search/providers] supabase error', { step: 'availability_query', error: availabilityError })
    // Return all providers if batch query fails (preserve existing behavior)
    return providers
  }

  // Build Map of provider_id -> slots[]
  const slotsByProvider = new Map<string, Array<{ start_time: string; end_time: string }>>()
  if (slots) {
    for (const slot of slots) {
      const existing = slotsByProvider.get(slot.provider_id) || []
      existing.push({ start_time: slot.start_time, end_time: slot.end_time })
      slotsByProvider.set(slot.provider_id, existing)
    }
  }

  // Filter providers based on availability
  const availableProviders: Provider[] = []

  for (const provider of providers) {
    const providerSlots = slotsByProvider.get(provider.id) || []

    if (providerSlots.length > 0) {
      // If time is specified, check for specific time slot (in-memory)
      if (time) {
        const requestedTime = new Date(`${date}T${time}`)
        const hasTimeSlot = providerSlots.some((slot) => {
          const slotStart = new Date(slot.start_time)
          const slotEnd = new Date(slot.end_time)
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
  if (!providers || providers.length === 0) return providers
  switch (sortBy) {
    case 'distance':
      return [...providers].sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
    case 'rating':
      return [...providers].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'price':
      return [...providers].sort((a, b) => {
        const aPrices = a.services?.filter(s => s.price != null).map(s => s.price) || []
        const bPrices = b.services?.filter(s => s.price != null).map(s => s.price) || []
        const aMinPrice = aPrices.length > 0 ? Math.min(...aPrices) : Infinity
        const bMinPrice = bPrices.length > 0 ? Math.min(...bPrices) : Infinity
        return aMinPrice - bMinPrice
      })
    case 'availability':
      return [...providers].sort((a, b) => (b.availability?.length || 0) - (a.availability?.length || 0))
    case 'popularity':
      return [...providers].sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0))
    default:
      return providers
  }
}

function dynamicRadiusFilter(providers: ProviderWithDistance[], maxTravelDistance: number) {
  if (!providers || providers.length === 0) {
    return { providers: [], radiusUsed: maxTravelDistance }
  }
  let currentRadius = START_RADIUS
  while (currentRadius <= maxTravelDistance) {
    const within = providers.filter(p => (p.distance || Infinity) <= currentRadius)
    if (within.length >= MIN_PROVIDERS_THRESHOLD) {
      return { providers: within, radiusUsed: currentRadius }
    }
    currentRadius += RADIUS_STEP
  }
  return { providers: [], radiusUsed: maxTravelDistance }
}

function applyPrivacy(providers: ProviderWithDistance[], bookingStatus?: string) {
  if (!providers) return []
  if (bookingStatus === 'committed') return providers
  return providers.map(p => ({
    distance: p.distance,
    id: p.id
  }))
}

// POST endpoint for AI-powered search suggestions
export async function POST(request: NextRequest) {
  try {
    const { query, location, user_preferences } = await request.json();

    // Generate AI-powered search suggestions
    const suggestions = await generateSearchSuggestions(query, location, user_preferences)

    return NextResponse.json({
      success: true,
      suggestions
    })

  } catch (error) {
    console.error('Error searching providers:', error);
    return NextResponse.json(
      { error: 'Failed to search providers' },
      { status: 500 }
    );
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
    .select('full_name')
    .eq('role', 'vendor')
    .ilike('full_name', `%${query}%`)
    .limit(3)

  // Combine and deduplicate suggestions
  const suggestions = new Set<string>()

  popularSearches?.forEach((search: { query: string }) => suggestions.add(search.query))
  categories?.forEach((category: { name: string }) => suggestions.add(category.name))
  providers?.forEach((provider: { full_name: string }) => suggestions.add(provider.full_name))

  // Add location-based suggestions if location provided
  if (location) {
    const { data: locationProviders } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('role', 'vendor')
      .limit(2)

    locationProviders?.forEach((provider: { full_name: string }) => {
      suggestions.add(`${provider.full_name} in ${location}`)
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