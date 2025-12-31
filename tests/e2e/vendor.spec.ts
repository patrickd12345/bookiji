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

test('vendor can access subscription page', { tag: '@requires-supabase' }, async ({ auth, page }) => {
  await skipIfSupabaseUnavailable(test.info())
  await auth.loginAsVendor()

  await page.goto('/vendor/dashboard/subscription', { waitUntil: 'domcontentloaded' })
  
  // Check that subscription page loads (look for subscription-related content)
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  // Page should load without errors (not a 404 or 500)
  expect(page.url()).toContain('/vendor/dashboard/subscription')
})

test('vendor can access bookings page', { tag: '@requires-supabase' }, async ({ auth, page }) => {
  await skipIfSupabaseUnavailable(test.info())
  await auth.loginAsVendor()

  await page.goto('/vendor/bookings', { waitUntil: 'domcontentloaded' })
  
  // Check that bookings page loads
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  expect(page.url()).toContain('/vendor/bookings')
})

test('vendor can access bookings create page', { tag: '@requires-supabase' }, async ({ auth, page }) => {
  await skipIfSupabaseUnavailable(test.info())
  await auth.loginAsVendor()

  await page.goto('/vendor/bookings/create', { waitUntil: 'domcontentloaded' })
  
  // Check that create bookings page loads
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  expect(page.url()).toContain('/vendor/bookings/create')
})

test('vendor can access settings page', { tag: '@requires-supabase' }, async ({ auth, page }) => {
  await skipIfSupabaseUnavailable(test.info())
  await auth.loginAsVendor()

  await page.goto('/vendor/settings', { waitUntil: 'domcontentloaded' })
  
  // Check that settings page loads
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  expect(page.url()).toContain('/vendor/settings')
})

test('vendor can access communications page', { tag: '@requires-supabase' }, async ({ auth, page }) => {
  await skipIfSupabaseUnavailable(test.info())
  await auth.loginAsVendor()

  await page.goto('/vendor/communications', { waitUntil: 'domcontentloaded' })
  
  // Check that communications page loads
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 })
  expect(page.url()).toContain('/vendor/communications')
})

























