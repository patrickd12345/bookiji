import { test, expect } from '../fixtures/base'
import { skipIfSupabaseUnavailable } from '../helpers/supabaseAvailability'

test('vendor can reach dashboard', { tag: '@requires-supabase' }, async ({ auth, page }) => {
  await skipIfSupabaseUnavailable(test.info())
  await auth.loginAsVendor()

  const vendorDashboardRoot = page.locator('[data-test="dashboard-root"]')
  const vendorSchedulingRoot = page.locator('[data-test="vendor-scheduling-root"]')

  await expect(async () => {
    const hasDashboard = await vendorDashboardRoot.isVisible().catch(() => false)
    const hasScheduling = await vendorSchedulingRoot.isVisible().catch(() => false)
    expect(hasDashboard || hasScheduling).toBeTruthy()
  }).toPass({ timeout: 60_000 })
})

























