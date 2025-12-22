import type { NotificationRequest } from '@/app/api/notifications/send/route';
import { addToDeadLetterQueue, logAttempt, type NotificationAttemptResult } from './notificationQueue';

export async function retryNotification(
  sendFn: () => Promise<NotificationAttemptResult>,
  notification: NotificationRequest,
  maxAttempts = 5,
  baseDelayMs = 500
): Promise<NotificationAttemptResult> {
  let attempt = 0;
  let delay = baseDelayMs;

  while (attempt < maxAttempts) {
    attempt++;
    const result = await sendFn();
    await logAttempt(notification, attempt, result);
    if (result.success) {
      return { ...result, attempts: attempt };
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }

  await addToDeadLetterQueue(notification, 'max_attempts');
  return { success: false, error: 'max_attempts', attempts: attempt };
}

