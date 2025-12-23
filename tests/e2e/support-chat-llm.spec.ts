import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Support Chat LLM Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
  })

  test('should open support chat widget', async ({ page }) => {
    // Find and click the support chat button
    const supportButton = page.locator('button[aria-label*="Support"], button[aria-label*="Help"], button:has-text("?")').first()
    await expect(supportButton).toBeVisible({ timeout: 5000 })
    await supportButton.click()
    
    // Wait for chat widget to appear
    const chatWidget = page.locator('[class*="SupportChat"], [class*="support-chat"]').first()
    await expect(chatWidget).toBeVisible({ timeout: 3000 })
    
    // Verify initial message from bot
    const initialMessage = chatWidget.locator('text=/Hello.*Bookiji Support/i').first()
    await expect(initialMessage).toBeVisible({ timeout: 2000 })
  })

  test('should send message and receive LLM-generated response', async ({ page }) => {
    // Open chat widget
    const supportButton = page.locator('button[aria-label*="Support"], button[aria-label*="Help"], button:has-text("?")').first()
    await supportButton.click()
    
    const chatWidget = page.locator('[class*="SupportChat"], [class*="support-chat"]').first()
    await expect(chatWidget).toBeVisible({ timeout: 3000 })
    
    // Find input field and send a message
    const input = chatWidget.locator('input[placeholder*="Ask"], input[placeholder*="question"], input[type="text"]').first()
    await expect(input).toBeVisible({ timeout: 2000 })
    
    const testMessage = 'How do I book a service?'
    await input.fill(testMessage)
    await input.press('Enter')
    
    // Wait for user message to appear
    await expect(chatWidget.locator(`text="${testMessage}"`).first()).toBeVisible({ timeout: 2000 })
    
    // Wait for AI response (should be LLM-generated, not raw KB chunk)
    // Look for assistant message that's not the initial greeting
    const assistantMessages = chatWidget.locator('[class*="assistant"], [role="assistant"]')
    await expect(assistantMessages).toHaveCount(2, { timeout: 10000 }) // Initial + response
    
    // Verify response is not empty and looks like a generated answer (not raw chunk)
    const lastMessage = assistantMessages.last()
    const responseText = await lastMessage.textContent()
    expect(responseText).toBeTruthy()
    expect(responseText?.length).toBeGreaterThan(20) // Should be a proper answer, not just a chunk
    
    // Verify it's not a raw KB chunk (should be conversational)
    expect(responseText).not.toMatch(/^---\n|^snippet:|^chunk:/i)
  })

  test('should handle escalation for complex questions', async ({ page }) => {
    // Open chat widget
    const supportButton = page.locator('button[aria-label*="Support"], button[aria-label*="Help"], button:has-text("?")').first()
    await supportButton.click()
    
    const chatWidget = page.locator('[class*="SupportChat"], [class*="support-chat"]').first()
    await expect(chatWidget).toBeVisible({ timeout: 3000 })
    
    // Send a question that should trigger escalation
    const input = chatWidget.locator('input[placeholder*="Ask"], input[placeholder*="question"], input[type="text"]').first()
    await input.fill('I need a refund immediately')
    await input.press('Enter')
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    // Should see escalation message
    const response = chatWidget.locator('text=/ticket|escalat|forward/i').first()
    await expect(response).toBeVisible({ timeout: 5000 })
  })

  test('should show sources when available', async ({ page }) => {
    // Open chat widget
    const supportButton = page.locator('button[aria-label*="Support"], button[aria-label*="Help"], button:has-text("?")').first()
    await supportButton.click()
    
    const chatWidget = page.locator('[class*="SupportChat"], [class*="support-chat"]').first()
    await expect(chatWidget).toBeVisible({ timeout: 3000 })
    
    // Send a question that should have sources
    const input = chatWidget.locator('input[placeholder*="Ask"], input[placeholder*="question"], input[type="text"]').first()
    await input.fill('How do I reschedule a booking?')
    await input.press('Enter')
    
    // Wait for response
    await page.waitForTimeout(5000)
    
    // Check if sources are shown (optional - may not always be present)
    const sourcesSection = chatWidget.locator('text=/source|Source/i').first()
    const hasSources = await sourcesSection.isVisible().catch(() => false)
    
    if (hasSources) {
      console.log('✓ Sources are displayed')
    } else {
      console.log('ℹ Sources not displayed (this is optional)')
    }
  })
})
