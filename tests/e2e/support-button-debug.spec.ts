import { test, expect, type Locator } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Magenta Support Button Debug', () => {
  test('should observe support button behavior', async ({ page }) => {
    const consoleMessages: string[] = []
    const errors: string[] = []
    const networkRequests: Array<{ url: string; status: number }> = []

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text()
      consoleMessages.push(`[${msg.type()}] ${text}`)
      console.log(`[CONSOLE ${msg.type()}] ${text}`) // Also log immediately
      if (msg.type() === 'error') {
        errors.push(text)
      }
    })

    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    // Capture network requests
    page.on('response', (response) => {
      networkRequests.push({
        url: response.url(),
        status: response.status()
      })
    })

    // Navigate to homepage with access key (or set cookie for access)
    console.log('\n=== Step 1: Loading homepage ===')
    
    // Set access cookie first to bypass access control
    await page.context().addCookies([{
      name: 'bookiji_access',
      value: 'true',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    }])
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    
    // Wait for dynamic components to load
    console.log('Waiting for dynamic components...')
    await page.waitForTimeout(3000) // Wait for dynamic imports
    
    // Check page content
    const pageContent = await page.content()
    const pageText = await page.textContent('body') || ''
    console.log(`Page HTML length: ${pageContent.length}`)
    console.log(`Page text preview: ${pageText.substring(0, 200)}`)
    console.log(`Contains "HomePageModern2025": ${pageContent.includes('HomePageModern2025')}`)
    console.log(`Contains "help-button": ${pageContent.includes('help-button')}`)
    console.log(`Contains "SupportChat": ${pageContent.includes('SupportChat')}`)
    console.log(`Contains "Maintenance": ${pageContent.includes('Maintenance') || pageText.includes('Maintenance')}`)
    console.log(`Contains "Coming Soon": ${pageContent.includes('Coming Soon') || pageText.includes('Coming Soon')}`)
    
    // Check for any buttons on the page
    const allButtons = await page.locator('button').all()
    console.log(`Total buttons on page: ${allButtons.length}`)
    for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
      const text = await allButtons[i].textContent().catch(() => '')
      const ariaLabel = await allButtons[i].getAttribute('aria-label').catch(() => '')
      console.log(`  Button ${i + 1}: text="${text}", aria-label="${ariaLabel}"`)
    }

    // Find the magenta support button - try multiple selectors
    console.log('\n=== Step 2: Locating support button ===')
    
    // Wait for button to appear (dynamic import might delay it)
    let supportButton: Locator = page.locator('button[data-testid="help-button"], button[aria-label*="Support"], button[aria-label*="Help"], button[aria-label*="Open Support Chat"]').first()
    
    try {
      await supportButton.waitFor({ timeout: 10000, state: 'visible' })
      console.log('✓ Button found via waitFor')
    } catch (e) {
      console.log('✗ Button not found via waitFor, trying alternative selectors...')
      supportButton = page.locator('button[data-testid="help-button"], button[aria-label*="Support"], button[aria-label*="Help"]')
        .filter({ has: page.locator('text=?' ) })
        .first()
    }

    const buttonCount = await supportButton.count()
    const buttonExists = buttonCount > 0
    console.log(`Button exists: ${buttonExists}`)

    if (!buttonExists) {
      // Try alternative selectors
      const altButton: Locator = page.locator('.bg-fuchsia-600, [style*="fuchsia"], [style*="magenta"]').first()
      const altCount = await altButton.count()
      const altExists = altCount > 0
      console.log(`Alternative button found: ${altExists}`)
      
      if (altExists) {
        const boundingBox = await altButton.boundingBox()
        console.log(`Button position: ${JSON.stringify(boundingBox)}`)
        const isVisible = await altButton.isVisible()
        console.log(`Button visible: ${isVisible}`)
      try {
        const zIndex = await altButton.evaluate((el: any) => {
          return window.getComputedStyle(el).zIndex
        })
        console.log(`Button z-index: ${zIndex}`)
        const pointerEvents = await altButton.evaluate((el: any) => {
          return window.getComputedStyle(el).pointerEvents
        })
        console.log(`Button pointer-events: ${pointerEvents}`)
      } catch (evalError) {
        console.log(`Could not evaluate button styles: ${evalError}`)
      }
      }
    } else {
      const boundingBox = await supportButton.boundingBox()
      console.log(`Button position: ${JSON.stringify(boundingBox)}`)
      const isVisible = await supportButton.isVisible()
      console.log(`Button visible: ${isVisible}`)
      try {
        const zIndex = await supportButton.evaluate((el: any) => {
          return window.getComputedStyle(el).zIndex
        })
        console.log(`Button z-index: ${zIndex}`)
        const pointerEvents = await supportButton.evaluate((el: any) => {
          return window.getComputedStyle(el).pointerEvents
        })
        console.log(`Button pointer-events: ${pointerEvents}`)
      } catch (evalError) {
        console.log(`Could not evaluate button styles: ${evalError}`)
      }
    }

    // Try to click the button
    console.log('\n=== Step 3: Attempting to click button ===')
    try {
      if (buttonExists) {
        // Get current state before click
        const buttonBefore = await supportButton.getAttribute('style')
        console.log(`Button style before click: ${buttonBefore?.substring(0, 100)}`)
        
        await supportButton.click({ timeout: 5000, force: true })
        console.log('✓ Click registered')
        
        // Wait for state update and animation
        await page.waitForTimeout(2000)
        
        // Check button state after click (should change if state updated)
        const buttonAfter = await supportButton.getAttribute('style')
        console.log(`Button style after click: ${buttonAfter?.substring(0, 100)}`)
        console.log(`Style changed: ${buttonBefore !== buttonAfter}`)
      } else {
        const altButton = page.locator('.bg-fuchsia-600, [style*="fuchsia"], [style*="magenta"]').first()
        await altButton.click({ timeout: 5000, force: true })
        console.log('✓ Click registered (alternative selector)')
        await page.waitForTimeout(2000)
      }
    } catch (error: any) {
      console.log(`✗ Click failed: ${error.message}`)
    }

    // Check if chat widget appeared - try multiple selectors and wait longer
    console.log('\n=== Step 4: Checking for chat widget ===')
    
    // Wait for widget to appear (AnimatePresence might delay it)
    let chatWidget
    try {
      chatWidget = await page.waitForSelector(
        '[class*="SupportChat"], [class*="support-chat"], [class*="Support"], [data-testid*="support"], [data-testid*="chat"]',
        { timeout: 5000, state: 'visible' }
      )
      console.log('✓ Chat widget found via waitForSelector')
    } catch (e) {
      console.log('✗ Chat widget not found via waitForSelector')
      chatWidget = page.locator('[class*="SupportChat"], [class*="support-chat"], [class*="Support"]').first()
    }
    
    const chatVisible = await chatWidget.isVisible().catch(() => false)
    console.log(`Chat widget visible: ${chatVisible}`)
    
    if (!chatVisible) {
      // Check if widget exists but is hidden
      const chatExists = (await chatWidget.count()) > 0
      console.log(`Chat widget exists in DOM: ${chatExists}`)
      
      if (chatExists) {
        const chatDisplay = await chatWidget.evaluate((el: any) => {
          return window.getComputedStyle(el).display
        }).catch(() => 'unknown')
        const chatOpacity = await chatWidget.evaluate((el: any) => {
          return window.getComputedStyle(el).opacity
        }).catch(() => 'unknown')
        const chatZIndex = await chatWidget.evaluate((el: any) => {
          return window.getComputedStyle(el).zIndex
        }).catch(() => 'unknown')
        console.log(`Chat widget styles - display: ${chatDisplay}, opacity: ${chatOpacity}, z-index: ${chatZIndex}`)
      }
    }

    if (chatVisible) {
      const chatText = await chatWidget.textContent().catch(() => '')
      console.log(`Chat widget content preview: ${chatText?.substring(0, 100)}`)
    }

    // Check console for any relevant messages
    console.log('\n=== Step 5: Console Analysis ===')
    console.log(`Total console messages: ${consoleMessages.length}`)
    consoleMessages.slice(0, 20).forEach(msg => console.log(`  ${msg}`))
    
    const supportRelatedMessages = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('support') || 
      msg.toLowerCase().includes('chat') ||
      msg.toLowerCase().includes('help') ||
      msg.toLowerCase().includes('button') ||
      msg.toLowerCase().includes('homepage') ||
      msg.toLowerCase().includes('modern')
    )
    console.log(`Support-related console messages: ${supportRelatedMessages.length}`)
    supportRelatedMessages.forEach(msg => console.log(`  - ${msg}`))
    
    // Check for React/Next.js errors
    const reactErrors = consoleMessages.filter(msg => 
      msg.includes('Error') || 
      msg.includes('Failed') ||
      msg.includes('Cannot') ||
      msg.includes('undefined') ||
      msg.includes('null')
    )
    console.log(`React/Error messages: ${reactErrors.length}`)
    reactErrors.slice(0, 10).forEach(msg => console.log(`  ✗ ${msg}`))

    // Check for errors
    console.log('\n=== Step 6: Error Analysis ===')
    console.log(`Total errors: ${errors.length}`)
    errors.forEach(err => console.log(`  ✗ ${err}`))

    // Check network requests
    console.log('\n=== Step 7: Network Analysis ===')
    const supportRelatedRequests = networkRequests.filter(req => 
      req.url.includes('support') || 
      req.url.includes('chat') ||
      req.url.includes('api')
    )
    console.log(`Support-related requests: ${supportRelatedRequests.length}`)
    supportRelatedRequests.forEach(req => {
      const status = req.status >= 400 ? '✗' : '✓'
      console.log(`  ${status} ${req.status} - ${req.url.substring(0, 80)}`)
    })

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'test-results/support-button-debug.png', fullPage: true })
    console.log('\n=== Screenshot saved: test-results/support-button-debug.png ===')

    // Summary
    console.log('\n=== SUMMARY ===')
    console.log(`Button found: ${buttonExists ? 'YES' : 'NO'}`)
    console.log(`Chat widget appeared: ${chatVisible ? 'YES' : 'NO'}`)
    console.log(`Console errors: ${errors.length}`)
    console.log(`Failed network requests: ${networkRequests.filter(r => r.status >= 400).length}`)
  })
})

