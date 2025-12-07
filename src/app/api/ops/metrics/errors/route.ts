import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOpsMode } from '../../_config'
import {
  fetchSimcitySnapshot,
  simcityToErrorMetrics
} from '../../_simcity/ops-from-simcity'
import { MetricsAI, ErrorMetrics } from '@/lib/metrics/metricsAI'

/**
 * GET /ops/metrics/errors
 * 
 * Returns error rate metrics analysis
 * MetricsAI analyzes trends and detects anomalies
 */
export async function GET(request: NextRequest) {
  if (getOpsMode() === 'simcity') {
    try {
      const { metrics } = await fetchSimcitySnapshot(request.nextUrl.origin)
      return NextResponse.json(simcityToErrorMetrics(metrics))
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to load SimCity error metrics',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      )
    }
  }

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

    // Fetch error metrics from performance_metrics
    let errorQuery = supabase
      .from('performance_metrics')
      .select('endpoint, method, status_code, created_at')
      .gte('created_at', startTime.toISOString())
      .gte('status_code', 400)
      .order('created_at', { ascending: true })

    if (endpoint) {
      errorQuery = errorQuery.eq('endpoint', endpoint)
    }

    const { data: errors, error: errorsError } = await errorQuery

    if (errorsError) {
      console.error('Failed to fetch error metrics:', errorsError)
      return NextResponse.json(
        {
          agent: 'MetricsAI',
          error: 'Failed to fetch error metrics',
          message: errorsError.message || 'Database query failed',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Fetch total requests for error rate calculation
    let totalQuery = supabase
      .from('performance_metrics')
      .select('endpoint, method, status_code, created_at', { count: 'exact' })
      .gte('created_at', startTime.toISOString())

    if (endpoint) {
      totalQuery = totalQuery.eq('endpoint', endpoint)
    }

    const { count: totalRequests, error: totalError } = await totalQuery

    if (totalError) {
      console.warn('Failed to fetch total requests:', totalError)
    }

    // Group errors by 5-minute buckets
    const bucketMap = new Map<string, {
      total_errors: number
      status_4xx: number
      status_5xx: number
      endpoint_errors: Map<string, { count: number; method: string }>
    }>()

    for (const error of errors || []) {
      const bucketTime = new Date(error.created_at)
      bucketTime.setMinutes(Math.floor(bucketTime.getMinutes() / 5) * 5, 0, 0)
      const bucketKey = bucketTime.toISOString()

      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          total_errors: 0,
          status_4xx: 0,
          status_5xx: 0,
          endpoint_errors: new Map()
        })
      }

      const bucket = bucketMap.get(bucketKey)!
      bucket.total_errors++

      if (error.status_code >= 400 && error.status_code < 500) {
        bucket.status_4xx++
      } else if (error.status_code >= 500) {
        bucket.status_5xx++
      }

      const endpointKey = `${error.method} ${error.endpoint}`
      if (!bucket.endpoint_errors.has(endpointKey)) {
        bucket.endpoint_errors.set(endpointKey, { count: 0, method: error.method || 'GET' })
      }
      bucket.endpoint_errors.get(endpointKey)!.count++
    }

    // Convert to ErrorMetrics array
    const errorMetrics: ErrorMetrics[] = Array.from(bucketMap.entries())
      .map(([timestamp, data]) => {
        const errorRate = totalRequests && totalRequests > 0
          ? (data.total_errors / totalRequests) * 100
          : 0

        const topErrorEndpoints = Array.from(data.endpoint_errors.entries())
          .map(([endpointKey, info]) => {
            const [method, ...endpointParts] = endpointKey.split(' ')
            const endpoint = endpointParts.join(' ')
            const endpointErrorRate = totalRequests && totalRequests > 0
              ? (info.count / totalRequests) * 100
              : 0

            return {
              endpoint,
              method: info.method,
              error_count: info.count,
              error_rate_percent: endpointErrorRate
            }
          })
          .sort((a, b) => b.error_count - a.error_count)
          .slice(0, 10)

        return {
          timestamp,
          total_errors: data.total_errors,
          error_rate_percent: errorRate,
          status_4xx: data.status_4xx,
          status_5xx: data.status_5xx,
          top_error_endpoints: topErrorEndpoints
        }
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    // Fetch previous period if requested
    let previousMetrics: ErrorMetrics[] | undefined
    if (compareStartTime && compareWith) {
      let prevErrorQuery = supabase
        .from('performance_metrics')
        .select('endpoint, method, status_code, created_at')
        .gte('created_at', compareStartTime.toISOString())
        .lt('created_at', startTime.toISOString())
        .gte('status_code', 400)
        .order('created_at', { ascending: true })

      if (endpoint) {
        prevErrorQuery = prevErrorQuery.eq('endpoint', endpoint)
      }

      const { data: prevErrors } = await prevErrorQuery

      let prevTotalQuery = supabase
        .from('performance_metrics')
        .select('endpoint, method, status_code, created_at', { count: 'exact' })
        .gte('created_at', compareStartTime.toISOString())
        .lt('created_at', startTime.toISOString())

      if (endpoint) {
        prevTotalQuery = prevTotalQuery.eq('endpoint', endpoint)
      }

      const { count: prevTotalRequests } = await prevTotalQuery

      const prevBucketMap = new Map<string, {
        total_errors: number
        status_4xx: number
        status_5xx: number
        endpoint_errors: Map<string, { count: number; method: string }>
      }>()

      for (const error of prevErrors || []) {
        const bucketTime = new Date(error.created_at)
        bucketTime.setMinutes(Math.floor(bucketTime.getMinutes() / 5) * 5, 0, 0)
        const bucketKey = bucketTime.toISOString()

        if (!prevBucketMap.has(bucketKey)) {
          prevBucketMap.set(bucketKey, {
            total_errors: 0,
            status_4xx: 0,
            status_5xx: 0,
            endpoint_errors: new Map()
          })
        }

        const bucket = prevBucketMap.get(bucketKey)!
        bucket.total_errors++

        if (error.status_code >= 400 && error.status_code < 500) {
          bucket.status_4xx++
        } else if (error.status_code >= 500) {
          bucket.status_5xx++
        }

        const endpointKey = `${error.method} ${error.endpoint}`
        if (!bucket.endpoint_errors.has(endpointKey)) {
          bucket.endpoint_errors.set(endpointKey, { count: 0, method: error.method || 'GET' })
        }
        bucket.endpoint_errors.get(endpointKey)!.count++
      }

      previousMetrics = Array.from(prevBucketMap.entries())
        .map(([timestamp, data]) => {
          const errorRate = prevTotalRequests && prevTotalRequests > 0
            ? (data.total_errors / prevTotalRequests) * 100
            : 0

          const topErrorEndpoints = Array.from(data.endpoint_errors.entries())
            .map(([endpointKey, info]) => {
              const [method, ...endpointParts] = endpointKey.split(' ')
              const endpoint = endpointParts.join(' ')
              const endpointErrorRate = prevTotalRequests && prevTotalRequests > 0
                ? (info.count / prevTotalRequests) * 100
                : 0

              return {
                endpoint,
                method: info.method,
                error_count: info.count,
                error_rate_percent: endpointErrorRate
              }
            })
            .sort((a, b) => b.error_count - a.error_count)
            .slice(0, 10)

          return {
            timestamp,
            total_errors: data.total_errors,
            error_rate_percent: errorRate,
            status_4xx: data.status_4xx,
            status_5xx: data.status_5xx,
            top_error_endpoints: topErrorEndpoints
          }
        })
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    }

    // Analyze with MetricsAI
    const analysis = MetricsAI.analyzeErrorMetrics(errorMetrics, previousMetrics)

    return NextResponse.json({
      success: true,
      analysis,
      raw_metrics: errorMetrics,
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
    console.error('Error metrics endpoint error:', error)
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
