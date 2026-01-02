/**
 * Microsoft/Outlook Calendar Webhook Endpoint
 * 
 * Receives push notifications from Microsoft Graph when calendar events change.
 * Marks connections as needing sync but does not trigger sync loop.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { isWebhookEnabled, isConnectionAllowed } from '@/lib/calendar-sync/flags'
import { safeError } from '@/lib/calendar-sync/utils/token-redaction'
import { MicrosoftWebhookSignatureValidator } from '@/lib/calendar-sync/webhooks/validators'

export async function POST(request: NextRequest) {
  try {
    // Check feature flag
    if (!isWebhookEnabled()) {
      return NextResponse.json(
        { error: 'Calendar webhooks are not enabled' },
        { status: 403 }
      )
    }

    // Get raw body for signature validation (must be done before parsing JSON)
    const rawBody = await request.text()
    
    // Parse webhook payload
    const body = JSON.parse(rawBody || '{}')
    
    // Extract connection_id from webhook payload
    // Microsoft Graph webhooks include resource data
    // The exact structure depends on Microsoft's webhook format
    const connectionId = body.resourceData?.id ||
                        body.value?.[0]?.resourceData?.id ||
                        request.headers.get('X-Microsoft-Graph-Resource-ID') ||
                        body.connection_id ||
                        body.subscriptionId

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connection identifier in webhook' },
        { status: 400 }
      )
    }

    // Check allowlist
    if (!isConnectionAllowed(connectionId)) {
      return NextResponse.json(
        { error: 'Connection not allowed for webhooks' },
        { status: 403 }
      )
    }

    // Validate signature
    const validator = new MicrosoftWebhookSignatureValidator()
    const isValid = await validator.validate(request, rawBody)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Extract dedupe key (e.g., notification ID or change type)
    const dedupeKey = body.notificationId ||
                     body.value?.[0]?.id ||
                     request.headers.get('X-Microsoft-Graph-Notification-Id') ||
                     `${body.changeType || 'unknown'}-${body.resource || 'unknown'}-${Date.now()}`

    const supabase = getServerSupabase()

    // Check if already processed (idempotency)
    const { data: connection } = await supabase
      .from('external_calendar_connections')
      .select('id, webhook_dedupe_keys')
      .eq('id', connectionId)
      .maybeSingle()

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Check dedupe keys (stored as JSONB array)
    const dedupeKeys = (connection.webhook_dedupe_keys as string[]) || []
    if (dedupeKeys.includes(dedupeKey)) {
      // Already processed, return 200 immediately
      return NextResponse.json({ processed: true, reason: 'duplicate' })
    }

    // Add dedupe key and mark sync needed
    const updatedDedupeKeys = [...dedupeKeys, dedupeKey]
    // Keep only last 100 dedupe keys to prevent unbounded growth
    const trimmedDedupeKeys = updatedDedupeKeys.slice(-100)

    const { error: updateError } = await supabase
      .from('external_calendar_connections')
      .update({
        sync_needed: true,
        last_webhook_received_at: new Date().toISOString(),
        webhook_dedupe_keys: trimmedDedupeKeys,
      })
      .eq('id', connectionId)

    if (updateError) {
      safeError('Failed to update connection after webhook:', updateError)
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      )
    }

    // Do NOT trigger sync loop - job runner handles it
    return NextResponse.json({ 
      processed: true,
      connection_id: connectionId,
      sync_marked: true,
    })
  } catch (error) {
    safeError('Error processing calendar webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
