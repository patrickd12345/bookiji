import { test, expect } from '../fixtures/base'

test.describe('Visual Regression Tests', () => {
  test.describe('Homepage', () => {
    test('homepage visual snapshot', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
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
      await page.waitForLoadState('networkidle')
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
      await page.waitForLoadState('networkidle')
    })

    test('admin dashboard visual snapshot', async ({ page }) => {
      await page.goto('/admin/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500) // Wait for charts/data to load
      await expect(page).toHaveScreenshot('admin-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('admin analytics page', async ({ page }) => {
      await page.goto('/admin/analytics')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)
      await expect(page).toHaveScreenshot('admin-analytics.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })
  })

  test.describe('Booking Flow', () => {
    test('get started page', async ({ page }) => {
      await page.goto('/get-started')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      await expect(page).toHaveScreenshot('get-started.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('booking selection page', async ({ page, booking }) => {
      await booking.start()
      await booking.chooseProvider()
      await page.waitForLoadState('networkidle')
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
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500) // Wait for Stripe elements
      await expect(page).toHaveScreenshot('payment-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })
  })

  test.describe('Vendor Cockpit', () => {
    test.beforeEach(async ({ page, auth }) => {
      // Login as vendor
      await auth.loginAsVendor()
      await page.waitForLoadState('networkidle')
    })

    test('vendor dashboard visual snapshot', async ({ page }) => {
      await page.goto('/vendor/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)
      await expect(page).toHaveScreenshot('vendor-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })

    test('vendor calendar page', async ({ page }) => {
      await page.goto('/vendor/calendar')
      await page.waitForLoadState('networkidle')
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
      await page.waitForLoadState('networkidle')
    })

    test('customer dashboard visual snapshot', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)
      await expect(page).toHaveScreenshot('customer-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 100,
      })
    })
  })
})
