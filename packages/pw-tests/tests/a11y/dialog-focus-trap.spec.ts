import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Guard against Vitest globals leaking into Playwright env
test.beforeAll(() => {
  if ((globalThis as any).vi || (globalThis as any).vitest) {
    throw new Error('Vitest globals detected in Playwright environment.');
  }
});

// Minimal config-by-env so you can point this at any page/dialog without changing code.
const PATH = process.env.DIALOG_TEST_PATH ?? '/'; // e.g. '/support' or '/demo'
const OPEN_SEL = process.env.DIALOG_OPEN_SELECTOR ?? '[data-testid="open-dialog"]';
const DIALOG_SEL = process.env.DIALOG_SELECTOR ?? '[role="dialog"]';
const CLOSE_SEL = process.env.DIALOG_CLOSE_SELECTOR ?? '[data-testid="close-dialog"]';
const ESC_CLOSE = (process.env.DIALOG_ESC_CLOSE ?? '1') === '1';

test('dialog traps focus, and restores it to the opener', async ({ page }) => {
  await page.goto(PATH);

  const opener = page.locator(OPEN_SEL);
  await expect(opener).toBeVisible();

  // Open the dialog
  await opener.focus();
  await opener.click();

  const dialog = page.locator(DIALOG_SEL);
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
    }, DIALOG_SEL);
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
  if (ESC_CLOSE) {
    await page.keyboard.press('Escape');
  } else if (await page.locator(CLOSE_SEL).isVisible()) {
    await page.locator(CLOSE_SEL).click();
  }
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('axe: dialog meets WCAG 2.1 A/AA', async ({ page }) => {
  await page.goto(PATH);
  await page.locator(OPEN_SEL).click();
  const dialog = page.locator(DIALOG_SEL);
  await expect(dialog).toBeVisible();

  // Run axe *scoped to the dialog*, WCAG 2.1 A/AA
  const results = await new AxeBuilder({ page })
    .include(DIALOG_SEL)
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
