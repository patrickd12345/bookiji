import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'
import { withSLOProbe } from '@/middleware/sloProbe'
import { featureFlags } from '@/config/featureFlags'
import { createHash } from 'crypto'

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

interface QuoteRequest {
  service_type: string
  location: {
    latitude: number
    longitude: number
    radius_km?: number
  }
  date_time: string
  duration_minutes?: number
  special_requirements?: string
}

interface ProviderCandidate {
  id: string
  name: string
  rating: number
  distance_km: number
  estimated_price_cents: number
  response_time_minutes: number
  availability_score: number
}

interface QuoteResponse {
  quote_id: string
  candidates: ProviderCandidate[]
  price_cents: number
  estimated_duration_minutes: number
  expires_at: string
  eta_minutes: number
}

async function quoteHandler(req: NextRequest): Promise<NextResponse> {
  if (!featureFlags.beta.core_booking_flow) {
    return NextResponse.json(
      { error: 'Core booking flow not enabled' },
      { status: 403 }
    )
  }

  try {
    const body: QuoteRequest = await req.json()
    
    // Validate required fields
    if (!body.service_type || !body.location || !body.date_time) {
      return NextResponse.json(
        { error: 'Missing required fields: service_type, location, date_time' },
        { status: 400 }
      )
    }

    // Create deterministic intent hash for caching
    const intentHash = createHash('sha256')
      .update(JSON.stringify({
        service_type: body.service_type,
        latitude: Math.round(body.location.latitude * 1000) / 1000, // Round to 3 decimal places
        longitude: Math.round(body.location.longitude * 1000) / 1000,
        radius_km: body.location.radius_km || 10,
        date_time: body.date_time,
        duration_minutes: body.duration_minutes || 60
      }))
      .digest('hex')

    // Check for existing quote within TTL
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('*')
      .eq('intent_hash', intentHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingQuote) {
      console.warn(`Returning cached quote for intent: ${intentHash}`)
      return NextResponse.json({
        quote_id: existingQuote.id,
        candidates: existingQuote.candidates,
        price_cents: existingQuote.price_cents,
        estimated_duration_minutes: existingQuote.estimated_duration_minutes,
        expires_at: existingQuote.expires_at,
        eta_minutes: 15 // Cached quote means faster response
      })
    }

    // Find available providers using deterministic selection
    const candidates = await findProviderCandidates(body)
    
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No providers available for this service and location' },
        { status: 404 }
      )
    }

    // Calculate pricing and ETA
    const priceCents = calculatePrice(candidates, body.duration_minutes || 60)
    const estimatedDuration = body.duration_minutes || 60
    const etaMinutes = calculateETA(candidates)

    // Create quote record
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        user_id: 'system', // Will be updated when user is authenticated
        intent_hash: intentHash,
        candidates: candidates,
        price_cents: priceCents,
        estimated_duration_minutes: estimatedDuration,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes TTL
      })
      .select()
      .single()

    if (quoteError) {
      console.error('Failed to create quote:', quoteError)
      return NextResponse.json(
        { error: 'Failed to create quote' },
        { status: 500 }
      )
    }

    const response: QuoteResponse = {
      quote_id: quote.id,
      candidates: candidates,
      price_cents: priceCents,
      estimated_duration_minutes: estimatedDuration,
      expires_at: quote.expires_at,
      eta_minutes: etaMinutes
    }

    return NextResponse.json({ ok: true, data: response })

  } catch (error) {
    console.error('Quote API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function findProviderCandidates(request: QuoteRequest): Promise<ProviderCandidate[]> {
  // First get providers with their specializations
  const { data: providers, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      rating,
      service_area_radius,
      response_time_avg,
      hourly_rate,
      specializations
    `)
    .eq('role', 'vendor')
    .contains('specializations', [request.service_type])
    .not('rating', 'is', null)
    .gte('rating', 4.0) // Only high-rated providers
    .order('rating', { ascending: false })

  if (error) {
    console.error('Failed to fetch providers:', error)
    return []
  }

  // Get provider locations
  const providerIds = providers?.map(p => p.id) || []
  if (providerIds.length === 0) return []

  const { data: locations, error: locationError } = await supabase
    .from('provider_locations')
    .select('provider_id, latitude, longitude')
    .in('provider_id', providerIds)

  if (locationError) {
    console.error('Failed to fetch provider locations:', locationError)
    return []
  }

  // Create location lookup map
  const locationMap = new Map(
    locations?.map(l => [l.provider_id, { lat: l.latitude, lon: l.longitude }]) || []
  )

  // Calculate distances and filter by radius
  const candidates: ProviderCandidate[] = []
  
  for (const provider of providers || []) {
    const location = locationMap.get(provider.id)
    if (!location) continue // Skip providers without location

    const distance = calculateDistance(
      request.location.latitude,
      request.location.longitude,
      location.lat,
      location.lon
    )

    if (distance <= (request.location.radius_km || 10)) {
      const estimatedPrice = calculateProviderPrice(
        provider.hourly_rate || 50,
        request.duration_minutes || 60
      )

      candidates.push({
        id: provider.id,
        name: provider.full_name,
        rating: provider.rating || 0,
        distance_km: distance,
        estimated_price_cents: estimatedPrice,
        response_time_minutes: provider.response_time_avg || 30,
        availability_score: calculateAvailabilityScore(provider, request.date_time)
      })
    }
  }

  // Sort by composite score (rating, distance, response time, availability)
  return candidates
    .sort((a, b) => {
      const scoreA = calculateCompositeScore(a)
      const scoreB = calculateCompositeScore(b)
      return scoreB - scoreA
    })
    .slice(0, 5) // Return top 5 candidates
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function calculateProviderPrice(hourlyRate: number, durationMinutes: number): number {
  return Math.round((hourlyRate * durationMinutes / 60) * 100)
}

function calculatePrice(candidates: ProviderCandidate[], _durationMinutes: number): number {
  if (candidates.length === 0) return 0
  
  // Use median price of top 3 candidates
  const prices = candidates
    .slice(0, 3)
    .map(c => c.estimated_price_cents)
    .sort((a, b) => a - b)
  
  return prices[Math.floor(prices.length / 2)]
}

function calculateETA(candidates: ProviderCandidate[]): number {
  if (candidates.length === 0) return 60
  
  // Average response time of top candidates
  const avgResponseTime = candidates
    .slice(0, 3)
    .reduce((sum, c) => sum + c.response_time_minutes, 0) / Math.min(candidates.length, 3)
  
  return Math.round(avgResponseTime + 15) // Add 15 minutes buffer
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateAvailabilityScore(_provider: any, _dateTime: string): number {
  // Simplified availability scoring - would integrate with calendar system
  return Math.random() * 0.5 + 0.5 // Random score between 0.5 and 1.0
}

function calculateCompositeScore(candidate: ProviderCandidate): number {
  // Weighted scoring: rating (40%), distance (30%), response time (20%), availability (10%)
  const ratingScore = candidate.rating / 5.0
  const distanceScore = Math.max(0, 1 - candidate.distance_km / 10)
  const responseScore = Math.max(0, 1 - candidate.response_time_minutes / 60)
  const availabilityScore = candidate.availability_score
  
  return (
    ratingScore * 0.4 +
    distanceScore * 0.3 +
    responseScore * 0.2 +
    availabilityScore * 0.1
  )
}

export const POST = withSLOProbe(quoteHandler, 'booking_quote_endpoint')
