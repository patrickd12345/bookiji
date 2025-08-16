import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET() {
  try {
    const config = getSupabaseConfig()
    const supabase = createClient(config.url, config.publishableKey)
    
    // Get system metrics
    const { data: metrics, error } = await supabase
      .from('analytics_events')
      .select('event, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching analytics:', error)
      }
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Process metrics
    const eventCounts = metrics?.reduce((acc: Record<string, number>, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      metrics: {
        totalEvents: metrics?.length || 0,
        eventCounts,
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Analytics system error:', error)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
