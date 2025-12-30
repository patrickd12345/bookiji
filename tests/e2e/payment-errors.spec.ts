import { test, expect } from '../fixtures/base'

const STRIPE_E2E_ENABLED =
  process.env.E2E_STRIPE === 'true' &&
  !!process.env.STRIPE_SECRET_KEY &&
  !!process.env.STRIPE_WEBHOOK_SECRET

test.skip(!STRIPE_E2E_ENABLED, 'Stripe E2E not configured (set E2E_STRIPE=true and Stripe env vars).')

test('shows card declined UI when Stripe declines payment', async ({ page, booking, payment }) => {
  await booking.start()
  await booking.chooseProvider()
  await booking.chooseTime()
  await payment.payCardDeclined()

  await expect(page.locator('[data-test="payment-error"]')).toContainText(/declined/i)
})





