import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MetricsAI, SystemMetrics } from '@/lib/metrics/metricsAI'

/**
 * GET /ops/metrics/system
 * 
 * Returns system-level metrics analysis (CPU/memory, database, cache)
 * MetricsAI analyzes trends and detects anomalies
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client inside handler with safety checks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          agent: 'MetricsAI',
          error: 'Supabase not configured',
          message: 'Database connection unavailable',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '1h'
    const compareWith = searchParams.get('compareWith') // Optional: previous time range for comparison

    // Validate timeRange parameter
    const validTimeRanges = ['15m', '1h', '6h', '24h']
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid timeRange parameter', validValues: validTimeRanges },
        { status: 400 }
      )
    }

    // Calculate time range
    const now = new Date()
    let startTime: Date
    let compareStartTime: Date | null = null

    switch (timeRange) {
      case '15m':
        startTime = new Date(now.getTime() - 15 * 60 * 1000)
        break
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
    }

    // If compareWith is provided, calculate previous period
    if (compareWith) {
      const duration = now.getTime() - startTime.getTime()
      compareStartTime = new Date(startTime.getTime() - duration)
    }

    // Fetch system metrics from performance_analytics_5min with timeout
    // We'll derive CPU/memory from database metrics and cache hit rates
    let performanceData: any = null
    let perfError: any = null
    
    try {
      const queryResult = await Promise.race([
        supabase
          .from('performance_analytics_5min')
          .select('five_minute_bucket, cache_hit_rate_percent, avg_database_queries, request_count')
          .gte('five_minute_bucket', startTime.toISOString())
          .order('five_minute_bucket', { ascending: true }),
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 30000)
        )
      ])
      performanceData = (queryResult as any).data
      perfError = (queryResult as any).error
    } catch (error) {
      console.error('Metrics system query timeout or error:', error)
      perfError = { message: error instanceof Error ? error.message : 'Query timeout' }
    }

    if (perfError) {
      console.error('Failed to fetch performance data:', perfError)
      return NextResponse.json(
        {
          agent: 'MetricsAI',
          error: 'Failed to fetch system metrics',
          message: perfError.message || 'Database query failed',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Get database connection metrics (if available)
    // For now, we'll estimate system load from request patterns
    // Note: get_database_stats function may not exist - handle gracefully
    let dbMetrics: any = null
    try {
      const { data } = await supabase.rpc('get_database_stats', {}).single()
      dbMetrics = data
    } catch (err) {
      // Function doesn't exist or not available - that's okay
      dbMetrics = null
    }

    // Transform to SystemMetrics format
    const systemMetrics: SystemMetrics[] = (performanceData || []).map((item: any) => {
      // Estimate CPU from request count and database queries
      // This is a simplified model - in production, you'd have actual system metrics
      const estimatedCpu = Math.min(100, 
        (item.request_count || 0) * 0.1 + 
        (item.avg_database_queries || 0) * 2
      )
      
      // Estimate memory from request patterns
      const estimatedMemory = Math.min(100,
        30 + (item.request_count || 0) * 0.05
      )

      return {
        timestamp: item.five_minute_bucket,
        cpu_percent: estimatedCpu,
        memory_percent: estimatedMemory,
        cache_hit_rate: item.cache_hit_rate_percent || null,
        active_connections: null,
        database_size_mb: dbMetrics?.database_size_mb || null
      }
    })

    // Fetch previous period if requested
    let previousMetrics: SystemMetrics[] | undefined
    if (compareStartTime && compareWith) {
      const { data: prevData } = await supabase
        .from('performance_analytics_5min')
        .select('five_minute_bucket, cache_hit_rate_percent, avg_database_queries, request_count')
        .gte('five_minute_bucket', compareStartTime.toISOString())
        .lt('five_minute_bucket', startTime.toISOString())
        .order('five_minute_bucket', { ascending: true })

      previousMetrics = (prevData || []).map((item: any) => {
        const estimatedCpu = Math.min(100,
          (item.request_count || 0) * 0.1 +
          (item.avg_database_queries || 0) * 2
        )
        const estimatedMemory = Math.min(100,
          30 + (item.request_count || 0) * 0.05
        )

        return {
          timestamp: item.five_minute_bucket,
          cpu_percent: estimatedCpu,
          memory_percent: estimatedMemory,
          cache_hit_rate: item.cache_hit_rate_percent || null,
          active_connections: null,
          database_size_mb: null
        }
      })
    }

    // Analyze with MetricsAI
    const analysis = MetricsAI.analyzeSystemMetrics(systemMetrics, previousMetrics)

    return NextResponse.json({
      success: true,
      analysis,
      raw_metrics: systemMetrics,
      time_range: {
        start: startTime.toISOString(),
        end: now.toISOString(),
        duration: timeRange
      },
      comparison: compareWith ? {
        enabled: true,
        previous_range: compareStartTime ? {
          start: compareStartTime.toISOString(),
          end: startTime.toISOString()
        } : null
      } : { enabled: false }
    })

  } catch (error) {
    console.error('System metrics endpoint error:', error)
    return NextResponse.json(
      {
        agent: 'MetricsAI',
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
