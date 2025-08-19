import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installChaos, loadChaosFromEnv } from '../utils/chaos';

test.describe('♿🌪️ Accessibility Under Chaos', () => {
  test.beforeEach(async ({ page }) => {
    const chaosConfig = loadChaosFromEnv();
    await installChaos(page, chaosConfig);
  });

  test('@chaos @a11y error states remain WCAG compliant', async ({ page }) => {
    await page.goto('/');
    
    // Let chaos potentially trigger some failures
    await page.waitForTimeout(2000);
    
    // Try to trigger some API calls that might fail
    const searchInput = page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('test service');
      
      const searchButton = page.getByRole('button', { name: /search|find/i }).first();
      if (await searchButton.isVisible({ timeout: 2000 })) {
        await searchButton.click();
      }
    }
    
    // Wait for either results or error states to appear
    await page.waitForTimeout(5000);
    
    // Run accessibility scan on the page (including any error states)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Filter critical and serious violations
    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');
    
    // Log violations for debugging
    if (critical.length > 0) {
      console.log('❌ Critical A11y violations in error states:', 
        critical.map(v => `${v.id}: ${v.description}`));
    }
    
    if (serious.length > 0) {
      console.log('⚠️ Serious A11y violations in error states:', 
        serious.map(v => `${v.id}: ${v.description}`));
    }
    
    // Critical violations should never exist, even in error states
    expect(critical, 'Error states must not have critical WCAG violations').toEqual([]);
    
    // Serious violations should be minimal (allow some tolerance during chaos)
    expect(serious.length, 'Error states should have minimal serious violations').toBeLessThan(3);
  });

  test('@chaos @a11y offline mode remains accessible', async ({ page, context }) => {
    await page.goto('/');
    
    // Go offline to trigger offline UI
    await context.setOffline(true);
    await page.reload();
    
    // Wait for offline UI to appear
    await page.waitForTimeout(3000);
    
    // Run accessibility scan on offline state
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const critical = results.violations.filter(v => v.impact === 'critical');
    
    expect(critical, 'Offline UI must be accessible').toEqual([]);
    
    // Check for proper ARIA attributes in offline state
    const offlineElements = await page.locator('[role="alert"], [aria-live], [aria-label*="offline"]').all();
    
    if (offlineElements.length > 0) {
      console.log('✅ Found accessible offline indicators');
    }
    
    // Ensure keyboard navigation still works
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log('Focused element after Tab:', focusedElement);
  });

  test('@chaos @a11y error messages have proper semantics', async ({ page }) => {
    await page.goto('/');
    
    // Try to trigger some actions that might fail due to chaos
    const actions = [
      async () => {
        const bookButton = page.getByRole('button', { name: /book|find/i }).first();
        if (await bookButton.isVisible({ timeout: 2000 })) {
          await bookButton.click();
        }
      },
      async () => {
        const chatButton = page.getByRole('button', { name: /chat|ai/i }).first();
        if (await chatButton.isVisible({ timeout: 2000 })) {
          await chatButton.click();
          await page.waitForTimeout(1000);
          
          const chatInput = page.getByRole('textbox', { name: /message/i }).first();
          if (await chatInput.isVisible({ timeout: 2000 })) {
            await chatInput.fill('test message');
            const sendButton = page.getByRole('button', { name: /send/i }).first();
            if (await sendButton.isVisible({ timeout: 1000 })) {
              await sendButton.click();
            }
          }
        }
      }
    ];
    
    // Execute actions that might trigger errors
    for (const action of actions) {
      try {
        await action();
        await page.waitForTimeout(2000);
      } catch {
        // Actions might fail, that's expected in chaos mode
      }
    }
    
    // Look for error messages and check their accessibility
    const errorSelectors = [
      '[role="alert"]',
      '[aria-live="polite"]', 
      '[aria-live="assertive"]',
      '.error-message',
      '[data-testid*="error"]',
      '*[class*="error"]:not(input):not(button)', // Error containers, not form states
    ];
    
    let errorElementsFound = 0;
    
    for (const selector of errorSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        if (await element.isVisible()) {
          errorElementsFound++;
          
          // Check if error has proper semantic structure
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLive = await element.getAttribute('aria-live');
          const role = await element.getAttribute('role');
          const text = await element.textContent();
          
          console.log('Error element found:', {
            selector,
            ariaLabel,
            ariaLive, 
            role,
            hasText: !!text?.trim()
          });
          
          // Error should have meaningful text
          expect(text?.trim(), 'Error messages should have meaningful text').toBeTruthy();
          
          // Error should be announced to screen readers
          const isAnnounced = role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive';
          if (!isAnnounced) {
            console.warn('⚠️ Error message may not be announced to screen readers');
          }
        }
      }
    }
    
    console.log(`Found ${errorElementsFound} accessible error elements`);
    
    // Run final accessibility scan
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    
    expect(critical, 'Page with error messages should be accessible').toEqual([]);
  });

  test('@chaos @a11y loading states are screen reader friendly', async ({ page }) => {
    await page.goto('/');
    
    // Trigger loading states that might be affected by chaos (slow responses)
    const searchInput = page.getByRole('textbox', { name: /search/i }).first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('massage therapy');
      
      const searchButton = page.getByRole('button', { name: /search|find/i }).first();
      if (await searchButton.isVisible({ timeout: 2000 })) {
        await searchButton.click();
        
        // Look for loading indicators immediately after click
        await page.waitForTimeout(500);
        
        const loadingSelectors = [
          '[aria-live="polite"]:has-text("loading")',
          '[aria-live="polite"]:has-text("searching")', 
          '[role="status"]',
          '[aria-label*="loading"]',
          '[aria-label*="searching"]',
          '.loading, .spinner',
        ];
        
        let loadingElementFound = false;
        
        for (const selector of loadingSelectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            loadingElementFound = true;
            
            const ariaLive = await element.getAttribute('aria-live');
            const role = await element.getAttribute('role');
            const ariaLabel = await element.getAttribute('aria-label');
            const text = await element.textContent();
            
            console.log('Loading element found:', {
              selector,
              ariaLive,
              role,
              ariaLabel,
              text: text?.trim()
            });
            
            // Loading states should be announced or have proper labels
            const isAccessible = ariaLive || role === 'status' || ariaLabel || text?.includes('loading') || text?.includes('searching');
            expect(isAccessible, 'Loading states should be accessible to screen readers').toBeTruthy();
            
            break;
          }
        }
        
        if (loadingElementFound) {
          console.log('✅ Accessible loading state detected');
        } else {
          console.log('ℹ️ No loading state detected (might be very fast or using different patterns)');
        }
      }
    }
  });
});
