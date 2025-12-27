import { NextRequest, NextResponse } from 'next/server'
import { alertService } from '@/lib/performance/alertService'
import { AlertSeverity } from '@/config/performance'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'

/**
 * Test alert configuration
 * POST /api/admin/test-alerts
 * 
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(_cookiesToSet) {}
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { severity = 'info', testMessage = 'Test alert from admin panel' } = body

    // Validate severity
    if (!Object.values(AlertSeverity).includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity level' },
        { status: 400 }
      )
    }

    // Send test alert
    const testResults = await alertService.testAlerts()
    
    // Also send a real alert with the specified severity
    const alertResult = await alertService.sendAlert({
      violations: [testMessage],
      severity: severity as AlertSeverity,
      environment: process.env.DEPLOY_ENV || 'development',
      timestamp: new Date().toISOString(),
      metrics: {
        testMetric: 100,
        responseTime: 1000,
        memoryUsage: 256
      }
    })

    return NextResponse.json({
      success: true,
      testResults,
      alertSent: alertResult,
      message: 'Test alerts sent successfully'
    })

  } catch (error) {
    console.error('Failed to send test alerts:', error)
    return NextResponse.json(
      { error: 'Failed to send test alerts', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Get alert configuration
 * GET /api/admin/test-alerts
 * 
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const supabaseConfig = getSupabaseConfig()
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(_cookiesToSet) {}
        }
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
    const alertConfig = process.env.NODE_ENV === 'production' ? {
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL_PROD,
      emailEnabled: !!process.env.ALERT_EMAIL,
      pagerDutyEnabled: !!process.env.PAGERDUTY_INTEGRATION_KEY,
      environment: process.env.DEPLOY_ENV || 'development'
    } : {
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL_STAGING,
      emailEnabled: !!process.env.ALERT_EMAIL,
      pagerDutyEnabled: false, // Disabled in non-prod
      environment: process.env.DEPLOY_ENV || 'development'
    }

    return NextResponse.json({
      success: true,
      config: alertConfig,
      availableSeverities: Object.values(AlertSeverity)
    })

  } catch (error) {
    console.error('Failed to get alert config:', error)
    return NextResponse.json(
      { error: 'Failed to get alert configuration' },
      { status: 500 }
    )
  }
}




