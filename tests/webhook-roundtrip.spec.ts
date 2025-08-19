import { test, expect } from '@playwright/test'

// You may have an internal API that creates a "pending" booking pre-payment.
// If not, create via the test route and capture the returned bookingId.
async function createPendingBooking(request: any) {
  const r = await request.post('/api/bookings/create-test', {
    data: {
      customer_name: 'Webhook User',
      phone: '555-555-9090',
      service_id: process.env.TEST_SERVICE_ID, // seed this in CI
      slot_iso: new Date(Date.now() + 3600_000).toISOString(),
    },
  })
  expect(r.ok()).toBeTruthy()
  const json = await r.json()
  return json.bookingId as string
}

test('payment_intent.succeeded flips booking status to confirmed', async ({ request }) => {
  // 1) Create a pending booking
  const bookingId = await createPendingBooking(request)

  // 2) Post a test-mode Stripe event to the webhook
  const event = {
    id: `evt_test_${Date.now()}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_test_${Date.now()}`,
        amount: 100, // cents
        currency: 'usd',
        metadata: { booking_id: bookingId },
      },
    },
  }

  const headers: Record<string, string> = {}
  headers['x-test-webhook-key'] = process.env.TEST_WEBHOOK_KEY || ''

  const resp = await request.post('/api/payments/webhook', {
    headers,
    data: event,
  })
  expect(resp.ok()).toBeTruthy()

  // 3) Read back the booking status
  const statusResp = await request.get(`/api/bookings/${bookingId}`)
  expect(statusResp.ok()).toBeTruthy()
  const booking = await statusResp.json()

  expect(booking.status).toBe('confirmed')
  expect(booking.commitment_fee_paid).toBe(true)
})


