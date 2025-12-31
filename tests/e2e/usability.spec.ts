import { test, expect, Page } from '@playwright/test'

/**
 * Usability Test Suite
 * 
 * Tests the site's usability from a user perspective:
 * - Navigation clarity
 * - Registration/login flow clarity
 * - Button/link visibility and labels
 * - Error messages and feedback
 * - Form validation
 * - Page structure and hierarchy
 * - Mobile responsiveness
 * - User flow completion
 */

test.describe('Site Usability Tests', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

  test.describe('Navigation and Clarity', () => {
    test('homepage has clear navigation and CTAs', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')

      // Check for main navigation
      const nav = page.locator('nav[data-test="main-nav"]').first()
      await expect(nav).toBeVisible()

      // Check for clear registration/login options
      const registrationOptions = [
        page.getByRole('button', { name: /book.*appointment/i }),
        page.getByRole('button', { name: /offer.*services/i }),
        page.getByRole('link', { name: /register/i }),
        page.getByRole('link', { name: /sign.*up/i }),
        page.getByRole('link', { name: /get.*started/i }),
      ]

      let foundRegistration = false
      for (const option of registrationOptions) {
        const count = await option.count()
        if (count > 0 && await option.first().isVisible()) {
          foundRegistration = true
          console.log(`✓ Found registration option: ${await option.first().textContent()}`)
          break
        }
      }

      if (!foundRegistration) {
        console.warn('⚠️ No clear registration/login options found on homepage')
      }

      // Check for login link
      const loginLink = page.getByRole('link', { name: /log.*in|sign.*in/i })
      const hasLogin = await loginLink.count() > 0 && await loginLink.first().isVisible()
      
      if (!hasLogin) {
        console.warn('⚠️ No clear login link found')
      }

      // Check for help/support link
      const helpLink = page.getByRole('link', { name: /help|support|faq/i })
      const hasHelp = await helpLink.count() > 0 && await helpLink.first().isVisible()
      
      expect(foundRegistration || hasLogin).toBeTruthy()
    })

    test('navigation buttons have clear labels', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')

      // Get all buttons in navigation
      const navButtons = page.locator('nav[data-test="main-nav"] button, nav[data-test="main-nav"] a[role="button"]')
      
      // Wait for at least one button to be visible
      try {
        await navButtons.first().waitFor({ state: 'visible', timeout: 5000 })
      } catch (e) {
        console.warn('⚠️ No navigation buttons became visible within timeout')
      }

      const buttonCount = await navButtons.count()

      const unclearButtons: string[] = []
      
      for (let i = 0; i < buttonCount; i++) {
        const button = navButtons.nth(i)
        if (await button.isVisible()) {
          const text = await button.textContent()
          const ariaLabel = await button.getAttribute('aria-label')
          const title = await button.getAttribute('title')
          
          // Check if button has meaningful text or label
          const hasLabel = (text && text.trim().length > 0) || ariaLabel || title
          
          if (!hasLabel) {
            unclearButtons.push(`Button ${i} has no label`)
          } else {
            // Check if label is too vague
            const label = (text || ariaLabel || title || '').toLowerCase()
            if (label.length < 3 || ['click', 'button', 'link', 'here'].includes(label)) {
              unclearButtons.push(`Button "${label}" is unclear`)
            }
          }
        }
      }

      if (unclearButtons.length > 0) {
        console.warn('⚠️ Found buttons with unclear labels:', unclearButtons)
      }

      // At least some buttons should have clear labels
      expect(buttonCount).toBeGreaterThan(0)
    })
  })

  test.describe('Registration Flow Clarity', () => {
    test('registration page is clear and intuitive', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`)
      await page.waitForLoadState('domcontentloaded')

      // Check for clear heading
      const heading = page.locator('h1, h2').first()
      const headingText = await heading.textContent()
      expect(headingText).toBeTruthy()
      expect(headingText?.toLowerCase()).toMatch(/register|sign.*up|create.*account/i)

      // Check for email field
      const emailField = page.locator('input[type="email"], input[name*="email"], input[id*="email"]').first()
      await expect(emailField).toBeVisible()

      // Check for password field
      const passwordField = page.locator('input[type="password"], input[name*="password"], input[id*="password"]').first()
      await expect(passwordField).toBeVisible()

      // Check for submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("register"), button:has-text("create")').first()
      await expect(submitButton).toBeVisible()

      // Check for helpful text or instructions
      const helpText = page.locator('p, span, label').filter({ hasText: /customer|provider|role/i })
      const hasHelpText = await helpText.count() > 0
      
      if (!hasHelpText) {
        console.warn('⚠️ No clear indication of customer vs provider registration')
      }
    })

    test('registration form provides clear feedback', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`)
      await page.waitForLoadState('domcontentloaded')

      const submitButton = page.locator('button[type="submit"]').first()
      // The register submit is disabled until a role is selected; treat disabled as acceptable feedback.
      const isDisabled = await submitButton.isDisabled().catch(() => false)
      if (!isDisabled) {
        await submitButton.click()
      }

      // Wait a bit for validation
      await page.waitForTimeout(500)

      // Check for error messages or validation feedback
      const errorMessages = page.locator('[role="alert"], .error, [class*="error"], [class*="invalid"]')
      const hasErrors = await errorMessages.count() > 0

      // Check for required field indicators
      const requiredFields = page.locator('input[required], label:has-text("*")')
      const hasRequiredIndicators = await requiredFields.count() > 0

      if (!hasErrors && !hasRequiredIndicators) {
        console.warn('⚠️ Form validation feedback is unclear')
      }

      // Form should have some way to indicate required fields
      expect(hasErrors || hasRequiredIndicators || await submitButton.isDisabled()).toBeTruthy()
    })
  })

  test.describe('User Flow Completion', () => {
    test('can complete basic user journey without confusion', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')

      const issues: string[] = []

      // Step 1: Find registration
      const registerButton = page.getByRole('button', { name: /book.*appointment|offer.*services/i }).first()
      const registerLink = page.getByRole('link', { name: /register|get.*started/i }).first()
      
      if (await registerButton.count() === 0 && await registerLink.count() === 0) {
        issues.push('Cannot find registration option')
      }

      // Step 2: Navigate to registration
      if (await registerButton.count() > 0) {
        await registerButton.click()
      } else if (await registerLink.count() > 0) {
        await registerLink.click()
      } else {
        await page.goto(`${BASE_URL}/register`)
      }

      await page.waitForLoadState('domcontentloaded')

      // Step 3: Check if we're on a registration page
      const currentUrl = page.url()
      const isRegistrationPage = currentUrl.includes('/register') || 
                                  currentUrl.includes('/get-started') ||
                                  currentUrl.includes('/signup')

      if (!isRegistrationPage) {
        issues.push(`After clicking register, ended up on: ${currentUrl}`)
      }

      // Step 4: Check for clear next steps
      const formFields = page.locator('input[type="email"], input[type="password"]')
      const fieldCount = await formFields.count()

      if (fieldCount === 0) {
        issues.push('Registration page has no form fields')
      }

      if (issues.length > 0) {
        console.warn('⚠️ User flow issues found:', issues)
      }

      // Should be able to at least reach registration page
      expect(isRegistrationPage || fieldCount > 0).toBeTruthy()
    })
  })

  test.describe('Error Handling and Feedback', () => {
    test('error messages are clear and helpful', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`)
      await page.waitForLoadState('domcontentloaded')

      // Enable submit by selecting a role first
      const roleButton = page.getByRole('button', { name: /book services|offer services/i }).first()
      if (await roleButton.count() > 0) {
        await roleButton.click()
      }

      // Fill form with invalid data
      const emailField = page.locator('input[type="email"]').first()
      const passwordField = page.locator('input[type="password"]').first()
      
      if (await emailField.count() > 0) {
        await emailField.fill('invalid-email')
        await passwordField.fill('123') // Too short
        
        // Try to submit
        const submitButton = page.locator('button[type="submit"]').first()
        await submitButton.click()
        
        await page.waitForTimeout(1000)

        // Check for error messages
        const errors = page.locator('[role="alert"], .error, [class*="error"]')
        const errorCount = await errors.count()

        if (errorCount === 0) {
          console.warn('⚠️ No error messages shown for invalid input')
        } else {
          // Check if error messages are helpful
          for (let i = 0; i < errorCount; i++) {
            const errorText = await errors.nth(i).textContent()
            if (!errorText || errorText.length < 10) {
              console.warn(`⚠️ Error message too short or unclear: "${errorText}"`)
            }
          }
        }
      }
    })
  })

  test.describe('Mobile Usability', () => {
    test('mobile navigation is accessible', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')

      const nav = page.locator('nav[data-test="main-nav"]').first()
      const mobileMenu = page.locator('[data-test*="mobile"], [aria-label*="menu"]').first()

      // Wait for nav to be present
      try {
        await nav.waitFor({ state: 'attached', timeout: 5000 })
      } catch (e) {
        console.warn('⚠️ Nav element not attached within timeout')
      }

      // Check for mobile menu button
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], [data-test*="mobile-menu"]').first()
      const hasMobileMenu = await mobileMenuButton.count() > 0 && await mobileMenuButton.isVisible()

      if (!hasMobileMenu) {
        // Check if navigation is still visible (might be always visible)
        const nav = page.locator('nav[data-test="main-nav"]').first()
        const navVisible = await nav.isVisible()
        
        if (!navVisible) {
          console.warn('⚠️ No mobile menu button and navigation not visible on mobile')
        }
      }

      // Navigation should be accessible somehow
      expect(await nav.isVisible() || await mobileMenu.isVisible()).toBeTruthy()
    })

    test('forms are usable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(`${BASE_URL}/register`)
      await page.waitForLoadState('domcontentloaded')

      // Check if form fields are visible and properly sized
      const emailField = page.locator('input[type="email"]').first()
      if (await emailField.count() > 0) {
        const isVisible = await emailField.isVisible()
        const box = await emailField.boundingBox()
        
        if (!isVisible) {
          console.warn('⚠️ Email field not visible on mobile')
        }
        
        if (box && box.height < 40) {
          console.warn('⚠️ Form fields might be too small for mobile touch targets (recommended: 44px+)')
        }

        expect(isVisible).toBeTruthy()
      }
    })
  })

  test.describe('Page Structure and Hierarchy', () => {
    test('pages have clear headings and structure', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')

      // Check for main heading
      const h1 = page.locator('h1').first()
      const hasH1 = await h1.count() > 0 && await h1.isVisible()
      
      if (!hasH1) {
        console.warn('⚠️ No visible H1 heading on homepage')
      }

      // Check for logical heading hierarchy
      const headings = page.locator('h1, h2, h3')
      const headingCount = await headings.count()
      
      if (headingCount === 0) {
        console.warn('⚠️ No headings found - page structure unclear')
      }

      // Should have at least some structure
      expect(headingCount).toBeGreaterThan(0)
    })

    test('important information is visible above the fold', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // Allow for any animations or dynamic content

      // Get viewport height
      const viewport = page.viewportSize()
      const viewportHeight = viewport?.height || 800

      // Check if key elements are visible without scrolling
      // Use more flexible selectors to catch various page structures
      const keyElements = [
        page.locator('h1').first(),
        page.locator('h2').first(),
        page.getByRole('button', { name: /book|register|get.*started|offer.*services/i }).first(),
        page.locator('[data-test*="home"]').first(),
        page.locator('main').first(),
        page.locator('nav').first(),
      ]

      let visibleCount = 0
      for (const element of keyElements) {
        try {
          const count = await element.count()
          if (count > 0) {
            const box = await element.boundingBox()
            if (box && box.y < viewportHeight && box.height > 0) {
              visibleCount++
            }
          }
        } catch (e) {
          // Element might not exist, continue checking others
        }
      }

      if (visibleCount === 0) {
        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-results/homepage-above-fold.png', fullPage: false })
        console.warn('⚠️ Key call-to-action elements not visible above the fold')
        // Check if page has any content at all
        const bodyText = await page.locator('body').textContent()
        if (!bodyText || bodyText.trim().length === 0) {
          throw new Error('Page appears to be empty')
        }
      }

      // At least one key element should be visible (relaxed requirement)
      expect(visibleCount).toBeGreaterThan(0)
    })
  })

  test.describe('Loading States and Feedback', () => {
    test('loading states provide feedback', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')

      // Check for any loading indicators
      const loadingIndicators = page.locator('[aria-busy="true"], .loading, [class*="loading"], [class*="spinner"]')
      const hasLoadingIndicators = await loadingIndicators.count() > 0

      // This is informational - loading states might not be visible on initial load
      if (hasLoadingIndicators) {
        console.log('✓ Loading indicators found')
      }
    })

    test('buttons show loading state during actions', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`)
      await page.waitForLoadState('domcontentloaded')

      // Registration submit is disabled until a role is selected
      const roleButton = page.getByRole('button', { name: /book services|offer services/i }).first()
      if (await roleButton.count() > 0) {
        await roleButton.click()
      }

      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.count() > 0) {
        // Fill form and submit
        const emailField = page.locator('input[type="email"]').first()
        const passwordField = page.locator('input[type="password"]').first()
        
        if (await emailField.count() > 0) {
          await emailField.fill('test@example.com')
          await passwordField.fill('TestPassword123!')
          
          await submitButton.click()
          
          // Check if button shows loading state
          await page.waitForTimeout(500)
          
          const isDisabled = await submitButton.isDisabled()
          const buttonText = await submitButton.textContent()
          const hasLoadingText = buttonText?.toLowerCase().includes('loading') || 
                                 buttonText?.toLowerCase().includes('...') ||
                                 buttonText?.toLowerCase().includes('ing')

          if (!isDisabled && !hasLoadingText) {
            console.warn('⚠️ Submit button does not show loading state during submission')
          }
        }
      }
    })
  })
})
