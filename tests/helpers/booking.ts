import { Page } from '@playwright/test'

export function bookingHelper(page: Page) {
  return {
    async start() {
      await page.goto('/')
      await page.click('text=Start Booking')
    },

    async chooseProvider() {
      await page.click('[data-test="provider-card"]:first-child')
    },

    async chooseTime() {
      await page.click('[data-test="time-slot"]:first-child')
    },

    async pay() {
      await page.click('text="Pay Now"')
      await page.frameLocator('iframe').getByPlaceholder('Card number').fill('4242 4242 4242 4242')
      await page.frameLocator('iframe').getByPlaceholder('MM / YY').fill('12/30')
      await page.frameLocator('iframe').getByPlaceholder('CVC').fill('123')
      await page.frameLocator('iframe').getByPlaceholder('ZIP').fill('90210')
      await page.click('button:has-text("Pay")')
    }
  }
}
