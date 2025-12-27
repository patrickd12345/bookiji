import { test, expect } from '@playwright/test'

/**
 * Jarvis Chat Interface Tests
 * 
 * Tests the chat interface for admins on the homepage
 */

test.describe('Jarvis Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Set test mode to bypass authentication in test environment
    await page.addInitScript(() => {
      window.localStorage.setItem('testMode', 'true')
    })
  })

  test('chat button should not be visible for non-admin users', async ({ page }) => {
    // Don't set admin status
    await page.goto('/', { timeout: 10000 })
    
    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 })
    await page.waitForTimeout(1000)
    
    // Chat button should not be visible
    const chatButton = page.locator('button[aria-label="Open Jarvis Chat"]')
    await expect(chatButton).not.toBeVisible()
  })

  test('chat interface should open when button is clicked (admin)', async ({ page }) => {
    // Mock admin check API
    await page.route('/api/auth/check-admin', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isAdmin: true })
      })
    })

    // Mock chat API
    await page.route('/api/jarvis/chat', async route => {
      const request = route.request()
      const body = request.postDataJSON()
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `I understand you asked: "${body.message}". Here's what I know about Bookiji's current state...`,
          timestamp: new Date().toISOString()
        })
      })
    })

    await page.goto('/', { timeout: 10000 })
    await page.waitForSelector('body', { timeout: 10000 })
    await page.waitForTimeout(2000) // Wait for admin check

    // Chat button should be visible for admin
    const chatButton = page.locator('button[aria-label="Open Jarvis Chat"]')
    await expect(chatButton).toBeVisible()

    // Click chat button
    await chatButton.click()

    // Chat window should open
    const chatWindow = page.locator('text=Jarvis').first()
    await expect(chatWindow).toBeVisible()

    // Check for initial greeting message
    const greeting = page.locator('text=Hello! I\'m Jarvis')
    await expect(greeting).toBeVisible()
  })

  test('should send message and receive response', async ({ page }) => {
    // Mock admin check API
    await page.route('/api/auth/check-admin', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isAdmin: true })
      })
    })

    // Mock chat API
    await page.route('/api/jarvis/chat', async route => {
      const request = route.request()
      const body = request.postDataJSON()
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `Based on current system state, here's what I found regarding "${body.message}": The system is operating normally.`,
          timestamp: new Date().toISOString()
        })
      })
    })

    await page.goto('/', { timeout: 10000 })
    await page.waitForSelector('body', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // Open chat
    const chatButton = page.locator('button[aria-label="Open Jarvis Chat"]')
    await chatButton.click()

    // Wait for chat window
    await page.waitForSelector('input[placeholder*="Ask Jarvis"]', { timeout: 5000 })

    // Type message
    const input = page.locator('input[placeholder*="Ask Jarvis"]')
    await input.fill('What is the current system status?')
    await input.press('Enter')

    // Wait for response
    await page.waitForTimeout(1000)
    
    // Check that response appears
    const response = page.locator('text=Based on current system state')
    await expect(response).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock admin check API
    await page.route('/api/auth/check-admin', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isAdmin: true })
      })
    })

    // Mock chat API to return error
    await page.route('/api/jarvis/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/', { timeout: 10000 })
    await page.waitForSelector('body', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // Open chat
    const chatButton = page.locator('button[aria-label="Open Jarvis Chat"]')
    await chatButton.click()

    // Wait for chat window
    await page.waitForSelector('input[placeholder*="Ask Jarvis"]', { timeout: 5000 })

    // Type message
    const input = page.locator('input[placeholder*="Ask Jarvis"]')
    await input.fill('Test message')
    await input.press('Enter')

    // Wait for error message
    await page.waitForTimeout(1000)
    
    // Check that error message appears
    const errorMessage = page.locator('text=Sorry, I encountered an error')
    await expect(errorMessage).toBeVisible()
  })

  test('should close chat window when close button is clicked', async ({ page }) => {
    // Mock admin check API
    await page.route('/api/auth/check-admin', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isAdmin: true })
      })
    })

    await page.goto('/', { timeout: 10000 })
    await page.waitForSelector('body', { timeout: 10000 })
    await page.waitForTimeout(2000)

    // Open chat
    const chatButton = page.locator('button[aria-label="Open Jarvis Chat"]')
    await chatButton.click()

    // Wait for chat window
    const chatWindow = page.locator('text=Jarvis').first()
    await expect(chatWindow).toBeVisible()

    // Click close button
    const closeButton = page.locator('button[aria-label="Close chat"]')
    await closeButton.click()

    // Chat window should close
    await expect(chatWindow).not.toBeVisible()

    // Chat button should be visible again
    await expect(chatButton).toBeVisible()
  })
})
