import { test, expect } from '@playwright/test'

test.describe('Admin Cockpit', () => {
  test.beforeEach(async ({ page }) => {
    // Set test mode to bypass admin authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('testMode', 'true')
    })
    
    // Navigate to admin dashboard
    await page.goto('/admin')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('Debug: Check if page loads at all', async ({ page }) => {
    // Wait a bit longer for the page to render
    await page.waitForTimeout(2000)
    
    // Check what's actually on the page
    const bodyText = await page.locator('body').textContent()
    console.log('Page body text:', bodyText)
    
    // Check if any elements exist
    const h1Elements = await page.locator('h1').count()
    const h2Elements = await page.locator('h2').count()
    const divElements = await page.locator('div').count()
    
    console.log('Element counts:', { h1: h1Elements, h2: h2Elements, div: divElements })
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-admin-page.png' })
  })

  test('Dashboard loads with title and dashboard cards', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check admin cockpit title in navbar
    await expect(page.locator('h2')).toContainText('Admin Cockpit')
    
    // Check for dashboard cards
    await expect(page.locator('[data-testid="dashboard-cards"]')).toBeVisible()
    
    // Verify 4 dashboard cards are present
    const cards = page.locator('.grid > div').filter({ hasText: /Active Users|Bookings Today|Revenue|Errors/ })
    await expect(cards).toHaveCount(4)
  })

  test('Sidebar navigation works correctly', async ({ page }) => {
    // Test Analytics navigation
    await page.click('text=Analytics')
    await expect(page.locator('h1')).toContainText('Analytics')
    
    // Test Vendors navigation
    await page.click('text=Vendors')
    await expect(page.locator('h1')).toContainText('Vendors')
    
    // Test Bookings navigation
    await page.click('text=Bookings')
    await expect(page.locator('h1')).toContainText('Bookings')
    
    // Test Broadcasts navigation
    await page.click('text=Broadcasts')
    await expect(page.locator('h1')).toContainText('Broadcasts')
    
    // Test Settings navigation
    await page.click('text=Settings')
    await expect(page.locator('h1')).toContainText('Settings')
    
    // Test Dashboard navigation
    await page.click('text=Dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('Analytics page shows Recharts line chart', async ({ page }) => {
    await page.goto('/admin/analytics')
    
    // Check page heading
    await expect(page.locator('h1')).toContainText('Analytics')
    
    // Check for Recharts elements
    await expect(page.locator('svg')).toBeVisible()
    
    // Verify chart containers exist
    await expect(page.locator('text=Users & Bookings')).toBeVisible()
    await expect(page.locator('text=Revenue Trend')).toBeVisible()
    
    // Check for chart tooltips and interactions
    const chartArea = page.locator('svg').first()
    await expect(chartArea).toBeVisible()
  })

  test('Vendors table renders with vendor rows', async ({ page }) => {
    await page.goto('/admin/vendors')
    
    // Check page heading
    await expect(page.locator('h1')).toContainText('Vendors')
    
    // Check for vendor table
    await expect(page.locator('text=Vendor Management')).toBeVisible()
    
    // Verify at least one vendor row is rendered
    const vendorRows = page.locator('tbody tr')
    await expect(vendorRows).toHaveCount(5) // Based on mock data
    
    // Check for vendor data
    await expect(page.locator('text=TechFix Pro')).toBeVisible()
    await expect(page.locator('text=CleanHome Services')).toBeVisible()
    
    // Check for status badges
    await expect(page.locator('text=active')).toBeVisible()
    await expect(page.locator('text=pending')).toBeVisible()
  })

  test('Bookings table renders with booking data and status', async ({ page }) => {
    await page.goto('/admin/bookings')
    
    // Check page heading
    await expect(page.locator('h1')).toContainText('Bookings')
    
    // Check for bookings table
    await expect(page.locator('text=Booking Management')).toBeVisible()
    
    // Verify booking rows are rendered
    const bookingRows = page.locator('tbody tr')
    await expect(bookingRows).toHaveCount(5) // Based on mock data
    
    // Check for booking data
    await expect(page.locator('text=BK001')).toBeVisible()
    await expect(page.locator('text=John Smith')).toBeVisible()
    await expect(page.locator('text=Computer Repair')).toBeVisible()
    
    // Check for status column with different statuses
    await expect(page.locator('text=confirmed')).toBeVisible()
    await expect(page.locator('text=pending')).toBeVisible()
    await expect(page.locator('text=completed')).toBeVisible()
  })

  test('Broadcasts table shows request IDs and expands to show vendor responses', async ({ page }) => {
    await page.goto('/admin/broadcasts')
    
    // Check page heading
    await expect(page.locator('h1')).toContainText('Broadcasts')
    
    // Check for broadcasts table
    await expect(page.locator('text=Broadcast Management')).toBeVisible()
    
    // Verify broadcast rows are rendered
    const broadcastRows = page.locator('tbody tr')
    await expect(broadcastRows).toHaveCount(3) // Based on mock data
    
    // Check for request IDs
    await expect(page.locator('text=BR001')).toBeVisible()
    await expect(page.locator('text=BR002')).toBeVisible()
    await expect(page.locator('text=BR003')).toBeVisible()
    
    // Expand first row to show vendor responses
    const expandButton = page.locator('button').filter({ hasText: '▶' }).first()
    await expandButton.click()
    
    // Check for expanded content
    await expect(page.locator('text=Vendor Responses')).toBeVisible()
    await expect(page.locator('text=TechFix Pro')).toBeVisible()
    await expect(page.locator('text=Accepted')).toBeVisible()
    await expect(page.locator('text=Available today at 2 PM')).toBeVisible()
  })

  test('Settings form allows dark mode toggle and email input', async ({ page }) => {
    await page.goto('/admin/settings')
    
    // Check page heading
    await expect(page.locator('h1')).toContainText('Settings')
    
    // Check for settings form
    await expect(page.locator('text=Admin Settings')).toBeVisible()
    
    // Test dark mode toggle
    const darkModeToggle = page.locator('#darkMode')
    await expect(darkModeToggle).toBeVisible()
    
    // Toggle dark mode
    await darkModeToggle.click()
    await expect(darkModeToggle).toBeChecked()
    
    // Toggle back
    await darkModeToggle.click()
    await expect(darkModeToggle).not.toBeChecked()
    
    // Test email input
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveValue('admin@bookiji.com')
    
    // Change email
    await emailInput.fill('newadmin@bookiji.com')
    await expect(emailInput).toHaveValue('newadmin@bookiji.com')
    
    // Test save button
    const saveButton = page.locator('button').filter({ hasText: 'Save Settings' })
    await expect(saveButton).toBeVisible()
    
    // Click save and check for confirmation
    await saveButton.click()
    
    // Wait for success message
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
  })

  test('Responsive design - sidebar collapses on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check that sidebar is hidden by default on mobile
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toBeVisible()
    
    // Click mobile menu button
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    
    // Check that sidebar is now visible
    await expect(sidebar).toBeVisible()
    
    // Check that overlay is present
    const overlay = page.locator('div').filter({ has: page.locator('text=Dashboard') })
    await expect(overlay).toBeVisible()
    
    // Click overlay to close sidebar
    await overlay.click()
    
    // Check that sidebar is hidden again
    await expect(sidebar).not.toBeVisible()
  })

  test('Search functionality works in tables', async ({ page }) => {
    await page.goto('/admin/vendors')
    
    // Find search input
    const searchInput = page.locator('input[placeholder="Search..."]')
    await expect(searchInput).toBeVisible()
    
    // Search for specific vendor
    await searchInput.fill('TechFix')
    
    // Check that only TechFix Pro is visible
    await expect(page.locator('text=TechFix Pro')).toBeVisible()
    await expect(page.locator('text=CleanHome Services')).not.toBeVisible()
    
    // Clear search
    await searchInput.clear()
    
    // Check that all vendors are visible again
    await expect(page.locator('text=TechFix Pro')).toBeVisible()
    await expect(page.locator('text=CleanHome Services')).toBeVisible()
  })

  test('Table sorting works correctly', async ({ page }) => {
    await page.goto('/admin/vendors')
    
    // Click on sortable column header
    const nameHeader = page.locator('th').filter({ hasText: 'Name' })
    await expect(nameHeader).toBeVisible()
    
    // Click to sort
    await nameHeader.click()
    
    // Check for sort indicator
    await expect(page.locator('text=↑')).toBeVisible()
    
    // Click again to reverse sort
    await nameHeader.click()
    
    // Check for reverse sort indicator
    await expect(page.locator('text=↓')).toBeVisible()
  })

  test('Notifications dropdown works', async ({ page }) => {
    // Click notifications bell
    const bellButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(bellButton).toBeVisible()
    await bellButton.click()
    
    // Check notifications panel
    await expect(page.locator('text=Notifications')).toBeVisible()
    await expect(page.locator('text=New vendor registration')).toBeVisible()
    await expect(page.locator('text=Booking completed')).toBeVisible()
    
    // Check mark all read button
    await expect(page.locator('text=Mark all read')).toBeVisible()
  })

  test('Profile dropdown works', async ({ page }) => {
    // Click profile button
    const profileButton = page.locator('button').filter({ hasText: 'Admin User' })
    await expect(profileButton).toBeVisible()
    await profileButton.click()
    
    // Check profile dropdown
    await expect(page.locator('text=admin@bookiji.com')).toBeVisible()
    await expect(page.locator('text=Profile')).toBeVisible()
    await expect(page.locator('text=Settings')).toBeVisible()
    await expect(page.locator('text=Sign out')).toBeVisible()
  })
})
