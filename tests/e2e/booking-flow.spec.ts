import { test, expect } from '../fixtures/base'

test('full booking flow: search → time → pay → webhook → confirm', async ({ page, booking, stripe }) => {
  await booking.start()
  await booking.chooseProvider()
  await booking.chooseTime()

  // capture intent ID created by backend
  let intentId: string | undefined
  page.on('response', async (response) => {
    if (response.url().includes('/bookings/create') && response.status() === 200) {
      const data = await response.json()
      intentId = data.booking?.stripe_payment_intent_id || data.stripe_payment_intent_id
    }
  })

  await booking.pay()

  // Wait a bit for the booking to be created
  await page.waitForTimeout(2000)

  if (intentId) {
    await stripe.triggerWebhook(intentId)
  }

  await expect(page).toHaveURL(/confirmation/)
  await expect(page.locator('text=Booking Confirmed')).toBeVisible()
})
