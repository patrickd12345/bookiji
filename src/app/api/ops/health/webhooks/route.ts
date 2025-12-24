import { NextResponse } from 'next/server'

/**
 * Webhook health check endpoint
 * HealthAI monitors this to detect webhook processing issues, DLQ buildup, and delivery failures
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  
  try {
    const { dlqMonitor } = await import('@/lib/observability/dlqMonitor')
    const dlqStatus = await dlqMonitor.getStatus()
    
    // Check DLQ size
    const dlqHealthy = dlqStatus.size < 20
    const dlqWarning = dlqStatus.size >= 20 && dlqStatus.size < 50
    const dlqCritical = dlqStatus.size >= 50
    
    // Check webhook endpoint availability (Stripe webhook)
    const { getServerSupabase } = await import('@/lib/supabaseServer')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
    
    // Check recent webhook processing (if we have a webhook_log table)
    let recentWebhooks = null
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error && data) {
        recentWebhooks = {
          total: data.length,
          successful: data.filter(w => w.status === 'success').length,
          failed: data.filter(w => w.status === 'failed').length,
          lastProcessed: data[0]?.created_at || null
        }
      }
    } catch {
      // webhook_logs table might not exist
      recentWebhooks = { available: false }
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (dlqCritical) {
      status = 'unhealthy'
    } else if (dlqWarning || dlqStatus.overThresholdSince) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    const recommendations: string[] = []
    if (dlqStatus.size > 0) {
      recommendations.push(`DLQ contains ${dlqStatus.size} messages - review failed webhook processing`)
    }
    if (dlqStatus.overThresholdSince) {
      recommendations.push(`DLQ has been over threshold since ${dlqStatus.overThresholdSince}`)
      recommendations.push('Investigate root cause of webhook failures')
      recommendations.push('Check downstream service availability')
    }
    if (recentWebhooks && 'failed' in recentWebhooks && recentWebhooks.failed > 0) {
      recommendations.push(`${recentWebhooks.failed} recent webhook failures detected`)
    }
    if (recommendations.length === 0) {
      recommendations.push('Webhook system operating normally')
    }

    return NextResponse.json({
      status,
      timestamp,
      dlq: {
        size: dlqStatus.size,
        overThresholdSince: dlqStatus.overThresholdSince,
        threshold: 20,
        healthy: dlqHealthy
      },
      recentProcessing: recentWebhooks,
      checks: {
        dlqSize: { status: dlqHealthy ? 'passed' : dlqWarning ? 'warning' : 'failed', value: dlqStatus.size },
        dlqDuration: { 
          status: dlqStatus.overThresholdSince ? 'warning' : 'passed',
          overThresholdSince: dlqStatus.overThresholdSince
        }
      },
      recommendations
    }, {
      status: status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Webhook health check failed',
      recommendations: [
        'Webhook monitoring system unavailable',
        'Check DLQ monitor service status',
        'Review application logs for webhook processing errors'
      ]
    }, { status: 503 })
  }
}
