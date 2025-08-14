import { getDeadLetterQueueSize } from '@/lib/services/notificationQueue';

let overThresholdSince: number | null = null;
let alerted = false;

export async function checkDlqAndAlert() {
  const size = getDeadLetterQueueSize();
  if (size > 20) {
    if (!overThresholdSince) overThresholdSince = Date.now();
    if (!alerted && Date.now() - overThresholdSince > 10 * 60 * 1000) {
      alerted = true;
      if (process.env.ALERT_WEBHOOK_URL) {
        try {
          const payload = {
            size,
            overThresholdSince: new Date(overThresholdSince).toISOString(),
            now: new Date().toISOString(),
          };
          await fetch(process.env.ALERT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.error('Failed to send alert', err);
        }
      }
    }
  } else {
    overThresholdSince = null;
    alerted = false;
  }
}

export function startDlqMonitor() {
  if (typeof window !== 'undefined') return;
  void setInterval(checkDlqAndAlert, 60_000);
}
