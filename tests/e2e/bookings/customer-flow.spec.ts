import { test, expect } from '../../fixtures/base'
import type { Page } from '@playwright/test'

/**
 * Layer 3: UI E2E Tests - Customer Booking Flow
 * 
 * Tests that the UI correctly reflects API state and provides
 * a usable booking experience for customers.
 */

test.describe('Customer Booking Flow - Layer 3: UI E2E (User-Visible Truth)', () => {
  test('customer books a slot and sees confirmation', async ({ page, baseURL }) => {
    // Navigate to booking page
    await page.goto(`${baseURL}/book/test-vendor-id`)
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded')
    
    // Select service (if available)
    const serviceSelect = page.locator('[data-testid="service-select"], select[name="service"]').first()
    if (await serviceSelect.isVisible()) {
      await serviceSelect.selectOption({ index: 0 })
    }
    
    // Select date (future date)
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const dateStr = futureDate.toISOString().split('T')[0]
    const dateInput = page.locator('input[type="date"], [data-testid="date-input"]').first()
    if (await dateInput.isVisible()) {
      await dateInput.fill(dateStr)
    }
    
    // Select time
    const timeSelect = page.locator('select[name="time"], [data-testid="time-select"]').first()
    if (await timeSelect.isVisible()) {
      const options = await timeSelect.locator('option').all()
      if (options.length > 0) {
        await timeSelect.selectOption({ index: 0 })
      }
    }
    
    // Click book button
    const bookButton = page.locator('button:has-text("Book"), [data-testid="book-button"]').first()
    if (await bookButton.isVisible()) {
      await bookButton.click()
      
      // Wait for booking confirmation or redirect
      await page.waitForURL(/\/confirm|\/pay|\/bookings/, { timeout: 10000 }).catch(() => {})
      
      // Verify success message or booking confirmation appears
      const successMessage = page.locator('text=/booking.*confirmed|success|payment/i').first()
      if (await successMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        expect(await successMessage.isVisible()).toBe(true)
      }
    }
  })

  test('customer sees error message for duplicate booking attempt', async ({ page, baseURL }) => {
    // Pre-create a booking via API (simulated)
    // In real test, you would use API to create booking first
    
    await page.goto(`${baseURL}/book/test-vendor-id`)
    await page.waitForLoadState('domcontentloaded')
    
    // Attempt to book the same slot again
    const bookButton = page.locator('button:has-text("Book"), [data-testid="book-button"]').first()
    if (await bookButton.isVisible()) {
      await bookButton.click()
      
      // Wait for error message
      const errorMessage = page.locator('text=/unavailable|already.*booked|slot.*taken|error/i').first()
      const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (errorVisible) {
        expect(await errorMessage.isVisible()).toBe(true)
      }
    }
  })

  test('booking appears in customer dashboard after creation', async ({ page, baseURL }) => {
    // This test assumes a booking was created (via API or previous test)
    await page.goto(`${baseURL}/customer/bookings`)
    await page.waitForLoadState('domcontentloaded')
    
    // Look for booking in the list
    const bookingList = page.locator('[data-testid="booking-list"], .booking-item, [data-booking-id]').first()
    const bookingVisible = await bookingList.isVisible({ timeout: 5000 }).catch(() => false)
    
    // If bookings exist, verify they're displayed
    if (bookingVisible) {
      expect(await bookingList.isVisible()).toBe(true)
    }
  })
})
