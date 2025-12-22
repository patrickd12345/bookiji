import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { dispatchIntentToRecipient } from '@/lib/notifications/intentDispatcher'

export interface NotificationRequest {
  type: 'email' | 'sms' | 'push'
  recipient: string
  template:
    | 'verify_email'
    | 'password_reset'
    | 'booking_created'
    | 'booking_updated'
    | 'booking_cancelled'
    | 'review_reminder'
    | 'rating_prompt'
  data: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  idempotency_key?: string
  intent_type?: string
  user_id?: string
}

export async function POST(request: Request) {
  try {
    const limited = await limitRequest(request, { windowMs: 60_000, max: 20 })
    if (limited) return limited
    const notification: NotificationRequest = await request.json();

    const { type, recipient, template, data } = notification

    // Validate input
    if (!type || !recipient || !template) {
      return NextResponse.json({ 
        error: 'Type, recipient, and template are required' 
      }, { status: 400 })
    }

    const normalizedPriority =
      notification.priority && notification.priority !== 'urgent'
        ? notification.priority
        : 'high'

    const result = await dispatchIntentToRecipient({
      channel: type,
      recipient,
      template,
      data,
      priority: normalizedPriority,
      intentType: notification.intent_type,
      idempotencyKey: notification.idempotency_key,
      userId: notification.user_id || (type === 'push' ? recipient : undefined)
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`OK ${type} notification sent to ${recipient}`)
    }
    return NextResponse.json({
      success: true,
      message: result.queued
        ? `${type} notification queued successfully`
        : `${type} notification sent successfully`,
      intent_id: result.intentId,
      delivery_id: result.deliveryId
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Notification error:', error)
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send notification',
      success: false
    }, { status: 500 })
  }
}
