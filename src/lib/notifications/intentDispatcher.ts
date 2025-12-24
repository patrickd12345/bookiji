import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { retryNotification } from '@/lib/services/notificationRetry'
import { sendEmail, sendSMS } from '@/lib/notifications/providers'
import { buildPushPayload } from '@/lib/notifications/pushPayload'
import { queueNotification, sendWebPushNotificationToUser } from '@/lib/notifications/batching'

export type IntentPriority = 'high' | 'normal' | 'low'
export type IntentChannel = 'email' | 'sms' | 'push'

interface IntentPayloadRef {
  user_id?: string
  booking_id?: string
  template?: string
  data?: Record<string, unknown>
  recipient?: string
}

interface IntentRecordInput {
  userId?: string
  intentType: string
  priority: IntentPriority
  allowedChannels: IntentChannel[]
  payloadRef?: IntentPayloadRef
  idempotencyKey: string
}

interface DeliveryRecord {
  id: string
  status: 'queued' | 'sent' | 'failed'
  attempt_count: number
}

function getAdminSupabase() {
  const config = getSupabaseConfig()
  const secretKey = config.secretKey
  if (!secretKey) {
    throw new Error('Missing Supabase service role key')
  }
  return createClient(config.url, secretKey, { auth: { persistSession: false } })
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  const mapped = entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
  return `{${mapped.join(',')}}`
}

export function buildIdempotencyKey(input: {
  intentType: string
  userId?: string
  bookingId?: string
  payload?: Record<string, unknown>
}): string {
  const base = stableStringify({
    intentType: input.intentType,
    userId: input.userId,
    bookingId: input.bookingId,
    payload: input.payload
  })
  return crypto.createHash('sha256').update(base).digest('hex')
}

async function createIntent(record: IntentRecordInput): Promise<string> {
  const supabase = getAdminSupabase()
  const { data: existing } = await supabase
    .from('notification_intents')
    .select('id')
    .eq('idempotency_key', record.idempotencyKey)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data, error } = await supabase
    .from('notification_intents')
    .insert({
      user_id: record.userId || null,
      idempotency_key: record.idempotencyKey,
      intent_type: record.intentType,
      priority: record.priority,
      allowed_channels: record.allowedChannels,
      payload_ref: record.payloadRef || null
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create notification intent')
  }

  return data.id as string
}

async function getOrCreateDelivery(intentId: string, channel: IntentChannel): Promise<DeliveryRecord> {
  const supabase = getAdminSupabase()
  const { data: existing } = await supabase
    .from('notification_deliveries')
    .select('id, status, attempt_count')
    .eq('intent_id', intentId)
    .eq('channel', channel)
    .maybeSingle()

  if (existing?.id) {
    return {
      id: existing.id as string,
      status: existing.status as DeliveryRecord['status'],
      attempt_count: existing.attempt_count ?? 0
    }
  }

  const { data, error } = await supabase
    .from('notification_deliveries')
    .insert({
      intent_id: intentId,
      channel,
      status: 'queued',
      attempt_count: 0,
      updated_at: new Date().toISOString()
    })
    .select('id, status, attempt_count')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create notification delivery')
  }

  return {
    id: data.id as string,
    status: data.status as DeliveryRecord['status'],
    attempt_count: data.attempt_count ?? 0
  }
}

async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryRecord['status'],
  attemptCount: number,
  errorMessage?: string
) {
  const supabase = getAdminSupabase()
  await supabase
    .from('notification_deliveries')
    .update({
      status,
      attempt_count: attemptCount,
      error_message: errorMessage || null,
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', deliveryId)
}

function getDelayMinutes(priority: IntentPriority): number {
  if (priority === 'high') return 0
  if (priority === 'normal') return 2
  return 10
}

async function resolvePushUserId(recipient: string, userId?: string): Promise<string> {
  if (userId) return userId
  const supabase = getAdminSupabase()
  const { data: profile } = await supabase
    .from('profiles')
    .select('auth_user_id')
    .eq('id', recipient)
    .maybeSingle()

  if (profile?.auth_user_id) {
    return profile.auth_user_id as string
  }

  return recipient
}

export async function dispatchIntentToRecipient(input: {
  channel: IntentChannel
  recipient: string
  template: string
  data: Record<string, unknown>
  priority?: IntentPriority
  intentType?: string
  idempotencyKey?: string
  userId?: string
}): Promise<{ intentId: string; deliveryId: string; queued: boolean }> {
  const intentType = input.intentType || input.template
  const priority = input.priority || 'normal'
  const idempotencyKey =
    input.idempotencyKey ||
    buildIdempotencyKey({
      intentType,
      userId: input.userId,
      payload: { template: input.template, recipient: input.recipient }
    })

  const resolvedUserId =
    input.channel === 'push' ? await resolvePushUserId(input.recipient, input.userId) : input.userId

  const intentId = await createIntent({
    userId: resolvedUserId,
    intentType,
    priority,
    allowedChannels: [input.channel],
    payloadRef: {
      user_id: resolvedUserId,
      template: input.template,
      recipient: input.recipient,
      data: input.data
    },
    idempotencyKey
  })

  const delivery = await getOrCreateDelivery(intentId, input.channel)
  if (delivery.status === 'sent') {
    return { intentId, deliveryId: delivery.id, queued: false }
  }

  if (input.channel === 'push' && priority !== 'high') {
    const pushUserId = resolvedUserId || input.recipient
    const payload = buildPushPayload(input.template, input.data)
    const mergedData = payload.data
      ? { ...input.data, ...payload.data }
      : input.data
    await queueNotification(
      pushUserId,
      {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        type: input.template,
        data: mergedData
      },
      {
        priority,
        batchDelayMinutes: getDelayMinutes(priority),
        intentId,
        deliveryId: delivery.id
      }
    )
    await updateDeliveryStatus(delivery.id, 'queued', delivery.attempt_count)
    return { intentId, deliveryId: delivery.id, queued: true }
  }

  const pushRecipient =
    input.channel === 'push'
      ? (resolvedUserId || input.recipient)
      : input.recipient

  const attemptResult = await retryNotification(
    () => {
      if (input.channel === 'email') {
        return sendEmail(input.recipient, input.template, input.data)
      }
      if (input.channel === 'sms') {
        return sendSMS(input.recipient, input.template, input.data)
      }
      return sendWebPushNotificationToUser(pushRecipient, input.template, input.data)
    },
    {
      type: input.channel,
      recipient: pushRecipient,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      template: input.template as any,
      data: input.data,
      priority
    }
  )

  await updateDeliveryStatus(
    delivery.id,
    attemptResult.success ? 'sent' : 'failed',
    attemptResult.attempts || delivery.attempt_count + 1,
    attemptResult.error
  )

  return { intentId, deliveryId: delivery.id, queued: false }
}

export async function dispatchIntentToUser(input: {
  userId: string
  template: string
  data: Record<string, unknown>
  priority?: IntentPriority
  intentType?: string
  idempotencyKey?: string
}): Promise<{ intentId: string; deliveries: Array<{ channel: IntentChannel; queued: boolean }> }> {
  const supabase = getAdminSupabase()
  const intentType = input.intentType || input.template
  const priority = input.priority || 'normal'
  const idempotencyKey =
    input.idempotencyKey ||
    buildIdempotencyKey({
      intentType,
      userId: input.userId,
      payload: { template: input.template }
    })

  const intentId = await createIntent({
    userId: input.userId,
    intentType,
    priority,
    allowedChannels: ['email', 'sms', 'push'],
    payloadRef: {
      user_id: input.userId,
      template: input.template,
      data: input.data
    },
    idempotencyKey
  })

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', input.userId)
    .maybeSingle()

  const preferences = prefs || {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: false,
    phone_number: null
  }

  const { data: userData } = await supabase.auth.admin.getUserById(input.userId)
  const email = userData?.user?.email || null
  const phone = preferences.phone_number || userData?.user?.phone || null

  const deliveries: Array<{ channel: IntentChannel; queued: boolean }> = []

  if (preferences.email_enabled && email) {
    const result = await dispatchIntentToRecipient({
      channel: 'email',
      recipient: email,
      template: input.template,
      data: input.data,
      priority,
      intentType,
      idempotencyKey,
      userId: input.userId
    })
    deliveries.push({ channel: 'email', queued: result.queued })
  }

  if (preferences.sms_enabled && phone) {
    const result = await dispatchIntentToRecipient({
      channel: 'sms',
      recipient: phone,
      template: input.template,
      data: input.data,
      priority,
      intentType,
      idempotencyKey,
      userId: input.userId
    })
    deliveries.push({ channel: 'sms', queued: result.queued })
  }

  if (preferences.push_enabled) {
    const result = await dispatchIntentToRecipient({
      channel: 'push',
      recipient: input.userId,
      template: input.template,
      data: input.data,
      priority,
      intentType,
      idempotencyKey,
      userId: input.userId
    })
    deliveries.push({ channel: 'push', queued: result.queued })
  }

  return { intentId, deliveries }
}
