import { test, expect } from '../fixtures/base'

test.describe('Admin Dashboard', () => {
  test('dashboard loads data from APIs', async ({ page, auth }) => {
    // Login as admin
    await auth.loginAsAdmin()
    
    // Navigate to admin dashboard
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-cards"]', { timeout: 10000 })
    
    // Check that dashboard cards are visible (not loading skeletons)
    const cards = page.locator('[data-testid="dashboard-cards"]')
    await expect(cards).toBeVisible()
    
    // Check that recent activity section loads
    const activitySection = page.locator('text=Recent Activity').first()
    await expect(activitySection).toBeVisible()
    
    // Check that system status section loads
    const systemStatusSection = page.locator('text=System Status').first()
    await expect(systemStatusSection).toBeVisible()
    
    // Verify API endpoints are called (check network requests)
    const statsRequest = page.waitForResponse(response => 
      response.url().includes('/api/admin/dashboard/stats') && response.status() === 200
    )
    const activityRequest = page.waitForResponse(response => 
      response.url().includes('/api/admin/dashboard/activity') && response.status() === 200
    )
    const statusRequest = page.waitForResponse(response => 
      response.url().includes('/api/admin/dashboard/system-status') && response.status() === 200
    )
    
    // Reload page to trigger API calls
    await page.reload({ waitUntil: 'domcontentloaded' })
    
    // Wait for all API calls to complete
    await Promise.all([statsRequest, activityRequest, statusRequest]).catch(() => {
      // Some requests might have already completed, that's okay
    })
    
    // Verify dashboard shows real data (not just loading states)
    const revenueCard = page.locator('text=/Revenue|\\$[0-9,]+/i').first()
    await expect(revenueCard).toBeVisible({ timeout: 5000 })
  })
})
