import { withBrowser } from '../browserHarness.mjs'

export async function certAuthSession({ baseUrl, seed, user }) {
  await withBrowser(seed, async ({ page }) => {
    // Set up console error listener BEFORE login attempt to catch all errors
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(`${baseUrl}/login`)

    await page.fill('[data-test=email]', user.email)
    await page.fill('[data-test=password]', user.password)
    
    // Wait for navigation after clicking login
    const navigationPromise = page.waitForNavigation({ timeout: 15000, waitUntil: 'networkidle' }).catch(() => null)
    await page.click('[data-test=login]')
    
    // Wait for either navigation or error message to appear
    await Promise.race([
      navigationPromise,
      page.waitForSelector('.text-red-600, [class*="error"], [class*="Error"], .bg-red-50', { timeout: 5000 }).catch(() => null)
    ])
    
    const navigationResult = await navigationPromise
    const currentUrl = page.url()
    
    // Assert: Login must redirect to a dashboard or admin page
    const isDashboardUrl = /\/(customer|vendor|admin)\/dashboard/.test(currentUrl) || currentUrl.includes('/admin')
    const isStillOnLogin = currentUrl.includes('/login')
    
    if (!isDashboardUrl && isStillOnLogin) {
      // Still on login page - check for error message
      const errorSelectors = [
        '.text-red-600',
        '[class*="error"]',
        '[class*="Error"]',
        '.bg-red-50',
        '[role="alert"]'
      ]
      
      let errorText = null
      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.$(selector)
          if (errorElement) {
            errorText = await errorElement.textContent()
            if (errorText && errorText.trim().length > 0) {
              break
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      const errorDetails = []
      if (errorText) errorDetails.push(`UI error: ${errorText}`)
      if (consoleErrors.length > 0) errorDetails.push(`Console errors: ${consoleErrors.join('; ')}`)
      
      throw new Error(`Login failed - did not redirect to dashboard. Current URL: ${currentUrl}. ${errorDetails.join('. ')}`)
    }

    // Assert: Session persists across page reload
    // Use the actual redirect URL (could be customer, vendor, or admin dashboard)
    const dashboardUrl = currentUrl.includes('/admin') 
      ? `${baseUrl}/admin`
      : currentUrl.match(/\/(customer|vendor|admin)\/dashboard/)
        ? currentUrl
        : `${baseUrl}/customer/dashboard` // Fallback to customer dashboard
    
    await page.goto(dashboardUrl)
    await page.reload()
    
    // Assert: Protected route is accessible (dashboard element exists)
    await page.waitForSelector('[data-test=dashboard-root]', { timeout: 10000 })
  })
}

