import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { rateLimit } from '@/lib/ratelimit'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function GET(request: NextRequest) {
  try {
    // Get session from request headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract user info from auth header
    const token = authHeader.replace('Bearer ', '')
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const adminUser = await requireAdmin({ user })
    
    // Apply rate limiting
    const rateLimitKey = `admin:${adminUser.email}:performance`
    if (!rateLimit(rateLimitKey, 60, 1)) { // 60 requests per minute
      return NextResponse.json(
        { error: 'Too Many Requests', hint: 'Rate limit exceeded. Please wait before retrying.' },
        { status: 429 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '1h' // 1h, 6h, 24h
    const endpoint = searchParams.get('endpoint')

    // Calculate time range in UTC
    const now = new Date()
    let startTime: Date
    
    switch (timeRange) {
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

    // Fetch 5-minute performance metrics
    let query = supabase
      .from('performance_analytics_5min')
      .select('*')
      .gte('five_minute_bucket', startTime.toISOString())
      .order('five_minute_bucket', { ascending: true })

    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    }

    const { data: performanceData, error: perfError } = await query

    if (perfError) {
      console.error('Performance data fetch error:', perfError)
      
      // Provide generic RLS error hints - never echo table/column names or policy text
      if (perfError.code === '42501' || perfError.message.includes('permission denied')) {
        return NextResponse.json({
          error: 'Permission denied',
          hint: 'Check: admin role assigned? Session valid? Contact support if issue persists.',
          code: perfError.code
        }, { status: 403 })
      }
      
      return NextResponse.json({
        error: 'Failed to fetch performance data',
        hint: 'Please try again later or contact support'
      }, { status: 500 })
    }

    // Fetch API metrics from 5-minute rollup
    let apiQuery = supabase
      .from('api_metrics_5m')
      .select('*')
      .gte('bucket', startTime.toISOString())
      .order('bucket', { ascending: true })

    if (endpoint) {
      apiQuery = apiQuery.eq('endpoint', endpoint)
    }

    const { data: apiMetrics, error: apiError } = await apiQuery

    if (apiError) {
      console.warn('API metrics fetch warning:', apiError)
    }

    // Fetch current system performance metrics
    const { data: currentMetrics, error: currentError } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (currentError) {
      console.warn('Current metrics fetch warning:', currentError)
    }

    // Calculate summary statistics
    const summary = {
      totalRequests: performanceData?.reduce((sum: number, item: any) => sum + (item.request_count || 0), 0) || 0,
      avgResponseTime: performanceData?.reduce((sum: number, item: any) => sum + (item.avg_response_time_ms || 0), 0) / (performanceData?.length || 1) || 0,
      p95ResponseTime: performanceData?.reduce((sum: number, item: any) => sum + (item.p95_response_time_ms || 0), 0) / (performanceData?.length || 1) || 0,
      p99ResponseTime: performanceData?.reduce((sum: number, item: any) => sum + (item.p99_response_time_ms || 0), 0) / (performanceData?.length || 1) || 0,
      errorRate: apiMetrics?.reduce((sum: number, item: any) => sum + (item.err_rate || 0), 0) / (apiMetrics?.length || 1) || 0,
      cacheHitRate: performanceData?.reduce((sum: number, item: any) => sum + (item.cache_hit_rate || 0), 0) / (performanceData?.length || 1) || 0
    }

    return NextResponse.json({
      data: {
        performance: performanceData || [],
        apiMetrics: apiMetrics || [],
        currentMetrics: currentMetrics || [],
        summary
      },
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      timezone: 'UTC', // Explicitly label timezone
      timezoneNote: 'All timestamps are in UTC'
    })

  } catch (error) {
    console.error('Performance API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later or contact support'
    }, { status: 500 })
  }
}

