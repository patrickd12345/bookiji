import type { NotificationRequest } from '@/app/api/notifications/send/route';
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { logger } from '@/lib/logger'

export interface NotificationAttemptResult {
  success: boolean;
  providerResponse?: string;
  error?: string;
  attempts?: number;
}

interface AttemptLog {
  notification: NotificationRequest;
  attempt: number;
  response: NotificationAttemptResult;
  timestamp: number;
}

interface DeadLetterItem {
  notification: NotificationRequest;
  error?: string;
  timestamp: number;
}

const providerLogs: AttemptLog[] = [];
// In-memory fallback (dev); primary storage is Supabase table notification_dlq
const deadLetterQueue: DeadLetterItem[] = [];
const DLQ_ALERT_THRESHOLD = 10;

export async function logAttempt(
  notification: NotificationRequest,
  attempt: number,
  response: NotificationAttemptResult
) {
  providerLogs.push({ notification, attempt, response, timestamp: Date.now() });
}

export async function addToDeadLetterQueue(
  notification: NotificationRequest,
  error?: string
) {
  try {
    const cfg = getSupabaseConfig()
    const admin = createClient(cfg.url, cfg.secretKey as string, { auth: { persistSession: false } })
    const { error: insertError } = await admin
      .from('notification_dlq')
      .insert({ payload: notification as unknown as Record<string, unknown>, error, status: 'dead' })
    if (insertError) {
      deadLetterQueue.push({ notification, error, timestamp: Date.now() })
    }
  } catch {
    deadLetterQueue.push({ notification, error, timestamp: Date.now() });
  }
  if (deadLetterQueue.length > DLQ_ALERT_THRESHOLD) {
    logger.error(
      `Dead letter queue size ${deadLetterQueue.length} exceeds threshold ${DLQ_ALERT_THRESHOLD}`,
      undefined,
      { queue_size: deadLetterQueue.length, threshold: DLQ_ALERT_THRESHOLD }
    );
  }
}

// Test helpers
export function __forceDeadLetterQueuePushForTests(notification: NotificationRequest, error?: string) {
  deadLetterQueue.push({ notification, error, timestamp: Date.now() })
}

export function getDeadLetterQueueSize() {
  return deadLetterQueue.length;
}

export function clearDeadLetterQueue() {
  deadLetterQueue.length = 0;
}

export function getProviderLogs() {
  return providerLogs;
}

export function clearProviderLogs() {
  providerLogs.length = 0;
}

// Support email function
export async function sendSupportEmail(
  to: string,
  subject: string,
  body: string
) {
  // In production, integrate with your email provider
  // For now, just log the email
  logger.info('[SUPPORT EMAIL]', { to, subject, body_length: body.length });
  return { success: true };
}
