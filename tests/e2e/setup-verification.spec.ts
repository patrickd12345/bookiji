import { test, expect } from '@playwright/test';

test('setup verification - basic page load', async ({ page }) => {
  await page.goto('/');
  
  // Verify the page loads
  await expect(page).toHaveTitle(/Bookiji/);
  
  // Verify our data-testid is present
  await expect(page.getByTestId('book-now-btn')).toBeVisible();
});

test('health endpoint accessible', async ({ page }) => {
  const response = await page.request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  
  const json = await response.json();
  expect(json).toHaveProperty('status');
});
