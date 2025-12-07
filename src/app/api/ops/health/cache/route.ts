import { NextResponse } from 'next/server'

/**
 * Cache health check endpoint
 * HealthAI monitors this to detect cache invalidation issues, queue buildup, and performance degradation
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  
  try {
    const { getServerSupabase } = await import('@/lib/supabaseClient')
    const supabase = getServerSupabase()
    
    // Check cache invalidation queue
    let queueStats = null
    try {
      const { data: pending, error: queueError } = await supabase
        .from('cache_invalidation_queue')
        .select('id, tag, enqueued_at, processed_at, retry_count')
        .is('processed_at', null)
        .order('enqueued_at', { ascending: true })
        .limit(100)
      
      if (!queueError && pending) {
        const oldestPending = pending.length > 0 ? pending[0] : null
        const highRetryCount = pending.filter(p => (p.retry_count || 0) >= 3).length
        
        queueStats = {
          pending: pending.length,
          oldestPendingAge: oldestPending 
            ? Math.floor((Date.now() - new Date(oldestPending.enqueued_at).getTime()) / 1000)
            : null,
          highRetryCount,
          tags: [...new Set(pending.map(p => p.tag))].slice(0, 10)
        }
      }
    } catch (error) {
      // cache_invalidation_queue might not exist
      queueStats = { available: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // Try to get cache performance metrics if available
    let performanceMetrics = null
    try {
      const { cachePerformanceMonitor } = await import('@/lib/cache/monitoring')
      const healthSummary = await cachePerformanceMonitor.getCacheHealthSummary()
      performanceMetrics = healthSummary
    } catch {
      // Cache monitoring might not be available
      performanceMetrics = { available: false }
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    const recommendations: string[] = []

    if (queueStats && 'pending' in queueStats) {
      if (queueStats.pending > 100) {
        status = 'unhealthy'
        recommendations.push(`Cache invalidation queue has ${queueStats.pending} pending items`)
        recommendations.push('Queue processing may be stuck - investigate cache worker')
      } else if (queueStats.pending > 50) {
        status = 'degraded'
        recommendations.push(`Cache invalidation queue elevated: ${queueStats.pending} pending`)
        recommendations.push('Monitor queue processing rate')
      }
      
      if (queueStats.oldestPendingAge && queueStats.oldestPendingAge > 3600) {
        status = status === 'healthy' ? 'degraded' : status
        recommendations.push(`Oldest pending invalidation is ${Math.floor(queueStats.oldestPendingAge / 60)} minutes old`)
      }
      
      if (queueStats.highRetryCount > 0) {
        status = status === 'healthy' ? 'degraded' : status
        recommendations.push(`${queueStats.highRetryCount} cache invalidations with high retry count`)
      }
    }

    if (performanceMetrics && 'overallHitRate' in performanceMetrics) {
      const hitRate = performanceMetrics.overallHitRate as number
      if (hitRate < 0.3) {
        status = status === 'healthy' ? 'degraded' : status
        recommendations.push(`Cache hit rate low: ${(hitRate * 100).toFixed(1)}% (target: ≥30%)`)
        recommendations.push('Consider reviewing cache TTLs and warming strategies')
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache system operating normally')
    }

    return NextResponse.json({
      status,
      timestamp,
      queue: queueStats,
      performance: performanceMetrics,
      recommendations
    }, {
      status: status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Cache health check failed',
      recommendations: [
        'Cache health check system unavailable',
        'Review application logs for cache-related errors',
        'Verify cache invalidation queue table exists'
      ]
    }, { status: 503 })
  }
}
