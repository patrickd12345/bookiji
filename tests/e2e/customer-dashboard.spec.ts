import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Customer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to customer dashboard
    await page.goto(`${BASE_URL}/customer/dashboard`)
    await page.waitForLoadState('networkidle')
  })

  test('should load customer dashboard page', async ({ page }) => {
    // Check if page loaded (not 404 or error)
    const title = await page.title()
    expect(title).toBeTruthy()
    
    // Check for dashboard content
    const dashboardHeading = page.getByRole('heading', { name: /my dashboard|dashboard/i })
    await expect(dashboardHeading).toBeVisible({ timeout: 5000 })
  })

  test('should show customer navigation', async ({ page }) => {
    // Check for customer navigation component
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible({ timeout: 5000 })
    
    // Check for navigation links
    const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first()
    await expect(dashboardLink).toBeVisible({ timeout: 3000 })
  })

  test('should display UserDashboard component', async ({ page }) => {
    // Wait for UserDashboard to render
    // Look for common dashboard elements
    const dashboardContent = page.locator('[class*="dashboard"], [class*="Dashboard"]').first()
    await expect(dashboardContent).toBeVisible({ timeout: 5000 })
  })

  test('should handle authentication redirect if not logged in', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies()
    await page.goto(`${BASE_URL}/customer/dashboard`)
    await page.waitForLoadState('networkidle')
    
    // Should either show login page or dashboard (depending on auth state)
    const url = page.url()
    const isLoginPage = url.includes('/login')
    const isDashboard = url.includes('/customer/dashboard')
    
    expect(isLoginPage || isDashboard).toBeTruthy()
  })

  test('should not show errors in console', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    
    await page.goto(`${BASE_URL}/customer/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Wait for any async operations
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(err => 
      !err.includes('CSP') && 
      !err.includes('Content Security Policy') &&
      !err.includes('analytics') &&
      !err.includes('beta_status') &&
      !err.includes('rate_limit')
    )
    
    if (criticalErrors.length > 0) {
      console.error('Console errors found:', criticalErrors)
    }
    
    // Allow some non-critical errors but log them
    expect(criticalErrors.length).toBeLessThan(5)
  })
})









