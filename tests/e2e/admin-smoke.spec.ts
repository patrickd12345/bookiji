import { test, expect } from '../fixtures/base'

test('admin requires authentication', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.locator('text=Access Denied')).toBeVisible()
})
