import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Guard against Vitest globals leaking into Playwright env
test.beforeAll(() => {
  if ((globalThis as { vi?: unknown; vitest?: unknown }).vi || (globalThis as { vi?: unknown; vitest?: unknown }).vitest) {
    throw new Error('Vitest globals detected in Playwright environment.');
  }
});

// Define the type for dialog configuration
interface DialogConfig {
  path: string;
  openSel: string;
  dialogSel: string;
  closeSel: string;
}

// Routes that actually have dialogs/modals - update this list as needed
const routesWithDialogs: DialogConfig[] = [
  // Add routes here when dialogs are implemented
  // { path: '/demo', openSel: '[data-testid="demo-modal"]', dialogSel: '[role="dialog"]', closeSel: '[data-testid="close-demo"]' },
  // { path: '/help', openSel: '[data-testid="help-dialog"]', dialogSel: '[role="dialog"]', closeSel: '[data-testid="close-help"]' },
];

// Skip all tests if no routes with dialogs are defined
test.skip(routesWithDialogs.length === 0, 'No routes with dialogs configured yet');

for (const config of routesWithDialogs) {
  test.describe(`@a11y-dialog-trap ${config.path}`, () => {
    test('dialog traps focus, and restores it to the opener', async ({ page }) => {
      await page.goto(config.path);
      await page.waitForLoadState('networkidle');

      const opener = page.locator(config.openSel);
      
      // Skip if opener doesn't exist or isn't visible
      const openerExists = await opener.count() > 0 && await opener.first().isVisible();
      test.skip(!openerExists, `No dialog opener found at ${config.openSel} on ${config.path}`);

      // Open the dialog
      await opener.focus();
      await opener.click();

      const dialog = page.locator(config.dialogSel);
      await expect(dialog).toBeVisible();

      // Sanity: dialog should be accessible
      await expect(dialog).toHaveAttribute('role', /dialog/i);
      // If you set aria-modal="true", uncomment the next line
      // await expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Collect focusable elements inside the dialog
      const focusables = dialog.locator(
        ':is(button,[href],input,select,textarea,[tabindex])' +
        ':not([tabindex="-1"]):not([disabled]):not([inert])'
      );
      const count = await focusables.count();
      expect(count).toBeGreaterThan(0);

      // Start from the first focusable
      await focusables.first().focus();

      // Helper to assert activeElement stays inside the dialog
      const assertFocusInside = async () => {
        const inside = await page.evaluate((sel) => {
          const dlg = document.querySelector(sel);
          return !!dlg && dlg.contains(document.activeElement);
        }, config.dialogSel);
        expect(inside).toBeTruthy();
      };

      // TAB cycles within
      for (let i = 0; i < count + 2; i++) {
        await page.keyboard.press('Tab');
        await assertFocusInside();
      }

      // SHIFT+TAB cycles within
      for (let i = 0; i < count + 2; i++) {
        await page.keyboard.down('Shift');
        await page.keyboard.press('Tab');
        await page.keyboard.up('Shift');
        await assertFocusInside();
      }

      // Close & restore focus to opener
      const closeBtn = page.locator(config.closeSel);
      if (await closeBtn.count() > 0 && await closeBtn.first().isVisible()) {
        await closeBtn.click();
      } else {
        // Fallback to Escape key
        await page.keyboard.press('Escape');
      }
      await expect(dialog).toBeHidden();
      
      // Check that focus is restored to opener
      const isOpenerFocused = await page.evaluate((selector) => {
        const opener = document.querySelector(selector);
        return opener === document.activeElement;
      }, config.openSel);
      expect(isOpenerFocused).toBeTruthy();
    });

    test('axe: dialog meets WCAG 2.1 A/AA', async ({ page }) => {
      await page.goto(config.path);
      await page.waitForLoadState('networkidle');
      
      const opener = page.locator(config.openSel);
      const openerExists = await opener.count() > 0 && await opener.first().isVisible();
      test.skip(!openerExists, `No dialog opener found at ${config.openSel} on ${config.path}`);
      
      await opener.click();
      const dialog = page.locator(config.dialogSel);
      await expect(dialog).toBeVisible();

      // Run axe *scoped to the dialog*, WCAG 2.1 A/AA
      const results = await new AxeBuilder({ page })
        .include(config.dialogSel)
        .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])
        // Axe contrast checks sometimes miss canvas/video; that's fine here.
        .analyze();

      if (results.violations.length) {
        console.error(
          'Axe violations:\n' +
          results.violations.map(v =>
            `• ${v.id} (${v.impact}) — ${v.help}\n  ${v.nodes.map(n => n.target.join(' ')).join('\n  ')}`
          ).join('\n')
        );
      }
      expect(results.violations, 'No WCAG A/AA violations').toHaveLength(0);
    });
  });
}
