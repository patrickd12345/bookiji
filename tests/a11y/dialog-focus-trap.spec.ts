import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('@a11y homepage has no critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Run axe scan on the entire page
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  // Filter out only critical violations
  const critical = results.violations.filter(v => v.impact === 'critical');
  const serious = results.violations.filter(v => v.impact === 'serious');
  
  // Log violations for debugging
  if (critical.length > 0) {
    console.log('Critical violations:', critical.map(v => `${v.id}: ${v.description}`));
  }
  if (serious.length > 0) {
    console.log('Serious violations:', serious.map(v => `${v.id}: ${v.description}`));
  }
  
  // Assert no critical violations (serious violations are warnings)
  expect(critical, 'No critical WCAG violations should be present').toEqual([]);
  
  // Basic page structure checks
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main, [role="main"]')).toBeVisible();
  
  // Ensure page has proper navigation
  const nav = page.locator('nav, [role="navigation"]');
  if (await nav.count() > 0) {
    await expect(nav.first()).toBeVisible();
  }
});