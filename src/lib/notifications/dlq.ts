/**
 * Dead Letter Queue (DLQ) for failed notifications
 * Captures notification failures without breaking booking flow
 */

import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export interface FailedNotification {
  userId: string
  template: string
  channel: 'email' | 'sms' | 'push'
  recipient: string
  error: string
  context?: Record<string, unknown>
  retryCount?: number
}

/**
 * Log failed notification to DLQ
 * @param failure Failed notification details
 */
export async function logNotificationFailure(failure: FailedNotification): Promise<void> {
  try {
    await supabase.from('notification_failures').insert({
      user_id: failure.userId,
      template: failure.template,
      channel: failure.channel,
      recipient: failure.recipient,
      error_message: failure.error,
      context: failure.context || {},
      retry_count: failure.retryCount || 0,
      created_at: new Date().toISOString(),
      status: 'failed',
    })
  } catch (error) {
    // Even if DLQ logging fails, don't break the flow
    console.error('Failed to log notification failure to DLQ:', error)
  }
}

/**
 * Get failed notifications for retry
 * @param limit Maximum number of failures to retrieve
 * @returns Array of failed notifications
 */
export async function getFailedNotifications(limit: number = 100): Promise<FailedNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notification_failures')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3) // Only retry up to 3 times
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching failed notifications:', error)
      return []
    }

    return (data || []).map((item) => ({
      userId: item.user_id,
      template: item.template,
      channel: item.channel,
      recipient: item.recipient,
      error: item.error_message,
      context: item.context,
      retryCount: item.retry_count,
    }))
  } catch (error) {
    console.error('Exception fetching failed notifications:', error)
    return []
  }
}
