import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

interface RankedOffer {
  id: string
  shout_out_id: string
  vendor_id: string
  vendor_name: string
  vendor_rating: number
  vendor_total_reviews: number
  service_id: string
  service_name: string
  slot_start: string
  slot_end: string
  price_cents: number
  message?: string
  status: string
  distance_km: number
  score: number
  created_at: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey || config.anonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the shout-out belongs to the user
    const { data: shoutOut, error: shoutOutError } = await supabase
      .from('shout_outs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (shoutOutError || !shoutOut) {
      return NextResponse.json(
        { error: 'Shout-out not found' },
        { status: 404 }
      )
    }

    // Get offers with vendor details and ranking
    const { data: offers, error: offersError } = await supabase
      .from('shout_out_offers')
      .select(`
        *,
        vendor:vendor_id (
          id,
          full_name,
          provider_locations (
            latitude,
            longitude
          )
        ),
        service:service_id (
          id,
          name
        )
      `)
      .eq('shout_out_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (offersError) {
      console.error('Error fetching offers:', offersError)
      return NextResponse.json(
        { error: 'Failed to fetch offers' },
        { status: 500 }
      )
    }

    if (!offers || offers.length === 0) {
      return NextResponse.json({
        success: true,
        offers: [],
        has_expired: new Date() > new Date(shoutOut.expires_at)
      })
    }

    // Calculate vendor ratings from reviews
    const vendorIds = offers.map(offer => offer.vendor_id)
    const { data: vendorStats } = await supabase
      .from('reviews')
      .select('vendor_id, rating')
      .in('vendor_id', vendorIds)

    const vendorRatings = vendorStats?.reduce((acc, review) => {
      if (!acc[review.vendor_id]) {
        acc[review.vendor_id] = { total: 0, count: 0 }
      }
      acc[review.vendor_id].total += review.rating
      acc[review.vendor_id].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>) || {}

    // Calculate average price for this service type
    const { data: servicePrices } = await supabase
      .from('services')
      .select('price_cents')
      .eq('category', shoutOut.service_type)
      .eq('is_active', true)

    const avgPrice = servicePrices?.length 
      ? servicePrices.reduce((sum, s) => sum + s.price_cents, 0) / servicePrices.length
      : 0

    // Rank offers by score
    const rankedOffers: RankedOffer[] = offers.map(offer => {
      const vendor = offer.vendor as any
      const service = offer.service as any
      const vendorStat = vendorRatings[offer.vendor_id]
      const avgRating = vendorStat ? vendorStat.total / vendorStat.count : 3.0
      const totalReviews = vendorStat ? vendorStat.count : 0

      // Calculate distance from shout-out location to vendor
      // This is a simplified distance calculation - in production you'd use PostGIS
      const vendorLocation = vendor?.provider_locations?.[0]
      let distance = 0
      if (vendorLocation && shoutOut.location) {
        // Simple Euclidean distance (good enough for ranking)
        const shoutOutCoords = shoutOut.location.match(/POINT\(([^)]+)\)/)
        if (shoutOutCoords) {
          const [lng, lat] = shoutOutCoords[1].split(' ').map(Number)
          const latDiff = vendorLocation.latitude - lat
          const lngDiff = vendorLocation.longitude - lng
          distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 // Rough km conversion
        }
      }

      // Calculate offer score using the database function logic
      const score = 
        Math.max(0, 20 - distance) + // Distance score (0-20)
        (avgRating * 5) + // Rating score (0-25)
        (avgPrice > 0 
          ? Math.max(0, 55 * (1 - Math.abs(offer.price_cents - avgPrice) / avgPrice))
          : 55) // Price competitiveness score (0-55)

      return {
        id: offer.id,
        shout_out_id: offer.shout_out_id,
        vendor_id: offer.vendor_id,
        vendor_name: vendor?.full_name || 'Unknown Vendor',
        vendor_rating: Math.round(avgRating * 10) / 10,
        vendor_total_reviews: totalReviews,
        service_id: offer.service_id,
        service_name: service?.name || 'Service',
        slot_start: offer.slot_start,
        slot_end: offer.slot_end,
        price_cents: offer.price_cents,
        message: offer.message,
        status: offer.status,
        distance_km: Math.round(distance * 10) / 10,
        score: Math.round(score * 10) / 10,
        created_at: offer.created_at
      }
    }).sort((a, b) => b.score - a.score) // Sort by score descending

    return NextResponse.json({
      success: true,
      offers: rankedOffers,
      has_expired: new Date() > new Date(shoutOut.expires_at),
      expires_at: shoutOut.expires_at
    })

  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
