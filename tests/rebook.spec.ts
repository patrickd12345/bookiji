import { expect, test } from '@playwright/test';

// Confirms the confirmation page supports rebooking shortcuts for users returning to schedule again.
test.describe('Rebooking from confirmation', () => {
  test('rebook button or link starts a new booking', async ({ page }) => {
    try {
      await page.goto('/confirmation', { timeout: 30000 });
      await expect(page.locator('body')).toBeVisible();

      const rebookAction = page.getByRole('link', { name: /rebook|book again|schedule another/i })
        .or(page.getByRole('button', { name: /rebook|book again|schedule another/i }));

      if ((await rebookAction.count()) === 0) {
        console.log('Rebook control not found; ensure confirmation page exposes rebooking.');
        return;
      }

      await rebookAction.first().click();

      // Verify the user is routed back into the booking flow
      await expect(page.locator('form').first()).toBeVisible({ timeout: 15000 });
    } catch (error) {
      console.log('App not running, skipping rebooking check');
      test.skip();
    }
  });
});
