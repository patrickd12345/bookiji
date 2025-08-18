import { test, expect } from '@playwright/test';
import { runAxeAndAttach } from './_helpers/a11y';

for (const cfg of [{ colorScheme: 'light' as const }, { colorScheme: 'dark' as const }]) {
  test(`home a11y (${cfg.colorScheme})`, async ({ page }) => {
    await page.emulateMedia(cfg);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    await runAxeAndAttach(page, `home-${cfg.colorScheme}`);
  });
}

