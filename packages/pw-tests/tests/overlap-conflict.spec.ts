import { test, expect } from '@playwright/test'
import { rescheduleInit, rescheduleComplete } from './utils/api'

const BOOKING_ID = process.env.BOOKING_ID!
const CONFLICT_SLOT = {
  start: process.env.CONFLICT_START!,
  end: process.env.CONFLICT_END!,
}

test('overlap exclusion prevents conflicting reschedule', async () => {
  const { token } = await rescheduleInit(BOOKING_ID)
  const { status, body } = await rescheduleComplete(token, CONFLICT_SLOT.start, CONFLICT_SLOT.end, 'overlap-1')
  expect([409, 422, 400]).toContain(status)
  expect(JSON.stringify(body)).toMatch(/overlap|constraint|conflict|EXCLUDE/i)
})
