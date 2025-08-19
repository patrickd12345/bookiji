import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resilienceAlertManager } from '@/lib/alerting/resilienceAlerts'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (you can implement your own admin check here)
    // For now, we'll use the service role key which has admin access
    
    // Get resilience metrics using the database function
    const { data: metrics, error } = await supabase
      .rpc('get_resilience_metrics', {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        end_time: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to fetch resilience metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      )
    }

    // Get additional real-time metrics
    const { data: hourlyMetrics, error: hourlyError } = await supabase
      .from('resilience_metrics_hourly')
      .select('*')
      .gte('hour', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('hour', { ascending: false })

    if (hourlyError) {
      console.error('Failed to fetch hourly metrics:', error)
    }

    // Calculate additional derived metrics
    const additionalMetrics = calculateAdditionalMetrics(hourlyMetrics || [])

    // Evaluate metrics for alerts
    let alerts: any[] = []
    if (metrics && metrics.length > 0) {
      try {
        alerts = await resilienceAlertManager.evaluateMetrics(metrics)
      } catch (alertError) {
        console.error('Failed to evaluate alerts:', alertError)
        // Don't fail the request if alerting fails
      }
    }

    return NextResponse.json({
      success: true,
      metrics: metrics || [],
      additional_metrics: additionalMetrics,
      alerts: alerts,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Resilience metrics endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateAdditionalMetrics(hourlyMetrics: any[]) {
  if (hourlyMetrics.length === 0) {
    return {}
  }

  // Calculate total signals by type
  const signalCounts = hourlyMetrics.reduce((acc: any, metric: any) => {
    const signal = metric.signal
    acc[signal] = (acc[signal] || 0) + metric.count
    return acc
  }, {})

  // Calculate component health
  const componentHealth = hourlyMetrics.reduce((acc: any, metric: any) => {
    const component = metric.component
    if (!acc[component]) {
      acc[component] = { total: 0, errors: 0 }
    }
    acc[component].total += metric.count
    
    // Count error signals
    if (metric.signal.includes('error') || metric.signal.includes('rollback') || metric.signal.includes('failure')) {
      acc[component].errors += metric.count
    }
    
    return acc
  }, {})

  // Calculate health percentages
  Object.keys(componentHealth).forEach(component => {
    const { total, errors } = componentHealth[component]
    componentHealth[component].health_percentage = total > 0 ? ((total - errors) / total * 100) : 100
  })

  return {
    signal_counts: signalCounts,
    component_health: componentHealth,
    total_signals: hourlyMetrics.reduce((sum: number, m: any) => sum + m.count, 0),
    unique_components: new Set(hourlyMetrics.map((m: any) => m.component)).size,
    time_range: {
      start: hourlyMetrics[hourlyMetrics.length - 1]?.hour,
      end: hourlyMetrics[0]?.hour
    }
  }
}

// POST endpoint for acknowledging alerts
export async function POST(request: NextRequest) {
  try {
    const { alertId, acknowledgedBy } = await request.json()
    
    if (!alertId || !acknowledgedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Acknowledge the alert
    resilienceAlertManager.acknowledgeAlert(alertId, acknowledgedBy)

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully'
    })

  } catch (error) {
    console.error('Failed to acknowledge alert:', error)
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    )
  }
}

