/**
 * Jarvis Monitoring Cron Job
 * 
 * Runs periodically to check for incidents and send alerts
 * 
 * Schedule: Every 5 minutes (or as configured)
 */

import { NextRequest, NextResponse } from 'next/server'
import { shouldTriggerAlert, jarvisDetectAndNotify, handleNoReplyDefaults } from '@/lib/jarvis/orchestrator'
import { checkAndEscalate } from '@/lib/jarvis/escalation/orchestrator'

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron or manual trigger)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    // Check if we should alert
    const alertCheck = await shouldTriggerAlert()

    if (!alertCheck.should_alert) {
      return NextResponse.json({
        success: true,
        message: 'No alert needed',
        reason: alertCheck.reason,
        timestamp: new Date().toISOString()
      })
    }

    // Get owner phone
    const ownerPhone = process.env.JARVIS_OWNER_PHONE

    if (!ownerPhone) {
      return NextResponse.json(
        { error: 'JARVIS_OWNER_PHONE not configured' },
        { status: 500 }
      )
    }

    // Trigger detection and notification
    const result = await jarvisDetectAndNotify(ownerPhone)

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          incident_id: result.incident_id
        },
        { status: 500 }
      )
    }

    // Check for escalation on existing incidents (run in background, don't block)
    checkAndEscalate(ownerPhone).catch(error => {
      console.error('Error checking escalation:', error)
    })

    // Also check for no-reply defaults (run in background, don't block)
    handleNoReplyDefaults(ownerPhone, 15).catch(error => {
      console.error('Error handling no-reply defaults:', error)
    })

    return NextResponse.json({
      success: true,
      incident_id: result.incident_id,
      snapshot_taken: result.snapshot_taken,
      assessment_done: result.assessment_done,
      sms_sent: result.sms_sent,
      duplicate_suppressed: result.duplicate_suppressed || false,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

