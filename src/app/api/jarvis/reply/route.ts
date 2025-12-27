/**
 * Jarvis SMS Reply Handler
 * 
 * POST /api/jarvis/reply
 * 
 * Receives SMS replies (via webhook or manual call)
 * Parses and executes actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { jarvisProcessReply } from '@/lib/jarvis/orchestrator'
import { sendSMS } from '@/lib/notifications/providers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract from webhook format (Twilio) or direct format
    const replyText = body.Body || body.message || body.reply
    const fromPhone = body.From || body.from
    const incidentId = body.incident_id || 'unknown'
    const snapshotEnv = body.env || 'prod'

    if (!replyText) {
      return NextResponse.json(
        { error: 'Reply text required (Body, message, or reply field)' },
        { status: 400 }
      )
    }

    // Process reply
    const result = await jarvisProcessReply(replyText, incidentId, snapshotEnv as 'prod' | 'staging' | 'local')

    // Send confirmation SMS back
    const ownerPhone = process.env.JARVIS_OWNER_PHONE
    if (ownerPhone && fromPhone) {
      await sendSMS(fromPhone, 'jarvis_confirmation', {
        message: result.message
      })
    }

    return NextResponse.json({
      success: true,
      parsed: result.parsed,
      actions_executed: result.actions_executed,
      message: result.message
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

