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

    // Get funnel data from analytics_events
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('event_name, created_at, properties')
      .in('event_name', ['visit_home', 'search_performed', 'booking_started', 'booking_confirmed'])
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching funnel data:', error)
      return NextResponse.json({ error: 'Failed to fetch funnel data' }, { status: 500 })
    }

    // Group events by session and calculate funnel
    const sessionFunnels: Record<string, Set<string>> = {}
    const dailyStats: Record<string, { visits: number; searches: number; bookings: number; confirmations: number }> = {}

    events?.forEach(event => {
      const sessionId = (event.properties as any)?.session_id || 'unknown'
      const day = new Date(event.created_at).toISOString().split('T')[0]
      
      // Initialize daily stats
      if (!dailyStats[day]) {
        dailyStats[day] = { visits: 0, searches: 0, bookings: 0, confirmations: 0 }
      }
      
      // Track daily counts
      switch (event.event_name) {
        case 'visit_home':
          dailyStats[day].visits++
          break
        case 'search_performed':
          dailyStats[day].searches++
          break
        case 'booking_started':
          dailyStats[day].bookings++
          break
        case 'booking_confirmed':
          dailyStats[day].confirmations++
          break
      }
      
      // Track session funnel
      if (!sessionFunnels[sessionId]) {
        sessionFunnels[sessionId] = new Set()
      }
      sessionFunnels[sessionId].add(event.event_name)
    })

    // Calculate conversion rates
    const totalSessions = Object.keys(sessionFunnels).length
    const sessionsWithSearch = Object.values(sessionFunnels).filter(events => events.has('search_performed')).length
    const sessionsWithBooking = Object.values(sessionFunnels).filter(events => events.has('booking_started')).length
    const sessionsWithConfirmation = Object.values(sessionFunnels).filter(events => events.has('booking_confirmed')).length

    const conversionRates = {
      searchToVisit: totalSessions > 0 ? (sessionsWithSearch / totalSessions) * 100 : 0,
      bookingToSearch: sessionsWithSearch > 0 ? (sessionsWithBooking / sessionsWithSearch) * 100 : 0,
      confirmationToBooking: sessionsWithBooking > 0 ? (sessionsWithConfirmation / sessionsWithBooking) * 100 : 0,
      overallConversion: totalSessions > 0 ? (sessionsWithConfirmation / totalSessions) * 100 : 0,
    }

    // Convert daily stats to array format for charts
    const dailyStatsArray = Object.entries(dailyStats).map(([day, stats]) => ({
      day,
      ...stats,
    })).sort((a, b) => a.day.localeCompare(b.day))

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        totalSessions,
        conversionRates,
        dailyStats: dailyStatsArray,
        funnelSteps: {
          visits: Object.values(dailyStats).reduce((sum, day) => sum + day.visits, 0),
          searches: Object.values(dailyStats).reduce((sum, day) => sum + day.searches, 0),
          bookings: Object.values(dailyStats).reduce((sum, day) => sum + day.bookings, 0),
          confirmations: Object.values(dailyStats).reduce((sum, day) => sum + day.confirmations, 0),
        },
      },
    })
  } catch (error) {
    console.error('Funnel analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
