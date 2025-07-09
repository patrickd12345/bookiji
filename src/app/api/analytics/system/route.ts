import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

export async function GET() {
  try {
    const supabase = createSupabaseClient()
    
    // Get system metrics
    const { data: metrics, error } = await supabase
      .from('analytics_events')
      .select('event, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analytics:', error)
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
    console.error('Analytics system error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
