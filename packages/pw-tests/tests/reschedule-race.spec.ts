import { test, expect } from '@playwright/test'
import { rescheduleInit, rescheduleComplete } from './utils/api'

const BOOKING_ID = process.env.BOOKING_ID!
const SLOT1 = { start: '2025-08-20T14:00:00Z', end: '2025-08-20T14:30:00Z' }
const SLOT2 = { start: '2025-08-20T14:05:00Z', end: '2025-08-20T14:35:00Z' }

test('two-tabs-one-booking: exactly one completion succeeds', async () => {
  const { token } = await rescheduleInit(BOOKING_ID)

  // Simulate two tabs submitting at once
  const p1 = rescheduleComplete(token, SLOT1.start, SLOT1.end, 'race-1')
  const p2 = rescheduleComplete(token, SLOT2.start, SLOT2.end, 'race-2')

  const [r1, r2] = await Promise.all([p1, p2])

  const okCount = [r1, r2].filter(r => r.status === 200 && (r.body?.ok || r.body?.success)).length
  const failCount = [r1, r2].filter(r => r.status !== 200 || !(r.body?.ok || r.body?.success)).length

  expect(okCount).toBe(1)
  expect(failCount).toBe(1)

  const loser = [r1, r2].find(r => !(r.status === 200 && (r.body?.ok || r.body?.success)))!
  expect([400, 409, 422]).toContain(loser.status)
  expect(JSON.stringify(loser.body)).toMatch(/TOKEN_INVALID_OR_USED|overlap|constraint|HOLD_EXPIRED/i)
})
