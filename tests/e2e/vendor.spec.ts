import { test, expect } from '../fixtures/base'

test('vendor can reach dashboard', async ({ auth, page }) => {
  await auth.loginAsVendor()
  await expect(page.locator('[data-test="dashboard-root"]')).toBeVisible({ timeout: 60_000 })
})


























