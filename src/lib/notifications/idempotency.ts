/**
 * Notification idempotency tracking
 * Prevents duplicate notifications from being sent
 */

import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export interface NotificationIdempotencyKey {
  userId: string
  template: string
  eventId?: string // Optional event ID for deduplication
  timestamp?: string // Optional timestamp window
}

/**
 * Generate idempotency key for a notification
 */
export function generateNotificationKey(params: NotificationIdempotencyKey): string {
  const { userId, template, eventId, timestamp } = params
  const timeWindow = timestamp || new Date().toISOString().split('T')[0] // Daily window by default
  return `notif:${userId}:${template}:${eventId || ''}:${timeWindow}`
}

/**
 * Check if notification was already sent (idempotency check)
 * @param key Idempotency key
 * @returns true if notification was already sent
 */
export async function isNotificationSent(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('idempotency_key', key)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking notification idempotency:', error)
      return false // On error, allow sending (fail open)
    }

    return !!data
  } catch (error) {
    console.error('Exception checking notification idempotency:', error)
    return false
  }
}

/**
 * Mark notification as sent (idempotency record)
 * @param key Idempotency key
 * @param userId User ID
 * @param template Notification template
 * @param channel Notification channel
 * @param recipient Recipient address/endpoint
 * @param success Whether notification was successful
 */
export async function markNotificationSent(
  key: string,
  userId: string,
  template: string,
  channel: 'email' | 'sms' | 'push',
  recipient: string,
  success: boolean
): Promise<void> {
  try {
    await supabase.from('notification_logs').insert({
      idempotency_key: key,
      user_id: userId,
      template,
      channel,
      recipient,
      success,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error marking notification as sent:', error)
    // Don't throw - idempotency is best effort
  }
}
