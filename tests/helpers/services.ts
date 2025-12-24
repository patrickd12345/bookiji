import { Page } from '@playwright/test'

export function servicesHelper(page: Page) {
  return {
    async createService(name = 'Test Service') {
      await page.goto('/vendors/services')
      await page.click('[data-test="add-service"]')
      await page.fill('[data-test="service-name"]', name)
      await page.fill('[data-test="service-duration"]', '30')
      await page.fill('[data-test="service-price"]', '50')
      await page.click('[data-test="service-save"]')
      await page.waitForSelector(`[data-test="service-row"][data-name="${name}"]`)
    },

    async editService(oldName: string, newName: string) {
      const row = page.locator('[data-test="service-row"]', { hasText: oldName })
      await row.getByRole('button', { name: /edit/i }).click()
      await page.fill('[data-test="service-name"]', newName)
      await page.click('[data-test="service-save"]')
      await page.waitForSelector(`[data-test="service-row"][data-name="${newName}"]`)
    },
  }
}



























