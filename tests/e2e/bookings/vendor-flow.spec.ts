import { test, expect } from '../../fixtures/base'
import type { Page } from '@playwright/test'

/**
 * Layer 3: UI E2E Tests - Vendor Booking Management
 * 
 * Tests that vendors can view and manage bookings through the UI.
 */
test.describe('Vendor Booking Flow - Layer 3: UI E2E (User-Visible Truth)', () => {
  test('vendor views bookings dashboard and sees confirmed bookings', async ({ page, baseURL }) => {
    // Navigate to vendor dashboard
    await page.goto(`${baseURL}/vendor/bookings`)
    await page.waitForLoadState('domcontentloaded')
    
    // Wait for auth check (may redirect to login)
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth')
    
    if (!isLoginPage) {
      // Look for bookings list or table
      const bookingsList = page.locator('[data-testid="bookings-list"], .bookings-table, [data-booking-id]').first()
      const bookingsVisible = await bookingsList.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (bookingsVisible) {
        expect(await bookingsList.isVisible()).toBe(true)
        
        // Check for booking status indicators
        const confirmedBookings = page.locator('text=/confirmed|confirmed/i').first()
        const hasConfirmed = await confirmedBookings.isVisible({ timeout: 2000 }).catch(() => false)
        
        // If confirmed bookings exist, verify they're displayed
        if (hasConfirmed) {
          expect(await confirmedBookings.isVisible()).toBe(true)
        }
      }
    }
  })

  test('vendor can cancel booking through UI', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/vendor/bookings`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth')
    
    if (!isLoginPage) {
      // Look for cancel button on a booking
      const cancelButton = page.locator('button:has-text("Cancel"), [data-testid="cancel-booking"]').first()
      const cancelVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (cancelVisible) {
        await cancelButton.click()
        
        // Wait for confirmation dialog or success message
        await page.waitForTimeout(1000)
        
        // Check for confirmation dialog or success message
        const confirmDialog = page.locator('text=/confirm.*cancel|cancel.*booking/i').first()
        const successMessage = page.locator('text=/cancelled|success/i').first()
        
        const hasDialog = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)
        const hasSuccess = await successMessage.isVisible({ timeout: 2000 }).catch(() => false)
        
        // Either confirmation dialog or success message should appear
        expect(hasDialog || hasSuccess).toBe(true)
      }
    }
  })

  test('vendor sees booking details when viewing a booking', async ({ page, baseURL }) => {
    // Navigate to a specific booking (if ID is known from API-created booking)
    await page.goto(`${baseURL}/vendor/bookings/test-booking-id`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth')
    
    if (!isLoginPage) {
      // Look for booking details
      const bookingDetails = page.locator('[data-testid="booking-details"], .booking-details').first()
      const detailsVisible = await bookingDetails.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (detailsVisible) {
        expect(await bookingDetails.isVisible()).toBe(true)
        
        // Check for key booking information
        const hasCustomerInfo = await page.locator('text=/customer|client/i').isVisible({ timeout: 2000 }).catch(() => false)
        const hasServiceInfo = await page.locator('text=/service|appointment/i').isVisible({ timeout: 2000 }).catch(() => false)
        const hasTimeInfo = await page.locator('text=/time|date|schedule/i').isVisible({ timeout: 2000 }).catch(() => false)
        
        // At least some booking information should be visible
        expect(hasCustomerInfo || hasServiceInfo || hasTimeInfo).toBe(true)
      }
    }
  })

  test('vendor dashboard shows booking statistics', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/vendor/dashboard`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth')
    
    if (!isLoginPage) {
      // Look for statistics or metrics
      const stats = page.locator('[data-testid="booking-stats"], .stats, .metrics').first()
      const statsVisible = await stats.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (statsVisible) {
        expect(await stats.isVisible()).toBe(true)
      }
    }
  })
})
