import { test, expect } from '../fixtures/base'
import type { APIRequestContext } from '@playwright/test'

const EXPECTATION_TEXT = 'Arrive 10 minutes early'

async function fetchBooking(request: APIRequestContext, userId: string, bookingId: string) {
  const resp = await request.get(`/api/bookings/user?userId=${userId}&bookingId=${bookingId}`)
  expect(resp.ok()).toBeTruthy()
  const payload = await resp.json()
  const bookings = Array.isArray(payload.bookings) ? payload.bookings : []
  const booking = bookings.find((entry: { id: string }) => entry.id === bookingId)
  expect(booking).toBeTruthy()
  return booking as {
    status: string
    slot_start: string
    slot_end: string
  }
}

async function sendIdempotentNotification(
  request: APIRequestContext,
  template: 'booking_created' | 'booking_updated' | 'booking_cancelled',
  idempotencyKey: string
) {
  const response = await request.post('/api/notifications/send', {
    data: {
      type: 'email',
      recipient: 'customer@test.dev',
      template,
      data: {
        service: 'Test Service',
        date: '2024-01-01',
        time: '10:00',
        expectations: EXPECTATION_TEXT
      },
      idempotency_key: idempotencyKey
    }
  })
  expect(response.ok()).toBeTruthy()
}

async function getInboxCount(request: APIRequestContext, template: string) {
  const inboxResp = await request.get('/api/test/inbox')
  expect(inboxResp.ok()).toBeTruthy()
  const payload = await inboxResp.json()
  const logs = Array.isArray(payload.logs) ? payload.logs : []
  return logs.filter((entry: { notification?: { template?: string } }) => entry.notification?.template === template).length
}

test('daily scheduling flow keeps state, time zone, and notification dedupe', async ({ request }) => {
  const seed = await request.post('/api/test/seed')
  expect(seed.ok()).toBeTruthy()
  const { customerId, bookingId, slotId } = await seed.json()
  expect(slotId).toBeTruthy()

  const newStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const newEnd = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
  const rescheduleResp = await request.post(`/api/test/bookings/${bookingId}/reschedule`, {
    data: { slot_start: newStart, slot_end: newEnd }
  })
  expect(rescheduleResp.ok()).toBeTruthy()

  const confirmResp = await request.post(`/api/test/bookings/${bookingId}/status`, {
    data: { status: 'confirmed' }
  })
  expect(confirmResp.ok()).toBeTruthy()

  const cancelResp = await request.post(`/api/test/bookings/${bookingId}/status`, {
    data: { status: 'cancelled' }
  })
  expect(cancelResp.ok()).toBeTruthy()

  const booking = await fetchBooking(request, customerId, bookingId)
  expect(booking.status).toBe('cancelled')
  expect(booking.slot_start).toBe(newStart)
  expect(booking.slot_end).toBe(newEnd)
  expect(booking.slot_start).toMatch(/Z$/)

  await request.delete('/api/test/inbox')
  const createdKey = `booking-created-${bookingId}`
  await sendIdempotentNotification(request, 'booking_created', createdKey)
  await sendIdempotentNotification(request, 'booking_created', createdKey)
  expect(await getInboxCount(request, 'booking_created')).toBe(1)

  const updatedKey = `booking-updated-${bookingId}`
  await sendIdempotentNotification(request, 'booking_updated', updatedKey)
  await sendIdempotentNotification(request, 'booking_updated', updatedKey)
  expect(await getInboxCount(request, 'booking_updated')).toBe(1)

  const cancelledKey = `booking-cancelled-${bookingId}`
  await sendIdempotentNotification(request, 'booking_cancelled', cancelledKey)
  await sendIdempotentNotification(request, 'booking_cancelled', cancelledKey)
  expect(await getInboxCount(request, 'booking_cancelled')).toBe(1)
})
