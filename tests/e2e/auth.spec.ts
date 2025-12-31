import { test, expect } from '../fixtures/base'
import { skipIfSupabaseUnavailable } from '../helpers/supabaseAvailability'

test('registration form loads', async ({ page }) => {
  await page.goto('/get-started')
  await expect(page.locator('form')).toBeVisible()
})

test('login works', { tag: '@requires-supabase' }, async ({ auth }) => {
  await skipIfSupabaseUnavailable(test.info())
  await auth.login()
})
