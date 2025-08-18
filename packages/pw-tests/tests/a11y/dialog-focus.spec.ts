import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Routes that actually have dialogs/modals - update this list as needed
const routesWithDialogs: string[] = [
  // Add routes here when dialogs are implemented
  // '/demo',      // Demo modal
  // '/help',      // Help dialog  
  // '/support',   // Support modal
];

// Skip all tests if no routes with dialogs are defined
test.skip(routesWithDialogs.length === 0, 'No routes with dialogs configured yet');

for (const route of routesWithDialogs) {
  test.describe(`@a11y-dialog ${route}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
    });

    test('modal opens and traps focus', async ({ page }) => {
      // Multiple selector strategies for finding dialog openers
      const openers = [
        page.getByRole('button', { name: /open (dialog|modal)/i }),
        page.locator('[data-testid="open-dialog"]'),
        page.getByRole('button', { name: /demo|help|support/i }),
      ];

      // Find the first opener that exists on this route
      let opener = null;
      for (const candidate of openers) {
        if (await candidate.count() > 0 && await candidate.first().isVisible()) {
          opener = candidate.first();
          break;
        }
      }
      
      test.skip(!opener, `No dialog opener found on ${route}`);

      // Open the dialog (we know opener is not null due to test.skip above)
      await opener!.focus();
      await opener!.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Focus-trap sanity: Tab around and ensure focus stays inside
      await page.keyboard.press('Tab');
      const activeInside = await dialog.evaluate((el) => el.contains(document.activeElement));
      expect(activeInside).toBeTruthy();

      // Run accessibility check scoped to dialog
      const results = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const critical = results.violations.filter(v => v.impact === 'critical');
      expect(critical, 'No critical accessibility violations in dialog').toEqual([]);

      // Test focus cycling within dialog
      const focusables = dialog.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const count = await focusables.count();
      
      if (count > 1) {
        // Tab through all focusable elements
        for (let i = 0; i < count + 1; i++) {
          await page.keyboard.press('Tab');
          const activeInside = await dialog.evaluate((el) => el.contains(document.activeElement));
          expect(activeInside, `Focus should stay inside dialog after ${i} tabs`).toBeTruthy();
        }
        
        // Shift+Tab backward
        for (let i = 0; i < count + 1; i++) {
          await page.keyboard.press('Shift+Tab');
          const activeInside = await dialog.evaluate((el) => el.contains(document.activeElement));
          expect(activeInside, `Focus should stay inside dialog after ${i} shift+tabs`).toBeTruthy();
        }
      }

      // Close dialog and ensure focus returns to opener
      const closers = [
        dialog.getByRole('button', { name: /close/i }),
        dialog.locator('[data-testid="close-dialog"]'),
        dialog.locator('[aria-label*="close" i]'),
      ];
      
      let closer = null;
      for (const candidate of closers) {
        if (await candidate.count() > 0 && await candidate.first().isVisible()) {
          closer = candidate.first();
          break;
        }
      }
      
      if (closer) {
        await closer.click();
        await expect(dialog).toBeHidden();
        
        // Check that focus returns to opener
        const isOpenerFocused = await page.evaluate(() => {
          return document.activeElement?.matches('[data-testid="open-dialog"], button[data-opener="true"]') || false;
        });
        expect(isOpenerFocused).toBeTruthy();
      } else {
        // Try Escape key as fallback
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        
        // Check that focus returns to opener
        const isOpenerFocused = await page.evaluate(() => {
          return document.activeElement?.matches('[data-testid="open-dialog"], button[data-opener="true"]') || false;
        });
        expect(isOpenerFocused).toBeTruthy();
      }
    });
  });
}
