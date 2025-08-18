import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'
import type { GetMetricsResponse, ShoutOutMetrics } from '@/types/shout-out-metrics'

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

    // Fetch metrics from database views
    const [conversionResult, responseTimeResult, resolutionResult] = await Promise.all([
      supabase.from('shout_out_conversion').select('*').single(),
      supabase.from('shout_out_response_time').select('*').single(),
      supabase.from('shout_out_resolution').select('*').single()
    ])

    // Handle errors gracefully - if no data exists, return zeros
    const conversion = conversionResult.data || { 
      conversion_rate: 0, 
      total_created: 0, 
      total_accepted: 0 
    }
    
    const responseTime = responseTimeResult.data || { 
      avg_response_time_minutes: 0, 
      total_responses: 0 
    }
    
    const resolution = resolutionResult.data || { 
      resolution_pct: 0, 
      total_shout_outs: 0, 
      total_with_offers: 0 
    }

    const metrics: ShoutOutMetrics = {
      conversion_rate: Number(conversion.conversion_rate) || 0,
      avg_response_time_minutes: Number(responseTime.avg_response_time_minutes) || 0,
      resolution_pct: Number(resolution.resolution_pct) || 0,
      total_created: Number(conversion.total_created) || 0,
      total_accepted: Number(conversion.total_accepted) || 0,
      total_with_offers: Number(resolution.total_with_offers) || 0,
      total_responses: Number(responseTime.total_responses) || 0
    }

    const response: GetMetricsResponse = {
      success: true,
      metrics
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching shout-out metrics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        metrics: {
          conversion_rate: 0,
          avg_response_time_minutes: 0,
          resolution_pct: 0,
          total_created: 0,
          total_accepted: 0,
          total_with_offers: 0,
          total_responses: 0
        }
      },
      { status: 500 }
    )
  }
}
