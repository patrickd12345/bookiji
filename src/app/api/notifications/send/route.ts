import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { retryNotification } from '@/lib/services/notificationRetry'
import { sendEmail, sendSMS, sendPushNotification } from '@/lib/notifications/providers'

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
  data: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
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

    // Process notification based on type
    let result = null

    const sendContext = { type, recipient, template, data }

    switch (type) {
      case 'email':
        result = await retryNotification(
          () => sendEmail(recipient, template, data),
          sendContext
        )
        break
      case 'sms':
        result = await retryNotification(
          () => sendSMS(recipient, template, data),
          sendContext
        )
        break
      case 'push':
        result = await retryNotification(
          () => sendPushNotification(recipient, template, data),
          sendContext
        )
        break
      default:
        return NextResponse.json({
          error: 'Invalid notification type'
        }, { status: 400 })
    }

    if (result.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${type} notification sent to ${recipient}`)
      }
      return NextResponse.json({
        success: true,
        message: `${type} notification sent successfully`
      })
    } else {
      throw new Error(result.error || `Failed to send ${type} notification`)
    }

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
