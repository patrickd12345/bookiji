import { createClient } from '@supabase/supabase-js'
import { sendEmail, sendSMS, sendPushNotification } from './providers'
import {
  generateNotificationKey,
  isNotificationSent,
  markNotificationSent,
} from './idempotency'
import { logNotificationFailure } from './dlq'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role to bypass RLS for preference checks
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface NotificationResult {
  type: 'email' | 'sms' | 'push'
  success: boolean
  error?: string
}

/**
 * Unified Notification Center
 * Dispatches notifications based on user preferences
 */
export async function notifyUser(
  userId: string, 
  template: string, 
  data: Record<string, unknown>,
  eventId?: string // Optional event ID for idempotency
): Promise<NotificationResult[]> {
  
  console.log(`🔔 Notification Center: Sending '${template}' to user ${userId}`)

  // Idempotency check - prevent duplicate notifications
  const idempotencyKey = generateNotificationKey({
    userId,
    template,
    eventId: eventId || (data.booking_id as string) || (data.event_id as string),
  })

  const alreadySent = await isNotificationSent(idempotencyKey)
  if (alreadySent) {
    console.log(`⏭️ Notification already sent (idempotency): ${idempotencyKey}`)
    return [
      { type: 'email', success: true },
      { type: 'sms', success: true },
      { type: 'push', success: true },
    ]
  }

  // 1. Get preferences
  const { data: prefs, error: prefError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Default to email enabled if no preferences set (safe default)
  const preferences = prefs || { 
    email_enabled: true, 
    sms_enabled: false, 
    push_enabled: false,
    phone_number: null 
  }

  if (prefError && prefError.code !== 'PGRST116') {
    console.warn('Error fetching preferences, using defaults:', prefError)
  }

  // 2. Get user contact info from Auth
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
  
  if (userError || !userData.user) {
    console.error('User not found for notification:', userId)
    return [{ type: 'email', success: false, error: 'User not found' }]
  }

  const email = userData.user.email
  const phone = preferences.phone_number || userData.user.phone 
  
  const results: NotificationResult[] = []

  // 3. Send Email
  if (preferences.email_enabled && email) {
    try {
      const res = await sendEmail(email, template, data)
      results.push({ type: 'email', ...res })
      await logNotification(userId, 'email', email, template, res)
      await markNotificationSent(idempotencyKey, userId, template, 'email', email, res.success)
      
      if (!res.success && res.error) {
        await logNotificationFailure({
          userId,
          template,
          channel: 'email',
          recipient: email,
          error: res.error,
          context: data,
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      results.push({ type: 'email', success: false, error: errorMsg })
      await logNotificationFailure({
        userId,
        template,
        channel: 'email',
        recipient: email || 'unknown',
        error: errorMsg,
        context: data,
      })
    }
  }

  // 4. Send SMS
  if (preferences.sms_enabled && phone) {
    try {
      const res = await sendSMS(phone, template, data)
      results.push({ type: 'sms', ...res })
      await logNotification(userId, 'sms', phone, template, res)
      await markNotificationSent(idempotencyKey, userId, template, 'sms', phone, res.success)
      
      if (!res.success && res.error) {
        await logNotificationFailure({
          userId,
          template,
          channel: 'sms',
          recipient: phone,
          error: res.error,
          context: data,
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      results.push({ type: 'sms', success: false, error: errorMsg })
      await logNotificationFailure({
        userId,
        template,
        channel: 'sms',
        recipient: phone || 'unknown',
        error: errorMsg,
        context: data,
      })
    }
  }

  // 5. Send Push Notification (if enabled and user has subscription)
  if (preferences.push_enabled) {
    // Check if user has push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .limit(1)

    if (subscriptions && subscriptions.length > 0) {
      // Check if batching is enabled (from preferences or default)
      const shouldBatch = true // TODO: Add batching preference to notification_preferences table
      
      if (shouldBatch) {
        // Queue for batching
        const { queueNotification } = await import('./batching')
        await queueNotification(userId, {
          title: formatTitle(template, data),
          body: formatMessage(template, data),
          type: template,
          data: data
        })
      } else {
        // Send immediately
        try {
          const res = await sendPushNotification(subscriptions[0].endpoint, template, data)
          results.push({ type: 'push', ...res })
          await logNotification(userId, 'push', subscriptions[0].endpoint, template, res)
          await markNotificationSent(idempotencyKey, userId, template, 'push', subscriptions[0].endpoint, res.success)
          
          if (!res.success && res.error) {
            await logNotificationFailure({
              userId,
              template,
              channel: 'push',
              recipient: subscriptions[0].endpoint,
              error: res.error,
              context: data,
            })
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ type: 'push', success: false, error: errorMsg })
          await logNotificationFailure({
            userId,
            template,
            channel: 'push',
            recipient: subscriptions[0]?.endpoint || 'unknown',
            error: errorMsg,
            context: data,
          })
        }
      }
    }
  }

  // 6. In-App Notification (Always insert into notifications table)
  // This assumes there is a 'notifications' table for the UI inbox
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: formatTitle(template, data),
      message: formatMessage(template, data),
      type: template,
      read: false,
      data: data
    })
  } catch (e) {
    console.warn('Failed to create in-app notification:', e)
  }

  return results
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logNotification(userId: string, type: string, recipient: string, template: string, result: any) {
  try {
    await supabase.from('notification_logs').insert({
      user_id: userId,
      type,
      recipient,
      template,
      status: result.success ? 'sent' : 'failed',
      provider_response: result,
      metadata: result.data // safely ignore if undefined
    })
  } catch (e) {
    console.error('Failed to log notification:', e)
  }
}

// Helper to format titles for in-app notifications
function formatTitle(template: string, _data: Record<string, unknown>): string {
  const titles: Record<string, string> = {
    booking_confirmation: 'Booking Confirmed',
    booking_cancelled: 'Booking Cancelled',
    reminder: 'Upcoming Appointment',
    welcome: 'Welcome to Bookiji'
  }
  return titles[template] || 'New Notification'
}

function formatMessage(template: string, data: Record<string, unknown>): string {
  // Simple formatting, can be expanded
  if (template === 'booking_confirmation') return `Your appointment on ${data.date} is confirmed.`
  return 'You have a new update.'
}

