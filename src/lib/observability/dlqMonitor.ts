import { getDeadLetterQueueSize } from '@/lib/services/notificationQueue'

let overThresholdSince: number | null = null
let alerted = false

export async function checkDlqAndAlert() {
  const size = getDeadLetterQueueSize()
  const now = Date.now()

  if (size > 20) {
    if (!overThresholdSince) overThresholdSince = now
    if (!alerted && now - overThresholdSince > 10 * 60 * 1000) {
      alerted = true
      const url = process.env.ALERT_WEBHOOK_URL
      if (url) {
        const payload = {
          size,
          overThresholdSince: new Date(overThresholdSince).toISOString(),
          now: new Date(now).toISOString(),
        }
        try {
          await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        } catch (e) {
          console.error('DLQ alert failed', e)
        }
      }
    }
  } else {
    overThresholdSince = null
    alerted = false
  }
}

export function startDlqMonitor() {
  if (typeof window !== 'undefined') return
  // fire-and-forget
  void setInterval(checkDlqAndAlert, 60_000)
}
