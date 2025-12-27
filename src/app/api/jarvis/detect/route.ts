/**
 * Jarvis Incident Detection Endpoint
 * 
 * POST /api/jarvis/detect
 * 
 * Manually trigger incident detection and SMS notification
 */

import { NextRequest, NextResponse } from 'next/server'
import { jarvisDetectAndNotify, shouldTriggerAlert } from '@/lib/jarvis/orchestrator'

export async function POST(request: NextRequest) {
  try {
    // Get owner phone from request or env
    const body = await request.json().catch(() => ({}))
    const ownerPhone = body.phone || process.env.JARVIS_OWNER_PHONE

    if (!ownerPhone) {
      return NextResponse.json(
        { error: 'Owner phone number required (JARVIS_OWNER_PHONE env or phone in body)' },
        { status: 400 }
      )
    }

    // Check if we should alert
    const alertCheck = await shouldTriggerAlert()

    if (!alertCheck.should_alert) {
      return NextResponse.json({
        success: true,
        message: 'No alert needed',
        reason: alertCheck.reason
      })
    }

    // Trigger detection and notification
    const result = await jarvisDetectAndNotify(ownerPhone)

    if (result.error) {
      return NextResponse.json(
        { error: result.error, incident_id: result.incident_id },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      incident_id: result.incident_id,
      snapshot_taken: result.snapshot_taken,
      assessment_done: result.assessment_done,
      sms_sent: result.sms_sent
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jarvis/detect
 * 
 * Check if incident should trigger alert (without sending SMS)
 */
export async function GET() {
  try {
    const alertCheck = await shouldTriggerAlert()

    return NextResponse.json({
      should_alert: alertCheck.should_alert,
      reason: alertCheck.reason,
      snapshot: alertCheck.snapshot
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

