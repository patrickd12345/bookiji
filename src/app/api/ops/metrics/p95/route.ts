import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MetricsAI, P95Metrics } from '@/lib/metrics/metricsAI'

/**
 * GET /ops/metrics/p95
 * 
 * Returns P95 latency metrics analysis
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
    const endpoint = searchParams.get('endpoint') // Optional: filter by endpoint
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

    // Fetch P95 metrics from api_metrics_5m materialized view
    let query = supabase
      .from('api_metrics_5m')
      .select('bucket, endpoint, method, p95_ms, p99_ms, reqs')
      .gte('bucket', startTime.toISOString())
      .order('bucket', { ascending: true })

    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    }

    const { data: apiMetrics, error: apiError } = await query

    if (apiError) {
      console.error('Failed to fetch API metrics:', apiError)
      // Fallback to performance_analytics_5min if api_metrics_5m is not available
      let fallbackQuery = supabase
        .from('performance_analytics_5min')
        .select('five_minute_bucket, endpoint, method, p95_response_time_ms, request_count')
        .gte('five_minute_bucket', startTime.toISOString())
        .order('five_minute_bucket', { ascending: true })

      if (endpoint) {
        fallbackQuery = fallbackQuery.eq('endpoint', endpoint)
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery

      if (fallbackError) {
        return NextResponse.json(
          {
            agent: 'MetricsAI',
            error: 'Failed to fetch P95 metrics',
            message: fallbackError.message || 'Database query failed',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        )
      }

      // Transform fallback data
      const p95Metrics: P95Metrics[] = (fallbackData || []).map((item: any) => ({
        timestamp: item.five_minute_bucket,
        endpoint: item.endpoint || 'unknown',
        method: item.method || 'GET',
        p95_latency_ms: item.p95_response_time_ms || 0,
        p99_latency_ms: item.p95_response_time_ms ? item.p95_response_time_ms * 1.2 : 0, // Estimate
        avg_latency_ms: item.avg_response_time_ms || 0,
        request_count: item.request_count || 0
      }))

      const analysis = MetricsAI.analyzeP95Metrics(p95Metrics)

      return NextResponse.json({
        success: true,
        analysis,
        raw_metrics: p95Metrics,
        time_range: {
          start: startTime.toISOString(),
          end: now.toISOString(),
          duration: timeRange
        },
        source: 'fallback'
      })
    }

    // Transform to P95Metrics format
    const p95Metrics: P95Metrics[] = (apiMetrics || []).map((item: any) => ({
      timestamp: item.bucket,
      endpoint: item.endpoint || 'unknown',
      method: item.method || 'GET',
      p95_latency_ms: item.p95_ms || 0,
      p99_latency_ms: item.p99_ms || 0,
      avg_latency_ms: 0, // Not available in api_metrics_5m
      request_count: item.reqs || 0
    }))

    // Fetch previous period if requested
    let previousMetrics: P95Metrics[] | undefined
    if (compareStartTime && compareWith) {
      let prevQuery = supabase
        .from('api_metrics_5m')
        .select('bucket, endpoint, method, p95_ms, p99_ms, reqs')
        .gte('bucket', compareStartTime.toISOString())
        .lt('bucket', startTime.toISOString())
        .order('bucket', { ascending: true })

      if (endpoint) {
        prevQuery = prevQuery.eq('endpoint', endpoint)
      }

      const { data: prevData } = await prevQuery

      previousMetrics = (prevData || []).map((item: any) => ({
        timestamp: item.bucket,
        endpoint: item.endpoint || 'unknown',
        method: item.method || 'GET',
        p95_latency_ms: item.p95_ms || 0,
        p99_latency_ms: item.p99_ms || 0,
        avg_latency_ms: 0,
        request_count: item.reqs || 0
      }))
    }

    // Analyze with MetricsAI
    const analysis = MetricsAI.analyzeP95Metrics(p95Metrics, previousMetrics)

    return NextResponse.json({
      success: true,
      analysis,
      raw_metrics: p95Metrics,
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
    console.error('P95 metrics endpoint error:', error)
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
