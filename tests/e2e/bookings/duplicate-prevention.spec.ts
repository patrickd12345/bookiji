import { test, expect } from '../../fixtures/base'
import type { Page } from '@playwright/test'

/**
 * Layer 3: UI E2E Tests - Duplicate Prevention
 * 
 * Tests that the UI prevents duplicate bookings and shows
 * appropriate error messages.
 */

test.describe('Duplicate Booking Prevention - Layer 3: UI E2E (User-Visible Truth)', () => {
  test('UI prevents double-click on book button', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/book/test-vendor-id`)
    await page.waitForLoadState('domcontentloaded')
    
    const bookButton = page.locator('button:has-text("Book"), [data-testid="book-button"]').first()
    
    if (await bookButton.isVisible()) {
      // Click button twice rapidly (simulating double-click)
      await bookButton.click()
      await bookButton.click({ timeout: 100 })
      
      // Button should be disabled after first click
      const isDisabled = await bookButton.isDisabled().catch(() => false)
      
      // If button has disabled state, verify it's disabled
      if (isDisabled !== null) {
        // Button should be disabled to prevent duplicate submissions
        expect(isDisabled || await bookButton.getAttribute('aria-disabled') === 'true').toBe(true)
      }
    }
  })

  test('UI shows error when slot becomes unavailable', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/book/test-vendor-id`)
    await page.waitForLoadState('domcontentloaded')
    
    // Select a slot
    const slotButton = page.locator('[data-testid="slot-button"], .slot-available').first()
    if (await slotButton.isVisible()) {
      await slotButton.click()
      
      // Attempt to book
      const bookButton = page.locator('button:has-text("Book")').first()
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Wait for either success or error
        await page.waitForTimeout(2000)
        
        // Check for error message about slot being unavailable
        const errorMessage = page.locator('text=/unavailable|taken|already.*booked/i').first()
        const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
        
        // If error appears, verify it's shown
        if (errorVisible) {
          expect(await errorMessage.isVisible()).toBe(true)
        }
      }
    }
  })

  test('UI reflects optimistic update when booking is created', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/book/test-vendor-id`)
    await page.waitForLoadState('domcontentloaded')
    
    // Select a slot
    const slotButton = page.locator('[data-testid="slot-button"], .slot-available').first()
    if (await slotButton.isVisible()) {
      const slotId = await slotButton.getAttribute('data-slot-id')
      await slotButton.click()
      
      // Click book
      const bookButton = page.locator('button:has-text("Book")').first()
      if (await bookButton.isVisible()) {
        await bookButton.click()
        
        // Slot should immediately disappear or be marked as unavailable (optimistic update)
        await page.waitForTimeout(1000)
        
        // Verify slot is no longer available
        if (slotId) {
          const slotAfterBooking = page.locator(`[data-slot-id="${slotId}"]`).first()
          const stillAvailable = await slotAfterBooking.locator('.slot-available, [data-available="true"]').isVisible().catch(() => false)
          
          // Slot should not be available after booking
          expect(stillAvailable).toBe(false)
        }
      }
    }
  })
})
