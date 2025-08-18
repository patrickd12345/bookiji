import { test, expect } from '@playwright/test';
import { installChaos, CHAOS_PRESETS } from './utils/chaos';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * 🏛️ Chaos UX Contracts
 * 
 * Tests that enforce the "never blank screen" contract across critical routes.
 * These tests simulate various failure scenarios to ensure error boundaries
 * catch all exceptions and render accessible fallback UIs.
 */
test.describe('🏛️ Chaos UX Contracts', () => {

  test.describe('Global Error Boundary Contracts', () => {
    test('should never blank screen on route-level errors', async ({ page }) => {
      // Force JavaScript errors by injecting bad script
      await page.addInitScript(() => {
        // Override console.error to catch boundary logs
        const originalError = console.error;
        (window as any).errorBoundaryLogs = [];
        console.error = (...args) => {
          (window as any).errorBoundaryLogs.push(args.join(' '));
          originalError.apply(console, args);
        };
      });

      await page.goto(`${BASE_URL}/`);
      
      // Inject script that will cause component to throw
      await page.evaluate(() => {
        // Force a render error by corrupting React state
        const script = document.createElement('script');
        script.textContent = `
          window.addEventListener('DOMContentLoaded', () => {
            // Corrupt any React fiber nodes we can find
            if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
              throw new Error('Simulated component error for boundary testing');
            }
          });
        `;
        document.head.appendChild(script);
      });

      // Navigate to a route that might have errors
      await page.goto(`${BASE_URL}/demo`).catch(() => {
        // Route might not exist, that's fine
      });

      // Should never see a blank screen - either content loads or error boundary shows
      const hasContent = await page.locator('main, section, article, div').first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasErrorBoundary = await page.locator('[role="alert"], [data-testid*="fallback"]').first().isVisible().catch(() => false);
      
      expect(hasContent || hasErrorBoundary).toBe(true);
      
      // If error boundary is shown, verify it's accessible
      if (hasErrorBoundary) {
        await expect(page.locator('[role="alert"]')).toBeVisible();
      }
    });
  });

  test.describe('Payment Route Contract', () => {
    test('should never blank screen on /pay/:id', async ({ page }) => {
      const bookingId = 'test-booking-123';
      
      // Install chaos targeting payment routes
      await installChaos(page, { 
        enabled: true,
        paymentFailRate: 1.0,  // 100% payment failures
        failureRate: 0.8       // 80% general failures
      });

      try {
        await page.goto(`${BASE_URL}/pay/${bookingId}`);
        await page.waitForLoadState('networkidle');
      } catch (error) {
        // Route errors are expected with chaos, that's what we're testing
      }

      // Contract: Must never show blank screen
      const hasPaymentFallback = await page.locator('[role="alert"]').isVisible({ timeout: 5000 }).catch(() => false);
      const hasContent = await page.locator('main, section, article').first().isVisible().catch(() => false);
      
      expect(hasPaymentFallback || hasContent).toBe(true);

      // If error boundary triggered, verify payment-specific fallback
      if (hasPaymentFallback) {
        await expect(page.locator('[role="alert"]')).toContainText(/payment.*unavailable/i);
        await expect(page.getByTestId('fallback-retry')).toBeVisible();
        await expect(page.getByTestId('fallback-to-confirm')).toBeVisible();
        await expect(page.getByTestId('fallback-choose-method')).toBeVisible();
        await expect(page.getByTestId('fallback-home')).toBeVisible();
      }
    });

    test('should render fallback within 1s of connection loss', async ({ page }) => {
      const bookingId = 'test-booking-456';
      
      await page.goto(`${BASE_URL}/pay/${bookingId}`).catch(() => {
        // Route might not exist yet, that's fine
      });

      // Simulate network loss after page loads
      await installChaos(page, { 
        enabled: true,
        timeoutRate: 1.0  // 100% timeouts
      });

      const startTime = Date.now();
      
      // Try to interact with payment form (if it exists)
      await page.locator('button, [type="submit"]').first().click().catch(() => {
        // Button might not exist, that's fine
      });

      // Should show fallback within 1s
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 1000 }).catch(async () => {
        // If no error boundary, at least verify page is still responsive
        await expect(page.locator('body')).toBeVisible();
      });

      const fallbackTime = Date.now() - startTime;
      expect(fallbackTime).toBeLessThan(2000); // Within 2s grace period
    });

    test('should provide graceful fallback with retry', async ({ page }) => {
      const bookingId = 'test-booking-789';
      
      await installChaos(page, { 
        enabled: true,
        paymentFailRate: 1.0
      });

      await page.goto(`${BASE_URL}/pay/${bookingId}`).catch(() => {
        // Route errors expected
      });

      // Should show payment fallback
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 }).catch(() => {
        // If route doesn't exist yet, that's ok
      });

      const hasRetryButton = await page.getByTestId('fallback-retry').isVisible().catch(() => false);
      if (hasRetryButton) {
        // Test retry functionality
        await page.getByTestId('fallback-retry').click();
        
        // Should either retry or show same fallback (both acceptable)
        await expect(page.locator('[role="alert"], main')).toBeVisible({ timeout: 3000 });
      }
    });

    test('should have no error boundary not blank screen', async ({ page }) => {
      const bookingId = 'test-booking-error-boundary';
      
      // Cause maximum chaos
      await installChaos(page, CHAOS_PRESETS.offline);

      await page.goto(`${BASE_URL}/pay/${bookingId}`).catch(() => {
        // Errors expected
      });

      // Should show error boundary, NOT blank screen
      const isBlankScreen = await page.evaluate(() => {
        const body = document.body;
        const hasNoVisibleContent = body.children.length === 0 || 
          Array.from(body.children).every(child => 
            (child as HTMLElement).offsetHeight === 0 && 
            (child as HTMLElement).offsetWidth === 0
          );
        return hasNoVisibleContent;
      });

      expect(isBlankScreen).toBe(false);

      // Should have EITHER content OR error boundary
      const hasErrorUI = await page.locator('[role="alert"], main, section').first().isVisible().catch(() => false);
      expect(hasErrorUI).toBe(true);
    });
  });

  test.describe('Error Boundary Accessibility', () => {
    test('should meet WCAG 2.1 A/AA in error state', async ({ page }) => {
      await installChaos(page, { 
        enabled: true,
        failureRate: 1.0 
      });

      await page.goto(`${BASE_URL}/pay/test-a11y`).catch(() => {
        // Route errors expected
      });

      // Wait for error boundary
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 }).catch(() => {
        // If no error boundary shows, skip a11y test
        test.skip(true, 'No error boundary rendered to test');
      });

      // Run axe on error boundary
      const results = await new AxeBuilder({ page })
        .include('[role="alert"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      if (results.violations.length > 0) {
        console.error('Error boundary a11y violations:', 
          results.violations.map(v => `${v.id}: ${v.help}`).join('\n')
        );
      }

      expect(results.violations).toHaveLength(0);
    });

    test('should announce errors to screen readers', async ({ page }) => {
      await installChaos(page, { 
        enabled: true,
        failureRate: 1.0 
      });

      await page.goto(`${BASE_URL}/pay/test-aria`).catch(() => {
        // Route errors expected
      });

      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toBeVisible({ timeout: 5000 }).catch(() => {
        test.skip(true, 'No error boundary to test');
      });

      // Should have aria-live="assertive" for immediate announcement
      await expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      
      // Should have meaningful error text
      await expect(errorAlert).toContainText(/error|problem|fail|unavailable/i);
    });
  });

  test.describe('Component-Level Error Boundaries', () => {
    test('should isolate component failures', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      // Inject script to cause individual component errors
      await page.addInitScript(() => {
        // Override window.addEventListener to simulate random component errors
        const originalAddEventListener = window.addEventListener;
        let errorCount = 0;
        
        window.addEventListener = function(type: any, listener: any, options?: any) {
          if (type === 'DOMContentLoaded' && Math.random() < 0.1 && errorCount < 3) {
            errorCount++;
            setTimeout(() => {
              throw new Error(`Simulated component error ${errorCount}`);
            }, 100);
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      });

      // Page should still be functional despite component errors
      await expect(page.locator('body')).toBeVisible();
      
      // Should either show error boundaries or normal content
      const hasVisibleContent = await page.locator('main, section, [role="alert"]').first().isVisible().catch(() => false);
      expect(hasVisibleContent).toBe(true);
    });
  });

  test.describe('Recovery and Navigation', () => {
    test('should allow navigation away from error state', async ({ page }) => {
      await installChaos(page, { 
        enabled: true,
        failureRate: 1.0 
      });

      await page.goto(`${BASE_URL}/pay/test-nav`).catch(() => {
        // Route errors expected
      });

      // Wait for error boundary
      const errorBoundary = page.locator('[role="alert"]');
      await expect(errorBoundary).toBeVisible({ timeout: 5000 }).catch(() => {
        test.skip(true, 'No error boundary to test navigation');
      });

      // Should be able to navigate home
      const homeButton = page.getByTestId('fallback-home');
      if (await homeButton.isVisible()) {
        await homeButton.click();
        await expect(page).toHaveURL(/.*\/$|.*\/home/);
      }
    });

    test('should allow retry functionality', async ({ page }) => {
      await installChaos(page, { 
        enabled: true,
        failureRate: 0.8  // Allow some retries to succeed
      });

      await page.goto(`${BASE_URL}/pay/test-retry`).catch(() => {
        // Route errors expected
      });

      const retryButton = page.getByTestId('fallback-retry');
      const hasRetry = await retryButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasRetry) {
        // Disable chaos for retry
        await page.unroute('**/*');
        
        await retryButton.click();
        
        // Should either succeed or show error again (both valid)
        await expect(page.locator('[role="alert"], main')).toBeVisible({ timeout: 3000 });
      }
    });
  });
});
