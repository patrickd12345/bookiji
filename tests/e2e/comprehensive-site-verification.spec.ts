import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive Site Verification Test
 * 
 * This test systematically goes through the entire site,
 * clicking buttons, testing forms, and documenting bugs.
 */

test.describe('Comprehensive Site Verification', () => {
  let page: Page
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    // Enable console logging to catch errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console Error] ${msg.text()}`)
      }
    })
    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`)
    })
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('1. Homepage loads and displays correctly', async () => {
    console.log('\n=== Testing Homepage ===')
    await page.goto(BASE_URL)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check for main heading
    const heading = page.locator('text=Universal Booking Platform').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
    console.log('✓ Homepage heading visible')
    
    // Check for search input
    const searchInput = page.locator('input[placeholder*="service"], input[type="search"]').first()
    if (await searchInput.isVisible().catch(() => false)) {
      console.log('✓ Search input found')
    }
    
    // Check for help button (magenta)
    const helpButton = page.locator('button:has-text("?"), button[aria-label*="Support"], button[aria-label*="Help"]')
      .filter({ has: page.locator('text=?' ) })
      .or(page.locator('.bg-fuchsia-600, .bg-magenta-600'))
      .first()
    
    const helpButtonVisible = await helpButton.isVisible().catch(() => false)
    console.log(helpButtonVisible ? '✓ Help button visible' : '✗ Help button NOT visible')
    
    if (helpButtonVisible) {
      // Try clicking it
      try {
        await helpButton.click({ timeout: 2000 })
        await page.waitForTimeout(1000)
        console.log('✓ Help button clicked')
        
        // Check if chat widget appeared
        const chatWidget = page.locator('[class*="SupportChat"], [class*="support-chat"]').first()
        const chatVisible = await chatWidget.isVisible().catch(() => false)
        console.log(chatVisible ? '✓ Chat widget appeared' : '✗ Chat widget did NOT appear')
      } catch (error) {
        console.log(`✗ Help button click failed: ${error}`)
      }
    }
  })

  test('2. Navigation and menu items', async () => {
    console.log('\n=== Testing Navigation ===')
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Check for navigation menu
    const nav = page.locator('nav, [role="navigation"]').first()
    const navVisible = await nav.isVisible().catch(() => false)
    console.log(navVisible ? '✓ Navigation menu found' : '✗ Navigation menu NOT found')
    
    // Try clicking common nav links
    const navLinks = [
      { text: 'How it works', url: '/how-it-works' },
      { text: 'About', url: '/about' },
      { text: 'Help', url: '/help' },
      { text: 'Contact', url: '/contact' },
    ]
    
    for (const link of navLinks) {
      try {
        const linkElement = page.locator(`a:has-text("${link.text}")`).first()
        if (await linkElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          await linkElement.click()
          await page.waitForLoadState('networkidle')
          const currentUrl = page.url()
          if (currentUrl.includes(link.url)) {
            console.log(`✓ ${link.text} link works`)
          } else {
            console.log(`✗ ${link.text} link navigated to wrong page: ${currentUrl}`)
          }
          await page.goBack()
          await page.waitForLoadState('networkidle')
        }
      } catch (error) {
        console.log(`✗ ${link.text} link error: ${error}`)
      }
    }
  })

  test('3. Search functionality', async () => {
    console.log('\n=== Testing Search ===')
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="service"], input[type="search"], input[name*="search"]').first()
    const searchVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (searchVisible) {
      console.log('✓ Search input found')
      
      // Try typing in search
      await searchInput.fill('haircut')
      await page.waitForTimeout(500)
      
      // Try clicking search button
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"]').first()
      const buttonVisible = await searchButton.isVisible().catch(() => false)
      
      if (buttonVisible) {
        try {
          await searchButton.click()
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(2000)
          const currentUrl = page.url()
          console.log(`✓ Search button clicked, navigated to: ${currentUrl}`)
        } catch (error) {
          console.log(`✗ Search button click failed: ${error}`)
        }
      }
    } else {
      console.log('✗ Search input NOT found')
    }
  })

  test('4. Authentication pages', async () => {
    console.log('\n=== Testing Authentication ===')
    
    // Test login page
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')
    
    const loginForm = page.locator('form, [class*="login"], [class*="auth"]').first()
    const loginVisible = await loginForm.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(loginVisible ? '✓ Login page loads' : '✗ Login page does NOT load')
    
    // Test register page
    await page.goto(`${BASE_URL}/register`)
    await page.waitForLoadState('networkidle')
    
    const registerForm = page.locator('form, [class*="register"], [class*="signup"]').first()
    const registerVisible = await registerForm.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(registerVisible ? '✓ Register page loads' : '✗ Register page does NOT load')
  })

  test('5. Help and support pages', async () => {
    console.log('\n=== Testing Help Pages ===')
    
    const helpPages = [
      '/help',
      '/help/tickets',
      '/faq',
      '/contact',
    ]
    
    for (const path of helpPages) {
      try {
        await page.goto(`${BASE_URL}${path}`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000)
        
        // Check for main content
        const content = page.locator('main, [role="main"], h1, h2').first()
        const contentVisible = await content.isVisible({ timeout: 5000 }).catch(() => false)
        console.log(contentVisible ? `✓ ${path} loads` : `✗ ${path} does NOT load properly`)
        
        // Check for errors
        const errorText = page.locator('text=/error|404|not found/i')
        const hasError = await errorText.isVisible({ timeout: 1000 }).catch(() => false)
        if (hasError) {
          console.log(`✗ ${path} shows error`)
        }
      } catch (error) {
        console.log(`✗ ${path} failed: ${error}`)
      }
    }
  })

  test('6. Interactive buttons and components', async () => {
    console.log('\n=== Testing Interactive Components ===')
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Find all buttons on the page
    const buttons = await page.locator('button, [role="button"], a[class*="button"]').all()
    console.log(`Found ${buttons.length} buttons on homepage`)
    
    // Test a few key buttons
    const keyButtons = [
      { selector: 'button:has-text("Get Started")', name: 'Get Started' },
      { selector: 'button:has-text("Watch Demo")', name: 'Watch Demo' },
      { selector: 'button:has-text("Start Chat")', name: 'Start Chat' },
      { selector: 'button:has-text("Search")', name: 'Search' },
    ]
    
    for (const btn of keyButtons) {
      try {
        const button = page.locator(btn.selector).first()
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`✓ ${btn.name} button found`)
          
          // Try clicking (but don't navigate away)
          if (!btn.name.includes('Search')) {
            await button.click({ timeout: 2000 })
            await page.waitForTimeout(1000)
            console.log(`✓ ${btn.name} button clickable`)
          }
        } else {
          console.log(`✗ ${btn.name} button NOT found`)
        }
      } catch (error) {
        console.log(`✗ ${btn.name} button error: ${error}`)
      }
    }
  })

  test('7. Form inputs and validation', async () => {
    console.log('\n=== Testing Forms ===')
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Find all inputs
    const inputs = await page.locator('input, textarea, select').all()
    console.log(`Found ${inputs.length} form inputs on homepage`)
    
    // Test search input if it exists
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test query')
      const value = await searchInput.inputValue()
      console.log(value === 'test query' ? '✓ Search input accepts text' : '✗ Search input does NOT accept text')
    }
  })

  test('8. Check for console errors', async () => {
    console.log('\n=== Checking for Console Errors ===')
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', error => {
      errors.push(error.message)
    })
    
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Wait for any async operations
    
    if (errors.length > 0) {
      console.log(`✗ Found ${errors.length} console errors:`)
      errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.substring(0, 100)}`)
      })
    } else {
      console.log('✓ No console errors found')
    }
  })

  test('9. Test responsive design', async () => {
    console.log('\n=== Testing Responsive Design ===')
    
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' },
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Check if main content is visible
      const heading = page.locator('text=Universal Booking Platform, text=Bookiji').first()
      const visible = await heading.isVisible({ timeout: 5000 }).catch(() => false)
      console.log(visible ? `✓ ${viewport.name} viewport works` : `✗ ${viewport.name} viewport has issues`)
    }
    
    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('10. Test API endpoints availability', async () => {
    console.log('\n=== Testing API Endpoints ===')
    
    const apiEndpoints = [
      '/api/health',
      '/api/support/ask',
    ]
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(`${BASE_URL}${endpoint}`)
        const status = response.status()
        console.log(status < 500 ? `✓ ${endpoint} responds (${status})` : `✗ ${endpoint} error (${status})`)
      } catch (error) {
        console.log(`✗ ${endpoint} failed: ${error}`)
      }
    }
  })
})

