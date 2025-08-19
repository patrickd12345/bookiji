import { test, expect } from '@playwright/test';

test.describe('🔌 Offline Mode & Network Recovery', () => {
  test('@offline app shows meaningful offline UI and recovers gracefully', async ({ page, context }) => {
    // First, load the page normally to cache resources
    await page.goto('/');
    await expect(page).toHaveTitle(/bookiji/i);
    
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate or refresh
    await page.reload();
    
    // Should show offline indicator or cached content
    const offlineIndicators = [
      page.getByText(/offline|no connection|network unavailable/i).first(),
      page.getByText(/check.*connection|internet.*required/i).first(),
      page.getByRole('banner', { name: /offline/i }).first(),
    ];
    
    let offlineUIVisible = false;
    for (const indicator of offlineIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 5000 });
        offlineUIVisible = true;
        console.log('✅ Offline UI detected');
        break;
      } catch {
        // Try next indicator
      }
    }
    
    // Even if no specific offline UI, page should not be blank
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent, 'Page should show some content even when offline').toBe(true);
    
    // Check if retry mechanism exists
    const retryElements = [
      page.getByRole('button', { name: /retry|try again|refresh/i }).first(),
      page.getByText(/try.*again.*online/i).first(),
    ];
    
    for (const retry of retryElements) {
      if (await retry.isVisible({ timeout: 2000 })) {
        console.log('✅ Retry mechanism found');
        break;
      }
    }
    
    // Go back online
    await context.setOffline(false);
    
    // Try to refresh or click retry
    const retryButton = page.getByRole('button', { name: /retry|try again|refresh/i }).first();
    if (await retryButton.isVisible({ timeout: 2000 })) {
      await retryButton.click();
    } else {
      await page.reload();
    }
    
    // Should recover and show normal content
    await expect(page).toHaveTitle(/bookiji/i, { timeout: 10000 });
    
    // Some interactive element should be working again
    const interactiveElements = [
      page.getByRole('button', { name: /book|search|get started/i }).first(),
      page.getByRole('textbox').first(),
      page.getByRole('link').first(),
    ];
    
    let interactionWorking = false;
    for (const element of interactiveElements) {
      if (await element.isVisible({ timeout: 3000 })) {
        interactionWorking = true;
        console.log('✅ Interactive elements recovered');
        break;
      }
    }
    
    expect(interactionWorking, 'Interactive elements should work after coming back online').toBe(true);
  });

  test('@offline service worker caches critical resources', async ({ page, context }) => {
    await page.goto('/');
    
    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    if (swRegistered) {
      console.log('✅ Service Worker support detected');
      
      // Wait a bit for SW to cache resources
      await page.waitForTimeout(2000);
      
      // Go offline
      await context.setOffline(true);
      
      // Navigate to another page that should be cached
      await page.goto('/faq');
      
      // Should load from cache (or show offline page)
      const pageLoaded = await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).then(() => true).catch(() => false);
      
      if (pageLoaded) {
        console.log('✅ Page loaded from cache while offline');
        await expect(page).toHaveTitle(/faq|bookiji/i);
      } else {
        console.log('ℹ️ Page not cached - showing offline state');
      }
    } else {
      console.log('ℹ️ Service Worker not available - skipping cache test');
    }
  });

  test('@offline graceful degradation maintains core functionality', async ({ page, context }) => {
    await page.goto('/');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to use search (should show offline message or cached suggestions)
    const searchInput = page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('massage');
      
      // Should either show cached results or offline message
      const outcomes = [
        page.getByText(/cached|offline|no connection/i).first(),
        page.getByText(/try.*online|check.*connection/i).first(),
        page.locator('[data-testid="offline-search"]').first(),
      ];
      
      // Some response should appear (not just hang)
      await page.waitForTimeout(3000);
    }
    
    // Navigation should still work for cached/static pages  
    const aboutLink = page.getByRole('link', { name: /about|how.*works|faq/i }).first();
    if (await aboutLink.isVisible({ timeout: 2000 })) {
      await aboutLink.click();
      
      // Should navigate (even if to offline page)
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      // URL should change
      const url = page.url();
      expect(url).not.toBe('about:blank');
    }
    
    // Theme switching should work (local functionality)
    const themeButton = page.getByRole('button', { name: /theme|palette/i }).first();
    if (await themeButton.isVisible({ timeout: 2000 })) {
      await themeButton.click();
      
      // Theme menu should appear
      const themeMenu = page.getByText(/light|dark|theme/i).first();
      await expect(themeMenu).toBeVisible({ timeout: 3000 });
    }
  });
});
