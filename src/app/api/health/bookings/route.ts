import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

/**
 * Booking API health check endpoint
 * 
 * Lightweight check to verify booking system is operational:
 * - Database connectivity for bookings table
 * - Basic query functionality
 */
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Perform a lightweight query to check booking system health
    const { error } = await supabase
      .from('bookings')
      .select('id')
      .limit(1)
    
    const latency = Date.now() - startTime
    
    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message,
          code: error.code,
          latency
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      latency,
      message: 'Booking API is operational',
      database: 'connected'
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Booking API health check failed'
      },
      { status: 503 }
    )
  }
}
