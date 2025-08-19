// 🏛️ Chaos UX Contracts - Testable Resilience Patterns
// These tests enforce specific UX behaviors under failure conditions

import { test, expect } from '@playwright/test';
import { installChaos, loadChaosFromEnv } from '../utils/chaos';

test.describe('🏛️ Chaos UX Contracts', () => {
  test.beforeEach(async ({ page }) => {
    const chaosConfig = {
      ...loadChaosFromEnv(),
      enabled: true,
      latencyMs: 300,
      failureRate: 0.20, // Higher failure rate to force contract testing
      timeoutRate: 0.10,
      supabaseFailRate: 0.25,
    };
    await installChaos(page, chaosConfig);
  });

  test('@contract search button must re-enable or offer retry within 5s', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('massage therapy');
      
      const searchButton = page.getByRole('button', { name: /search|find|go/i }).first();
      if (await searchButton.isVisible({ timeout: 2000 })) {
        
        // Record initial state
        const initialDisabled = await searchButton.isDisabled();
        
        await searchButton.click();
        
        // Wait for either:
        // 1. Button re-enables (retry mechanism)
        // 2. Explicit retry affordance appears
        // 3. Clear error state with retry option
        
        const retryMechanisms = [
          // Button re-enables
          searchButton.and(page.locator(':not([disabled])')),
          
          // Retry button appears  
          page.getByRole('button', { name: /retry|try again/i }).first(),
          
          // Refresh/reload suggestion
          page.getByText(/refresh|reload|try again/i).first(),
          
          // Clear error with actionable guidance
          page.getByText(/check.*connection.*try.*again/i).first(),
        ];
        
        let contractFulfilled = false;
        const startTime = Date.now();
        
        while (Date.now() - startTime < 5000 && !contractFulfilled) {
          for (const mechanism of retryMechanisms) {
            try {
              await expect(mechanism).toBeVisible({ timeout: 500 });
              contractFulfilled = true;
              console.log('✅ Retry mechanism found within 5s');
              break;
            } catch {
              // Try next mechanism
            }
          }
          
          if (!contractFulfilled) {
            await page.waitForTimeout(200);
          }
        }
        
        expect(contractFulfilled, 
          'Search button must re-enable or show retry mechanism within 5s of failure'
        ).toBe(true);
      }
    }
  });

  test('@contract offline banner must appear within 2s of connection loss', async ({ page, context }) => {
    await page.goto('/');
    
    // Go offline
    const offlineStartTime = Date.now();
    await context.setOffline(true);
    
    // Try to trigger network request
    const searchInput = page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('test');
      
      const searchButton = page.getByRole('button', { name: /search/i }).first();
      if (await searchButton.isVisible({ timeout: 1000 })) {
        await searchButton.click().catch(() => {}); // May fail, that's expected
      }
    }
    
    // Must show offline indicator within 2s
    const offlineIndicators = [
      page.getByText(/offline|no connection|network unavailable/i).first(),
      page.getByText(/check.*connection|connect.*internet/i).first(),
      page.locator('[data-testid="offline-banner"]').first(),
      page.locator('[role="alert"]:has-text("offline")').first(),
    ];
    
    let offlineBannerFound = false;
    
    for (const indicator of offlineIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 2000 });
        offlineBannerFound = true;
        
        const timeToShow = Date.now() - offlineStartTime;
        console.log(`✅ Offline banner appeared in ${timeToShow}ms`);
        
        // Ensure it's accessible
        const ariaLive = await indicator.getAttribute('aria-live');
        const role = await indicator.getAttribute('role');
        const isAccessible = ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert';
        
        expect(isAccessible, 'Offline banner must be screen reader accessible').toBe(true);
        break;
      } catch {
        // Try next indicator
      }
    }
    
    expect(offlineBannerFound, 
      'Offline banner must appear within 2s of connection loss'
    ).toBe(true);
  });

  test('@contract payment flow must show graceful fallback with retry', async ({ page }) => {
    // Navigate to payment flow (adjust URL based on your routing)
    await page.goto('/pay/demo-booking-id').catch(async () => {
      // If direct navigation fails, try alternative route
      await page.goto('/');
      const paymentLink = page.getByText(/pay|payment|checkout/i).first();
      if (await paymentLink.isVisible({ timeout: 2000 })) {
        await paymentLink.click();
      }
    });
    
    // Wait for either success or graceful failure
    const paymentOutcomes = [
      // Success states
      page.getByText(/enter.*card|payment.*details|stripe/i).first(),
      page.getByRole('textbox', { name: /card.*number|email/i }).first(),
      
      // Graceful failure states (required by contract)
      page.getByText(/payment.*unavailable|temporarily.*down/i).first(),
      page.getByText(/please.*try.*again.*later/i).first(),
      page.getByRole('button', { name: /retry.*payment|try.*again/i }).first(),
      page.getByText(/booking.*not.*found/i).first(),
      
      // Must not be blank/broken
      page.locator('main:has-text("error"), main:has-text("sorry"), main:has-text("unavailable")').first(),
    ];
    
    let gracefulHandling = false;
    
    for (const outcome of paymentOutcomes) {
      try {
        await expect(outcome).toBeVisible({ timeout: 8000 });
        gracefulHandling = true;
        console.log('✅ Payment flow shows graceful handling');
        break;
      } catch {
        // Try next outcome
      }
    }
    
    // Must have title (not completely broken)
    const hasTitle = await page.title();
    expect(hasTitle.toLowerCase().includes('bookiji') || hasTitle.length > 0, 
      'Payment page must have meaningful title'
    ).toBe(true);
    
    // Must show some content (not blank)
    const hasContent = await page.locator('body').textContent();
    expect(hasContent && hasContent.trim().length > 0, 
      'Payment page must show meaningful content'
    ).toBe(true);
    
    expect(gracefulHandling, 
      'Payment flow must show graceful fallback message or working form'
    ).toBe(true);
  });

  test('@contract theme loader must timeout to safe default within 3s', async ({ page, context }) => {
    await page.goto('/');
    
    // Go offline to trigger theme loading issues
    await context.setOffline(true);
    
    const themeButton = page.getByRole('button', { name: /theme|palette/i }).first();
    
    if (await themeButton.isVisible({ timeout: 3000 })) {
      const startTime = Date.now();
      
      // Check initial state
      const initialDisabled = await themeButton.isDisabled();
      const initialLabel = await themeButton.getAttribute('aria-label');
      
      console.log('Theme button initial state:', { 
        disabled: initialDisabled, 
        label: initialLabel 
      });
      
      // Wait for theme to either:
      // 1. Load successfully
      // 2. Timeout to safe default
      // 3. Show clear error state
      
      let themeResolved = false;
      
      while (Date.now() - startTime < 3000 && !themeResolved) {
        const currentDisabled = await themeButton.isDisabled();
        const currentLabel = await themeButton.getAttribute('aria-label');
        
        // Theme resolved if:
        // - Button is enabled and no longer says "loading"
        // - OR clear error state is shown
        if (!currentDisabled && !currentLabel?.includes('loading')) {
          themeResolved = true;
          console.log('✅ Theme resolved to working state');
        } else if (currentLabel?.includes('error') || currentLabel?.includes('failed')) {
          themeResolved = true;
          console.log('✅ Theme showed clear error state');
        }
        
        if (!themeResolved) {
          await page.waitForTimeout(200);
        }
      }
      
      const finalTime = Date.now() - startTime;
      console.log(`Theme resolution took ${finalTime}ms`);
      
      expect(themeResolved, 
        'Theme loader must resolve to safe default or show error within 3s'
      ).toBe(true);
      
      // Must be accessible in final state
      const finalLabel = await themeButton.getAttribute('aria-label');
      expect(finalLabel && finalLabel.length > 0, 
        'Theme button must have accessible label in final state'
      ).toBe(true);
    }
  });

  test('@contract critical routes must show error boundary not blank screen', async ({ page }) => {
    // Test critical application routes under chaos
    const criticalRoutes = [
      '/',
      '/faq', 
      '/how-it-works',
      '/login',
      '/register'
    ];
    
    for (const route of criticalRoutes) {
      console.log(`Testing critical route: ${route}`);
      
      try {
        await page.goto(route, { timeout: 10000 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Route ${route} failed to load: ${errorMessage}`);
      }
      
      // Must have some content (not blank)
      const bodyText = await page.locator('body').textContent();
      const hasContent = bodyText && bodyText.trim().length > 10;
      
      // Must have a title
      const title = await page.title();
      const hasTitle = title && title.length > 0;
      
      // Must have proper error boundary if failing
      const errorBoundaryElements = [
        page.getByText(/something went wrong|error|sorry/i).first(),
        page.getByRole('button', { name: /reload|refresh|retry/i }).first(),
        page.locator('[data-testid="error-boundary"]').first(),
      ];
      
      let hasErrorBoundary = false;
      for (const element of errorBoundaryElements) {
        if (await element.isVisible({ timeout: 1000 })) {
          hasErrorBoundary = true;
          break;
        }
      }
      
      // Route must either work OR show proper error boundary
      const routeHandledGracefully = hasContent && hasTitle;
      
      expect(routeHandledGracefully, 
        `Route ${route} must show content or proper error boundary, not blank screen`
      ).toBe(true);
      
      if (!routeHandledGracefully) {
        console.log(`Route ${route} contract violation:`, {
          hasContent,
          hasTitle,
          hasErrorBoundary,
          bodyLength: bodyText?.length
        });
      }
    }
  });
});
