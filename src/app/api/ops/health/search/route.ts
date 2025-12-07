import { NextResponse } from 'next/server'

/**
 * Search health check endpoint
 * HealthAI monitors this to detect search service issues, vector search availability, and query performance
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  
  try {
    const { getServerSupabase } = await import('@/lib/supabaseClient')
    const supabase = getServerSupabase()
    
    const checks: Record<string, any> = {}
    const recommendations: string[] = []
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Test 1: Basic provider search
    const basicSearchStart = Date.now()
    const { data: basicResults, error: basicError } = await supabase
      .from('profiles')
      .select('id, name, user_type')
      .eq('user_type', 'provider')
      .limit(1)
    const basicSearchLatency = Date.now() - basicSearchStart

    if (basicError) {
      checks.basicSearch = { status: 'failed', error: basicError.message, latency: basicSearchLatency }
      overallStatus = 'unhealthy'
      recommendations.push('Basic provider search failing - check database connectivity')
    } else {
      checks.basicSearch = { status: 'passed', latency: basicSearchLatency, results: basicResults?.length || 0 }
      if (basicSearchLatency > 1000) {
        recommendations.push(`Basic search latency elevated: ${basicSearchLatency}ms`)
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      }
    }

    // Test 2: Vector search (pgvector) availability
    let vectorSearchAvailable = false
    let vectorSearchLatency = null
    try {
      const vectorStart = Date.now()
      const { data: vectorData, error: vectorError } = await supabase.rpc('kb_search', {
        q_embedding: Array(1536).fill(0), // Dummy embedding for test
        k: 1,
        in_locale: null,
        in_section: null
      })
      vectorSearchLatency = Date.now() - vectorStart

      if (vectorError) {
        if (vectorError.message.includes('function') || vectorError.message.includes('does not exist')) {
          checks.vectorSearch = { status: 'unavailable', message: 'Vector search function not available' }
          recommendations.push('Vector search (pgvector) not configured - using fallback text search')
          overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
        } else {
          checks.vectorSearch = { status: 'failed', error: vectorError.message, latency: vectorSearchLatency }
          overallStatus = 'unhealthy'
        }
      } else {
        vectorSearchAvailable = true
        checks.vectorSearch = { status: 'passed', latency: vectorSearchLatency, available: true }
        if (vectorSearchLatency > 2000) {
          recommendations.push(`Vector search latency elevated: ${vectorSearchLatency}ms`)
          overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
        }
      }
    } catch (error) {
      checks.vectorSearch = { 
        status: 'unavailable', 
        error: error instanceof Error ? error.message : 'Vector search check failed' 
      }
      recommendations.push('Vector search unavailable - check pgvector extension')
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
    }

    // Test 3: Service search (with joins)
    const serviceSearchStart = Date.now()
    const { data: serviceResults, error: serviceError } = await supabase
      .from('services')
      .select('id, name, category')
      .limit(1)
    const serviceSearchLatency = Date.now() - serviceSearchStart

    if (serviceError) {
      checks.serviceSearch = { status: 'failed', error: serviceError.message, latency: serviceSearchLatency }
      overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy'
      recommendations.push('Service search failing - check services table access')
    } else {
      checks.serviceSearch = { status: 'passed', latency: serviceSearchLatency, results: serviceResults?.length || 0 }
      if (serviceSearchLatency > 1000) {
        recommendations.push(`Service search latency elevated: ${serviceSearchLatency}ms`)
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Search system operating normally')
    }

    return NextResponse.json({
      status: overallStatus,
      timestamp,
      checks,
      metrics: {
        basicSearchLatency,
        vectorSearchLatency,
        serviceSearchLatency,
        vectorSearchAvailable
      },
      recommendations
    }, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Search health check failed',
      recommendations: [
        'Search health check system unavailable',
        'Review application logs for search-related errors',
        'Verify database tables and RLS policies'
      ]
    }, { status: 503 })
  }
}
