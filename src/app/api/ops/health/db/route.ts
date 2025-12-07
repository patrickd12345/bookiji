import { NextResponse } from 'next/server'

/**
 * Database health check endpoint
 * HealthAI monitors this to detect DB connectivity issues, latency spikes, and connection pool problems
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  
  try {
    const { getServerSupabase } = await import('@/lib/supabaseClient')
    const supabase = getServerSupabase()
    
    // Test 1: Basic connectivity
    const connectStart = Date.now()
    const { error: connectError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    const connectLatency = Date.now() - connectStart
    
    if (connectError) {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp,
        checks: {
          connectivity: { status: 'failed', error: connectError.message, code: connectError.code }
        },
        latency: connectLatency,
        recommendations: [
          'Verify Supabase connection string',
          'Check database server status',
          'Review network connectivity',
          'Check RLS policies for profiles table'
        ]
      }, { status: 503 })
    }

    // Test 2: Write capability (read-only check)
    const writeStart = Date.now()
    const { error: writeError } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .limit(1)
    const writeLatency = Date.now() - writeStart
    
    // Test 3: Complex query performance
    const complexStart = Date.now()
    const { error: complexError } = await supabase
      .from('bookings')
      .select('id, status, created_at')
      .limit(1)
    const complexLatency = Date.now() - complexStart

    const allChecksPassed = !writeError && !complexError
    const status = allChecksPassed ? 'healthy' : 'degraded'
    const maxLatency = Math.max(connectLatency, writeLatency, complexLatency)
    
    return NextResponse.json({
      status,
      timestamp,
      checks: {
        connectivity: { status: 'passed', latency: connectLatency },
        readCapability: { status: writeError ? 'failed' : 'passed', latency: writeLatency, error: writeError?.message },
        complexQueries: { status: complexError ? 'failed' : 'passed', latency: complexLatency, error: complexError?.message }
      },
      metrics: {
        maxLatency,
        avgLatency: (connectLatency + writeLatency + complexLatency) / 3,
        connectLatency,
        writeLatency,
        complexLatency
      },
      recommendations: maxLatency > 1000 
        ? ['Database latency elevated - consider connection pooling optimization', 'Review slow query logs', 'Check database load']
        : []
    }, {
      status: status === 'healthy' ? 200 : 200 // Return 200 even if degraded (HealthAI will interpret)
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Database health check failed',
      recommendations: [
        'Database connection completely unavailable',
        'Check Supabase service status',
        'Verify environment variables',
        'Review application logs for connection errors'
      ]
    }, { status: 503 })
  }
}
