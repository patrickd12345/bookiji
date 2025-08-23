import { NextRequest, NextResponse } from 'next/server'
import { alertService } from '@/lib/performance/alertService'
import { AlertSeverity } from '@/config/performance'

/**
 * Test alert configuration
 * POST /api/admin/test-alerts
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication (simplified for demo)
    // In production, you'd verify JWT token or session
    
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
 */
export async function GET() {
  try {
    const config = process.env.NODE_ENV === 'production' ? {
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
      config,
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




