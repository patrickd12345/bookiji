import { test, expect } from '@playwright/test';

test('html[lang] and meta viewport exist', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html[lang]')).toHaveCount(1);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/i);
});

