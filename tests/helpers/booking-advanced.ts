import { Page } from '@playwright/test'

export function bookingAdvancedHelper(page: Page) {
  return {
    async openCustomerBookings() {
      await page.goto('/bookings')
      await page.waitForSelector('[data-test="booking-list"]')
    },

    async rescheduleFirstBooking() {
      const first = page.locator('[data-test="booking-row"]').first()
      await first.getByRole('button', { name: /reschedule/i }).click()
      await page.click('[data-test="time-slot"]:nth-of-type(2)')
      await page.click('[data-test="reschedule-confirm"]')
      await page.waitForSelector('[data-test="toast-success"]')
    },

    async cancelFirstBooking() {
      const first = page.locator('[data-test="booking-row"]').first()
      await first.getByRole('button', { name: /cancel/i }).click()
      await page.click('[data-test="cancel-confirm"]')
      await page.waitForSelector('[data-test="toast-success"]')
    },

    async bookWithProvider(index = 0) {
      await page.goto('/')
      await page.click('[data-test="start-booking"]')
      await page.locator('[data-test="provider-card"]').nth(index).click()
      await page.locator('[data-test="time-slot"]').first().click()
      await page.click('[data-test="continue-to-payment"]')
    },
  }
}







