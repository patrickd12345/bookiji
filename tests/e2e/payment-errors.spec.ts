import { test, expect } from '../fixtures/base'

test('shows card declined UI when Stripe declines payment', async ({ page, booking, payment }) => {
  await booking.start()
  await booking.chooseProvider()
  await booking.chooseTime()
  await payment.payCardDeclined()

  await expect(page.locator('[data-test="payment-error"]')).toContainText(/declined/i)
})





