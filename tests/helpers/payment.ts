import { Page } from '@playwright/test'

export function paymentHelper(page: Page) {
  const frame = () => page.frameLocator('iframe')

  return {
    async paySuccess() {
      await frame().getByPlaceholder('Card number').fill('4242 4242 4242 4242')
      await frame().getByPlaceholder('MM / YY').fill('12/30')
      await frame().getByPlaceholder('CVC').fill('123')
      await frame().getByPlaceholder('ZIP').fill('90210')
      await page.click('button:has-text("Pay")')
    },

    async payCardDeclined() {
      await frame().getByPlaceholder('Card number').fill('4000 0000 0000 0002')
      await frame().getByPlaceholder('MM / YY').fill('12/30')
      await frame().getByPlaceholder('CVC').fill('123')
      await frame().getByPlaceholder('ZIP').fill('90210')
      await page.click('button:has-text("Pay")')
      await page.waitForSelector('[data-test="payment-error"]', { timeout: 10000 })
    },
  }
}






