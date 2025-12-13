import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

export async function POST(request: NextRequest) {
  try {
    const { signals } = await request.json()

    if (!signals || !Array.isArray(signals)) {
      return NextResponse.json(
        { error: 'Invalid signals format' },
        { status: 400 }
      )
    }

    // Store signals in resilience_metrics table
    const { data, error } = await supabase
      .from('resilience_metrics')
      .insert(
        signals.map((signal: any) => ({
          id: signal.id,
          ts: new Date(signal.timestamp).toISOString(),
          user_id: signal.user_id,
          session_id: signal.session_id,
          component: signal.component,
          signal: signal.signal_type,
          data: signal.data
        }))
      )

    if (error) {
      console.error('Failed to store resilience telemetry:', error)
      return NextResponse.json(
        { error: 'Failed to store telemetry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      stored: signals.length 
    })

  } catch (error) {
    console.error('Resilience telemetry endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    endpoint: 'resilience-telemetry',
    timestamp: new Date().toISOString()
  })
}


