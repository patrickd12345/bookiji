import { test, expect } from '../fixtures/base'

const STRIPE_E2E_ENABLED =
  process.env.E2E_STRIPE === 'true' &&
  !!process.env.STRIPE_SECRET_KEY &&
  !!process.env.STRIPE_WEBHOOK_SECRET

test.skip(!STRIPE_E2E_ENABLED, 'Stripe E2E not configured (set E2E_STRIPE=true and Stripe env vars).')

test('user can book with different providers in separate sessions', async ({ page, bookingAdvanced, payment }) => {
  // Provider 1
  await bookingAdvanced.bookWithProvider(0)
  await payment.paySuccess()
  await page.waitForURL(/confirmation/)
  await expect(page.locator('text=Booking Confirmed')).toBeVisible()

  // Provider 2
  await page.goto('/')
  await bookingAdvanced.bookWithProvider(1)
  await payment.paySuccess()
  await page.waitForURL(/confirmation/)
  await expect(page.locator('text=Booking Confirmed')).toBeVisible()
})



























