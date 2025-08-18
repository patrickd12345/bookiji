import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'
import type { GetConfigResponse, ShoutOutConfig } from '@/types/shout-out-metrics'

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

    // Get authenticated user (any authenticated user can read config)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch configuration using the helper function
    const { data: configData, error: configError } = await supabase
      .rpc('get_shout_out_config')
      .single()

    if (configError) {
      console.error('Error fetching shout-out config:', configError)
      // Return default config if none exists
      const defaultConfig: ShoutOutConfig = {
        enabled: true,
        default_radius_km: 10,
        expiry_minutes: 30,
        max_radius_km: 100,
        min_radius_km: 1
      }
      
      return NextResponse.json({
        success: true,
        config: defaultConfig
      })
    }

    const shoutOutConfig: ShoutOutConfig = {
      enabled: configData.enabled,
      default_radius_km: Number(configData.default_radius_km),
      expiry_minutes: configData.expiry_minutes,
      max_radius_km: Number(configData.max_radius_km),
      min_radius_km: Number(configData.min_radius_km)
    }

    const response: GetConfigResponse = {
      success: true,
      config: shoutOutConfig
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching shout-out config:', error)
    
    // Return default config on error
    const defaultConfig: ShoutOutConfig = {
      enabled: true,
      default_radius_km: 10,
      expiry_minutes: 30,
      max_radius_km: 100,
      min_radius_km: 1
    }
    
    return NextResponse.json(
      { 
        success: true, // Return success with default config
        config: defaultConfig
      }
    )
  }
}
