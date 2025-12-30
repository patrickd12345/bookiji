import { test, expect } from '@playwright/test'

test.describe('Admin Access Test', () => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

  test('admin can log in and access mission control', async ({ page }) => {
    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...')
    await page.goto('/login')
    await expect(page).toHaveURL(/.*\/login/)

    // Step 2: Fill in login form
    console.log('Step 2: Filling in login form...')
    await page.fill('input[name="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)

    // Step 3: Submit login
    console.log('Step 3: Submitting login form...')
    await page.click('button[type="submit"]')

    // Step 4: Wait for navigation after login
    console.log('Step 4: Waiting for post-login navigation...')
    // Could go to /get-started, /choose-role, or /admin
    await page.waitForURL(/\/(get-started|choose-role|admin|customer|vendor)/, { timeout: 30000, waitUntil: 'domcontentloaded' })

    // Step 5: Check if we're on choose-role page and handle it
    const currentUrl = page.url()
    console.log(`Current URL after login: ${currentUrl}`)

    if (currentUrl.includes('/choose-role')) {
      console.log('On choose-role page, checking for admin redirect or button...')
      
      // Wait a bit for any auto-redirect
      await page.waitForTimeout(2000)
      
      // Check if we were redirected
      if (!page.url().includes('/choose-role')) {
        console.log('Auto-redirected away from choose-role page')
      } else {
        // Try clicking "Try Admin Dashboard" button if it exists
        const adminButton = page.locator('text=Try Admin Dashboard').first()
        if (await adminButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('Clicking "Try Admin Dashboard" button...')
          await adminButton.click()
          await page.waitForURL(/.*\/admin/, { timeout: 5000 })
        } else {
          // Or just navigate directly
          console.log('Navigating directly to admin...')
          await page.goto('/admin')
        }
      }
    }

    // Step 6: Navigate to mission control
    console.log('Step 6: Navigating to mission control...')
    await page.goto('/admin/simcity/mission-control')
    
    // Step 7: Check for admin access
    console.log('Step 7: Checking for admin access...')
    
    // Wait a moment for the page to load
    await page.waitForTimeout(2000)

    // Check if we see "Admin Access Required" (bad)
    const accessDenied = page.locator('text=Admin Access Required').first()
    const accessDeniedVisible = await accessDenied.isVisible({ timeout: 1000 }).catch(() => false)

    if (accessDeniedVisible) {
      console.error('❌ Admin Access Required message is visible!')
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/admin-access-denied.png', fullPage: true })
      
      // Check what the page actually shows
      const pageContent = await page.textContent('body')
      console.log('Page content:', pageContent?.substring(0, 500))
      
      // Check browser console for errors
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      throw new Error('Admin access was denied. Check test-results/admin-access-denied.png for screenshot.')
    }

    // Check if we see mission control content (good)
    const missionControl = page.locator('text=MISSION CONTROL').first()
    const missionControlVisible = await missionControl.isVisible({ timeout: 5000 }).catch(() => false)

    if (missionControlVisible) {
      console.log('✅ Successfully accessed Mission Control!')
      await expect(missionControl).toBeVisible()
    } else {
      // Check what we actually see
      const pageTitle = await page.title()
      const pageUrl = page.url()
      console.log(`Page title: ${pageTitle}`)
      console.log(`Page URL: ${pageUrl}`)
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/admin-unexpected-page.png', fullPage: true })
      
      throw new Error(`Expected to see Mission Control but didn't. Check test-results/admin-unexpected-page.png`)
    }

    // Step 8: Verify we can see admin content
    console.log('Step 8: Verifying admin content is visible...')
    
    // Check for mode selector (FUSED, LIVE, SIMCITY)
    const modeSelector = page.locator('text=FUSED').or(page.locator('text=LIVE')).or(page.locator('text=SIMCITY')).first()
    await expect(modeSelector).toBeVisible({ timeout: 5000 })
    
    console.log('✅ Admin access test passed!')
  })

  test('admin check API endpoint works', async ({ page, request }) => {
    // First, we need to log in to get a session
    await page.goto('/login')
    await page.fill('input[name="email"]', adminEmail)
    await page.fill('input[type="password"]', adminPassword)
    await page.click('button[type="submit"]')
    
    // Wait for login to complete
    await page.waitForURL(/\/(get-started|choose-role|admin|customer|vendor)/, { timeout: 30000, waitUntil: 'domcontentloaded' })
    
    // Get cookies from the page context
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name.includes('sb-') || c.name.includes('supabase'))
    
    console.log('Cookies found:', cookies.map(c => c.name))
    
    // Test the admin check endpoint
    const response = await request.get('/api/auth/check-admin', {
      headers: {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    })
    
    const data = await response.json()
    console.log('Admin check response:', data)
    
    expect(response.ok()).toBeTruthy()
    expect(data.isAdmin).toBe(true)
    expect(data.email).toBe(adminEmail)
  })
})
