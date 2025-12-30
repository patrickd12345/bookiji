import { test, expect } from '../fixtures/base'

const STRIPE_E2E_ENABLED =
  process.env.E2E_STRIPE === 'true' &&
  !!process.env.STRIPE_SECRET_KEY &&
  !!process.env.STRIPE_WEBHOOK_SECRET

test.skip(!STRIPE_E2E_ENABLED, 'Stripe E2E not configured (set E2E_STRIPE=true and Stripe env vars).')

test('customer can reschedule and cancel a booking', async ({ page, booking, bookingAdvanced, payment }) => {
  await booking.start()
  await booking.chooseProvider()
  await booking.chooseTime()
  await payment.paySuccess()
  await page.waitForURL(/confirmation/)

  await bookingAdvanced.openCustomerBookings()
  await bookingAdvanced.rescheduleFirstBooking()
  await bookingAdvanced.cancelFirstBooking()

  await expect(page.locator('[data-test="toast-success"]')).toBeVisible()
})



























