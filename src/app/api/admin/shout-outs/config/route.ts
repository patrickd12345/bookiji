import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'
import type { 
  UpdateConfigRequest, 
  UpdateConfigResponse, 
  ShoutOutConfig 
} from '@/types/shout-out-metrics'

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

    // Get authenticated user and verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body: UpdateConfigRequest = await request.json()

    // Validate input
    const { 
      enabled, 
      default_radius_km, 
      expiry_minutes, 
      max_radius_km, 
      min_radius_km 
    } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    if (default_radius_km < min_radius_km || default_radius_km > max_radius_km) {
      return NextResponse.json(
        { success: false, error: 'default_radius_km must be between min and max radius' },
        { status: 400 }
      )
    }

    if (expiry_minutes < 5 || expiry_minutes > 1440) { // 5 minutes to 24 hours
      return NextResponse.json(
        { success: false, error: 'expiry_minutes must be between 5 and 1440' },
        { status: 400 }
      )
    }

    if (min_radius_km < 0.1 || min_radius_km >= max_radius_km) {
      return NextResponse.json(
        { success: false, error: 'Invalid min_radius_km' },
        { status: 400 }
      )
    }

    if (max_radius_km > 1000 || max_radius_km <= min_radius_km) {
      return NextResponse.json(
        { success: false, error: 'Invalid max_radius_km' },
        { status: 400 }
      )
    }

    // Update configuration
    const { data: updatedConfig, error: updateError } = await supabase
      .from('shout_out_config')
      .upsert({
        id: true, // Singleton row
        enabled,
        default_radius_km,
        expiry_minutes,
        max_radius_km,
        min_radius_km,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (updateError) {
      console.error('Error updating shout-out config:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update configuration' },
        { status: 500 }
      )
    }

    const responseConfig: ShoutOutConfig = {
      enabled: updatedConfig.enabled,
      default_radius_km: Number(updatedConfig.default_radius_km),
      expiry_minutes: updatedConfig.expiry_minutes,
      max_radius_km: Number(updatedConfig.max_radius_km),
      min_radius_km: Number(updatedConfig.min_radius_km)
    }

    const response: UpdateConfigResponse = {
      success: true,
      config: responseConfig
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error updating shout-out config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Delegate to the public config endpoint but with admin verification
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

    // Get authenticated user and verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Forward to the public config endpoint
    const baseUrl = request.nextUrl.origin
    const configResponse = await fetch(`${baseUrl}/api/shout-outs/config`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    })

    return configResponse

  } catch (error) {
    console.error('Error fetching admin config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
