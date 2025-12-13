import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body for custom refresh options
    const body = await request.json().catch(() => ({}))
    const { 
      useStaggered = true
    } = body

    interface RefreshResult {
      success: boolean
      message?: string
      [key: string]: unknown
    }
    let refreshResults: RefreshResult | undefined

    if (useStaggered) {
      // Use staggered refresh for better performance
      const { data: staggeredResults, error: staggeredError } = await supabase
        .rpc('refresh_materialized_views_staggered')

      if (staggeredError) {
        console.error('Staggered refresh error:', staggeredError)
        return NextResponse.json({
          error: 'Failed to refresh materialized views',
          hint: 'Please try again later or contact support'
        }, { status: 500 })
      }

      refreshResults = staggeredResults
    } else {
      // Use concurrent refresh for faster execution
      const { data: concurrentResults, error: concurrentError } = await supabase
        .rpc('refresh_analytics_views_concurrent')

      if (concurrentError) {
        console.error('Concurrent refresh error:', concurrentError)
        return NextResponse.json({
          error: 'Failed to refresh analytics views',
          hint: 'Please try again later or contact support'
        }, { status: 500 })
      }

      refreshResults = concurrentResults
    }

    // Get refresh log for monitoring
    const { data: refreshLog, error: logError } = await supabase
      .from('mv_refresh_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    if (logError) {
      console.warn('Refresh log fetch warning:', logError)
    }

    // Check for any failed refreshes
    const failedRefreshes = refreshLog?.filter(log => !log.ok) || []
    const successfulRefreshes = refreshLog?.filter(log => log.ok) || []

    // Calculate summary
    const summary = {
      totalRefreshes: refreshLog?.length || 0,
      successfulRefreshes: successfulRefreshes.length,
      failedRefreshes: failedRefreshes.length,
      totalDuration: refreshResults?.total_duration_ms || 0,
      lastRefresh: refreshLog?.[0]?.started_at || null,
      refreshMethod: useStaggered ? 'staggered' : 'concurrent'
    }

    // Check if any critical failures occurred
    if (failedRefreshes.length > 2) {
      console.error('Multiple materialized view refresh failures detected:', failedRefreshes)
    }

    return NextResponse.json({
      summary,
      refreshResults: refreshResults || {},
      refreshLog: refreshLog || [],
      failedRefreshes,
      successfulRefreshes,
      timezone: 'UTC',
      timezoneNote: 'All timestamps are in UTC',
      recommendations: failedRefreshes.length > 0 ? [
        'Check database logs for refresh errors',
        'Verify materialized view unique indexes exist',
        'Consider using staggered refresh for better reliability'
      ] : []
    })

  } catch (error) {
    console.error('Materialized view refresh API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later or contact support'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get refresh log for monitoring
    const { data: refreshLog, error: logError } = await supabase
      .from('mv_refresh_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50)

    if (logError) {
      console.error('Refresh log fetch error:', logError)
      return NextResponse.json({
        error: 'Failed to fetch refresh log',
        hint: 'Please try again later or contact support'
      }, { status: 500 })
    }

    // Get materialized view status
    const { data: mvStatus, error: statusError } = await supabase
      .rpc('verify_materialized_view_indexes')

    if (statusError) {
      console.warn('MV status check warning:', statusError)
    }

    // Calculate summary statistics
    const summary = {
      totalRefreshes: refreshLog?.length || 0,
      successfulRefreshes: refreshLog?.filter(log => log.ok).length || 0,
      failedRefreshes: refreshLog?.filter(log => !log.ok).length || 0,
      averageDuration: refreshLog?.filter(log => log.duration_ms)
        .reduce((sum, log) => sum + (log.duration_ms || 0), 0) / 
        (refreshLog?.filter(log => log.duration_ms).length || 1) || 0,
      lastRefresh: refreshLog?.[0]?.started_at || null,
      materializedViewsIndexed: mvStatus?.all_indexed || false
    }

    return NextResponse.json({
      summary,
      refreshLog: refreshLog || [],
      mvStatus: mvStatus || {},
      timezone: 'UTC',
      timezoneNote: 'All timestamps are in UTC'
    })

  } catch (error) {
    console.error('Refresh log API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later or contact support'
    }, { status: 500 })
  }
}
