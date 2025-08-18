import { expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:3000'

const auth = () => ({
  'Authorization': `Bearer ${process.env.CUSTOMER_JWT ?? ''}`,
  'Content-Type': 'application/json',
})

export async function rescheduleInit(bookingId: string) {
  const r = await fetch(`${base}/api/bookings/${bookingId}/terminate`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({ action: 'reschedule' }),
  })
  expect(r.status).toBe(200)
  const j = await r.json()
  expect(j?.success ?? j?.ok).toBeTruthy()
  return (j?.success ? j : { ok: true, ...j }) as { ok: true; token: string; prefill?: any }
}

export async function rescheduleComplete(token: string, startISO: string, endISO: string, idem?: string) {
  const r = await fetch(`${base}/api/bookings/reschedule/complete`, {
    method: 'POST',
    headers: { ...auth(), 'x-idempotency-key': idem ?? crypto.randomUUID() },
    body: JSON.stringify({ token, newStart: startISO, newEnd: endISO }),
  })
  const j = await r.json()
  return { status: r.status, body: j }
}

export async function abortReschedule(bookingId: string) {
  const r = await fetch(`${base}/api/bookings/${bookingId}/reschedule/cancel`, {
    method: 'POST',
    headers: auth(),
  })
  const j = await r.json()
  return { status: r.status, body: j }
}

export async function getMetrics() {
  const r = await fetch(`${base}/api/analytics/reschedule-metrics`, {
    headers: auth(),
  })
  const j = await r.json()
  return { status: r.status, body: j }
}
