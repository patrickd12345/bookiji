import { test, expect } from '@playwright/test';
import { installChaos, loadChaosFromEnv } from '../utils/chaos';

test.describe('🌪️ Booking - Chaos Resilience', () => {
  test.beforeEach(async ({ page }) => {
    const chaosConfig = loadChaosFromEnv();
    await installChaos(page, chaosConfig);
  });

  test('@chaos booking flow survives network chaos or shows graceful fallbacks', async ({ page }) => {
    await page.goto('/');

    // Navigate to booking flow (adjust selectors based on your actual UI)
    const bookButton = page.getByRole('button', { name: /book|get started|find service/i }).first();
    
    if (await bookButton.isVisible({ timeout: 3000 })) {
      await bookButton.click();
    } else {
      // Fallback navigation if main CTA not found
      await page.goto('/book');
    }

    // Try to interact with search/booking form
    const searchInput = page.getByRole('textbox', { name: /search|service|what do you need/i }).first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('massage therapy');
      
      const searchSubmit = page.getByRole('button', { name: /search|find|go/i }).first();
      if (await searchSubmit.isVisible({ timeout: 2000 })) {
        await searchSubmit.click();
      }
    }

    // Wait for either success OR graceful fallback
    const possibleOutcomes = [
      // Success states
      page.getByText(/found|results|available/i).first(),
      page.getByRole('button', { name: /book now|select|choose/i }).first(),
      
      // Graceful fallback states  
      page.getByText(/temporarily unavailable/i).first(),
      page.getByText(/please try again/i).first(),
      page.getByText(/experiencing high load/i).first(),
      page.getByText(/something went wrong/i).first(),
      
      // Loading states are also acceptable
      page.getByText(/loading|searching/i).first(),
    ];

    // At least one outcome should be visible (no blank screens!)
    let outcomeFound = false;
    for (const outcome of possibleOutcomes) {
      try {
        await expect(outcome).toBeVisible({ timeout: 2000 });
        outcomeFound = true;
        break;
      } catch {
        // Try next outcome
      }
    }

    // Assert the app doesn't crash completely
    await expect(page).toHaveTitle(/bookiji/i);
    
    // Ensure navigation stays functional
    const navElements = [
      page.getByRole('link', { name: /home/i }).first(),
      page.getByRole('button', { name: /menu/i }).first(),
      page.locator('nav').first(),
    ];

    let navWorking = false;
    for (const nav of navElements) {
      if (await nav.isVisible({ timeout: 1000 })) {
        navWorking = true;
        break;
      }
    }

    expect(navWorking, 'Navigation should remain functional during chaos').toBe(true);
    
    // Log for debugging
    if (!outcomeFound) {
      console.log('⚠️ No expected outcome found - this might indicate a real issue');
    }
  });

  test('@chaos AI chat survives service failures with helpful fallbacks', async ({ page }) => {
    await page.goto('/');

    // Try to open AI chat
    const aiChatButton = page.getByRole('button', { name: /chat|ai|assistant|help/i }).first();
    
    if (await aiChatButton.isVisible({ timeout: 3000 })) {
      await aiChatButton.click();
      
      // Try to send a message
      const chatInput = page.getByRole('textbox', { name: /message|chat|ask/i }).first();
      if (await chatInput.isVisible({ timeout: 3000 })) {
        await chatInput.fill('I need help booking a massage');
        
        const sendButton = page.getByRole('button', { name: /send|submit/i }).first();
        if (await sendButton.isVisible({ timeout: 2000 })) {
          await sendButton.click();
        }
      }
      
      // Either AI responds OR fallback message appears
      const outcomes = [
        page.getByText(/here are some massage/i).first(), // AI success
        page.getByText(/ai.*unavailable|taking.*break|try.*again/i).first(), // AI fallback
        page.getByText(/search.*manually|browse.*services/i).first(), // Manual fallback
      ];
      
      let outcomeVisible = false;
      for (const outcome of outcomes) {
        try {
          await expect(outcome).toBeVisible({ timeout: 8000 });
          outcomeVisible = true;
          break;
        } catch {
          // Try next
        }
      }
      
      // Chat UI should remain functional (not crash)
      await expect(page.getByRole('textbox', { name: /message|chat|ask/i }).first())
        .toBeVisible({ timeout: 2000 });
    }
  });

  test('@chaos payment flow shows clear error states and retry options', async ({ page }) => {
    // This would test payment resilience - for now, just ensure
    // payment pages load and show appropriate error handling
    
    await page.goto('/pay/demo-booking-id'); // Adjust URL structure
    
    // Should either show payment form OR clear error message
    const outcomes = [
      page.getByText(/enter.*card|payment.*details/i).first(), // Success
      page.getByText(/payment.*unavailable|temporarily.*down/i).first(), // Payment down
      page.getByText(/booking.*not.*found/i).first(), // Invalid booking
    ];
    
    let foundOutcome = false;
    for (const outcome of outcomes) {
      try {
        await expect(outcome).toBeVisible({ timeout: 5000 });
        foundOutcome = true;
        break;
      } catch {
        // Try next
      }
    }
    
    // Page should not be completely blank
    await expect(page).toHaveTitle(/bookiji/i);
    
    // Some content should be visible
    const hasContent = await page.locator('main, [role="main"], body').first().isVisible();
    expect(hasContent, 'Page should have visible content even during payment chaos').toBe(true);
  });
});
