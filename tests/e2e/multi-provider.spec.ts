import { test, expect } from '../fixtures/base'

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


















