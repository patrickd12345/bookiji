import { test, expect } from '../fixtures/base'

test('registration form loads', async ({ page }) => {
  await page.goto('/get-started')
  await expect(page.locator('form')).toBeVisible()
})

test('login works', async ({ auth }) => {
  await auth.login()
})
