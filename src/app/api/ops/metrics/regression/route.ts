import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RegressionAI } from '@/lib/regression/regressionAI'
import { loadBaselines, getLatestBaseline } from '../../../../../../scripts/ops-baseline-store'
import type { P95Metrics, BookingMetrics, ErrorMetrics, SystemMetrics } from '@/lib/metrics/metricsAI'

/**
 * GET /ops/metrics/regression
 * 
 * RegressionAI endpoint - compares current metrics to historical baselines
 * Detects P95 degradations, booking flow slowdowns, and error bumps after deploys
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client inside handler with safety checks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          agent: 'RegressionAI',
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
    const metricType = searchParams.get('metricType') // Optional: 'p95' | 'booking' | 'error' | 'system'

    // Validate timeRange parameter
    const validTimeRanges = ['15m', '1h', '6h', '24h']
    if (!validTimeRanges.includes(timeRange)) {
      return NextResponse.json(
        { success: false, error: 'Invalid timeRange parameter', validValues: validTimeRanges },
        { status: 400 }
      )
    }

    // Validate metricType if provided
    if (metricType) {
      const validMetricTypes = ['p95', 'booking', 'error', 'system']
      if (!validMetricTypes.includes(metricType)) {
        return NextResponse.json(
          { success: false, error: 'Invalid metricType parameter', validValues: validMetricTypes },
          { status: 400 }
        )
      }
    }

    // Calculate time range
    const now = new Date()
    let startTime: Date

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

    // Load baselines
    const baselines = loadBaselines()

    if (baselines.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No baselines available. Please establish baselines first.',
        recommendation: 'Use POST /api/ops/baseline to create baselines from historical data'
      }, { status: 400 })
    }

    // Fetch current metrics
    const currentMetrics: {
      p95?: P95Metrics[]
      booking?: BookingMetrics[]
      error?: ErrorMetrics[]
      system?: SystemMetrics[]
    } = {}

    // Fetch P95 metrics if requested
    if (!metricType || metricType === 'p95') {
      let p95Query = supabase
        .from('api_metrics_5m')
        .select('bucket, endpoint, method, p95_ms, p99_ms, reqs')
        .gte('bucket', startTime.toISOString())
        .order('bucket', { ascending: true })

      if (endpoint) {
        p95Query = p95Query.eq('endpoint', endpoint)
      }

      const { data: apiMetrics, error: p95Error } = await Promise.race([
        p95Query,
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('P95 metrics query timeout')), 30000)
        )
      ]).catch((error) => {
        console.warn('RegressionAI: P95 query timeout or error:', error)
        return { data: null, error: { message: error instanceof Error ? error.message : 'Query timeout' } }
      }) as { data: any; error: any }

      if (p95Error && !apiMetrics) {
        // Continue with fallback, don't fail completely
        console.warn('RegressionAI: P95 query failed, trying fallback:', p95Error)
      }

      if (apiMetrics && apiMetrics.length > 0) {
        currentMetrics.p95 = apiMetrics.map((item: any) => ({
          timestamp: item.bucket,
          endpoint: item.endpoint || 'unknown',
          method: item.method || 'GET',
          p95_latency_ms: item.p95_ms || 0,
          p99_latency_ms: item.p99_ms || 0,
          avg_latency_ms: 0,
          request_count: item.reqs || 0
        }))
      } else {
        // Fallback to performance_analytics_5min
        let fallbackQuery = supabase
          .from('performance_analytics_5min')
          .select('five_minute_bucket, endpoint, method, p95_response_time_ms, request_count')
          .gte('five_minute_bucket', startTime.toISOString())
          .order('five_minute_bucket', { ascending: true })

        if (endpoint) {
          fallbackQuery = fallbackQuery.eq('endpoint', endpoint)
        }

        const { data: fallbackData } = await fallbackQuery

        if (fallbackData && fallbackData.length > 0) {
          currentMetrics.p95 = fallbackData.map((item: any) => ({
            timestamp: item.five_minute_bucket,
            endpoint: item.endpoint || 'unknown',
            method: item.method || 'GET',
            p95_latency_ms: item.p95_response_time_ms || 0,
            p99_latency_ms: item.p95_response_time_ms ? item.p95_response_time_ms * 1.2 : 0,
            avg_latency_ms: 0,
            request_count: item.request_count || 0
          }))
        }
      }
    }

    // Fetch booking metrics if requested
    if (!metricType || metricType === 'booking') {
      const { data: bookings, error: bookingError } = await Promise.race([
        supabase
          .from('bookings')
          .select('id, status, created_at, confirmed_at, cancelled_at, total_amount_cents, price_cents')
          .gte('created_at', startTime.toISOString())
          .order('created_at', { ascending: true }),
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('Booking metrics query timeout')), 30000)
        )
      ]).catch((error) => {
        console.warn('RegressionAI: Booking query timeout or error:', error)
        return { data: null, error: { message: error instanceof Error ? error.message : 'Query timeout' } }
      }) as { data: any; error: any }

      if (bookingError) {
        console.warn('RegressionAI: Booking query failed:', bookingError)
      }

      if (bookings && Array.isArray(bookings) && bookings.length > 0) {
        const bucketMap = new Map<string, {
          bookings_created: number
          bookings_confirmed: number
          bookings_cancelled: number
          bookings_completed: number
          total_revenue_cents: number
        }>()

        for (const booking of bookings) {
          const bucketTime = new Date(booking.created_at)
          bucketTime.setMinutes(Math.floor(bucketTime.getMinutes() / 5) * 5, 0, 0)
          const bucketKey = bucketTime.toISOString()

          if (!bucketMap.has(bucketKey)) {
            bucketMap.set(bucketKey, {
              bookings_created: 0,
              bookings_confirmed: 0,
              bookings_cancelled: 0,
              bookings_completed: 0,
              total_revenue_cents: 0
            })
          }

          const bucket = bucketMap.get(bucketKey)!
          bucket.bookings_created++

          const amount = booking.total_amount_cents || booking.price_cents || 0
          bucket.total_revenue_cents += amount

          if (booking.status === 'confirmed' || booking.confirmed_at) {
            bucket.bookings_confirmed++
          }
          if (booking.status === 'cancelled') {
            bucket.bookings_cancelled++
          }
          if (booking.status === 'completed') {
            bucket.bookings_completed++
          }
        }

        currentMetrics.booking = Array.from(bucketMap.entries())
          .map(([timestamp, data]) => ({
            timestamp,
            bookings_created: data.bookings_created,
            bookings_confirmed: data.bookings_confirmed,
            bookings_cancelled: data.bookings_cancelled,
            bookings_completed: data.bookings_completed,
            total_revenue_cents: data.total_revenue_cents,
            avg_booking_value_cents: data.bookings_created > 0
              ? data.total_revenue_cents / data.bookings_created
              : 0
          }))
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      }
    }

    // Fetch error metrics if requested
    if (!metricType || metricType === 'error') {
      let errorQuery = supabase
        .from('performance_metrics')
        .select('endpoint, method, status_code, created_at')
        .gte('created_at', startTime.toISOString())
        .gte('status_code', 400)
        .order('created_at', { ascending: true })

      if (endpoint) {
        errorQuery = errorQuery.eq('endpoint', endpoint)
      }

      const { data: errors, error: errorQueryError } = await Promise.race([
        errorQuery,
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('Error metrics query timeout')), 30000)
        )
      ]).catch((error) => {
        console.warn('RegressionAI: Error query timeout or error:', error)
        return { data: null, error: { message: error instanceof Error ? error.message : 'Query timeout' } }
      }) as { data: any; error: any }

      const { count: totalRequests } = await Promise.race([
        supabase
          .from('performance_metrics')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startTime.toISOString()),
        new Promise<{ count: null }>((_, reject) =>
          setTimeout(() => reject(new Error('Total requests query timeout')), 30000)
        )
      ]).catch((error) => {
        console.warn('RegressionAI: Total requests query timeout or error:', error)
        return { count: null }
      }) as { count: number | null }

      if (errorQueryError) {
        console.warn('RegressionAI: Error query failed:', errorQueryError)
      }

      if (errors && Array.isArray(errors) && errors.length > 0) {
        const bucketMap = new Map<string, {
          total_errors: number
          status_4xx: number
          status_5xx: number
          endpoint_errors: Map<string, { count: number; method: string }>
        }>()

        for (const error of errors) {
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

        currentMetrics.error = Array.from(bucketMap.entries())
          .map(([timestamp, data]) => {
            const errorRate = totalRequests && totalRequests > 0
              ? (data.total_errors / totalRequests) * 100
              : 0

            const topErrorEndpoints = Array.from(data.endpoint_errors.entries())
              .map(([endpointKey, info]) => {
                const [method, ...endpointParts] = endpointKey.split(' ')
                const endpoint = endpointParts.join(' ')
                return {
                  endpoint,
                  method: info.method,
                  error_count: info.count,
                  error_rate_percent: totalRequests && totalRequests > 0
                    ? (info.count / totalRequests) * 100
                    : 0
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
    }

    // Fetch system metrics if requested
    if (!metricType || metricType === 'system') {
      const { data: performanceData, error: systemError } = await Promise.race([
        supabase
          .from('performance_analytics_5min')
          .select('five_minute_bucket, cache_hit_rate_percent, avg_database_queries, request_count')
          .gte('five_minute_bucket', startTime.toISOString())
          .order('five_minute_bucket', { ascending: true }),
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('System metrics query timeout')), 30000)
        )
      ]).catch((error) => {
        console.warn('RegressionAI: System query timeout or error:', error)
        return { data: null, error: { message: error instanceof Error ? error.message : 'Query timeout' } }
      }) as { data: any; error: any }

      if (systemError) {
        console.warn('RegressionAI: System query failed:', systemError)
      }

      if (performanceData && performanceData.length > 0) {
        currentMetrics.system = performanceData.map((item: any) => {
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
    }

    // Run regression detection
    const report = RegressionAI.detectRegressions(currentMetrics, baselines)

    return NextResponse.json({
      success: true,
      report,
      time_range: {
        start: startTime.toISOString(),
        end: now.toISOString(),
        duration: timeRange
      },
      metrics_analyzed: {
        p95: currentMetrics.p95?.length || 0,
        booking: currentMetrics.booking?.length || 0,
        error: currentMetrics.error?.length || 0,
        system: currentMetrics.system?.length || 0
      }
    })

  } catch (error) {
    console.error('Regression detection endpoint error:', error)
    return NextResponse.json(
      {
        agent: 'RegressionAI',
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
