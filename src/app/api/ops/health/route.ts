import { NextRequest, NextResponse } from 'next/server'
import { getOpsMode } from '../_config'
import {
  fetchSimcitySnapshot,
  simcityToHealth
} from '../_simcity/ops-from-simcity'

/**
 * Main health endpoint - aggregates all subsystem health checks
 * HealthAI monitors this endpoint to get overall system status
 */
export async function GET(request: NextRequest) {
  if (getOpsMode() === 'simcity') {
    try {
      const { metrics, violations } = await fetchSimcitySnapshot(request.nextUrl.origin)
      return NextResponse.json(simcityToHealth(metrics, violations))
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to load SimCity health',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      )
    }
  }

  const timestamp = new Date().toISOString()
  
  try {
    // Check all subsystems in parallel
    const [dbHealth, webhookHealth, cacheHealth, searchHealth, authHealth] = await Promise.allSettled([
      checkDatabase(),
      checkWebhooks(),
      checkCache(),
      checkSearch(),
      checkAuth()
    ])

    const subsystems = {
      db: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'unhealthy', error: 'check failed' },
      webhooks: webhookHealth.status === 'fulfilled' ? webhookHealth.value : { status: 'unhealthy', error: 'check failed' },
      cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : { status: 'unhealthy', error: 'check failed' },
      search: searchHealth.status === 'fulfilled' ? searchHealth.value : { status: 'unhealthy', error: 'check failed' },
      auth: authHealth.status === 'fulfilled' ? authHealth.value : { status: 'unhealthy', error: 'check failed' }
    }

    // Determine overall status
    const allHealthy = Object.values(subsystems).every(s => s.status === 'healthy')
    const anyUnhealthy = Object.values(subsystems).some(s => s.status === 'unhealthy')
    const overallStatus = allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded'

    return NextResponse.json({
      status: overallStatus,
      timestamp,
      subsystems,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development'
    }, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error',
      subsystems: {}
    }, { status: 503 })
  }
}

async function checkDatabase() {
  try {
    const { getServerSupabase } = await import('@/lib/supabaseServer')
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
    
    const startTime = Date.now()
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    const latency = Date.now() - startTime
    
    if (error) {
      return {
        status: 'unhealthy' as const,
        latency,
        error: error.message,
        code: error.code
      }
    }

    return {
      status: 'healthy' as const,
      latency,
      message: 'Database connection successful'
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Database check failed'
    }
  }
}

async function checkWebhooks() {
  try {
    const { dlqMonitor } = await import('@/lib/observability/dlqMonitor')
    const dlqStatus = await dlqMonitor.getStatus()
    
    // Check if DLQ is healthy (under threshold)
    const isHealthy = dlqStatus.size < 20 // DLQ threshold
    
    // Check webhook processing (simplified - could be enhanced)
    return {
      status: isHealthy ? 'healthy' as const : 'degraded' as const,
      dlqSize: dlqStatus.size,
      dlqOverThresholdSince: dlqStatus.overThresholdSince,
      message: isHealthy 
        ? 'Webhook processing normal' 
        : 'DLQ size elevated - review failed webhooks'
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Webhook check failed'
    }
  }
}

async function checkCache() {
  try {
    // Check cache invalidation queue health
    const { getServerSupabase } = await import('@/lib/supabaseServer')
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
    
    const { data: queueStats, error } = await supabase
      .from('cache_invalidation_queue')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null)
    
    if (error) {
      // Cache queue might not exist in all environments
      return {
        status: 'degraded' as const,
        message: 'Cache queue check unavailable',
        error: error.message
      }
    }

    const pendingCount = queueStats?.length || 0
    const isHealthy = pendingCount < 100 // Threshold for pending invalidations
    
    return {
      status: isHealthy ? 'healthy' as const : 'degraded' as const,
      pendingInvalidations: pendingCount,
      message: isHealthy 
        ? 'Cache system operating normally' 
        : `Elevated cache invalidation queue: ${pendingCount} pending`
    }
  } catch (error) {
    return {
      status: 'degraded' as const,
      error: error instanceof Error ? error.message : 'Cache check failed'
    }
  }
}

async function checkSearch() {
  try {
    const { getServerSupabase } = await import('@/lib/supabaseServer')
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
    
    // Test basic search functionality
    const startTime = Date.now()
    const { error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('user_type', 'provider')
      .limit(1)
    
    const latency = Date.now() - startTime
    
    if (error) {
      return {
        status: 'unhealthy' as const,
        latency,
        error: error.message
      }
    }

    // Check if vector search is available (pgvector)
    try {
      await supabase.rpc('kb_search', {
        q_embedding: Array(1536).fill(0), // Dummy embedding
        k: 1,
        in_locale: null,
        in_section: null
      })
      
      return {
        status: 'healthy' as const,
        latency,
        vectorSearchAvailable: true,
        message: 'Search system operational'
      }
    } catch {
      // Vector search might not be available, but basic search works
      return {
        status: 'healthy' as const,
        latency,
        vectorSearchAvailable: false,
        message: 'Basic search operational (vector search unavailable)'
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Search check failed'
    }
  }
}

async function checkAuth() {
  try {
    const { getServerSupabase } = await import('@/lib/supabaseServer')
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
    
    // Check auth service availability
    const startTime = Date.now()
    const { data: { session }, error } = await supabase.auth.getSession()
    const latency = Date.now() - startTime
    
    // Auth service is healthy if we can call it (even without a session)
    if (error && error.message.includes('JWT')) {
      // JWT errors are expected when no session exists
      return {
        status: 'healthy' as const,
        latency,
        message: 'Auth service responding (no active session)'
      }
    }
    
    if (error) {
      return {
        status: 'unhealthy' as const,
        latency,
        error: error.message
      }
    }

    return {
      status: 'healthy' as const,
      latency,
      hasSession: !!session,
      message: 'Auth service operational'
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Auth check failed'
    }
  }
}
