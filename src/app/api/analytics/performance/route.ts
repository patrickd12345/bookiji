import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const endpoint = searchParams.get('endpoint')
    const method = searchParams.get('method')

    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get performance metrics from materialized view
    const { data: performanceData, error: performanceError } = await supabase
      .from('performance_analytics_hourly')
      .select('*')
      .gte('hour', startDate.toISOString())
      .order('hour', { ascending: true })

    if (performanceError) {
      console.error('Performance analytics error:', performanceError)
      return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 })
    }

    // Get real-time metrics for the last hour
    const { data: realtimeMetrics, error: realtimeError } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (realtimeError) {
      console.error('Realtime metrics error:', realtimeError)
      return NextResponse.json({ error: 'Failed to fetch realtime data' }, { status: 500 })
    }

    // Calculate summary statistics
    const summary = calculatePerformanceSummary(performanceData || [], realtimeMetrics || [])
    
    // Get endpoint-specific performance if requested
    let endpointPerformance = null
    if (endpoint) {
      endpointPerformance = await getEndpointPerformance(endpoint, method, startDate)
    }

    // Get top slow endpoints
    const topSlowEndpoints = await getTopSlowEndpoints(startDate)

    // Get error analysis
    const errorAnalysis = await getErrorAnalysis(startDate)

    return NextResponse.json({
      success: true,
      timeRange,
      summary,
      endpointPerformance,
      topSlowEndpoints,
      errorAnalysis,
      dataPoints: performanceData?.length || 0
    })

  } catch (error) {
    console.error('Performance analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculatePerformanceSummary(performanceData: any[], realtimeMetrics: any[]) {
  if (performanceData.length === 0) {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      errorRate: 0,
      activeEndpoints: 0
    }
  }

  const totalRequests = performanceData.reduce((sum, hour) => sum + hour.request_count, 0)
  const totalErrors = performanceData.reduce((sum, hour) => sum + hour.error_count, 0)
  const avgResponseTime = performanceData.reduce((sum, hour) => sum + hour.avg_response_time_ms, 0) / performanceData.length
  const p95ResponseTime = Math.max(...performanceData.map(hour => hour.p95_response_time_ms || 0))
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
  const activeEndpoints = new Set(performanceData.map(hour => hour.endpoint)).size

  return {
    totalRequests,
    avgResponseTime: Math.round(avgResponseTime),
    p95ResponseTime,
    errorRate: Math.round(errorRate * 100) / 100,
    activeEndpoints
  }
}

async function getEndpointPerformance(endpoint: string, method: string | null, startDate: Date) {
  try {
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .eq('endpoint', endpoint)
      .gte('created_at', startDate.toISOString())

    if (method) {
      query = query.eq('method', method)
    }

    const { data, error } = await query
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Endpoint performance error:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    // Group by hour for trend analysis
    const hourlyData = data.reduce((acc, metric) => {
      const hour = new Date(metric.created_at).toISOString().slice(0, 13) + ':00:00Z'
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          request_count: 0,
          total_response_time: 0,
          error_count: 0,
          status_codes: {}
        }
      }
      
      acc[hour].request_count++
      acc[hour].total_response_time += metric.response_time_ms
      if (metric.status_code >= 400) {
        acc[hour].error_count++
      }
      
      const statusKey = Math.floor(metric.status_code / 100) + 'xx'
      acc[hour].status_codes[statusKey] = (acc[hour].status_codes[statusKey] || 0) + 1
      
      return acc
    }, {} as Record<string, any>)

    // Convert to array and calculate averages
    const hourlyArray = Object.values(hourlyData).map((hour: any) => ({
      hour: hour.hour,
      request_count: hour.request_count,
      avg_response_time_ms: Math.round(hour.total_response_time / hour.request_count),
      error_rate_percent: Math.round((hour.error_count / hour.request_count) * 100 * 100) / 100,
      status_codes: hour.status_codes
    }))

    return {
      endpoint,
      method,
      total_requests: data.length,
      avg_response_time_ms: Math.round(data.reduce((sum, m) => sum + m.response_time_ms, 0) / data.length),
      p95_response_time_ms: calculatePercentile(data.map(m => m.response_time_ms), 95),
      error_rate_percent: Math.round((data.filter(m => m.status_code >= 400).length / data.length) * 100 * 100) / 100,
      hourly_trends: hourlyArray
    }
  } catch (error) {
    console.error('Endpoint performance calculation error:', error)
    return null
  }
}

async function getTopSlowEndpoints(startDate: Date) {
  try {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('endpoint, method, response_time_ms')
      .gte('created_at', startDate.toISOString())
      .order('response_time_ms', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Top slow endpoints error:', error)
      return []
    }

    if (!data) return []

    // Group by endpoint and calculate average response time
    const endpointStats = data.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`
      if (!acc[key]) {
        acc[key] = {
          endpoint: metric.endpoint,
          method: metric.method,
          total_time: 0,
          count: 0,
          max_time: 0
        }
      }
      
      acc[key].total_time += metric.response_time_ms
      acc[key].count++
      acc[key].max_time = Math.max(acc[key].max_time, metric.response_time_ms)
      
      return acc
    }, {} as Record<string, any>)

    // Convert to array and sort by average response time
    return Object.values(endpointStats)
      .map((stat: any) => ({
        endpoint: stat.endpoint,
        method: stat.method,
        avg_response_time_ms: Math.round(stat.total_time / stat.count),
        max_response_time_ms: stat.max_time,
        request_count: stat.count
      }))
      .sort((a, b) => b.avg_response_time_ms - a.avg_response_time_ms)
      .slice(0, 10)

  } catch (error) {
    console.error('Top slow endpoints error:', error)
    return []
  }
}

async function getErrorAnalysis(startDate: Date) {
  try {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('endpoint, method, status_code, response_time_ms, created_at')
      .gte('created_at', startDate.toISOString())
      .gte('status_code', 400)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error analysis error:', error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        total_errors: 0,
        error_rate_percent: 0,
        status_code_distribution: {},
        error_trends: []
      }
    }

    // Group errors by status code
    const statusCodeDistribution = data.reduce((acc, metric) => {
      const statusKey = Math.floor(metric.status_code / 100) + 'xx'
      acc[statusKey] = (acc[statusKey] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group errors by hour for trend analysis
    const hourlyErrors = data.reduce((acc, metric) => {
      const hour = new Date(metric.created_at).toISOString().slice(0, 13) + ':00:00Z'
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorTrends = Object.entries(hourlyErrors)
      .map(([hour, count]) => ({ hour, error_count: count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    // Get total requests for error rate calculation
    const { count: totalRequests } = await supabase
      .from('performance_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    const errorRate = totalRequests ? (data.length / totalRequests) * 100 : 0

    return {
      total_errors: data.length,
      error_rate_percent: Math.round(errorRate * 100) / 100,
      status_code_distribution: statusCodeDistribution,
      error_trends: errorTrends,
      top_error_endpoints: getTopErrorEndpoints(data)
    }

  } catch (error) {
    console.error('Error analysis calculation error:', error)
    return null
  }
}

function getTopErrorEndpoints(errorData: any[]) {
  const endpointErrors = errorData.reduce((acc, metric) => {
    const key = `${metric.method} ${metric.endpoint}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

      return Object.entries(endpointErrors)
      .map(([endpoint, count]) => {
        const [method, path] = endpoint.split(' ', 2)
        return { endpoint: path, method, error_count: count as number }
      })
      .sort((a, b) => (b.error_count as number) - (a.error_count as number))
      .slice(0, 10)
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  
  const sorted = values.sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

// POST endpoint to record performance metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, method, responseTimeMs, statusCode, userId, ipAddress, userAgent } = body

    if (!endpoint || !method || !responseTimeMs || !statusCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert performance metric
    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        endpoint,
        method,
        response_time_ms: responseTimeMs,
        status_code: statusCode,
        user_id: userId || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null
      })

    if (error) {
      console.error('Performance metric insert error:', error)
      return NextResponse.json({ error: 'Failed to record metric' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Performance metric recording error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
