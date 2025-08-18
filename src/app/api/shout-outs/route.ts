import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

interface CreateShoutOutRequest {
  service_type: string
  description?: string
  latitude: number
  longitude: number
  radius_km?: number
}

interface ShoutOut {
  id: string
  user_id: string
  service_type: string
  description?: string
  location: string
  radius_km: number
  status: string
  expires_at: string
  created_at: string
  updated_at: string
}

export async function POST(request: NextRequest) {
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      service_type, 
      description, 
      latitude, 
      longitude, 
      radius_km = 10 
    } = body as CreateShoutOutRequest

    // Validate required fields
    if (!service_type || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required fields: service_type, latitude, longitude' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Validate radius
    if (radius_km < 1 || radius_km > 100) {
      return NextResponse.json(
        { error: 'Radius must be between 1 and 100 km' },
        { status: 400 }
      )
    }

    // Get system configuration for expiry time
    const { data: configResponse, error: configError } = await supabase
      .rpc('get_shout_out_config')
      .single()

    if (configError) {
      console.error('Error fetching shout-out config:', configError)
      // Use default values if config fetch fails
      const expiryMinutes = 30
      const defaultRadiusKm = 10
      const maxRadiusKm = 100
      const minRadiusKm = 1
    } else {
      const configData = configResponse as {
        expiry_minutes: number
        default_radius_km: number
        max_radius_km: number
        min_radius_km: number
      }
      const expiryMinutes = configData?.expiry_minutes || 30
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()

      // Create shout-out
      const { data: shoutOut, error: shoutOutError } = await supabase
        .from('shout_outs')
        .insert([{
          user_id: user.id,
          service_type,
          description,
          location: `POINT(${longitude} ${latitude})`,
          radius_km,
          expires_at: expiresAt,
          status: 'active'
        }])
        .select()
        .single()

      if (shoutOutError) {
        console.error('Error creating shout-out:', shoutOutError)
        return NextResponse.json(
          { error: 'Failed to create shout-out' },
          { status: 500 }
        )
      }

      // Find eligible vendors within radius
      const { data: eligibleVendors, error: vendorsError } = await supabase
        .rpc('find_eligible_vendors', {
          p_service_type: service_type,
          p_location: `POINT(${longitude} ${latitude})`,
          p_radius_km: radius_km
        })

      if (vendorsError) {
        console.error('Error finding eligible vendors:', vendorsError)
        // Continue without vendor notifications
      }

      // Create recipient records and notifications for eligible vendors
      if (eligibleVendors && eligibleVendors.length > 0) {
        const vendorIds = eligibleVendors.map((vendor: { vendor_id: string }) => vendor.vendor_id)
        
        const recipients = eligibleVendors.map((vendor: { vendor_id: string }) => ({
          shout_out_id: shoutOut.id,
          vendor_id: vendor.vendor_id,
          response_status: 'pending'
        }))

        const { error: recipientsError } = await supabase
          .from('shout_out_recipients')
          .insert(recipients)

        if (recipientsError) {
          console.error('Error creating recipient records:', recipientsError)
          // Continue without recipient records
        }

        // Record metrics for shout-out creation
        await supabase.rpc('record_shout_out_metric', {
          p_shout_out_id: shoutOut.id,
          p_vendor_id: null,
          p_event: 'created',
          p_metadata: { eligible_vendor_count: vendorIds.length }
        })

        // Create vendor notifications
        const { error: notificationError } = await supabase.rpc('create_vendor_notifications', {
          p_shout_out_id: shoutOut.id,
          p_vendor_ids: vendorIds
        })

        if (notificationError) {
          console.error('Error creating vendor notifications:', notificationError)
          // Continue without notifications
        }
      }

      return NextResponse.json({
        success: true,
        shout_out: shoutOut,
        eligible_vendors_count: eligibleVendors?.length || 0
      })
    }

  } catch (error) {
    console.error('Error in shout-out creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's shout-outs
    const { data: shoutOuts, error: shoutOutError } = await supabase
      .from('shout_outs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (shoutOutError) {
      console.error('Error fetching shout-outs:', shoutOutError)
      return NextResponse.json(
        { error: 'Failed to fetch shout-outs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      shout_outs: shoutOuts || []
    })

  } catch (error) {
    console.error('Error fetching shout-outs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
