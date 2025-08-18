import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Test data
const testCustomer = {
  email: 'customer-shoutout@test.com',
  password: 'TestPassword123!',
  name: 'Test Customer'
}

const testVendor = {
  email: 'vendor-shoutout@test.com',
  password: 'TestPassword123!',
  name: 'Test Vendor',
  business_name: 'Test Vendor Business'
}

const testService = {
  name: 'Test Service',
  category: 'Beauty & Wellness',
  price: 50.00,
  duration: 60
}

const testLocation = {
  latitude: 40.7128,
  longitude: -74.0060,
  address: 'New York, NY'
}

// Helper functions
async function signUp(page: Page, user: typeof testCustomer, role: 'customer' | 'vendor' = 'customer') {
  await page.goto('/register')
  await page.fill('[data-testid="email-input"]', user.email)
  await page.fill('[data-testid="password-input"]', user.password)
  await page.fill('[data-testid="full-name-input"]', user.name)
  
  if (role === 'vendor') {
    await page.click('[data-testid="vendor-role-radio"]')
    await page.fill('[data-testid="business-name-input"]', (user as any).business_name)
  }
  
  await page.click('[data-testid="register-button"]')
  await expect(page).toHaveURL(/\/dashboard|\/choose-role/)
}

async function signIn(page: Page, user: typeof testCustomer) {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', user.email)
  await page.fill('[data-testid="password-input"]', user.password)
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL(/\/dashboard/)
}

async function createVendorService(page: Page, service: typeof testService) {
  // Navigate to vendor dashboard and create service
  await page.goto('/vendor/services')
  await page.click('[data-testid="add-service-button"]')
  
  await page.fill('[data-testid="service-name-input"]', service.name)
  await page.selectOption('[data-testid="service-category-select"]', service.category)
  await page.fill('[data-testid="service-price-input"]', service.price.toString())
  await page.fill('[data-testid="service-duration-input"]', service.duration.toString())
  
  await page.click('[data-testid="save-service-button"]')
  await expect(page.locator('[data-testid="service-created-message"]')).toBeVisible()
}

async function enableVendorShoutOuts(page: Page) {
  await page.goto('/vendor/settings')
  await page.check('[data-testid="shout-out-opt-in-checkbox"]')
  await page.click('[data-testid="save-settings-button"]')
  await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible()
}

test.describe('Shout-Out Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should show consent modal when search returns no results', async ({ page }) => {
    // Set up test environment
    await signUp(page, testCustomer, 'customer')
    
    // Navigate to search page
    await page.goto('/')
    
    // Perform a search that will return no results
    await page.fill('[data-testid="search-query-input"]', 'Unicorn Grooming Service')
    await page.fill('[data-testid="search-location-input"]', testLocation.address)
    await page.click('[data-testid="search-providers-btn"]')
    
    // Wait for search to complete and show no results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="no-results-message"]')).toBeVisible()
    
    // Consent modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('#shout-out-modal-title')).toContainText('No Results Found')
    
    // Verify modal content
    await expect(page.locator('#shout-out-modal-description')).toContainText('Unicorn Grooming Service')
    await expect(page.locator('#shout-out-modal-description')).toContainText(testLocation.address)
  })

  test('should have accessible consent modal with proper focus management', async ({ page }) => {
    await signUp(page, testCustomer, 'customer')
    await page.goto('/')
    
    // Trigger no results scenario
    await page.fill('[data-testid="search-query-input"]', 'Nonexistent Service')
    await page.fill('[data-testid="search-location-input"]', testLocation.address)
    await page.click('[data-testid="search-providers-btn"]')
    
    // Modal should be accessible
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal).toHaveAttribute('aria-modal', 'true')
    await expect(modal).toHaveAttribute('aria-labelledby', 'shout-out-modal-title')
    await expect(modal).toHaveAttribute('aria-describedby', 'shout-out-modal-description')
    
    // Focus should be trapped in modal
    const closeButton = page.locator('[aria-label="Close modal"]')
    const consentButton = page.locator('text=Yes, Send Shout-Out')
    
    await expect(closeButton).toBeFocused()
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(consentButton).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(closeButton).toBeFocused() // Should wrap around
    
    // Test escape key
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('should create shout-out when user consents', async ({ page }) => {
    await signUp(page, testCustomer, 'customer')
    await page.goto('/')
    
    // Trigger consent modal
    await page.fill('[data-testid="search-query-input"]', 'Test Service Request')
    await page.fill('[data-testid="search-location-input"]', testLocation.address)
    await page.click('[data-testid="search-providers-btn"]')
    
    // Wait for modal and consent
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    
    // Mock geolocation
    await page.evaluate(() => {
      const mockGeolocation = {
        getCurrentPosition: (success: (position: { coords: { latitude: number; longitude: number } }) => void) => {
          success({
            coords: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          })
        }
      }
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true
      })
    })
    
    // Click consent button
    await page.click('text=Yes, Send Shout-Out')
    
    // Modal should close and offers view should appear
    await expect(modal).not.toBeVisible()
    await expect(page.locator('[data-testid="shout-out-offers"]')).toBeVisible()
    await expect(page.locator('[data-testid="offers-timer"]')).toBeVisible()
  })

  test('should show waiting state when no offers received', async ({ page }) => {
    await signUp(page, testCustomer, 'customer')
    
    // Create shout-out (skip modal for this test)
    await page.goto('/api-test') // Hypothetical test page that creates shout-out directly
    
    const offersSection = page.locator('[data-testid="shout-out-offers"]')
    await expect(offersSection).toBeVisible()
    
    // Should show waiting state
    await expect(page.locator('[data-testid="waiting-for-offers"]')).toBeVisible()
    await expect(page.locator('text=Waiting for Offers')).toBeVisible()
    await expect(page.locator('text=We\'ve notified nearby providers')).toBeVisible()
    
    // Should show expand radius option
    await expect(page.locator('[data-testid="expand-radius-button"]')).toBeVisible()
  })

  test('should show fallback UI when shout-out expires with no offers', async ({ page }) => {
    await signUp(page, testCustomer, 'customer')
    
    // Mock an expired shout-out
    await page.evaluate(() => {
      // Mock the offers API to return expired shout-out
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.includes('/api/shout-outs/') && url.includes('/offers')) {
          return new Response(JSON.stringify({
            success: true,
            offers: [],
            has_expired: true,
            expires_at: new Date(Date.now() - 1000).toISOString()
          }))
        }
        return new Response('{}')
      }
    })
    
    await page.goto('/test-expired-shout-out') // Hypothetical test page
    
    // Should show expired state
    await expect(page.locator('[data-testid="shout-out-expired"]')).toBeVisible()
    await expect(page.locator('text=Shout-Out Expired')).toBeVisible()
    await expect(page.locator('text=No offers were received')).toBeVisible()
    
    // Should offer to expand radius
    const expandButton = page.locator('[data-testid="expand-radius-final"]')
    await expect(expandButton).toBeVisible()
    await expect(expandButton).toContainText('Expand Search Radius')
  })

  test('should display vendor offers with correct information', async ({ page }) => {
    await signUp(page, testCustomer, 'customer')
    
    // Mock offers response
    await page.evaluate(() => {
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.includes('/api/shout-outs/') && url.includes('/offers')) {
          return new Response(JSON.stringify({
            success: true,
            offers: [
              {
                id: 'offer-1',
                vendor_name: 'Test Vendor',
                vendor_rating: 4.5,
                vendor_total_reviews: 23,
                service_name: 'Premium Service',
                slot_start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                slot_end: new Date(Date.now() + 86400000 + 3600000).toISOString(), // Tomorrow + 1 hour
                price_cents: 7500, // $75.00
                message: 'Special offer for first-time customers!',
                distance_km: 2.3,
                score: 85.5
              }
            ],
            has_expired: false,
            expires_at: new Date(Date.now() + 1800000).toISOString() // 30 minutes from now
          }))
        }
        return new Response('{}')
      }
    })
    
    await page.goto('/test-shout-out-offers') // Hypothetical test page
    
    // Verify offer card content
    const offerCard = page.locator('[data-testid="offer-card"]').first()
    await expect(offerCard).toBeVisible()
    
    await expect(offerCard.locator('[data-testid="vendor-name"]')).toContainText('Test Vendor')
    await expect(offerCard.locator('[data-testid="vendor-rating"]')).toContainText('4.5')
    await expect(offerCard.locator('[data-testid="vendor-reviews"]')).toContainText('23 reviews')
    await expect(offerCard.locator('[data-testid="offer-price"]')).toContainText('$75.00')
    await expect(offerCard.locator('[data-testid="vendor-message"]')).toContainText('Special offer for first-time customers!')
    await expect(offerCard.locator('[data-testid="vendor-distance"]')).toContainText('2.3 km')
    
    // Verify accept button
    const acceptButton = offerCard.locator('[data-testid="accept-offer-button"]')
    await expect(acceptButton).toBeVisible()
    await expect(acceptButton).toBeEnabled()
    await expect(acceptButton).toContainText('Accept Offer')
  })

  test('should accept offer and create booking', async ({ page }) => {
    await signUp(page, testCustomer, 'customer')
    
    // Mock successful offer acceptance
    await page.evaluate(() => {
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (init?.method === 'POST' && url.includes('/accept')) {
          return new Response(JSON.stringify({
            success: true,
            booking_id: 'booking-123',
            message: 'Offer accepted and booking created successfully'
          }))
        }
        return new Response('{}')
      }
    })
    
    await page.goto('/test-shout-out-offers') // Hypothetical test page with offers
    
    const acceptButton = page.locator('[data-testid="accept-offer-button"]').first()
    await acceptButton.click()
    
    // Should show loading state
    await expect(acceptButton).toContainText('Accepting...')
    await expect(acceptButton).toBeDisabled()
    
    // Should redirect to booking page
    await expect(page).toHaveURL(/\/bookings\/booking-123/)
  })

  test('should handle offer acceptance errors gracefully', async ({ page }) => {
    await signUp(page, testCustomer, 'customer')
    
    // Mock failed offer acceptance
    await page.evaluate(() => {
      window.fetch = async (url: string, options?: any) => {
        if (options?.method === 'POST' && url.includes('/accept')) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Offer is no longer available'
          }), { status: 400 })
        }
        return new Response('{}')
      }
    })
    
    await page.goto('/test-shout-out-offers') // Hypothetical test page with offers
    
    const acceptButton = page.locator('[data-testid="accept-offer-button"]').first()
    await acceptButton.click()
    
    // Should show error message
    await expect(page.locator('[data-testid="offer-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="offer-error"]')).toContainText('Offer is no longer available')
    
    // Button should be re-enabled
    await expect(acceptButton).toBeEnabled()
  })

  test('should show vendor shout-out dashboard', async ({ page }) => {
    await signUp(page, testVendor, 'vendor')
    await createVendorService(page, testService)
    await enableVendorShoutOuts(page)
    
    await page.goto('/vendor/shout-outs')
    
    // Should show dashboard
    await expect(page.locator('[data-testid="shout-out-dashboard"]')).toBeVisible()
    await expect(page.locator('text=Shout-Out Requests')).toBeVisible()
    
    // Should show empty state initially
    await expect(page.locator('[data-testid="no-shout-outs"]')).toBeVisible()
    await expect(page.locator('text=No shout-outs available')).toBeVisible()
  })

  test('should display shout-out requests for vendors', async ({ page }) => {
    await signUp(page, testVendor, 'vendor')
    await enableVendorShoutOuts(page)
    
    // Mock shout-out requests
    await page.evaluate(() => {
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        if (url.includes('/api/vendors/shout-outs')) {
          return new Response(JSON.stringify({
            success: true,
            shout_outs: [
              {
                id: 'shout-out-1',
                service_type: 'Beauty & Wellness',
                description: 'Need hair styling for wedding',
                radius_km: 10,
                status: 'active',
                expires_at: new Date(Date.now() + 1800000).toISOString(),
                created_at: new Date(Date.now() - 300000).toISOString(),
                response_status: 'pending',
                notified_at: new Date(Date.now() - 300000).toISOString(),
                distance_km: 3.2
              }
            ]
          }))
        }
        return new Response('{}')
      }
    })
    
    await page.goto('/vendor/shout-outs')
    
    // Should show shout-out card
    const shoutOutCard = page.locator('[data-testid="shout-out-card"]').first()
    await expect(shoutOutCard).toBeVisible()
    
    await expect(shoutOutCard.locator('[data-testid="service-type"]')).toContainText('Beauty & Wellness')
    await expect(shoutOutCard.locator('[data-testid="description"]')).toContainText('Need hair styling for wedding')
    await expect(shoutOutCard.locator('[data-testid="distance"]')).toContainText('3.2 km')
    await expect(shoutOutCard.locator('[data-testid="status-badge"]')).toContainText('New')
    
    // Should show respond button
    const respondButton = shoutOutCard.locator('[data-testid="respond-button"]')
    await expect(respondButton).toBeVisible()
    await expect(respondButton).toContainText('Respond with Offer')
  })

  test('should open response modal when vendor clicks respond', async ({ page }) => {
    await signUp(page, testVendor, 'vendor')
    await page.goto('/vendor/shout-outs')
    
    // Click respond button (mock data assumed from previous test)
    await page.click('[data-testid="respond-button"]')
    
    // Response modal should open
    const modal = page.locator('[data-testid="response-modal"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('text=Respond to Shout-Out')).toBeVisible()
    
    // Should have form fields
    await expect(page.locator('[data-testid="service-select"]')).toBeVisible()
    await expect(page.locator('[data-testid="date-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="time-select"]')).toBeVisible()
    await expect(page.locator('[data-testid="price-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-textarea"]')).toBeVisible()
  })

  test('should submit vendor response successfully', async ({ page }) => {
    await signUp(page, testVendor, 'vendor')
    await page.goto('/vendor/shout-outs')
    await page.click('[data-testid="respond-button"]')
    
    // Fill out response form
    await page.selectOption('[data-testid="service-select"]', 'service-123')
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.fill('[data-testid="date-input"]', tomorrow.toISOString().split('T')[0])
    
    await page.selectOption('[data-testid="time-select"]', '10:00')
    await page.fill('[data-testid="price-input"]', '75.00')
    await page.fill('[data-testid="message-textarea"]', 'I specialize in wedding hair and would love to help!')
    
    // Mock successful submission
    await page.evaluate(() => {
      window.fetch = async (url: string, options?: any) => {
        if (options?.method === 'POST' && url.includes('/reply')) {
          return new Response(JSON.stringify({
            success: true,
            offer_id: 'offer-123',
            message: 'Offer created successfully'
          }))
        }
        return new Response('{}')
      }
    })
    
    // Submit form
    await page.click('[data-testid="submit-response"]')
    
    // Should show success and close modal
    await expect(page.locator('[data-testid="response-modal"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('should withdraw vendor offer if needed', async ({ page }) => {
    await signUp(page, testVendor, 'vendor')
    
    // Test withdrawal functionality would go here
    // This would involve mocking an existing offer and providing withdraw option
  })

  test('complete end-to-end shout-out flow', async ({ page, context }) => {
    // This test simulates the complete flow with both customer and vendor
    
    // Setup: Create vendor with service
    const vendorPage = await context.newPage()
    await signUp(vendorPage, testVendor, 'vendor')
    await createVendorService(vendorPage, testService)
    await enableVendorShoutOuts(vendorPage)
    
    // Customer creates shout-out
    await signUp(page, testCustomer, 'customer')
    await page.goto('/')
    
    // Perform search with no results
    await page.fill('[data-testid="search-query-input"]', testService.name)
    await page.fill('[data-testid="search-location-input"]', testLocation.address)
    await page.click('[data-testid="search-providers-btn"]')
    
    // Consent to shout-out
    await page.click('text=Yes, Send Shout-Out')
    
    // Verify shout-out created
    await expect(page.locator('[data-testid="shout-out-offers"]')).toBeVisible()
    
    // Vendor responds to shout-out
    await vendorPage.goto('/vendor/shout-outs')
    await vendorPage.click('[data-testid="respond-button"]')
    
    // Fill response form
    await vendorPage.selectOption('[data-testid="service-select"]', 'service-123')
    await vendorPage.fill('[data-testid="price-input"]', '60.00')
    await vendorPage.click('[data-testid="submit-response"]')
    
    // Customer sees and accepts offer
    await page.reload()
    await expect(page.locator('[data-testid="offer-card"]')).toBeVisible()
    await page.click('[data-testid="accept-offer-button"]')
    
    // Verify booking creation
    await expect(page).toHaveURL(/\/bookings\//)
    
    await vendorPage.close()
  })
})
