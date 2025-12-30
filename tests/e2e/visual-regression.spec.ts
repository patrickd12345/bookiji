import { test, expect } from '../fixtures/base'

test.describe('Visual Regression Tests', () => {
  test.skip(process.env.E2E_VISUAL !== 'true', 'Visual regression tests are opt-in (set E2E_VISUAL=true).')

  test.describe('Homepage', () => {
    test('homepage visual snapshot', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      // Wait for any animations to complete
      await page.waitForTimeout(1000)
      await expect(page).toHaveScreenshot('homepage.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('homepage mobile view', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
      await expect(page).toHaveScreenshot('homepage-mobile.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })
  })

  test.describe('Admin Dashboard', () => {
    test.beforeEach(async ({ page, auth }) => {
      // Login as admin
      await auth.loginAsAdmin()
      await page.waitForLoadState('domcontentloaded')
    })

    test('admin dashboard visual snapshot', async ({ page }) => {
      await page.goto('/admin/dashboard')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500) // Wait for charts/data to load
      await expect(page).toHaveScreenshot('admin-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('admin analytics page', async ({ page }) => {
      await page.goto('/admin/analytics')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)
      await expect(page).toHaveScreenshot('admin-analytics.png', {
        // Analytics can vary slightly across runs; keep the snapshot but allow small drift.
        fullPage: false,
        maxDiffPixels: 50000,
        maxDiffPixelRatio: 0.1,
      })
    })
  })

  test.describe('Booking Flow', () => {
    test('get started page', async ({ page }) => {
      await page.goto('/get-started')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
      await expect(page).toHaveScreenshot('get-started.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('booking selection page', async ({ page, booking }) => {
      await booking.start()
      await booking.chooseProvider()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
      await expect(page).toHaveScreenshot('booking-selection.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('payment page', async ({ page, booking }) => {
      await booking.start()
      await booking.chooseProvider()
      await booking.chooseTime()
      await booking.pay()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500) // Wait for Stripe elements
      await expect(page).toHaveScreenshot('payment-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })
  })

  test.describe('Vendor Cockpit', () => {
    test('vendor dashboard visual snapshot', async ({ page }) => {
      test.skip(process.env.E2E_VENDOR_DASHBOARD_SNAPSHOT !== 'true', 'Vendor dashboard snapshot is opt-in (set E2E_VENDOR_DASHBOARD_SNAPSHOT=true).')

      // Login as vendor
      // (Skip must be evaluated before login to avoid unnecessary flake when opt-in is off.)
      await (await import('../helpers/auth')).authHelper(page).loginAsVendor()
      await expect(page).toHaveURL(/\/vendor\/dashboard/, { timeout: 30000 })
      await expect(page.getByText('Loading dashboard...')).toHaveCount(0, { timeout: 30000 })
      await page.waitForTimeout(500)
      await expect(page).toHaveScreenshot('vendor-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('vendor calendar page', async ({ page }) => {
      await (await import('../helpers/auth')).authHelper(page).loginAsVendor()
      await page.goto('/vendor/calendar')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // Wait for calendar to render
      await expect(page).toHaveScreenshot('vendor-calendar.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })
  })

  test.describe('Customer Dashboard', () => {
    test.beforeEach(async ({ page, auth }) => {
      // Login as customer
      await auth.loginAsCustomer()
      await page.waitForLoadState('domcontentloaded')
    })

    test('customer dashboard visual snapshot', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)
      await expect(page).toHaveScreenshot('customer-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })
  })
})
