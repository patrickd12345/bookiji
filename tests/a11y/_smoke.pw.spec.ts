import { test, expect } from '@playwright/test';

test('smoke', async ({ page }) => {
  await page.goto('about:blank');
  await expect(page).toBeDefined();
});
