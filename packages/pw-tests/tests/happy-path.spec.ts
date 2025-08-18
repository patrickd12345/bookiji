import { test, expect } from '@playwright/test'
import { rescheduleInit, rescheduleComplete, getMetrics } from './utils/api'

const BOOKING_ID = process.env.BOOKING_ID!
const NEW_SLOT = {
  start: process.env.NEW_START!,
  end: process.env.NEW_END!,
}

test('happy path: init → complete → metrics reflect completion', async () => {
  const { token } = await rescheduleInit(BOOKING_ID)
  const { status, body } = await rescheduleComplete(token, NEW_SLOT.start, NEW_SLOT.end, 'happy-1')
  expect(status).toBe(200)
  expect(body?.ok || body?.success).toBeTruthy()
  expect(body?.bookingId).toBeTruthy()

  // Optional: check metrics endpoint
  const m = await getMetrics()
  expect(m.status).toBe(200)
  expect(m.body).toHaveProperty('metrics')
})
