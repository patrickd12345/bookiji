import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

interface VendorShoutOut {
  id: string
  service_type: string
  description?: string
  radius_km: number
  status: string
  expires_at: string
  created_at: string
  response_status: string
  notified_at: string
  distance_km: number
  existing_offer?: {
    id: string
    price_cents: number
    status: string
    created_at: string
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Get authenticated user and verify they're a vendor
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a vendor
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, shout_out_opt_in')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'vendor') {
      return NextResponse.json(
        { error: 'Access denied. Vendor role required.' },
        { status: 403 }
      )
    }

    if (!userProfile.shout_out_opt_in) {
      return NextResponse.json({
        success: true,
        shout_outs: [],
        message: 'You are not opted in to receive shout-outs. Enable this in your settings to start receiving requests.'
      })
    }

    // Get query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'active'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)

    // Get vendor's location for distance calculation
    const { data: vendorLocation, error: locationError } = await supabase
      .from('provider_locations')
      .select('latitude, longitude')
      .eq('vendor_id', user.id)
      .eq('is_active', true)
      .single()

    if (locationError || !vendorLocation) {
      return NextResponse.json(
        { error: 'Vendor location not found. Please set up your location first.' },
        { status: 400 }
      )
    }

    // Get shout-outs for this vendor
    const { data: shoutOuts, error: shoutOutsError } = await supabase
      .from('shout_out_recipients')
      .select(`
        response_status,
        notified_at,
        shout_outs!inner (
          id,
          service_type,
          description,
          location,
          radius_km,
          status,
          expires_at,
          created_at
        )
      `)
      .eq('vendor_id', user.id)
      .eq('shout_outs.status', status)
      .order('notified_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (shoutOutsError) {
      console.error('Error fetching shout-outs:', shoutOutsError)
      return NextResponse.json(
        { error: 'Failed to fetch shout-outs' },
        { status: 500 }
      )
    }

    if (!shoutOuts || shoutOuts.length === 0) {
      return NextResponse.json({
        success: true,
        shout_outs: [],
        total: 0,
        offset,
        limit
      })
    }

    // Get existing offers for these shout-outs
    const shoutOutIds = shoutOuts.map(so => (so.shout_outs as any).id)
    const { data: existingOffers } = await supabase
      .from('shout_out_offers')
      .select('shout_out_id, id, price_cents, status, created_at')
      .in('shout_out_id', shoutOutIds)
      .eq('vendor_id', user.id)

    const offersMap = existingOffers?.reduce((acc, offer) => {
      acc[offer.shout_out_id] = offer
      return acc
    }, {} as Record<string, any>) || {}

    // Calculate distances and format response
    const formattedShoutOuts: VendorShoutOut[] = shoutOuts.map(item => {
      const shoutOut = (item.shout_outs as any)
      let distance = 0

      // Calculate distance if location data is available
      if (shoutOut.location) {
        const coordsMatch = shoutOut.location.match(/POINT\(([^)]+)\)/)
        if (coordsMatch) {
          const [lng, lat] = coordsMatch[1].split(' ').map(Number)
          const latDiff = vendorLocation.latitude - lat
          const lngDiff = vendorLocation.longitude - lng
          distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 // Rough km conversion
        }
      }

      return {
        id: shoutOut.id,
        service_type: shoutOut.service_type,
        description: shoutOut.description,
        radius_km: shoutOut.radius_km,
        status: shoutOut.status,
        expires_at: shoutOut.expires_at,
        created_at: shoutOut.created_at,
        response_status: item.response_status,
        notified_at: item.notified_at,
        distance_km: Math.round(distance * 10) / 10,
        existing_offer: offersMap[shoutOut.id]
      }
    })

    // Sort by distance (closest first) and then by creation time
    formattedShoutOuts.sort((a, b) => {
      if (a.distance_km !== b.distance_km) {
        return a.distance_km - b.distance_km
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('shout_out_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', user.id)
      .eq('shout_outs.status', status)

    return NextResponse.json({
      success: true,
      shout_outs: formattedShoutOuts,
      total: totalCount || 0,
      offset,
      limit,
      vendor_location: vendorLocation
    })

  } catch (error) {
    console.error('Error fetching vendor shout-outs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
