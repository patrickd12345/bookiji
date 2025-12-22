// Server-side Notification Batching Queue
// Handles batching notifications for users who have batching enabled

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { buildPushPayload } from '@/lib/notifications/pushPayload'
import type { NotificationAttemptResult } from '@/lib/services/notificationQueue'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase notification configuration missing')
    }
    
    _supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabase
}

export interface QueuedNotification {
  user_id: string
  notification_data: {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, any>
    type: string
  }
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  expires_at: Date
  intent_id?: string
  delivery_id?: string
}

/**
 * Add notification to batching queue
 */
export async function queueNotification(
  userId: string,
  notification: QueuedNotification['notification_data'],
  options?: {
    priority?: QueuedNotification['priority']
    batchDelayMinutes?: number
    intentId?: string
    deliveryId?: string
  }
): Promise<void> {
  const supabase = getSupabase()
  const batchId = getBatchId(userId, options?.batchDelayMinutes || 5)
  const expiresAt = new Date(Date.now() + (options?.batchDelayMinutes || 5) * 60 * 1000)

  await supabase.from('notification_batch_queue').insert({
    user_id: userId,
    batch_id: batchId,
    notification_data: notification,
    priority: options?.priority || 'normal',
    expires_at: expiresAt.toISOString(),
    processed: false,
    intent_id: options?.intentId || null,
    delivery_id: options?.deliveryId || null
  })
}

/**
 * Process a batch of notifications for a user
 * This should be called by a background worker/cron job
 */
export async function processBatch(userId: string, batchId: string): Promise<void> {
  const supabase = getSupabase()
  const { data: notifications, error } = await supabase
    .from('notification_batch_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('batch_id', batchId)
    .eq('processed', false)
    .lt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })

  if (error || !notifications || notifications.length === 0) {
    return
  }

  // If only one notification, send it immediately
  if (notifications.length === 1) {
    // Send single notification
    const result = await sendPushNotification(userId, notifications[0].notification_data)
    await updateDeliveries(notifications, result)
  } else {
    // Send batched notification
    const result = await sendBatchedPushNotification(userId, notifications.map(n => n.notification_data))
    await updateDeliveries(notifications, result)
  }

  // Mark as processed
  await supabase
    .from('notification_batch_queue')
    .update({ processed: true })
    .eq('user_id', userId)
    .eq('batch_id', batchId)
    .eq('processed', false)
}

/**
 * Process all expired batches (should be called by cron)
 */
export async function processExpiredBatches(): Promise<void> {
  const supabase = getSupabase()
  const { data: batches, error } = await supabase
    .from('notification_batch_queue')
    .select('user_id, batch_id')
    .eq('processed', false)
    .lt('expires_at', new Date().toISOString())

  if (error || !batches) {
    return
  }

  // Group by user_id and batch_id
  const batchMap = new Map<string, Set<string>>()
  for (const batch of batches) {
    if (!batchMap.has(batch.user_id)) {
      batchMap.set(batch.user_id, new Set())
    }
    batchMap.get(batch.user_id)!.add(batch.batch_id)
  }

  // Process each batch
  for (const [userId, batchIds] of batchMap.entries()) {
    for (const batchId of batchIds) {
      await processBatch(userId, batchId)
    }
  }
}

/**
 * Send push notification directly (bypasses batching)
 */
export async function sendWebPushNotificationToUser(
  userId: string,
  template: string,
  data: Record<string, unknown>
): Promise<NotificationAttemptResult> {
  const payload = buildPushPayload(template, data)
  return sendPushNotification(userId, {
    title: payload.title,
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    data: payload.data,
    type: template
  })
}

async function sendPushNotification(
  userId: string,
  notification: QueuedNotification['notification_data']
): Promise<NotificationAttemptResult> {
  const supabase = getSupabase()
  // Get user's push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) {
    return { success: false, error: 'no_subscriptions' }
  }

  // Send to all subscriptions using web-push
  const webpush = await import('web-push').then(m => m.default || m)
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ VAPID keys not configured, skipping push notification')
    return { success: false, error: 'missing_vapid_keys' }
  }

  // Set VAPID details
  if (typeof webpush.setVapidDetails === 'function') {
    webpush.setVapidDetails(
      'mailto:notifications@bookiji.com', // Contact email
      vapidPublicKey,
      vapidPrivateKey
    )
  }

  // Send to all subscriptions
  const sendPromises = subscriptions.map(async (subscription) => {
    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-72x72.png',
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.data?.requireInteraction || false
      })

      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        payload
      )

      // Log success
      await supabase.from('notification_logs').insert({
        user_id: userId,
        recipient: subscription.endpoint,
        type: 'push',
        template: notification.type || 'push',
        status: 'sent',
        metadata: notification.data
      })
      return { success: true }
    } catch (error: any) {
      console.error(`Failed to send push to subscription ${subscription.id}:`, error)

      // If subscription is invalid (410 Gone), delete it
      if (error.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', subscription.id)
      }

      // Log failure
      await supabase.from('notification_logs').insert({
        user_id: userId,
        recipient: subscription.endpoint,
        type: 'push',
        template: notification.type || 'push',
        status: 'failed',
        error_message: error.message,
        metadata: notification.data
      })
      return { success: false, error: error.message }
    }
  })

  const results = await Promise.allSettled(sendPromises)
  const successCount = results.filter(
    (result) => result.status === 'fulfilled' && result.value.success
  ).length
  if (successCount === 0) {
    return { success: false, error: 'push_delivery_failed' }
  }
  return { success: true }
}

/**
 * Send batched push notification
 */
async function sendBatchedPushNotification(
  userId: string,
  notifications: QueuedNotification['notification_data'][]
): Promise<NotificationAttemptResult> {
  const title = `You have ${notifications.length} new notifications`
  const body = generateBatchBody(notifications)

  return sendPushNotification(userId, {
    title,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `batch_${userId}_${Date.now()}`,
    data: {
      type: 'batch',
      notifications
    },
    type: 'batch'
  })
}

/**
 * Generate batch body text from notifications
 */
function generateBatchBody(notifications: QueuedNotification['notification_data'][]): string {
  const types = notifications.reduce((acc, n) => {
    const type = n.type || 'notification'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const typeStrings = Object.entries(types).map(([type, count]) => 
    `${count} ${type.replace('_', ' ')}`
  )

  return typeStrings.join(', ')
}

/**
 * Generate batch ID based on time window
 */
function getBatchId(userId: string, delayMinutes: number): string {
  const now = Date.now()
  const windowMs = delayMinutes * 60 * 1000
  const windowStart = Math.floor(now / windowMs) * windowMs
  return `${userId}_${windowStart}`
}

async function updateDeliveries(
  queued: Array<{ delivery_id?: string }>,
  result: NotificationAttemptResult
) {
  const deliveryIds = queued
    .map((item) => item.delivery_id)
    .filter(Boolean) as string[]

  if (deliveryIds.length === 0) return

  const supabase = getSupabase()
  const { data: deliveries } = await supabase
    .from('notification_deliveries')
    .select('id, attempt_count')
    .in('id', deliveryIds)

  if (!deliveries || deliveries.length === 0) return

  await Promise.all(
    deliveries.map((delivery) =>
      supabase
        .from('notification_deliveries')
        .update({
          status: result.success ? 'sent' : 'failed',
          attempt_count: (delivery.attempt_count || 0) + 1,
          error_message: result.success ? null : result.error || 'push_delivery_failed',
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', delivery.id)
    )
  )
}
