import type { NotificationRequest } from '@/app/api/notifications/send/route';

export interface NotificationAttemptResult {
  success: boolean;
  providerResponse?: string;
  error?: string;
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
  deadLetterQueue.push({ notification, error, timestamp: Date.now() });
  if (deadLetterQueue.length > DLQ_ALERT_THRESHOLD) {
    console.error(
      `Dead letter queue size ${deadLetterQueue.length} exceeds threshold ${DLQ_ALERT_THRESHOLD}`
    );
  }
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

