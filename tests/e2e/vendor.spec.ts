import { test, expect } from '../fixtures/base'

test('vendor can register and reach dashboard', async ({ vendor, page }) => {
  await vendor.registerVendor('vendor+e2e@example.com')
  await expect(page.locator('[data-test="vendor-dashboard"]')).toBeVisible()
})



