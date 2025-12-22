import { test, expect } from '../fixtures/base'
import type { APIRequestContext } from '@playwright/test'
import { getSupabaseAdmin } from './helpers/supabaseAdmin'

const EXPECTATION_TEXT = 'Arrive 10 minutes early'
const TIME_DRIFT_MS = 2_000

async function fetchBookingAdmin(bookingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('bookings').select('id,status,slot_start,slot_end').eq('id', bookingId).single()
  expect(error?.message ?? null).toBeNull()
  expect(data).toBeTruthy()
  return data as { status: string; slot_start: string; slot_end: string }
}

async function expectOneDeliveryByIdempotencyKey(idempotencyKey: string) {
  const supabase = getSupabaseAdmin()
  const { data: intent, error: intentError } = await supabase
    .from('notification_intents')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .single()
  expect(intentError?.message ?? null).toBeNull()
  expect(intent?.id).toBeTruthy()

  const { data: deliveries, error: deliveryError } = await supabase
    .from('notification_deliveries')
    .select('id,channel,status')
    .eq('intent_id', intent!.id)
    .eq('channel', 'email')
  expect(deliveryError?.message ?? null).toBeNull()
  expect(deliveries?.length ?? 0).toBe(1)
  expect(deliveries?.[0]?.status).toMatch(/^(queued|sent|failed)$/)
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

test('daily scheduling flow keeps state, time zone, and notification dedupe', async ({ request }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const seed = await request.post('/api/test/seed', { data: { seedId: runId } })
  expect(seed.ok()).toBeTruthy()
  const { bookingId, slotId } = await seed.json()
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

  const booking = await fetchBookingAdmin(bookingId)
  expect(booking.status).toBe('cancelled')
  expect(Math.abs(new Date(booking.slot_start).getTime() - new Date(newStart).getTime())).toBeLessThan(TIME_DRIFT_MS)
  expect(Math.abs(new Date(booking.slot_end).getTime() - new Date(newEnd).getTime())).toBeLessThan(TIME_DRIFT_MS)
  expect(booking.slot_start).toMatch(/(Z|[+-]\d\d:\d\d)$/)

  const createdKey = `booking-created-${bookingId}-${runId}`
  await sendIdempotentNotification(request, 'booking_created', createdKey)
  await sendIdempotentNotification(request, 'booking_created', createdKey)
  await expectOneDeliveryByIdempotencyKey(createdKey)

  const updatedKey = `booking-updated-${bookingId}-${runId}`
  await sendIdempotentNotification(request, 'booking_updated', updatedKey)
  await sendIdempotentNotification(request, 'booking_updated', updatedKey)
  await expectOneDeliveryByIdempotencyKey(updatedKey)

  const cancelledKey = `booking-cancelled-${bookingId}-${runId}`
  await sendIdempotentNotification(request, 'booking_cancelled', cancelledKey)
  await sendIdempotentNotification(request, 'booking_cancelled', cancelledKey)
  await expectOneDeliveryByIdempotencyKey(cancelledKey)
})
