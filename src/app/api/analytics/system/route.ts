import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    if (!config?.url || !config?.publishableKey) {
      return NextResponse.json({ error: 'Invalid Supabase configuration' }, { status: 500 })
    }
    const supabase = createClient(config.url, config.publishableKey)

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('range') || '7d'
    
    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Get conversion funnel data
    const { data: funnelData } = await supabase
      .from('conversion_funnels')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Calculate conversion rate
    let conversionRate = 0
    if (funnelData && funnelData.length > 0) {
      const started = funnelData.filter(f => f.step_name === 'started').length
      const completed = funnelData.filter(f => f.step_name === 'completed').length
      conversionRate = started > 0 ? (completed / started) * 100 : 0
    }

    // Get revenue data from bookings
    const { data: revenueData } = await supabase
      .from('bookings')
      .select('total_amount, status')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())

    const revenue = revenueData?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0

    // Get geographic distribution
    const { data: geoData } = await supabase
      .from('analytics_events')
      .select('properties')
      .not('properties->country', 'is', null)
      .gte('created_at', startDate.toISOString())

    const geographicDistribution: Record<string, number> = {}
    geoData?.forEach(event => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const country = (event.properties as any)?.country
      if (country && country !== 'unknown') {
        geographicDistribution[country] = (geographicDistribution[country] || 0) + 1
      }
    })

    // Get device breakdown
    const { data: deviceData } = await supabase
      .from('analytics_events')
      .select('properties')
      .not('properties->device_type', 'is', null)
      .gte('created_at', startDate.toISOString())

    const deviceBreakdown: Record<string, number> = {}
    deviceData?.forEach(event => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const device = (event.properties as any)?.device_type
      if (device) {
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1
      }
    })

    // Get error rate and critical errors
    const { data: errorData } = await supabase
      .from('analytics_events')
      .select('*')
      .or('event_name.like.%error%,event_name.like.%failed%')
      .gte('created_at', startDate.toISOString())

    const totalEvents = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact' })
      .gte('created_at', startDate.toISOString())

    const errorRate = totalEvents.count && totalEvents.count > 0 
      ? (errorData?.length || 0) / totalEvents.count * 100 
      : 0

    // Group errors by type and severity
    const errorGroups: Record<string, { count: number; lastOccurrence: string }> = {}
    errorData?.forEach(event => {
      const errorType = event.event_name
      if (errorType) {
        if (!errorGroups[errorType]) {
          errorGroups[errorType] = { count: 0, lastOccurrence: event.created_at }
        }
        errorGroups[errorType].count++
        if (new Date(event.created_at) > new Date(errorGroups[errorType].lastOccurrence)) {
          errorGroups[errorType].lastOccurrence = event.created_at
        }
      }
    })

    // Convert to critical errors array with severity
    const criticalErrors = Object.entries(errorGroups).map(([error, data]) => ({
      error,
      count: data.count,
      lastOccurrence: data.lastOccurrence,
      severity: data.count > 10 ? 'high' : data.count > 5 ? 'medium' : 'low' as const
    })).sort((a, b) => b.count - a.count)

    // Get active users (unique users in time range)
    const { data: userData } = await supabase
      .from('analytics_events')
      .select('properties')
      .not('properties->user_id', 'is', null)
      .gte('created_at', startDate.toISOString())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueUsers = new Set(userData?.map(event => (event.properties as any)?.user_id).filter(Boolean))
    const activeUsers = uniqueUsers.size

    // Calculate p95 session duration (placeholder - would need session tracking)
    const p95SessionDuration = 180 // 3 minutes average

    const systemMetrics = {
      p95SessionDuration,
      errorRate: parseFloat(errorRate.toFixed(2)),
      activeUsers,
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      revenue,
      geographicDistribution,
      deviceBreakdown,
      criticalErrors
    }

    return NextResponse.json({ 
      success: true, 
      data: systemMetrics 
    })

  } catch (error) {
    console.error('System metrics error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load system metrics' 
    }, { status: 500 })
  }
}
