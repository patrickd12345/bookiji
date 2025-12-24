import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

interface SearchFilters {
  query?: string
  location?: string
  latitude?: number
  longitude?: number
  radius?: number // in miles (legacy)
  maxTravelDistance?: number // in kilometers
  service_category?: string
  specialty_ids?: string[]
  min_rating?: number
  max_price?: number
  availability_date?: string
  availability_time?: string
  sort_by?: 'distance' | 'rating' | 'price' | 'availability' | 'popularity'
  limit?: number
  offset?: number
}

interface ProviderWithDistance {
  provider_id: string
  full_name: string
  business_name: string
  average_rating: number
  total_bookings: number
  distance_km?: number
  min_price_cents: number
  specialty_names: string[]
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

    // Generate cache key for this search
    const cacheKey = generateCacheKey(filters)
    
    // Try to get cached results first
    const cachedResults = await getCachedResults(cacheKey)
    if (cachedResults) {
      return NextResponse.json(cachedResults)
    }

    // Perform optimized search using database function
    const searchResults = await performOptimizedSearch(filters)
    
    // Cache the results for 15 minutes
    await cacheResults(cacheKey, searchResults, 15)
    
    return NextResponse.json(searchResults)
  } catch (error) {
    console.error('Optimized search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function performOptimizedSearch(filters: SearchFilters) {
  try {
    // Convert specialty IDs to UUID array if provided
    const specialtyUuids = filters.specialty_ids?.map(id => id) || null
    
    // Convert price to cents if provided
    const maxPriceCents = filters.max_price ? Math.round(filters.max_price * 100) : null
    
    // Use the optimized database function
    const { data: providers, error } = await supabase
      .rpc('search_providers_optimized', {
        search_query: filters.query || null,
        specialty_ids: specialtyUuids,
        min_rating: filters.min_rating || null,
        max_price_cents: maxPriceCents,
        search_lat: filters.latitude || null,
        search_lon: filters.longitude || null,
        radius_km: filters.maxTravelDistance || 20,
        limit_count: filters.limit || 20,
        offset_count: filters.offset || 0
      })

    if (error) {
      console.error('Database function error:', error)
      throw new Error('Database query failed')
    }

    if (!providers) {
      return { providers: [], total: 0, pagination: {} }
    }

    // Apply additional filters that aren't handled by the database function
    let filteredProviders = providers as ProviderWithDistance[]

    // Apply availability filtering if needed
    if (filters.availability_date) {
      filteredProviders = await filterByAvailability(
        filteredProviders,
        filters.availability_date,
        filters.availability_time
      )
    }

    // Apply service category filtering if needed
    if (filters.service_category) {
      filteredProviders = await filterByServiceCategory(
        filteredProviders,
        filters.service_category
      )
    }

    // Get total count for pagination
    const total = filteredProviders.length

    // Apply final sorting
    filteredProviders = sortProviders(filteredProviders, filters.sort_by || 'rating')

    // Apply final pagination
    const startIndex = filters.offset || 0
    const endIndex = startIndex + (filters.limit || 20)
    const paginatedProviders = filteredProviders.slice(startIndex, endIndex)

    return {
      providers: paginatedProviders.map(provider => ({
        id: provider.provider_id,
        full_name: provider.full_name,
        business_name: provider.business_name,
        average_rating: provider.average_rating,
        total_bookings: provider.total_bookings,
        distance: provider.distance_km,
        min_price: provider.min_price_cents / 100, // Convert back to dollars
        specialties: provider.specialty_names
      })),
      total,
      pagination: {
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        has_more: endIndex < total
      }
    }
  } catch (error) {
    console.error('Optimized search execution error:', error)
    throw error
  }
}

async function filterByAvailability(
  providers: ProviderWithDistance[],
  date: string,
  _time?: string
): Promise<ProviderWithDistance[]> {
  try {
    const providerIds = providers.map(p => p.provider_id)
    
    // Query availability slots for the specified date
    const { data: availabilitySlots, error } = await supabase
      .from('availability_slots')
      .select('provider_id, start_time, end_time, is_booked')
      .in('provider_id', providerIds)
      .eq('date', date)
      .eq('is_booked', false)

    if (error) {
      console.error('Availability filter error:', error)
      return providers // Return all providers if filtering fails
    }

    // Filter providers who have available slots
    const availableProviderIds = new Set(
      availabilitySlots?.map(slot => slot.provider_id) || []
    )

    return providers.filter(provider => availableProviderIds.has(provider.provider_id))
  } catch (error) {
    console.error('Availability filtering error:', error)
    return providers // Return all providers if filtering fails
  }
}

async function filterByServiceCategory(
  providers: ProviderWithDistance[],
  category: string
): Promise<ProviderWithDistance[]> {
  try {
    const providerIds = providers.map(p => p.provider_id)
    
    // Query services for the specified category
    const { data: services, error } = await supabase
      .from('services')
      .select('provider_id')
      .in('provider_id', providerIds)
      .eq('category', category)
      .eq('available', true)

    if (error) {
      console.error('Service category filter error:', error)
      return providers // Return all providers if filtering fails
    }

    // Filter providers who have services in the specified category
    const categoryProviderIds = new Set(
      services?.map(service => service.provider_id) || []
    )

    return providers.filter(provider => categoryProviderIds.has(provider.provider_id))
  } catch (error) {
    console.error('Service category filtering error:', error)
    return providers // Return all providers if filtering fails
  }
}

function sortProviders(
  providers: ProviderWithDistance[], 
  sortBy: 'distance' | 'rating' | 'price' | 'availability' | 'popularity'
): ProviderWithDistance[] {
  switch (sortBy) {
    case 'distance':
      return providers.sort((a, b) => {
        const distA = a.distance_km || Infinity
        const distB = b.distance_km || Infinity
        return distA - distB
      })
    case 'rating':
      return providers.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    case 'price':
      return providers.sort((a, b) => (a.min_price_cents || 0) - (b.min_price_cents || 0))
    case 'popularity':
      return providers.sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0))
    default:
      return providers
  }
}

function generateCacheKey(filters: SearchFilters): string {
  const keyParts = [
    'search',
    filters.query || '',
    filters.latitude?.toString() || '',
    filters.longitude?.toString() || '',
    filters.maxTravelDistance?.toString() || '',
    filters.specialty_ids?.sort().join(',') || '',
    filters.min_rating?.toString() || '',
    filters.max_price?.toString() || '',
    filters.limit?.toString() || '',
    filters.offset?.toString() || ''
  ]
  return `search:${keyParts.join(':')}`
}

async function getCachedResults(cacheKey: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_cached_query', { cache_key: cacheKey })

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('Cache retrieval error:', error)
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cacheResults(cacheKey: string, data: any, ttlMinutes: number) {
  try {
    await supabase
      .rpc('set_cached_query', {
        cache_key: cacheKey,
        cache_data: data,
        ttl_minutes: ttlMinutes
      })
  } catch (error) {
    console.error('Cache storage error:', error)
    // Don't fail the request if caching fails
  }
}
