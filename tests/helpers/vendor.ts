import { Page } from '@playwright/test'

export function vendorHelper(page: Page) {
  return {
    async registerVendor(email = 'vendor@example.com') {
      await page.goto('/vendors/register')
      await page.fill('[data-test="vendor-email"]', email)
      await page.fill('[data-test="vendor-name"]', 'Test Vendor')
      await page.click('[data-test="vendor-submit"]')
      await page.waitForURL('**/vendors/dashboard')
    },
  }
}

