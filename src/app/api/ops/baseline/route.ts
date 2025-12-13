import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadBaselines, saveBaseline, getLatestBaseline, deleteBaseline } from '../../../../../scripts/ops-baseline-store'
import type { BaselineData } from '@/lib/regression/regressionAI'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /ops/baseline
 * 
 * List all baselines or get a specific baseline
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metricType = searchParams.get('metricType')
    const endpoint = searchParams.get('endpoint')
    const period = searchParams.get('period') as 'normal' | 'peak' | 'low' | null

    if (metricType && period) {
      // Get specific baseline
      const baseline = getLatestBaseline(metricType, endpoint || undefined, period)
      if (!baseline) {
        return NextResponse.json({
          success: false,
          error: 'Baseline not found'
        }, { status: 404 })
      }
      return NextResponse.json({
        success: true,
        baseline
      })
    }

    // List all baselines
    const baselines = loadBaselines(metricType || undefined, endpoint || undefined)
    
    return NextResponse.json({
      success: true,
      baselines,
      count: baselines.length
    })

  } catch (error) {
    console.error('Baseline GET endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /ops/baseline
 * 
 * Create a new baseline from current metrics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      metricType, 
      endpoint, 
      period = 'normal',
      timeRange = '24h',
      deployId,
      commitSha,
      notes
    } = body

    if (!metricType) {
      return NextResponse.json({
        success: false,
        error: 'metricType is required'
      }, { status: 400 })
    }

    if (!['p95', 'booking', 'error', 'system'].includes(metricType)) {
      return NextResponse.json({
        success: false,
        error: 'metricType must be one of: p95, booking, error, system'
      }, { status: 400 })
    }

    // Calculate time range
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
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Fetch metrics and calculate baseline data
    const baselineData: BaselineData = {}

    if (metricType === 'p95') {
      let query = supabase
        .from('api_metrics_5m')
        .select('endpoint, method, p95_ms, p99_ms, reqs')
        .gte('bucket', startTime.toISOString())
        .order('bucket', { ascending: true })

      if (endpoint) {
        query = query.eq('endpoint', endpoint)
      }

      const { data: metrics } = await query

      if (metrics && metrics.length > 0) {
        const p95Values = metrics.map((m: any) => m.p95_ms).filter((v: number) => v != null && v > 0)
        const p99Values = metrics.map((m: any) => m.p99_ms).filter((v: number) => v != null && v > 0)

        if (p95Values.length > 0) {
          baselineData.p95_latency_ms = p95Values.reduce((sum: number, v: number) => sum + v, 0) / p95Values.length
        }
        if (p99Values.length > 0) {
          baselineData.p99_latency_ms = p99Values.reduce((sum: number, v: number) => sum + v, 0) / p99Values.length
        }
      }
    } else if (metricType === 'booking') {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, created_at, confirmed_at, total_amount_cents, price_cents')
        .gte('created_at', startTime.toISOString())

      if (bookings && bookings.length > 0) {
        const hours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        baselineData.bookings_per_hour = bookings.length / hours

        const confirmed = bookings.filter(b => b.status === 'confirmed' || b.confirmed_at).length
        baselineData.conversion_rate = bookings.length > 0 ? (confirmed / bookings.length) * 100 : 0
      }
    } else if (metricType === 'error') {
      const { data: errors } = await supabase
        .from('performance_metrics')
        .select('status_code, created_at')
        .gte('created_at', startTime.toISOString())
        .gte('status_code', 400)

      const { count: totalRequests } = await supabase
        .from('performance_metrics')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startTime.toISOString())

      if (errors && totalRequests) {
        const hours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        baselineData.error_count_per_hour = errors.length / hours
        baselineData.error_rate_percent = totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0
      }
    } else if (metricType === 'system') {
      const { data: performanceData } = await supabase
        .from('performance_analytics_5min')
        .select('cache_hit_rate_percent, avg_database_queries, request_count')
        .gte('five_minute_bucket', startTime.toISOString())

      if (performanceData && performanceData.length > 0) {
        const cpuValues = performanceData.map((item: any) => {
          return Math.min(100,
            (item.request_count || 0) * 0.1 +
            (item.avg_database_queries || 0) * 2
          )
        })
        const memoryValues = performanceData.map((item: any) => {
          return Math.min(100,
            30 + (item.request_count || 0) * 0.05
          )
        })
        const cacheValues = performanceData
          .map((item: any) => item.cache_hit_rate_percent)
          .filter((v: number) => v != null && !isNaN(v))

        if (cpuValues.length > 0) {
          baselineData.cpu_percent = cpuValues.reduce((sum: number, v: number) => sum + v, 0) / cpuValues.length
        }
        if (memoryValues.length > 0) {
          baselineData.memory_percent = memoryValues.reduce((sum: number, v: number) => sum + v, 0) / memoryValues.length
        }
        if (cacheValues.length > 0) {
          baselineData.cache_hit_rate = cacheValues.reduce((sum: number, v: number) => sum + v, 0) / cacheValues.length
        }
      }
    }

    // Create baseline
    const baseline = saveBaseline({
      metric_type: metricType as 'p95' | 'booking' | 'error' | 'system',
      endpoint: endpoint || undefined,
      period: period as 'normal' | 'peak' | 'low',
      data: baselineData,
      metadata: {
        deploy_id: deployId,
        commit_sha: commitSha,
        notes
      }
    })

    return NextResponse.json({
      success: true,
      baseline,
      message: `Baseline created for ${metricType}${endpoint ? ` (${endpoint})` : ''}`
    })

  } catch (error) {
    console.error('Baseline POST endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /ops/baseline
 * 
 * Delete a baseline by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'id parameter is required'
      }, { status: 400 })
    }

    const deleted = deleteBaseline(id)

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Baseline not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Baseline deleted'
    })

  } catch (error) {
    console.error('Baseline DELETE endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
