import { test, expect } from '../fixtures/base'

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







